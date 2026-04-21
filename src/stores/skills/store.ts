import { create } from 'zustand';
import { flattenActions } from '@/stores/utils/flattenActions';
import { createSkillsSlice } from './action';
import { initialSkillsState } from './initialState';
import type { SkillsStore, SkillsStoreAction } from './types';

export const useSkillsStore = create<SkillsStore>((...params) => ({
  ...initialSkillsState,
  ...flattenActions<SkillsStoreAction>([
    createSkillsSlice(...params),
  ]),
}));
