import type { StateCreator } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { shallow } from 'zustand/shallow';
import { createWithEqualityFn } from 'zustand/traditional';
import { createDevtools } from '../middleware/createDevtools';
import { createChatActions } from './action';
import { initialChatState } from './initialState';
import type { ChatState } from './types';

const devtools = createDevtools('chat');

const storeCreator: StateCreator<ChatState, [['zustand/devtools', never]]> = (...params) => ({
  ...initialChatState,
  ...createChatActions(...params),
});

export const useChatStore = createWithEqualityFn<ChatState>()(
  subscribeWithSelector(devtools(storeCreator)),
  shallow,
);
