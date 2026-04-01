import { create } from 'zustand';
import type { HostJizhiSession } from '@/lib/jizhi-chat';

export interface JizhiSession extends HostJizhiSession {}

interface JizhiSessionsState {
  sessions: JizhiSession[];
  loading: boolean;
  lastSyncedAt: number | null;
  syncError: string | null;
  activeSessionId: string | null;
  setLoading: (loading: boolean) => void;
  setSessions: (sessions: JizhiSession[], syncedAt: number) => void;
  setSyncError: (error: string | null) => void;
  setActiveSessionId: (sessionId: string | null) => void;
}

export const useJizhiSessionsStore = create<JizhiSessionsState>((set) => ({
  sessions: [],
  loading: false,
  lastSyncedAt: null,
  syncError: null,
  activeSessionId: null,

  setLoading: (loading) => set({ loading }),

  setSessions: (sessions, syncedAt) => set((state) => {
    const knownIds = new Set(sessions.map((session) => session.id));
    return {
      sessions,
      lastSyncedAt: syncedAt,
      loading: false,
      syncError: null,
      activeSessionId:
        state.activeSessionId && knownIds.has(state.activeSessionId)
          ? state.activeSessionId
          : (sessions[0]?.id ?? null),
    };
  }),

  setSyncError: (syncError) => set({ syncError, loading: false }),

  setActiveSessionId: (activeSessionId) => set({ activeSessionId }),
}));
