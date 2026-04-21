import type { RemoteMessengerStoreState } from './types';

export const initialRemoteMessengerState: RemoteMessengerStoreState = {
  sessions: [],
  loading: false,
  lastSyncedAt: null,
  syncError: null,
  activeSessionId: null,
};
