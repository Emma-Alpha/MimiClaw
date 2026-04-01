import { hostApiFetch } from './host-api';

export interface HostJizhiSession {
  id: string;
  name: string;
  updatedAt?: number;
  createdAt?: number;
  lastMessageCreatedAt?: number;
  model?: string;
  category?: string;
  isCollect: boolean;
  isTop: boolean;
  projectId?: number;
}

export interface HostJizhiMessageContentItem {
  blockUUID: string;
  parentMessageUUID: string;
  contentType: string;
  content: string;
}

export interface HostJizhiMessageContent {
  items: HostJizhiMessageContentItem[];
}

export interface HostJizhiAssistantMessageItem {
  content: HostJizhiMessageContent;
  createdAt: string;
  creatorId: number;
  creatorName: string;
  env: string;
  errorMessage: string;
  errorTitle?: string;
  errorType?: string;
  errorData?: unknown;
  id: number;
  isActive: boolean;
  messageUUID: string;
  model: string;
  modelName: string;
  status: string;
  updatedAt: string;
  icon_bucket_path?: string;
}

export interface HostJizhiGroupMessages {
  answerGroup: string;
  messages: HostJizhiAssistantMessageItem[];
}

export interface HostJizhiAssistantMessage {
  chatId: number;
  parentMessageId: number;
  groupMessages: HostJizhiGroupMessages[];
}

export interface HostJizhiUserMessage {
  chatId: number;
  content: HostJizhiMessageContent;
  createdAt: string;
  creatorId: number;
  creatorName: string;
  env: string;
  errorMessage: string;
  id: number;
  messageUUID: string;
  status: string;
  updatedAt: string;
}

export interface HostJizhiChatMessage {
  assistantMessage?: HostJizhiAssistantMessage;
  role: 'assistant' | 'user' | 'system';
  userMessage?: HostJizhiUserMessage;
  index: string;
}

function trace(step: string, payload?: Record<string, unknown>): void {
  console.info('[jizhi-trace][renderer]', step, payload ?? {});
}

export async function fetchHostJizhiSessions(): Promise<HostJizhiSession[]> {
  trace('fetch sessions:start');
  const response = await hostApiFetch<{ sessions: HostJizhiSession[] }>('/api/jizhi/sessions');
  const sessions = response.sessions ?? [];
  trace('fetch sessions:success', { count: sessions.length });
  return sessions;
}

export async function fetchHostJizhiMessages(sessionId: string): Promise<HostJizhiChatMessage[]> {
  trace('fetch messages:start', { sessionId });
  const response = await hostApiFetch<{ messages: HostJizhiChatMessage[] }>('/api/jizhi/messages', {
    method: 'POST',
    body: JSON.stringify({ sessionId }),
  });
  const messages = response.messages ?? [];
  trace('fetch messages:success', {
    sessionId,
    count: messages.length,
  });
  return messages;
}
