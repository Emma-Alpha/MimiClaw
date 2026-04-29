import type { CodeAgentStore } from './types';

export const codeAgentSelectors = {
  items: (state: CodeAgentStore) => state.items,
  streaming: (state: CodeAgentStore) => state.streaming,
  pendingPermission: (state: CodeAgentStore) => state.pendingPermission,
  contextUsage: (state: CodeAgentStore) => state.contextUsage,
  sessionState: (state: CodeAgentStore) => state.sessionState,
};
