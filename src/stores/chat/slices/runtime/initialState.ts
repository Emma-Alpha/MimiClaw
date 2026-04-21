import type { ChatState } from '../../types';

export type ChatRuntimeState = Pick<
  ChatState,
  | 'activeRunId'
  | 'error'
  | 'lastRunWasAborted'
  | 'lastUserMessageAt'
  | 'loading'
  | 'messages'
  | 'pendingFinal'
  | 'pendingToolImages'
  | 'sending'
  | 'showThinking'
  | 'streamingMessage'
  | 'streamingText'
  | 'streamingTools'
  | 'thinkingLevel'
>;

export const initialRuntimeState: ChatRuntimeState = {
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

  showThinking: true,
  thinkingLevel: null,
};
