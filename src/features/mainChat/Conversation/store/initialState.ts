import type { ConversationStoreState } from './types';

export const initialConversationStoreState: ConversationStoreState = {
  dbMessages: [],
  isInputLoading: false,
  pendingInterventions: [],
  sendMessageError: null,
};
