/**
 * useChatStore — inert stub after gateway chat removal.
 * Kept so that component-level `useChatStore(...)` calls in ActionBar
 * components (which are imported but not mounted in Code Agent mode)
 * don't crash at module load time.
 */
import { shallow } from 'zustand/shallow';
import { createWithEqualityFn } from 'zustand/traditional';
import { createChatActions } from './action';
import { initialChatState } from './initialState';
import type { ChatState } from './types';

export const useChatStore = createWithEqualityFn<ChatState>()(
  () => ({
    ...initialChatState,
    ...createChatActions(),
  }),
  shallow,
);
