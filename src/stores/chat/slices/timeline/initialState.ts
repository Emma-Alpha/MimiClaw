import type { TimelineState, SpinnerMode, StreamingToolUse, VendorStatusSource } from './types';
export type { TimelineState } from './types';

export function createInitialCodeAgentStreamingState(): TimelineState['streaming'] {
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

export const initialTimelineState: TimelineState = {
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
  perfTurnStartedAt: 0,
  perfFirstTokenAt: 0,
  sessionAllowedTools: new Set<string>(),
};

/** @deprecated Use `initialTimelineState` instead */
export const initialCodeAgentState = initialTimelineState;
