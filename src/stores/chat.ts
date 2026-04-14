/**
 * Chat State Store
 * Manages chat messages, sessions, streaming, and thinking state.
 * Communicates with OpenClaw Gateway via IPC proxy layer.
 */
import { subscribeWithSelector } from 'zustand/middleware';
import { createWithEqualityFn } from 'zustand/traditional';
import { shallow } from 'zustand/shallow';
import type { StateCreator } from 'zustand';
import { createChatActions, initialChatState } from './chat/internal';
import { createDevtools } from './middleware/createDevtools';
import type { ChatState } from './chat/types';

// Re-export types for consumers (backward-compatible)
export type {
  AttachedFileMeta,
  RawMessage,
  ContentBlock,
  ChatSession,
  ToolStatus,
  ChatState,
} from './chat/types';

// Re-export selectors
export {
  chatMessageSelectors,
  chatSessionSelectors,
  chatStreamingSelectors,
  chatThinkingSelectors,
} from './chat/selectors';

const devtools = createDevtools('chat');

const storeCreator: StateCreator<ChatState> = (set, get) => ({
  ...initialChatState,
  ...createChatActions(set, get),
});

export const useChatStore = createWithEqualityFn<ChatState>()(
  subscribeWithSelector(devtools(storeCreator)),
  shallow,
);
