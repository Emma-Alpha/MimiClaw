import { create } from 'zustand';
import { flattenActions } from '@/stores/utils/flattenActions';
import { createJizhiChatSlice } from './action';
import { initialJizhiChatState } from './initialState';
import type { JizhiChatStore, JizhiChatStoreAction } from './types';

export const useJizhiChatStore = create<JizhiChatStore>((...params) => ({
  ...initialJizhiChatState,
  ...flattenActions<JizhiChatStoreAction>([
    createJizhiChatSlice(...params),
  ]),
}));
