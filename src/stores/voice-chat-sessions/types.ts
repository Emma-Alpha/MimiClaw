import type { VoiceChatSessionSummary } from '../../../shared/voice-chat';

export interface VoiceChatSessionsStoreState {
  sessions: VoiceChatSessionSummary[];
  loading: boolean;
  lastSyncedAt: number | null;
  syncError: string | null;
  activeSessionId: string | null;
}

export interface VoiceChatSessionsStoreAction {
  setLoading: (loading: boolean) => void;
  setSessions: (sessions: VoiceChatSessionSummary[], syncedAt: number) => void;
  setSyncError: (error: string | null) => void;
  setActiveSessionId: (sessionId: string | null) => void;
}

export type VoiceChatSessionsStore = VoiceChatSessionsStoreState & VoiceChatSessionsStoreAction;
