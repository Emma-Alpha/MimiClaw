import type { CodeAgentStore } from '../timeline/types';
// Note: CodeAgentStore is the composed store type that includes SessionConfigState

export const sessionConfigSelectors = {
  sessionModel: (s: CodeAgentStore) => s.sessionModel,
  sessionEffort: (s: CodeAgentStore) => s.sessionEffort,
  sessionThinkingLevel: (s: CodeAgentStore) => s.sessionThinkingLevel,
};
