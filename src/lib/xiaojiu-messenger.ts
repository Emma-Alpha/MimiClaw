import { hostApiFetch } from './host-api';

export interface HostXiaojiuSession {
  id: string;
  name: string;
  avatar?: string;
  unreadCount: number;
  draftText?: string;
  updatedAt?: number;
  sortIndex: number;
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
  const response = await hostApiFetch<{ sessions: HostXiaojiuSession[] }>('/api/xiaojiu/sessions');
  return response.sessions ?? [];
}

export async function fetchHostXiaojiuLatestMessages(
  sessionId: string,
  pageSize = 20,
): Promise<HostXiaojiuMessagePage> {
  return hostApiFetch<HostXiaojiuMessagePage>('/api/xiaojiu/messages', {
    method: 'POST',
    body: JSON.stringify({ sessionId, pageSize }),
  });
}

export async function fetchHostXiaojiuOlderMessages(
  sessionId: string,
  anchorMsgId: string | null,
  pageSize = 20,
): Promise<HostXiaojiuMessagePage> {
  return hostApiFetch<HostXiaojiuMessagePage>('/api/xiaojiu/messages/load-more', {
    method: 'POST',
    body: JSON.stringify({ sessionId, anchorMsgId, pageSize }),
  });
}
