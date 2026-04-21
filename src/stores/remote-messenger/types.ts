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

export interface RemoteMessengerStoreState {
  sessions: RemoteMessengerSession[];
  loading: boolean;
  lastSyncedAt: number | null;
  syncError: string | null;
  activeSessionId: string | null;
}

export interface RemoteMessengerStoreAction {
  setLoading: (loading: boolean) => void;
  setSessions: (sessions: RemoteMessengerSession[], syncedAt: number) => void;
  setSyncError: (error: string | null) => void;
  setActiveSessionId: (sessionId: string | null) => void;
}

export type RemoteMessengerStore = RemoteMessengerStoreState & RemoteMessengerStoreAction;
