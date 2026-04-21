import type { VoiceChatSessionsStoreState } from './types';

export const initialVoiceChatSessionsState: VoiceChatSessionsStoreState = {
  sessions: [],
  loading: false,
  lastSyncedAt: null,
  syncError: null,
  activeSessionId: null,
};
