export type CodeAgentAdapterKind = 'emma-alpha-claude-code';
export type CodeAgentRuntimeKind = 'node' | 'bun' | 'unknown';
export type CodeAgentLifecycleState = 'stopped' | 'starting' | 'running' | 'error';
export type CodeAgentRunStatus = 'completed' | 'failed' | 'not_implemented' | 'analysis_only' | 'cancelled';
export type CodeAgentExecutionMode = 'cli' | 'snapshot';
export type CodeAgentPermissionMode = 'acceptEdits' | 'bypassPermissions' | 'default' | 'dontAsk' | 'plan' | 'auto';
export type CodeAgentEffortLevel = 'low' | 'medium' | 'high' | 'max' | '';
export type CodeAgentThinkingMode = 'enabled' | 'adaptive' | 'disabled';

export interface CodeAgentRuntimeConfig {
  executionMode: CodeAgentExecutionMode;
  cliPath: string;
  model: string;
  fallbackModel: string;
  effort: CodeAgentEffortLevel;
  thinking: CodeAgentThinkingMode;
  fastMode: boolean;
  baseUrl: string;
  apiKey: string;
  permissionMode: CodeAgentPermissionMode;
  allowedTools: string[];
  appendSystemPrompt: string;
}

export const DEFAULT_CODE_AGENT_RUNTIME_CONFIG: CodeAgentRuntimeConfig = {
  executionMode: 'cli',
  cliPath: '',
  model: '',
  fallbackModel: '',
  effort: '',
  thinking: 'enabled',
  fastMode: false,
  baseUrl: '',
  apiKey: '',
  permissionMode: 'default',
  allowedTools: [],
  appendSystemPrompt: '',
};

export interface CodeAgentPermissionRequest {
  requestId: string;
  toolName: string;
  inputSummary: string;
  rawInput?: Record<string, unknown>;
}

export interface CodeAgentDescriptor {
  adapter: CodeAgentAdapterKind;
  runtime: CodeAgentRuntimeKind;
  sidecarPath: string;
  vendorPath: string;
  vendorPresent: boolean;
  bunAvailable: boolean;
  executionMode?: CodeAgentExecutionMode;
  cliPath?: string;
  /** Isolated config directory used by the bundled Claude CLI (CLAUDE_CONFIG_DIR). */
  configDir?: string;
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

export interface CodeAgentImageAttachment {
  filePath: string;
  mimeType: string;
}

export interface CodeAgentRunRequest {
  workspaceRoot: string;
  prompt: string;
  images?: CodeAgentImageAttachment[];
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
  request: Pick<CodeAgentRunRequest, 'workspaceRoot' | 'prompt' | 'images' | 'sessionId' | 'allowedTools' | 'metadata' | 'timeoutMs' | 'configOverride'>;
  result?: CodeAgentRunResult;
  error?: string;
}

export interface CodeAgentSessionSummary {
  sessionId: string;
  title: string;
  updatedAt: number;
}

export interface CodeAgentSessionMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
}

export interface CodeAgentSessionHistoryResult {
  messages: CodeAgentSessionMessage[];
  /** Raw JSONL rows for rebuilding rich timeline via pushSdkMessage */
  rawSdkMessages: Record<string, unknown>[];
}
