import type { ConversationStore } from '../types';

export const messageStateSelectors = {
  isInputLoading: (state: ConversationStore) => state.isInputLoading,
  sendMessageError: (state: ConversationStore) => state.sendMessageError,
};
