import { app } from 'electron';
import { spawn, spawnSync, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import type {
  CodeAgentDescriptor,
  CodeAgentHealth,
  CodeAgentRuntimeConfig,
  CodeAgentRunRequest,
  CodeAgentRunRecord,
  CodeAgentRunResult,
  CodeAgentStatus,
} from '../../shared/code-agent';
import { DEFAULT_CODE_AGENT_RUNTIME_CONFIG } from '../../shared/code-agent';
import { getProviderService } from '../services/providers/provider-service';
import { getApiKey } from '../utils/secure-storage';
import { getAllSettings } from '../utils/store';
import { logger } from '../utils/logger';
import { readClaudeUserSettingsRuntimeConfig } from './claude-user-settings';

type SidecarResponse = {
  type: 'response';
  id: string;
  ok: boolean;
  result?: unknown;
  error?: {
    message: string;
    code?: string;
    details?: unknown;
  };
};

type SidecarReadyEvent = {
  type: 'ready';
  payload: CodeAgentHealth;
};

type SidecarEvent = {
  type: 'event';
  event: string;
  payload?: unknown;
};

type SidecarMessage = SidecarResponse | SidecarReadyEvent | SidecarEvent;

type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timer: NodeJS.Timeout;
};

type ReadyWaiter = {
  resolve: () => void;
  reject: (error: Error) => void;
  timer: NodeJS.Timeout;
};

type RuntimeConfigResolution = {
  configSource: 'settings' | 'claude_settings' | 'default_provider';
  configSourceAccountId?: string;
  configSourceLabel?: string;
  inheritedApiKey: boolean;
};

export class CodeAgentManager extends EventEmitter {
  private process: ChildProcessWithoutNullStreams | null = null;
  private stdoutBuffer = '';
  private pendingRequests = new Map<string, PendingRequest>();
  private startPromise: Promise<void> | null = null;
  private readyWaiter: ReadyWaiter | null = null;
  private lastRun: CodeAgentRunRecord | null = null;
  private runtimeConfig: CodeAgentRuntimeConfig = { ...DEFAULT_CODE_AGENT_RUNTIME_CONFIG };
  private runtimeConfigResolution: RuntimeConfigResolution = {
    configSource: 'settings',
    inheritedApiKey: false,
  };
  private status: CodeAgentStatus = {
    state: 'stopped',
    ...this.buildDescriptor(),
  };

  getStatus(): CodeAgentStatus {
    return { ...this.status };
  }

  getLastRun(): CodeAgentRunRecord | null {
    return this.lastRun ? structuredClone(this.lastRun) : null;
  }

  async start(): Promise<void> {
    if (this.status.state === 'running' && this.process && !this.process.killed) {
      return;
    }
    if (this.startPromise) {
      await this.startPromise;
      return;
    }

    this.startPromise = this.startInternal();
    try {
      await this.startPromise;
    } finally {
      this.startPromise = null;
    }
  }

  async stop(): Promise<void> {
    if (!this.process) {
      this.setStatus({ state: 'stopped', lastError: undefined });
      return;
    }

    const child = this.process;
    await new Promise<void>((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        resolve();
      };

      child.once('exit', finish);
      try {
        child.kill();
      } catch (error) {
        logger.warn('[code-agent] Failed to terminate sidecar cleanly:', error);
        finish();
      }

      setTimeout(() => {
        if (!settled) {
          try {
            child.kill('SIGKILL');
          } catch {
            // ignore forced kill failures
          }
          finish();
        }
      }, 2_000);
    });
  }

  async restart(): Promise<void> {
    await this.stop();
    await this.start();
  }

  async checkHealth(): Promise<CodeAgentHealth> {
    await this.refreshRuntimeConfig();
    const descriptor = this.buildDescriptor();
    if (!this.process || this.status.state !== 'running') {
      return {
        ok: false,
        error: 'Code agent sidecar is not running',
        protocolVersion: 1,
        snapshotEntryPath: join(descriptor.vendorPath, 'src', 'main.tsx'),
        ...descriptor,
      };
    }

    const result = await this.sendRequest<CodeAgentHealth>('health', { config: this.runtimeConfig }, 5_000);
    return {
      ...result,
      ...descriptor,
      configSource: this.runtimeConfigResolution.configSource,
      configSourceAccountId: this.runtimeConfigResolution.configSourceAccountId,
      configSourceLabel: this.runtimeConfigResolution.configSourceLabel,
      inheritedApiKey: this.runtimeConfigResolution.inheritedApiKey,
    };
  }

  async runTask(input: CodeAgentRunRequest): Promise<CodeAgentRunResult> {
    await this.refreshRuntimeConfig(input.configOverride);
    await this.start();
    const timeoutMs = typeof input.timeoutMs === 'number' && input.timeoutMs > 0
      ? input.timeoutMs
      : 120_000;
    const startedAt = Date.now();
    this.lastRun = {
      startedAt,
      request: {
        workspaceRoot: input.workspaceRoot,
        prompt: input.prompt,
        sessionId: input.sessionId,
        allowedTools: input.allowedTools,
        metadata: input.metadata,
        timeoutMs: input.timeoutMs,
        configOverride: input.configOverride,
      },
    };
    this.emit('run:started', this.getLastRun());

    try {
      const result = await this.sendRequest<CodeAgentRunResult>('run.start', {
        ...input,
        config: this.runtimeConfig,
      }, timeoutMs);
      this.lastRun = {
        ...(this.lastRun ?? { startedAt, request: this.buildRequestRecord(input) }),
        completedAt: Date.now(),
        result,
      };
      this.emit('run:completed', this.getLastRun());
      return result;
    } catch (error) {
      this.lastRun = {
        ...(this.lastRun ?? { startedAt, request: this.buildRequestRecord(input) }),
        completedAt: Date.now(),
        error: error instanceof Error ? error.message : String(error),
      };
      this.emit('run:failed', this.getLastRun());
      throw error;
    }
  }

  private async startInternal(): Promise<void> {
    await this.refreshRuntimeConfig();
    const descriptor = this.buildDescriptor();
    if (!existsSync(descriptor.sidecarPath)) {
      const error = new Error(`Claude code sidecar script not found at ${descriptor.sidecarPath}`);
      this.setStatus({ state: 'error', lastError: error.message, ...descriptor });
      throw error;
    }

    this.stdoutBuffer = '';
    const env = {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      CLAWX_CODE_AGENT_VENDOR_PATH: descriptor.vendorPath,
      CLAWX_CODE_AGENT_ID: randomUUID(),
    };

    this.setStatus({ state: 'starting', lastError: undefined, ...descriptor });

    const child = spawn(process.execPath, [descriptor.sidecarPath, `--vendor-path=${descriptor.vendorPath}`], {
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
      cwd: app.getAppPath(),
    });
    this.process = child;

    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      this.handleStdoutChunk(chunk);
    });

    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk: string) => {
      const text = chunk.trim();
      if (!text) return;
      logger.warn(`[code-agent sidecar stderr] ${text}`);
      this.emit('stderr', text);
    });

    child.on('error', (error) => {
      logger.error('[code-agent] Sidecar process error:', error);
      this.rejectAllPending(error);
      this.rejectReady(error);
      this.setStatus({ state: 'error', lastError: error.message, ...this.buildDescriptor() });
      this.emit('error', error);
    });

    child.on('exit', (code, signal) => {
      const message = code !== null
        ? `Claude code sidecar exited with code ${code}`
        : `Claude code sidecar exited due to signal ${signal ?? 'unknown'}`;
      this.process = null;
      this.rejectAllPending(new Error(message));
      this.rejectReady(new Error(message));
      this.setStatus({
        state: this.status.state === 'error' ? 'error' : 'stopped',
        lastError: this.status.state === 'error' ? this.status.lastError : undefined,
        ...this.buildDescriptor(),
      });
      this.emit('exit', { code, signal });
    });

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.readyWaiter = null;
        reject(new Error('Timed out waiting for Claude code sidecar to become ready'));
      }, 10_000);
      this.readyWaiter = {
        resolve: () => {
          clearTimeout(timer);
          this.readyWaiter = null;
          resolve();
        },
        reject: (error) => {
          clearTimeout(timer);
          this.readyWaiter = null;
          reject(error);
        },
        timer,
      };
    });
  }

  private buildDescriptor(): CodeAgentDescriptor {
    const sidecarPath = app.isPackaged
      ? join(process.resourcesPath, 'resources', 'code-agent', 'claude-sidecar.mjs')
      : join(app.getAppPath(), 'resources', 'code-agent', 'claude-sidecar.mjs');
    const vendorPath = process.env.CLAWX_CODE_AGENT_VENDOR_PATH?.trim()
      || (app.isPackaged
        ? join(process.resourcesPath, 'vendor', 'claude-code')
        : join(app.getAppPath(), 'vendor', 'claude-code'));
    return {
      adapter: 'emma-alpha-claude-code',
      runtime: 'node',
      sidecarPath,
      vendorPath,
      vendorPresent: existsSync(vendorPath),
      bunAvailable: this.detectBunAvailable(),
      executionMode: this.runtimeConfig.executionMode,
      cliPath: this.runtimeConfig.cliPath,
    };
  }

  private async refreshRuntimeConfig(override?: Partial<CodeAgentRuntimeConfig>): Promise<void> {
    const settings = await getAllSettings();
    const nextRuntimeConfig: CodeAgentRuntimeConfig = {
      ...DEFAULT_CODE_AGENT_RUNTIME_CONFIG,
      ...(settings.codeAgent ?? {}),
      ...(override ?? {}),
      allowedTools: override?.allowedTools
        ?? settings.codeAgent?.allowedTools
        ?? DEFAULT_CODE_AGENT_RUNTIME_CONFIG.allowedTools,
    };
    this.runtimeConfigResolution = {
      configSource: 'settings',
      inheritedApiKey: false,
    };

    const claudeUserSettings = await readClaudeUserSettingsRuntimeConfig();
    let inheritedFromClaudeUserSettings = false;

    if (!nextRuntimeConfig.model && claudeUserSettings.model) {
      nextRuntimeConfig.model = claudeUserSettings.model;
      inheritedFromClaudeUserSettings = true;
    }
    if (!nextRuntimeConfig.baseUrl && claudeUserSettings.baseUrl) {
      nextRuntimeConfig.baseUrl = claudeUserSettings.baseUrl;
      inheritedFromClaudeUserSettings = true;
    }
    if (!nextRuntimeConfig.apiKey && claudeUserSettings.apiKey) {
      nextRuntimeConfig.apiKey = claudeUserSettings.apiKey;
      inheritedFromClaudeUserSettings = true;
    }
    if (nextRuntimeConfig.permissionMode === 'default' && claudeUserSettings.permissionMode) {
      nextRuntimeConfig.permissionMode = claudeUserSettings.permissionMode;
      inheritedFromClaudeUserSettings = true;
    }

    if (inheritedFromClaudeUserSettings) {
      this.runtimeConfigResolution.configSource = 'claude_settings';
    }

    const needsProviderMapping = (
      !nextRuntimeConfig.model
      || !nextRuntimeConfig.baseUrl
      || !nextRuntimeConfig.apiKey
    );

    if (needsProviderMapping) {
      const providerService = getProviderService();
      const defaultAccountId = await providerService.getDefaultAccountId();
      if (defaultAccountId) {
        const account = await providerService.getAccount(defaultAccountId);
        const isClaudeCompatible = Boolean(
          account
          && account.enabled
          && (
            account.vendorId === 'anthropic'
            || account.apiProtocol === 'anthropic-messages'
          ),
        );

        if (account && isClaudeCompatible) {
          if (!nextRuntimeConfig.model && account.model) {
            nextRuntimeConfig.model = account.model;
          }
          if (!nextRuntimeConfig.baseUrl && account.baseUrl) {
            nextRuntimeConfig.baseUrl = account.baseUrl;
          }
          if (!nextRuntimeConfig.apiKey) {
            const inheritedApiKey = await getApiKey(account.id);
            if (inheritedApiKey) {
              nextRuntimeConfig.apiKey = inheritedApiKey;
              this.runtimeConfigResolution.inheritedApiKey = true;
            }
          }

          if (
            this.runtimeConfigResolution.configSource === 'settings'
            && (
              this.runtimeConfigResolution.inheritedApiKey
              || (!override?.model && !settings.codeAgent?.model && account.model)
              || (!override?.baseUrl && !settings.codeAgent?.baseUrl && account.baseUrl)
            )
          ) {
            this.runtimeConfigResolution = {
              configSource: 'default_provider',
              configSourceAccountId: account.id,
              configSourceLabel: account.label,
              inheritedApiKey: this.runtimeConfigResolution.inheritedApiKey,
            };
          }
        }
      }
    }

    this.runtimeConfig = nextRuntimeConfig;
  }

  private detectBunAvailable(): boolean {
    const configuredPath = process.env.CLAWX_CODE_AGENT_BUN_PATH?.trim();
    if (configuredPath) {
      return existsSync(configuredPath);
    }
    try {
      return spawnSync('bun', ['--version'], { stdio: 'ignore' }).status === 0;
    } catch {
      return false;
    }
  }

  private setStatus(next: Partial<CodeAgentStatus> & Pick<CodeAgentStatus, 'state'>): void {
    this.status = {
      ...this.status,
      ...this.buildDescriptor(),
      ...next,
    };
    this.emit('status', this.getStatus());
  }

  private handleStdoutChunk(chunk: string): void {
    this.stdoutBuffer += chunk;
    while (true) {
      const newlineIndex = this.stdoutBuffer.indexOf('\n');
      if (newlineIndex === -1) break;
      const line = this.stdoutBuffer.slice(0, newlineIndex).trim();
      this.stdoutBuffer = this.stdoutBuffer.slice(newlineIndex + 1);
      if (!line) continue;
      this.handleStdoutLine(line);
    }
  }

  private handleStdoutLine(line: string): void {
    let message: SidecarMessage;
    try {
      message = JSON.parse(line) as SidecarMessage;
    } catch (error) {
      logger.warn('[code-agent] Failed to parse sidecar message:', error);
      logger.warn(`[code-agent] Raw sidecar line: ${line}`);
      return;
    }

    if (message.type === 'ready') {
      this.setStatus({
        state: 'running',
        startedAt: Date.now(),
        lastError: undefined,
      });
      this.emit('ready', message.payload);
      this.readyWaiter?.resolve();
      return;
    }

    if (message.type === 'event') {
      this.emit(message.event, message.payload);
      return;
    }

    const pending = this.pendingRequests.get(message.id);
    if (!pending) {
      logger.warn(`[code-agent] Received response for unknown request id=${message.id}`);
      return;
    }
    clearTimeout(pending.timer);
    this.pendingRequests.delete(message.id);
    if (message.ok) {
      pending.resolve(message.result);
      return;
    }
    pending.reject(new Error(message.error?.message || 'Unknown sidecar error'));
  }

  private rejectReady(error: Error): void {
    if (!this.readyWaiter) return;
    clearTimeout(this.readyWaiter.timer);
    const waiter = this.readyWaiter;
    this.readyWaiter = null;
    waiter.reject(error);
  }

  private rejectAllPending(error: Error): void {
    for (const pending of this.pendingRequests.values()) {
      clearTimeout(pending.timer);
      pending.reject(error);
    }
    this.pendingRequests.clear();
  }

  private async sendRequest<T>(method: string, params?: unknown, timeoutMs = 30_000): Promise<T> {
    const child = this.process;
    if (!child || !child.stdin.writable) {
      throw new Error('Claude code sidecar is not available');
    }

    const id = randomUUID();
    const serialized = `${JSON.stringify({ id, method, params })}\n`;

    return await new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Code agent request timed out for method ${method}`));
      }, timeoutMs);

      this.pendingRequests.set(id, {
        resolve: (value) => resolve(value as T),
        reject,
        timer,
      });

      child.stdin.write(serialized, (error) => {
        if (!error) return;
        clearTimeout(timer);
        this.pendingRequests.delete(id);
        reject(error);
      });
    });
  }

  private buildRequestRecord(input: CodeAgentRunRequest): CodeAgentRunRecord['request'] {
    return {
      workspaceRoot: input.workspaceRoot,
      prompt: input.prompt,
      sessionId: input.sessionId,
      allowedTools: input.allowedTools,
      metadata: input.metadata,
      timeoutMs: input.timeoutMs,
      configOverride: input.configOverride,
    };
  }
}
