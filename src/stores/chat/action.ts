import { flattenActions } from '../utils/flattenActions';
import {
  createChatRuntimeSlice,
  type ChatRuntimeAction,
} from './slices/runtime';
import {
  createChatSessionHistorySlice,
  type ChatSessionHistoryAction,
} from './slices/session';
import {
  createChatTopicSlice,
  type ChatTopicAction,
} from './slices/topic';
import type { ChatGet, ChatSet } from './store-api';

type PublicActions<T> = { [K in keyof T]: T[K] };

export type ChatAction = PublicActions<
  ChatSessionHistoryAction & ChatRuntimeAction & ChatTopicAction
>;

export {
  createChatRuntimeSlice,
  createChatSessionHistorySlice,
  createChatTopicSlice,
};

export function createChatActions(set: ChatSet, get: ChatGet, api?: unknown): ChatAction {
  return flattenActions<ChatAction>([
    createChatSessionHistorySlice(set, get, api),
    createChatRuntimeSlice(set, get, api),
    createChatTopicSlice(set, get, api),
  ]);
}
