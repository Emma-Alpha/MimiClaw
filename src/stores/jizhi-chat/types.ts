import type {
  HostJizhiChatMessage,
  HostJizhiStreamData,
  HostJizhiStreamEvent,
} from '@/lib/jizhi-chat';

export type JizhiChatMessage = HostJizhiChatMessage;

export type PendingMessagePair = {
  prompt: string;
  assistantMessageUUID: string;
  messages: JizhiChatMessage[];
};

export type AppendPendingMessageParams = {
  sessionId: string;
  prompt: string;
  assistantMessageUUID: string;
  model?: string;
  modelName?: string;
};

export type AppendPendingAssistantParams = {
  sessionId: string;
  assistantMessageUUID: string;
  model?: string;
  modelName?: string;
  placeholderText?: string;
};

export interface JizhiChatStoreState {
  messagesBySession: Record<string, JizhiChatMessage[]>;
  pendingMessagesBySession: Record<string, PendingMessagePair[]>;
  serverMessageCountBySession: Record<string, number>;
  loadingSessionId: string | null;
  refreshNonce: number;
  syncError: string | null;
  lastSyncedAtBySession: Record<string, number>;
}

export interface JizhiChatStoreAction {
  setLoadingSession: (sessionId: string | null) => void;
  setMessages: (sessionId: string, messages: JizhiChatMessage[], syncedAt: number) => void;
  appendPendingMessagePair: (params: AppendPendingMessageParams) => void;
  appendPendingAssistant: (params: AppendPendingAssistantParams) => void;
  markPendingPairError: (sessionId: string, assistantMessageUUID: string, errorMessage: string) => void;
  applyStreamEvent: (payload: HostJizhiStreamEvent) => void;
  setSyncError: (error: string | null) => void;
  requestRefresh: () => void;
}

export type JizhiChatStore = JizhiChatStoreState & JizhiChatStoreAction;

export type { HostJizhiStreamData, HostJizhiStreamEvent };
