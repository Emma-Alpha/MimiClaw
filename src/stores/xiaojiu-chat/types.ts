export interface XiaojiuAttachment {
  type: 'image' | 'video' | 'audio' | 'file';
  url?: string;
  name?: string;
  mimeType?: string;
}

export interface XiaojiuMessage {
  id: string;
  sessionId: string;
  senderId?: string;
  senderName: string;
  senderAvatar?: string;
  isSelf: boolean;
  type?: string;
  text?: string;
  timestamp?: number;
  attachments: XiaojiuAttachment[];
  raw: Record<string, unknown>;
}

export interface XiaojiuMessagePageMeta {
  hasMore: boolean;
  oldestMessageId?: string | null;
}

export interface XiaojiuChatStoreState {
  messagesBySession: Record<string, XiaojiuMessage[]>;
  loadingSessionId: string | null;
  loadingMoreSessionId: string | null;
  refreshNonce: number;
  loadMoreNonceBySession: Record<string, number>;
  syncError: string | null;
  lastSyncedAtBySession: Record<string, number>;
  hasMoreBySession: Record<string, boolean>;
  oldestMessageIdBySession: Record<string, string | null>;
}

export interface XiaojiuChatStoreAction {
  setLoadingSession: (sessionId: string | null) => void;
  setLoadingMoreSession: (sessionId: string | null) => void;
  mergeLatestMessages: (
    sessionId: string,
    messages: XiaojiuMessage[],
    syncedAt: number,
    meta: XiaojiuMessagePageMeta,
  ) => void;
  prependMessages: (
    sessionId: string,
    messages: XiaojiuMessage[],
    syncedAt: number,
    meta: XiaojiuMessagePageMeta,
  ) => void;
  setSyncError: (error: string | null) => void;
  requestRefresh: () => void;
  requestLoadMore: (sessionId: string) => void;
}

export type XiaojiuChatStore = XiaojiuChatStoreState & XiaojiuChatStoreAction;
