export type CodeAgentAdapterKind = 'emma-alpha-claude-code';
export type CodeAgentRuntimeKind = 'node' | 'bun' | 'unknown';
export type CodeAgentLifecycleState = 'stopped' | 'starting' | 'running' | 'error';
export type CodeAgentRunStatus = 'completed' | 'failed' | 'not_implemented' | 'analysis_only' | 'cancelled';
export type CodeAgentExecutionMode = 'cli' | 'snapshot';
export type CodeAgentPermissionMode = 'acceptEdits' | 'bypassPermissions' | 'default' | 'dontAsk' | 'plan' | 'auto';

export interface CodeAgentRuntimeConfig {
  executionMode: CodeAgentExecutionMode;
  cliPath: string;
  model: string;
  fallbackModel: string;
  baseUrl: string;
  apiKey: string;
  permissionMode: CodeAgentPermissionMode;
  allowedTools: string[];
  appendSystemPrompt: string;
}

export const DEFAULT_CODE_AGENT_RUNTIME_CONFIG: CodeAgentRuntimeConfig = {
  executionMode: 'cli',
  cliPath: 'claude',
  model: '',
  fallbackModel: '',
  baseUrl: '',
  apiKey: '',
  permissionMode: 'default',
  allowedTools: [],
  appendSystemPrompt: '',
};

export interface CodeAgentDescriptor {
  adapter: CodeAgentAdapterKind;
  runtime: CodeAgentRuntimeKind;
  sidecarPath: string;
  vendorPath: string;
  vendorPresent: boolean;
  bunAvailable: boolean;
  executionMode?: CodeAgentExecutionMode;
  cliPath?: string;
}

export interface CodeAgentStatus extends CodeAgentDescriptor {
  state: CodeAgentLifecycleState;
  pid?: number;
  startedAt?: number;
  lastError?: string;
}

export interface CodeAgentHealth extends CodeAgentDescriptor {
  ok: boolean;
  uptime?: number;
  error?: string;
  protocolVersion: number;
  snapshotEntryPath: string;
  runnable?: boolean;
  diagnostics?: string[];
  manifestPaths?: string[];
  entryPoints?: string[];
  externalImportsSample?: string[];
  cliFound?: boolean;
  cliVersion?: string;
  configuredModel?: string;
  configuredBaseUrl?: string;
  configuredPermissionMode?: CodeAgentPermissionMode;
  configSource?: 'settings' | 'claude_settings' | 'default_provider';
  configSourceAccountId?: string;
  configSourceLabel?: string;
  inheritedApiKey?: boolean;
}

export interface CodeAgentRunRequest {
  workspaceRoot: string;
  prompt: string;
  sessionId?: string;
  allowedTools?: string[];
  metadata?: Record<string, unknown>;
  timeoutMs?: number;
  configOverride?: Partial<CodeAgentRuntimeConfig>;
}

export interface CodeAgentRunResult {
  runId: string;
  status: CodeAgentRunStatus;
  output: string;
  summary?: string;
  diagnostics?: string[];
  metadata?: Record<string, unknown>;
}

export interface CodeAgentRunRecord {
  startedAt: number;
  completedAt?: number;
  request: Pick<CodeAgentRunRequest, 'workspaceRoot' | 'prompt' | 'sessionId' | 'allowedTools' | 'metadata' | 'timeoutMs' | 'configOverride'>;
  result?: CodeAgentRunResult;
  error?: string;
}
