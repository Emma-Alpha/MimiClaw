import { create } from 'zustand';

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

interface XiaojiuMessagePageMeta {
  hasMore: boolean;
  oldestMessageId?: string | null;
}

function mergeMessages(existing: XiaojiuMessage[], incoming: XiaojiuMessage[]): XiaojiuMessage[] {
  const merged = new Map<string, XiaojiuMessage>();

  existing.forEach((message) => {
    merged.set(message.id, message);
  });
  incoming.forEach((message) => {
    merged.set(message.id, message);
  });

  return Array.from(merged.values()).sort((left, right) => {
    const leftTime = left.timestamp ?? 0;
    const rightTime = right.timestamp ?? 0;
    if (leftTime !== rightTime) return leftTime - rightTime;
    return left.id.localeCompare(right.id);
  });
}

interface XiaojiuChatState {
  messagesBySession: Record<string, XiaojiuMessage[]>;
  loadingSessionId: string | null;
  loadingMoreSessionId: string | null;
  refreshNonce: number;
  loadMoreNonceBySession: Record<string, number>;
  syncError: string | null;
  lastSyncedAtBySession: Record<string, number>;
  hasMoreBySession: Record<string, boolean>;
  oldestMessageIdBySession: Record<string, string | null>;
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

export const useXiaojiuChatStore = create<XiaojiuChatState>((set) => ({
  messagesBySession: {},
  loadingSessionId: null,
  loadingMoreSessionId: null,
  refreshNonce: 0,
  loadMoreNonceBySession: {},
  syncError: null,
  lastSyncedAtBySession: {},
  hasMoreBySession: {},
  oldestMessageIdBySession: {},

  setLoadingSession: (loadingSessionId) => set({ loadingSessionId }),

  setLoadingMoreSession: (loadingMoreSessionId) => set({ loadingMoreSessionId }),

  mergeLatestMessages: (sessionId, messages, syncedAt, meta) => set((state) => {
    const existing = state.messagesBySession[sessionId] ?? [];
    const mergedMessages = mergeMessages(existing, messages);
    const existingHasMore = state.hasMoreBySession[sessionId];
    const oldestMessageId = mergedMessages[0]?.id ?? meta.oldestMessageId ?? null;

    return {
      messagesBySession: {
        ...state.messagesBySession,
        [sessionId]: mergedMessages,
      },
      loadingSessionId: state.loadingSessionId === sessionId ? null : state.loadingSessionId,
      syncError: null,
      lastSyncedAtBySession: {
        ...state.lastSyncedAtBySession,
        [sessionId]: syncedAt,
      },
      hasMoreBySession: {
        ...state.hasMoreBySession,
        [sessionId]: existingHasMore === false ? false : meta.hasMore,
      },
      oldestMessageIdBySession: {
        ...state.oldestMessageIdBySession,
        [sessionId]: oldestMessageId,
      },
    };
  }),

  prependMessages: (sessionId, messages, syncedAt, meta) => set((state) => {
    const existing = state.messagesBySession[sessionId] ?? [];
    const mergedMessages = mergeMessages(messages, existing);
    const oldestMessageId = mergedMessages[0]?.id ?? meta.oldestMessageId ?? null;

    return {
      messagesBySession: {
        ...state.messagesBySession,
        [sessionId]: mergedMessages,
      },
      loadingMoreSessionId:
        state.loadingMoreSessionId === sessionId ? null : state.loadingMoreSessionId,
      syncError: null,
      lastSyncedAtBySession: {
        ...state.lastSyncedAtBySession,
        [sessionId]: syncedAt,
      },
      hasMoreBySession: {
        ...state.hasMoreBySession,
        [sessionId]: meta.hasMore,
      },
      oldestMessageIdBySession: {
        ...state.oldestMessageIdBySession,
        [sessionId]: oldestMessageId,
      },
    };
  }),

  setSyncError: (syncError) => set({
    syncError,
    loadingSessionId: null,
    loadingMoreSessionId: null,
  }),

  requestRefresh: () => set((state) => ({ refreshNonce: state.refreshNonce + 1 })),

  requestLoadMore: (sessionId) => set((state) => ({
    loadMoreNonceBySession: {
      ...state.loadMoreNonceBySession,
      [sessionId]: (state.loadMoreNonceBySession[sessionId] ?? 0) + 1,
    },
  })),
}));
