import type { JizhiChatStoreState } from './types';

export const initialJizhiChatState: JizhiChatStoreState = {
  messagesBySession: {},
  pendingMessagesBySession: {},
  serverMessageCountBySession: {},
  loadingSessionId: null,
  refreshNonce: 0,
  syncError: null,
  lastSyncedAtBySession: {},
};
