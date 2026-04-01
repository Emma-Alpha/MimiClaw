import { hostApiFetch } from '@/lib/host-api';
import type {
  VoiceChatConfigState,
  VoiceChatHistoryMessage,
  VoiceChatSessionSummary,
} from '../../shared/voice-chat';

export async function fetchVoiceChatConfig(): Promise<VoiceChatConfigState> {
  return await hostApiFetch<VoiceChatConfigState>('/api/voice-chat/config');
}

export async function saveVoiceChatConfig(input: {
  accessKey?: string;
  appId?: string;
  endpoint?: string;
  clearAccessKey?: boolean;
}): Promise<VoiceChatConfigState> {
  return await hostApiFetch<VoiceChatConfigState>('/api/voice-chat/config', {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export async function fetchVoiceChatSessions(): Promise<VoiceChatSessionSummary[]> {
  const result = await hostApiFetch<{ sessions: VoiceChatSessionSummary[] }>('/api/voice-chat/sessions');
  return result.sessions ?? [];
}

export async function fetchVoiceChatMessages(sessionId: string): Promise<VoiceChatHistoryMessage[]> {
  const params = new URLSearchParams({ sessionId });
  const result = await hostApiFetch<{ messages: VoiceChatHistoryMessage[] }>(`/api/voice-chat/messages?${params.toString()}`);
  return result.messages ?? [];
}

export async function appendVoiceChatMessage(input: {
  sessionId: string;
  groupId: string;
  role: 'user' | 'assistant';
  text: string;
  interrupted?: boolean;
  createdAt?: number;
}): Promise<VoiceChatHistoryMessage> {
  const result = await hostApiFetch<{ message: VoiceChatHistoryMessage }>('/api/voice-chat/messages', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return result.message;
}

export async function finalizeVoiceChatSession(input: {
  sessionId: string;
  status?: 'active' | 'completed' | 'failed';
  endedAt?: number;
}): Promise<void> {
  await hostApiFetch<{ success: boolean }>('/api/voice-chat/session/finalize', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
