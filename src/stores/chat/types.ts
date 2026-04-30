/** Metadata for locally-attached files (not from Gateway) */
export interface AttachedFileMeta {
  fileName: string;
  mimeType: string;
  fileSize: number;
  preview: string | null;
  filePath?: string;
}

/** Subagent task metadata attached to a RawMessage for inline rendering */
export interface SubagentTaskMeta {
  taskId: string;
  description: string;
  status: 'running' | 'completed' | 'failed' | 'stopped';
  summary?: string;
  durationMs?: number;
  parentTaskId?: string;
}

/** Raw message from chat.history */
export interface RawMessage {
  role: 'user' | 'assistant' | 'system' | 'toolresult';
  content: unknown; // string | ContentBlock[]
  timestamp?: number;
  id?: string;
  toolCallId?: string;
  toolName?: string;
  details?: unknown;
  isError?: boolean;
  /** Local-only: file metadata for user-uploaded attachments (not sent to/from Gateway) */
  _attachedFiles?: AttachedFileMeta[];
  /** Local-only: mention tags extracted from editor for styled inline rendering */
  _mentionTags?: { kind: string; label: string; icon?: string }[];
  /** Local-only: subagent task metadata for inline SubagentCard rendering */
  _subagentTask?: SubagentTaskMeta;
}

/** Content block inside a message */
export interface ContentBlock {
  type: 'text' | 'image' | 'thinking' | 'tool_use' | 'tool_result' | 'toolCall' | 'toolResult';
  text?: string;
  thinking?: string;
  source?: { type: string; media_type?: string; data?: string; url?: string };
  /** Flat image format from Gateway tool results (no source wrapper) */
  data?: string;
  mimeType?: string;
  id?: string;
  name?: string;
  input?: unknown;
  arguments?: unknown;
  content?: unknown;
}

/** Session from sessions.list */
export interface ChatSession {
  key: string;
  label?: string;
  displayName?: string;
  thinkingLevel?: string;
  model?: string;
  updatedAt?: number;
}

export interface ChatToolStatus {
  id?: string;
  toolCallId?: string;
  name: string;
  status: 'running' | 'completed' | 'error';
  durationMs?: number;
  summary?: string;
  updatedAt: number;
}

export interface ChatSendAttachment {
  fileName: string;
  mimeType: string;
  fileSize: number;
  stagedPath: string;
  preview: string | null;
}

export interface ChatSendPayload {
  editorData?: Record<string, unknown> | null;
  files?: ChatSendAttachment[];
  message: string;
  pageSelections?: unknown[];
}

export interface ChatTopic {
  id: string;
  sessionId: string;
  agentId: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  summary?: string;
}

export interface InterventionItem {
  id: string;
  toolCallId?: string;
  toolName: string;
  requestArgs?: unknown;
  sessionKey: string;
  createdAt: number;
}

export interface QueuedMessage {
  id: string;
  message: string;
  attachments?: ChatSendAttachment[];
  createdAt: number;
}

export type TopicDispatch =
  | { type: 'addTopic'; value: ChatTopic }
  | { type: 'deleteTopic'; id: string }
  | { type: 'setCurrentTopic'; id: string | null }
  | {
    type: 'updateTopic';
    id: string;
    value: Partial<Pick<ChatTopic, 'title' | 'summary' | 'updatedAt'>>;
  };

export type InterventionDispatch =
  | { type: 'setInterventions'; value: InterventionItem[] }
  | { type: 'removeIntervention'; id: string }
  | { type: 'upsertIntervention'; value: InterventionItem };

export type QueueDispatch =
  | { type: 'setQueue'; sessionKey: string; value: QueuedMessage[] }
  | { type: 'enqueue'; sessionKey: string; value: QueuedMessage }
  | { type: 'flushQueue'; sessionKey: string };

export interface ChatState {
  // Messages
  messages: RawMessage[];
  loading: boolean;
  error: string | null;

  // Streaming
  sending: boolean;
  activeRunId: string | null;
  streamingText: string;
  streamingMessage: unknown | null;
  streamingTools: ChatToolStatus[];
  pendingFinal: boolean;
  lastUserMessageAt: number | null;
  /** True when the last run was aborted by the user — cleared on next sendMessage */
  lastRunWasAborted: boolean;
  /** Images collected from tool results, attached to the next assistant message */
  pendingToolImages: AttachedFileMeta[];

  // Sessions
  sessions: ChatSession[];
  currentSessionKey: string;
  currentAgentId: string;
  /** First user message text per session key, used as display label */
  sessionLabels: Record<string, string>;
  /** Last message timestamp (ms) per session key, used for sorting */
  sessionLastActivity: Record<string, number>;
  topicMap: Record<string, ChatTopic>;
  currentTopicId: string | null;
  pendingInterventions: InterventionItem[];
  queuedMessages: Record<string, QueuedMessage[]>;
  mode: 'chat' | 'agent';
  mainInputEditor: unknown | null;

  // Thinking
  showThinking: boolean;
  thinkingLevel: string | null;

  // Internal dispatch / helpers
  internal_dispatchTopic: (payload: TopicDispatch, source?: string) => void;
  internal_dispatchIntervention: (payload: InterventionDispatch, source?: string) => void;
  internal_dispatchQueue: (payload: QueueDispatch, source?: string) => void;
  internal_createTopic: (sessionId: string, title?: string) => string;

  // Actions
  loadSessions: () => Promise<void>;
  switchSession: (key: string) => void;
  newSession: () => void;
  deleteSession: (key: string) => Promise<void>;
  cleanupEmptySession: () => void;
  loadHistory: (quiet?: boolean) => Promise<void>;
  sendMessage: (
    payloadOrText: string | ChatSendPayload,
    attachments?: ChatSendAttachment[],
  ) => Promise<void>;
  abortRun: () => Promise<void>;
  handleChatEvent: (event: Record<string, unknown>) => void;
  toggleThinking: () => void;
  refresh: () => Promise<void>;
  clearError: () => void;

  createTopic: (sessionId: string, title?: string) => string;
  switchTopic: (topicId: string | null) => void;
  summarizeTopic: (topicId: string, summary?: string) => void;
  deleteTopic: (topicId: string) => void;
  clearCurrentTopic: (topicId?: string | null) => void;
  approveIntervention: (id: string) => void;
  rejectIntervention: (id: string) => void;
  enqueueMessage: (sessionKey: string, message: Omit<QueuedMessage, 'id' | 'createdAt'>) => string;
  flushQueue: (sessionKey: string) => QueuedMessage[];
  setMainInputEditor: (editor: unknown | null) => void;
  setChatMode: (mode: 'chat' | 'agent') => void;
}

export const DEFAULT_CANONICAL_PREFIX = 'agent:main';
export const DEFAULT_SESSION_KEY = `${DEFAULT_CANONICAL_PREFIX}:main`;
