import type {
  CodeAgentHealth,
  CodeAgentRunRequest,
  CodeAgentRunRecord,
  CodeAgentRunResult,
  CodeAgentStatus,
} from '../../shared/code-agent';
import { hostApiFetch } from './host-api';

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
