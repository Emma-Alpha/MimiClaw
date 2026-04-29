import type { CodeAgentStore, SpinnerMode, StreamingToolUse, VendorStatusSource } from './store';

export function createInitialCodeAgentStreamingState(): CodeAgentStore['streaming'] {
  return {
    thinkingText: '',
    isThinking: false,
    assistantText: '',
    isStreaming: false,
    spinnerMode: null as SpinnerMode,
    vendorStatusText: '',
    vendorStatusSource: null as VendorStatusSource,
    toolUses: new Map<string, StreamingToolUse>(),
    accumulatedUsage: null,
    turnStartedAt: 0,
    firstTokenAt: 0,
  };
}

export const initialCodeAgentState = {
  sessionId: null,
  sessionInit: null,
  sessionState: 'idle',
  sessionTitle: null,
  lastUpdatedAt: null,
  items: [],
  streaming: createInitialCodeAgentStreamingState(),
  pendingPermission: null,
  pendingElicitation: null,
  activeTasks: new Map(),
  rateLimitInfo: null,
  contextUsage: null,
  sessionAllowedTools: new Set<string>(),
  sessionModel: null,
  sessionEffort: null,
  sessionThinkingLevel: null,
} as const;
