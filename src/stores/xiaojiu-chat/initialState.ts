import type { XiaojiuChatStoreState } from './types';

export const initialXiaojiuChatState: XiaojiuChatStoreState = {
  messagesBySession: {},
  loadingSessionId: null,
  loadingMoreSessionId: null,
  refreshNonce: 0,
  loadMoreNonceBySession: {},
  syncError: null,
  lastSyncedAtBySession: {},
  hasMoreBySession: {},
  oldestMessageIdBySession: {},
};
