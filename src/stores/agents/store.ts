import { create } from 'zustand';
import { flattenActions } from '@/stores/utils/flattenActions';
import { createAgentsSlice } from './action';
import { initialAgentsState } from './initialState';
import type { AgentsStore, AgentsStoreAction } from './types';

export const useAgentsStore = create<AgentsStore>((...params) => ({
  ...initialAgentsState,
  ...flattenActions<AgentsStoreAction>([
    createAgentsSlice(...params),
  ]),
}));
