import { create } from 'zustand';

export interface RemoteMessengerSession {
  id: string;
  name: string;
  avatar?: string;
  unreadCount: number;
  draftText?: string;
  updatedAt?: number;
  sortIndex: number;
  lastMsgId?: string | null;
}

interface RemoteMessengerState {
  sessions: RemoteMessengerSession[];
  loading: boolean;
  lastSyncedAt: number | null;
  syncError: string | null;
  activeSessionId: string | null;
  setLoading: (loading: boolean) => void;
  setSessions: (sessions: RemoteMessengerSession[], syncedAt: number) => void;
  setSyncError: (error: string | null) => void;
  setActiveSessionId: (sessionId: string | null) => void;
}

export const useRemoteMessengerStore = create<RemoteMessengerState>((set) => ({
  sessions: [],
  loading: false,
  lastSyncedAt: null,
  syncError: null,
  activeSessionId: null,

  setLoading: (loading) => set({ loading }),

  setSessions: (sessions, syncedAt) => set((state) => {
    const knownIds = new Set(sessions.map((session) => session.id));
    const fallbackActiveId = sessions[0]?.id ?? null;
    return {
      sessions,
      lastSyncedAt: syncedAt,
      loading: false,
      syncError: null,
      activeSessionId:
        state.activeSessionId && knownIds.has(state.activeSessionId)
          ? state.activeSessionId
          : fallbackActiveId,
    };
  }),

  setSyncError: (syncError) => set({ syncError, loading: false }),

  setActiveSessionId: (activeSessionId) => set({ activeSessionId }),
}));
