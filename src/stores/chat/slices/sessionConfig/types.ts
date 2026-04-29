import type { CodeAgentEffortLevel } from '../../../../../shared/code-agent';

export type ThinkingLevel = 'none' | 'low' | 'medium' | 'high';

export interface SessionConfigState {
  sessionModel: string | null;
  sessionEffort: CodeAgentEffortLevel | null;
  sessionThinkingLevel: ThinkingLevel | null;
}

export interface SessionConfigAction {
  setSessionModel: (model: string | null) => void;
  setSessionEffort: (effort: CodeAgentEffortLevel | null) => void;
  setSessionThinkingLevel: (level: ThinkingLevel | null) => void;
  restoreSessionConfig: (config: { model?: string; effort?: string; thinkingLevel?: string } | null) => void;
  resetSessionConfig: () => void;
}
