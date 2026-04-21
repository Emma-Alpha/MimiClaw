import { create } from 'zustand';
import { flattenActions } from '@/stores/utils/flattenActions';
import { createVoiceChatSessionsSlice } from './action';
import { initialVoiceChatSessionsState } from './initialState';
import type { VoiceChatSessionsStore, VoiceChatSessionsStoreAction } from './types';

export const useVoiceChatSessionsStore = create<VoiceChatSessionsStore>((...params) => ({
  ...initialVoiceChatSessionsState,
  ...flattenActions<VoiceChatSessionsStoreAction>([
    createVoiceChatSessionsSlice(...params),
  ]),
}));
