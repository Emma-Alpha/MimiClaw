import { create } from 'zustand';
import { flattenActions } from '@/stores/utils/flattenActions';
import { createXiaojiuChatSlice } from './action';
import { initialXiaojiuChatState } from './initialState';
import type { XiaojiuChatStore, XiaojiuChatStoreAction } from './types';

export const useXiaojiuChatStore = create<XiaojiuChatStore>((...params) => ({
  ...initialXiaojiuChatState,
  ...flattenActions<XiaojiuChatStoreAction>([
    createXiaojiuChatSlice(...params),
  ]),
}));
