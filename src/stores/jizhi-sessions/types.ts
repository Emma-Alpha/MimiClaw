import type { HostJizhiSession } from '@/lib/jizhi-chat';

export type JizhiSession = HostJizhiSession;

export interface JizhiSessionsStoreState {
  sessions: JizhiSession[];
  loading: boolean;
  lastSyncedAt: number | null;
  syncError: string | null;
  activeSessionId: string | null;
}

export interface JizhiSessionsStoreAction {
  setLoading: (loading: boolean) => void;
  setSessions: (sessions: JizhiSession[], syncedAt: number) => void;
  setSyncError: (error: string | null) => void;
  setActiveSessionId: (sessionId: string | null) => void;
}

export type JizhiSessionsStore = JizhiSessionsStoreState & JizhiSessionsStoreAction;
