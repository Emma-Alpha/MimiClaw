import type { ChatState } from './types';
import { DEFAULT_SESSION_KEY } from './types';

export const initialChatState: Pick<
  ChatState,
  | 'messages'
  | 'loading'
  | 'error'
  | 'sending'
  | 'activeRunId'
  | 'streamingText'
  | 'streamingMessage'
  | 'streamingTools'
  | 'pendingFinal'
  | 'lastUserMessageAt'
  | 'lastRunWasAborted'
  | 'pendingToolImages'
  | 'sessions'
  | 'currentSessionKey'
  | 'currentAgentId'
  | 'sessionLabels'
  | 'sessionLastActivity'
  | 'topicMap'
  | 'currentTopicId'
  | 'pendingInterventions'
  | 'queuedMessages'
  | 'mode'
  | 'mainInputEditor'
  | 'showThinking'
  | 'thinkingLevel'
> = {
  messages: [],
  loading: false,
  error: null,

  sending: false,
  activeRunId: null,
  streamingText: '',
  streamingMessage: null,
  streamingTools: [],
  pendingFinal: false,
  lastUserMessageAt: null,
  lastRunWasAborted: false,
  pendingToolImages: [],

  sessions: [],
  currentSessionKey: DEFAULT_SESSION_KEY,
  currentAgentId: 'main',
  sessionLabels: {},
  sessionLastActivity: {},
  topicMap: {},
  currentTopicId: null,
  pendingInterventions: [],
  queuedMessages: {},
  mode: 'chat',
  mainInputEditor: null,

  showThinking: true,
  thinkingLevel: null,
};
