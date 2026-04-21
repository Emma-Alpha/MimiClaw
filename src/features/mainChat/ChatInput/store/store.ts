import { createWithEqualityFn } from 'zustand/traditional';
import { shallow } from 'zustand/shallow';
import { flattenActions } from '@/stores/utils/flattenActions';
import { createChatInputStoreSlice } from './action';
import { initialChatInputStoreState } from './initialState';
import type { ChatInputStore, ChatInputStoreAction } from './types';

export const useChatInputStore = createWithEqualityFn<ChatInputStore>()(
  (...params) => ({
    ...initialChatInputStoreState,
    ...flattenActions<ChatInputStoreAction>([
      createChatInputStoreSlice(...params),
    ]),
  }),
  shallow,
);
