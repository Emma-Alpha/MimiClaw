import type { StateCreator } from 'zustand';
import { createWithEqualityFn } from 'zustand/traditional';
import { shallow } from 'zustand/shallow';
import { flattenActions } from '@/stores/utils/flattenActions';
import type { CodeAgentStore, ChatStoreAction } from './slices/timeline/types';
import { initialState } from './initialState';
import { createTimelineSlice } from './slices/timeline';
import { createSessionConfigSlice } from './slices/sessionConfig';

const createStore: StateCreator<CodeAgentStore> = (...params) => ({
  ...initialState,
  ...flattenActions<ChatStoreAction>([
    createTimelineSlice(...params),
    createSessionConfigSlice(...params),
  ]),
});

export const useChatStore = createWithEqualityFn<CodeAgentStore>()(
  createStore,
  shallow,
);

/** Backward-compatible alias — use `useChatStore` for new code */
export const useCodeAgentStore = useChatStore;
