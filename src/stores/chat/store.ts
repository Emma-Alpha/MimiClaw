import type { StateCreator } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { shallow } from 'zustand/shallow';
import { createWithEqualityFn } from 'zustand/traditional';
import { createDevtools } from '../middleware/createDevtools';
import { flattenActions } from '../utils/flattenActions';
import {
  createChatRuntimeSlice,
  createChatSessionHistorySlice,
  createChatTopicSlice,
  type ChatAction,
} from './action';
import { initialChatState } from './initialState';
import type { ChatState } from './types';

const devtools = createDevtools('chat');

const storeCreator: StateCreator<ChatState, [['zustand/devtools', never]]> = (...params) => ({
  ...initialChatState,
  ...flattenActions<ChatAction>([
    createChatSessionHistorySlice(...params),
    createChatRuntimeSlice(...params),
    createChatTopicSlice(...params),
  ]),
});

export const useChatStore = createWithEqualityFn<ChatState>()(
  subscribeWithSelector(devtools(storeCreator)),
  shallow,
);
