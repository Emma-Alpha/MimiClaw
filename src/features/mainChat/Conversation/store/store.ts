import { createWithEqualityFn } from 'zustand/traditional';
import { shallow } from 'zustand/shallow';
import { flattenActions } from '@/stores/utils/flattenActions';
import { createConversationStoreSlice } from './action';
import { initialConversationStoreState } from './initialState';
import type { ConversationStore, ConversationStoreAction } from './types';

export const useConversationStore = createWithEqualityFn<ConversationStore>()(
  (...params) => ({
    ...initialConversationStoreState,
    ...flattenActions<ConversationStoreAction>([
      createConversationStoreSlice(...params),
    ]),
  }),
  shallow,
);
