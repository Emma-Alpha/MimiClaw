import type {
  CodeAgentHealth,
  CodeAgentSessionMessage,
  CodeAgentSessionHistoryResult,
  CodeAgentSessionSummary,
  CodeAgentRunRequest,
  CodeAgentRunRecord,
  CodeAgentRunResult,
  CodeAgentStatus,
} from '../../shared/code-agent';
import { hostApiFetch } from './host-api';

export const CODE_AGENT_WORKSPACE_ROOT_STORAGE_KEY = 'mimiclaw:code-agent-workspace-root';

export function readStoredCodeAgentWorkspaceRoot(): string {
  try {
    return window.localStorage.getItem(CODE_AGENT_WORKSPACE_ROOT_STORAGE_KEY)?.trim() ?? '';
  } catch {
    return '';
  }
}

export function writeStoredCodeAgentWorkspaceRoot(value: string): void {
  try {
    if (value) {
      window.localStorage.setItem(CODE_AGENT_WORKSPACE_ROOT_STORAGE_KEY, value);
    } else {
      window.localStorage.removeItem(CODE_AGENT_WORKSPACE_ROOT_STORAGE_KEY);
    }
  } catch {
    // ignore localStorage write failures
  }
}

export function inferCodeAgentWorkspaceRoot(candidate: string | null | undefined): string {
  if (!candidate) return '';
  const trimmed = candidate.trim();
  if (!trimmed) return '';
  const withoutVendor = trimmed.replace(/[\\/]vendor[\\/]claude-code$/, '');
  return withoutVendor || trimmed;
}

let _cachedDefaultWorkspaceRoot: string | null = null;

export async function fetchDefaultWorkspaceRoot(): Promise<string> {
  if (_cachedDefaultWorkspaceRoot) return _cachedDefaultWorkspaceRoot;
  const response = await hostApiFetch<{ success: boolean; workspaceRoot: string }>(
    '/api/code-agent/default-workspace',
  );
  const root = response.workspaceRoot?.trim() || '';
  if (root) _cachedDefaultWorkspaceRoot = root;
  return root;
}

export function getCachedDefaultWorkspaceRoot(): string {
  return _cachedDefaultWorkspaceRoot || '';
}

export async function fetchCodeAgentStatus(): Promise<CodeAgentStatus> {
  return await hostApiFetch<CodeAgentStatus>('/api/code-agent/status');
}

export async function fetchCodeAgentHealth(): Promise<CodeAgentHealth> {
  return await hostApiFetch<CodeAgentHealth>('/api/code-agent/health');
}

export async function startCodeAgent(): Promise<{ success: boolean; status: CodeAgentStatus }> {
  return await hostApiFetch<{ success: boolean; status: CodeAgentStatus }>('/api/code-agent/start', {
    method: 'POST',
  });
}

export async function stopCodeAgent(): Promise<{ success: boolean; status: CodeAgentStatus }> {
  return await hostApiFetch<{ success: boolean; status: CodeAgentStatus }>('/api/code-agent/stop', {
    method: 'POST',
  });
}

export async function restartCodeAgent(): Promise<{ success: boolean; status: CodeAgentStatus }> {
  return await hostApiFetch<{ success: boolean; status: CodeAgentStatus }>('/api/code-agent/restart', {
    method: 'POST',
  });
}

export interface CodeAgentModelInfo {
  id: string;
  name: string;
}

export async function fetchCodeAgentModels(baseUrl: string, apiKey: string): Promise<CodeAgentModelInfo[]> {
  const response = await hostApiFetch<{
    success: boolean;
    models?: CodeAgentModelInfo[];
    error?: string;
  }>('/api/code-agent/models', {
    method: 'POST',
    body: JSON.stringify({ baseUrl, apiKey }),
  });
  if (!response.success) {
    throw new Error(response.error || 'Failed to fetch models');
  }
  return response.models ?? [];
}

export async function runCodeAgentTask(input: CodeAgentRunRequest): Promise<CodeAgentRunResult> {
  const response = await hostApiFetch<{ success: boolean; result: CodeAgentRunResult; error?: string }>('/api/code-agent/runs', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  if (!response.success || !response.result) {
    throw new Error(response.error || 'Code agent task failed without result');
  }
  if (response.result.status === 'failed') {
    throw new Error(response.result.output || response.result.summary || 'Code agent task failed');
  }
  return response.result;
}

export async function cancelCodeAgentRun(): Promise<{
  cancelled: boolean;
  result?: CodeAgentRunResult;
}> {
  const response = await hostApiFetch<{
    success: boolean;
    cancelled: boolean;
    result?: CodeAgentRunResult;
    error?: string;
  }>('/api/code-agent/runs/cancel', {
    method: 'POST',
  });

  if (!response.success) {
    throw new Error(response.error || 'Failed to cancel code agent run');
  }

  return {
    cancelled: response.cancelled === true,
    result: response.result,
  };
}

export async function fetchLatestCodeAgentRun(): Promise<CodeAgentRunRecord | null> {
  const response = await hostApiFetch<{ success: boolean; run: CodeAgentRunRecord | null }>('/api/code-agent/runs/latest');
  return response.run;
}

export async function fetchCodeAgentSessions(
  workspaceRoot: string,
  limit = 30,
): Promise<CodeAgentSessionSummary[]> {
  const params = new URLSearchParams({
    workspaceRoot,
    limit: String(limit),
  });
  const response = await hostApiFetch<{ success: boolean; sessions: CodeAgentSessionSummary[] }>(
    `/api/code-agent/sessions?${params.toString()}`,
  );
  return Array.isArray(response.sessions) ? response.sessions : [];
}

export type ProjectMentionEntry = {
  absolutePath: string;
  relativePath: string;
  name: string;
  isDirectory: boolean;
};

export type WorkspaceAvailability = {
  available: boolean;
  reason?: string;
};

export async function fetchCodeAgentSessionHistory(
  workspaceRoot: string,
  sessionId: string,
  limit = 120,
): Promise<CodeAgentSessionHistoryResult> {
  const params = new URLSearchParams({
    workspaceRoot,
    sessionId,
    limit: String(limit),
  });
  const response = await hostApiFetch<{
    success: boolean;
    messages: CodeAgentSessionMessage[];
    rawSdkMessages?: Record<string, unknown>[];
  }>(
    `/api/code-agent/session-history?${params.toString()}`,
  );
  return {
    messages: Array.isArray(response.messages) ? response.messages : [],
    rawSdkMessages: Array.isArray(response.rawSdkMessages) ? response.rawSdkMessages : [],
  };
}

export type ClaudeCodeSkillEntry = {
  name: string;
  command: string;
  description: string;
  icon?: string;
  scope: 'global' | 'project';
  source: 'claude' | 'external';
  skillContent: string;
  requiresSkills?: string[];
};

export type ClaudeCodeSkillsResult = {
  global: ClaudeCodeSkillEntry[];
  project: ClaudeCodeSkillEntry[];
};

export async function fetchClaudeCodeSkills(
  workspaceRoot: string,
): Promise<ClaudeCodeSkillsResult> {
  const params = new URLSearchParams({ workspaceRoot });
  const response = await hostApiFetch<{
    success: boolean;
    skills: ClaudeCodeSkillsResult;
  }>(`/api/code-agent/skills?${params.toString()}`);
  return response.skills ?? { global: [], project: [] };
}

export async function fetchProjectMentionEntries(
  workspaceRoot: string,
  query?: string,
): Promise<ProjectMentionEntry[]> {
  const params = new URLSearchParams({ workspaceRoot });
  if (query) {
    params.set('query', query);
  }
  const response = await hostApiFetch<{
    success: boolean;
    entries: ProjectMentionEntry[];
  }>(`/api/files/project-mentions?${params.toString()}`);
  return Array.isArray(response.entries) ? response.entries : [];
}

/**
 * Browse direct children of a specific directory within the workspace.
 * Used for Cursor-like "@" directory browsing (e.g. `@src/` lists contents of `src/`).
 */
export async function fetchDirectoryChildren(
  workspaceRoot: string,
  dirRelativePath: string,
): Promise<ProjectMentionEntry[]> {
  const params = new URLSearchParams({ workspaceRoot, mode: 'browse', dir: dirRelativePath });
  const response = await hostApiFetch<{
    success: boolean;
    entries: ProjectMentionEntry[];
  }>(`/api/files/project-mentions?${params.toString()}`);
  return Array.isArray(response.entries) ? response.entries : [];
}

export async function fetchFileTextContent(
  absolutePath: string,
): Promise<{ content: string; truncated: boolean }> {
  const params = new URLSearchParams({ path: absolutePath });
  return hostApiFetch<{ content: string; truncated: boolean }>(
    `/api/files/read-text?${params.toString()}`,
  );
}

export async function fetchWorkspaceAvailability(
  workspaceRoot: string,
): Promise<WorkspaceAvailability> {
  const params = new URLSearchParams({ workspaceRoot });
  const response = await hostApiFetch<{
    success: boolean;
    available: boolean;
    reason?: string;
  }>(`/api/files/workspace-status?${params.toString()}`);
  return {
    available: response.available === true,
    reason: typeof response.reason === 'string' ? response.reason : undefined,
  };
}

export async function fetchWorkspaceGitBranch(
  workspaceRoot: string,
): Promise<{ branch: string; branches: string[] }> {
  const params = new URLSearchParams({ workspaceRoot });
  const response = await hostApiFetch<{
    success: boolean;
    branch: string;
    branches: string[];
  }>(`/api/files/git-branch?${params.toString()}`);
  return {
    branch: typeof response.branch === 'string' ? response.branch : '',
    branches: Array.isArray(response.branches) ? response.branches : [],
  };
}
