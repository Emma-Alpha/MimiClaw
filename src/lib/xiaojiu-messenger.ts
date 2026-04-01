import { hostApiFetch } from './host-api';

function traceXiaojiu(step: string, payload?: Record<string, unknown>): void {
  console.info('[xiaojiu-trace][renderer]', step, payload ?? {});
}

export interface HostXiaojiuSession {
  id: string;
  name: string;
  avatar?: string;
  unreadCount: number;
  draftText?: string;
  updatedAt?: number;
  sortIndex: number;
  lastMsgId?: string | null;
}

export interface HostXiaojiuAttachment {
  type: 'image' | 'video' | 'audio' | 'file';
  url?: string;
  name?: string;
  mimeType?: string;
}

export interface HostXiaojiuMessage {
  id: string;
  sessionId: string;
  senderId?: string;
  senderName: string;
  senderAvatar?: string;
  isSelf: boolean;
  type?: string;
  text?: string;
  timestamp?: number;
  attachments: HostXiaojiuAttachment[];
  raw: Record<string, unknown>;
}

export interface HostXiaojiuMessagePage {
  messages: HostXiaojiuMessage[];
  hasMore: boolean;
  oldestMessageId: string | null;
}

export async function fetchHostXiaojiuSessions(): Promise<HostXiaojiuSession[]> {
  traceXiaojiu('fetch sessions:start');
  const response = await hostApiFetch<{ sessions: HostXiaojiuSession[] }>('/api/xiaojiu/sessions');
  const sessions = response.sessions ?? [];
  traceXiaojiu('fetch sessions:success', {
    count: sessions.length,
    ids: sessions.slice(0, 5).map((session) => session.id),
  });
  return sessions;
}

export async function fetchHostXiaojiuLatestMessages(
  sessionId: string,
  pageSize = 20,
  latestMsgId?: string | null,
): Promise<HostXiaojiuMessagePage> {
  traceXiaojiu('fetch latest messages:start', { sessionId, pageSize, latestMsgId: latestMsgId ?? null });
  const result = await hostApiFetch<HostXiaojiuMessagePage>('/api/xiaojiu/messages', {
    method: 'POST',
    body: JSON.stringify({ sessionId, pageSize, latestMsgId: latestMsgId ?? undefined }),
  });
  traceXiaojiu('fetch latest messages:success', {
    sessionId,
    pageSize,
    count: result.messages.length,
    hasMore: result.hasMore,
    oldestMessageId: result.oldestMessageId,
    newestMessageId: result.messages[result.messages.length - 1]?.id ?? null,
  });
  return result;
}

export async function fetchHostXiaojiuOlderMessages(
  sessionId: string,
  anchorMsgId: string | null,
  pageSize = 20,
): Promise<HostXiaojiuMessagePage> {
  traceXiaojiu('fetch older messages:start', { sessionId, anchorMsgId, pageSize });
  const result = await hostApiFetch<HostXiaojiuMessagePage>('/api/xiaojiu/messages/load-more', {
    method: 'POST',
    body: JSON.stringify({ sessionId, anchorMsgId, pageSize }),
  });
  traceXiaojiu('fetch older messages:success', {
    sessionId,
    anchorMsgId,
    pageSize,
    count: result.messages.length,
    hasMore: result.hasMore,
    oldestMessageId: result.oldestMessageId,
  });
  return result;
}
