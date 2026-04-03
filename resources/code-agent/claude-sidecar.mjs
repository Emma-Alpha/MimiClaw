import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { join, resolve } from 'node:path';
import { buildExecutionHealth, runSnapshotAnalysis, normalizeRuntimeConfig } from './claude-snapshot-adapter.mjs';

const vendorPath = resolve(
  process.argv.find((arg) => arg.startsWith('--vendor-path='))?.slice('--vendor-path='.length)
    || process.env.CLAWX_CODE_AGENT_VENDOR_PATH
    || join(process.cwd(), 'vendor', 'claude-code'),
);
const protocolVersion = 1;

function hasBun() {
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

function buildDescriptor(config = undefined) {
  const runtimeConfig = normalizeRuntimeConfig(config);
  return {
    adapter: 'emma-alpha-claude-code',
    runtime: 'node',
    sidecarPath: process.argv[1] || '',
    vendorPath,
    vendorPresent: existsSync(vendorPath),
    bunAvailable: hasBun(),
    executionMode: runtimeConfig.executionMode,
    cliPath: runtimeConfig.cliPath,
  };
}

function buildHealth(config) {
  const descriptor = buildDescriptor(config);
  const executionHealth = buildExecutionHealth({
    vendorPath,
    bunAvailable: descriptor.bunAvailable,
    config,
  });
  return {
    ok: executionHealth.runnable,
    protocolVersion,
    snapshotEntryPath: join(vendorPath, 'src', 'main.tsx'),
    runnable: executionHealth.runnable,
    diagnostics: executionHealth.diagnostics,
    manifestPaths: executionHealth.manifestPaths,
    entryPoints: executionHealth.entryPoints,
    externalImportsSample: executionHealth.externalImportsSample,
    cliFound: executionHealth.cliFound,
    cliVersion: executionHealth.cliVersion,
    configuredModel: executionHealth.configuredModel,
    configuredBaseUrl: executionHealth.configuredBaseUrl,
    configuredPermissionMode: executionHealth.configuredPermissionMode,
    ...descriptor,
  };
}

function send(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

async function handleRequest(method, params) {
  if (method === 'health') {
    return buildHealth(params?.config);
  }

  if (method === 'run.start') {
    const workspaceRoot = typeof params?.workspaceRoot === 'string' ? params.workspaceRoot : '';
    const prompt = typeof params?.prompt === 'string' ? params.prompt : '';
    if (!workspaceRoot || !prompt) {
      throw new Error('run.start requires both workspaceRoot and prompt');
    }

    const descriptor = buildDescriptor(params?.config);
    const analysis = await runSnapshotAnalysis({
      vendorPath: descriptor.vendorPath,
      workspaceRoot,
      prompt,
      bunAvailable: descriptor.bunAvailable,
      config: params?.config,
      sessionId: typeof params?.sessionId === 'string' ? params.sessionId : '',
      allowedTools: Array.isArray(params?.allowedTools) ? params.allowedTools : [],
      timeoutMs: typeof params?.timeoutMs === 'number' ? params.timeoutMs : 120_000,
      onEvent: (payload) => {
        send({
          type: 'event',
          event: 'code-agent:trace',
          payload,
        });
        // Forward text deltas as a dedicated streaming token event so the renderer
        // can display incremental output without waiting for the full result.
        if (payload && payload.step === 'run:text-delta' && typeof payload.text === 'string' && payload.text) {
          send({
            type: 'event',
            event: 'code-agent:token',
            payload: { text: payload.text },
          });
        }
        // Forward tool-use activity events so the renderer can render a Claude Code-style feed.
        if (payload && payload.step === 'run:tool-activity' && typeof payload.toolName === 'string') {
          send({
            type: 'event',
            event: 'code-agent:activity',
            payload: {
              toolId: payload.toolId || '',
              toolName: payload.toolName,
              inputSummary: typeof payload.inputSummary === 'string' ? payload.inputSummary : '',
            },
          });
        }
      },
    });

    return {
      ...analysis,
      runId: analysis.runId || randomUUID(),
      metadata: {
        promptPreview: prompt.slice(0, 240),
        vendorPresent: descriptor.vendorPresent,
        workspaceRoot,
        ...(analysis.metadata || {}),
      },
    };
  }

  throw new Error(`Unknown sidecar method: ${method}`);
}

const rl = createInterface({
  input: process.stdin,
  crlfDelay: Infinity,
});

rl.on('line', async (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;

  let message;
  try {
    message = JSON.parse(trimmed);
  } catch (error) {
    send({
      type: 'event',
      event: 'sidecar:warning',
      payload: { message: `Invalid JSON input: ${String(error)}` },
    });
    return;
  }

  const id = typeof message.id === 'string' ? message.id : randomUUID();
  try {
    const result = await handleRequest(message.method, message.params);
    send({ type: 'response', id, ok: true, result });
  } catch (error) {
    send({
      type: 'response',
      id,
      ok: false,
      error: {
        message: error instanceof Error ? error.message : String(error),
      },
    });
  }
});

process.on('SIGTERM', () => {
  process.exit(0);
});

process.on('SIGINT', () => {
  process.exit(0);
});

send({
  type: 'ready',
  payload: buildHealth(undefined),
});
