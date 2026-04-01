import { create } from 'zustand';
import type { HostJizhiChatMessage } from '@/lib/jizhi-chat';

export interface JizhiChatMessage extends HostJizhiChatMessage {}

interface JizhiChatState {
  messagesBySession: Record<string, JizhiChatMessage[]>;
  loadingSessionId: string | null;
  refreshNonce: number;
  syncError: string | null;
  lastSyncedAtBySession: Record<string, number>;
  setLoadingSession: (sessionId: string | null) => void;
  setMessages: (sessionId: string, messages: JizhiChatMessage[], syncedAt: number) => void;
  setSyncError: (error: string | null) => void;
  requestRefresh: () => void;
}

export const useJizhiChatStore = create<JizhiChatState>((set) => ({
  messagesBySession: {},
  loadingSessionId: null,
  refreshNonce: 0,
  syncError: null,
  lastSyncedAtBySession: {},

  setLoadingSession: (loadingSessionId) => set({ loadingSessionId }),

  setMessages: (sessionId, messages, syncedAt) => set((state) => ({
    messagesBySession: {
      ...state.messagesBySession,
      [sessionId]: messages,
    },
    loadingSessionId:
      state.loadingSessionId === sessionId ? null : state.loadingSessionId,
    syncError: null,
    lastSyncedAtBySession: {
      ...state.lastSyncedAtBySession,
      [sessionId]: syncedAt,
    },
  })),

  setSyncError: (syncError) => set({
    syncError,
    loadingSessionId: null,
  }),

  requestRefresh: () => set((state) => ({ refreshNonce: state.refreshNonce + 1 })),
}));
