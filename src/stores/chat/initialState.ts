import {
  initialRuntimeState,
  type ChatRuntimeState,
} from './slices/runtime';
import {
  initialSessionState,
  type ChatSessionState,
} from './slices/session';
import {
  initialTopicState,
  type ChatTopicState,
} from './slices/topic';

export interface ChatStoreState extends ChatRuntimeState, ChatSessionState, ChatTopicState {}

export const initialChatState: ChatStoreState = {
  ...initialRuntimeState,
  ...initialSessionState,
  ...initialTopicState,
};
