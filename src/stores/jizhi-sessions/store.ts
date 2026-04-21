import { create } from 'zustand';
import { flattenActions } from '@/stores/utils/flattenActions';
import { createJizhiSessionsSlice } from './action';
import { initialJizhiSessionsState } from './initialState';
import type { JizhiSessionsStore, JizhiSessionsStoreAction } from './types';

export const useJizhiSessionsStore = create<JizhiSessionsStore>((...params) => ({
  ...initialJizhiSessionsState,
  ...flattenActions<JizhiSessionsStoreAction>([
    createJizhiSessionsSlice(...params),
  ]),
}));
