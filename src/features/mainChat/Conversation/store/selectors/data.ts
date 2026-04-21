import type { ConversationStore } from '../types';

export const dataSelectors = {
  dbMessages: (state: ConversationStore) => state.dbMessages,
  pendingInterventions: (state: ConversationStore) => state.pendingInterventions,
};
