import { DEFAULT_SESSION_KEY } from '../../types';
import type { ChatState } from '../../types';

export type ChatSessionState = Pick<
  ChatState,
  'currentAgentId' | 'currentSessionKey' | 'sessionLabels' | 'sessionLastActivity' | 'sessions'
>;

export const initialSessionState: ChatSessionState = {
  sessions: [],
  currentSessionKey: DEFAULT_SESSION_KEY,
  currentAgentId: 'main',
  sessionLabels: {},
  sessionLastActivity: {},
};
