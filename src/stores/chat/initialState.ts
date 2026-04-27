/**
 * Chat store initial state — minimal stub for the inert store.
 */
import type { ChatState } from './types';
import { DEFAULT_SESSION_KEY } from './types';

const noop = () => {};
const asyncNoop = async () => {};

export const initialChatState: ChatState = {
  // Messages
  messages: [],
  loading: false,
  error: null,

  // Streaming
  sending: false,
  activeRunId: null,
  streamingText: '',
  streamingMessage: null,
  streamingTools: [],
  pendingFinal: false,
  lastUserMessageAt: null,
  lastRunWasAborted: false,
  pendingToolImages: [],

  // Sessions
  sessions: [],
  currentSessionKey: DEFAULT_SESSION_KEY,
  currentAgentId: 'default',
  sessionLabels: {},
  sessionLastActivity: {},
  topicMap: {},
  currentTopicId: null,
  pendingInterventions: [],
  queuedMessages: {},
  mode: 'chat',
  mainInputEditor: null,

  // Thinking
  showThinking: false,
  thinkingLevel: null,

  // Stub actions (overwritten by createChatActions)
  internal_dispatchTopic: noop,
  internal_dispatchIntervention: noop,
  internal_dispatchQueue: noop,
  internal_createTopic: () => '',
  loadSessions: asyncNoop,
  switchSession: noop,
  newSession: noop,
  deleteSession: asyncNoop,
  cleanupEmptySession: noop,
  loadHistory: asyncNoop,
  sendMessage: asyncNoop,
  abortRun: asyncNoop,
  handleChatEvent: noop,
  toggleThinking: noop,
  refresh: asyncNoop,
  clearError: noop,
  createTopic: () => '',
  switchTopic: noop,
  summarizeTopic: noop,
  deleteTopic: noop,
  clearCurrentTopic: noop,
  approveIntervention: noop,
  rejectIntervention: noop,
  enqueueMessage: () => '',
  flushQueue: () => [],
  setMainInputEditor: noop,
  setChatMode: noop,
};
