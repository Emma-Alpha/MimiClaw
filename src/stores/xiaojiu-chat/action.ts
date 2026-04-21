import type { StoreGetter, StorePublicActions, StoreSetter } from '@/stores/types';
import type {
  XiaojiuChatStore,
  XiaojiuChatStoreAction,
  XiaojiuMessage,
} from './types';

type Setter = StoreSetter<XiaojiuChatStore>;
type Getter = StoreGetter<XiaojiuChatStore>;

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

export class XiaojiuChatActionImpl {
  readonly #set: Setter;

  constructor(set: Setter, get: Getter, _api?: unknown) {
    void get;
    void _api;
    this.#set = set;
  }

  setLoadingSession: XiaojiuChatStoreAction['setLoadingSession'] = (loadingSessionId) =>
    this.#set({ loadingSessionId });

  setLoadingMoreSession: XiaojiuChatStoreAction['setLoadingMoreSession'] = (loadingMoreSessionId) =>
    this.#set({ loadingMoreSessionId });

  mergeLatestMessages: XiaojiuChatStoreAction['mergeLatestMessages'] = (
    sessionId,
    messages,
    syncedAt,
    meta,
  ) => this.#set((state) => {
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
  });

  prependMessages: XiaojiuChatStoreAction['prependMessages'] = (
    sessionId,
    messages,
    syncedAt,
    meta,
  ) => this.#set((state) => {
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
  });

  setSyncError: XiaojiuChatStoreAction['setSyncError'] = (syncError) => this.#set({
    syncError,
    loadingSessionId: null,
    loadingMoreSessionId: null,
  });

  requestRefresh: XiaojiuChatStoreAction['requestRefresh'] = () =>
    this.#set((state) => ({ refreshNonce: state.refreshNonce + 1 }));

  requestLoadMore: XiaojiuChatStoreAction['requestLoadMore'] = (sessionId) => this.#set((state) => ({
    loadMoreNonceBySession: {
      ...state.loadMoreNonceBySession,
      [sessionId]: (state.loadMoreNonceBySession[sessionId] ?? 0) + 1,
    },
  }));
}

export type XiaojiuChatAction = StorePublicActions<XiaojiuChatActionImpl>;

export const createXiaojiuChatSlice = (
  set: Setter,
  get: Getter,
  api?: unknown,
): XiaojiuChatStoreAction => new XiaojiuChatActionImpl(set, get, api);
