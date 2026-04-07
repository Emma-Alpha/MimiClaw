import type {
  CodeAgentHealth,
  CodeAgentSessionMessage,
  CodeAgentSessionSummary,
  CodeAgentRunRequest,
  CodeAgentRunRecord,
  CodeAgentRunResult,
  CodeAgentStatus,
} from '../../shared/code-agent';
import { hostApiFetch } from './host-api';

export const CODE_AGENT_WORKSPACE_ROOT_STORAGE_KEY = 'clawx:code-agent-workspace-root';

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

export async function runCodeAgentTask(input: CodeAgentRunRequest): Promise<CodeAgentRunResult> {
  const response = await hostApiFetch<{ success: boolean; result: CodeAgentRunResult }>('/api/code-agent/runs', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return response.result;
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

export async function fetchCodeAgentSessionHistory(
  workspaceRoot: string,
  sessionId: string,
  limit = 120,
): Promise<CodeAgentSessionMessage[]> {
  const params = new URLSearchParams({
    workspaceRoot,
    sessionId,
    limit: String(limit),
  });
  const response = await hostApiFetch<{ success: boolean; messages: CodeAgentSessionMessage[] }>(
    `/api/code-agent/session-history?${params.toString()}`,
  );
  return Array.isArray(response.messages) ? response.messages : [];
}
