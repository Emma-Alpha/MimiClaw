import type { JizhiSessionsStoreState } from './types';

export const initialJizhiSessionsState: JizhiSessionsStoreState = {
  sessions: [],
  loading: false,
  lastSyncedAt: null,
  syncError: null,
  activeSessionId: null,
};
