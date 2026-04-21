import type { InterventionItem, RawMessage } from '@/stores/chat/types';

export interface ConversationStoreState {
  dbMessages: RawMessage[];
  isInputLoading: boolean;
  pendingInterventions: InterventionItem[];
  sendMessageError: string | null;
}

export interface ConversationStoreAction {
  reset: () => void;
  setMessages: (messages: RawMessage[]) => void;
  setMessageState: (state: { isInputLoading: boolean; sendMessageError: string | null }) => void;
  setPendingInterventions: (items: InterventionItem[]) => void;
}

export type ConversationStore = ConversationStoreState & ConversationStoreAction;
