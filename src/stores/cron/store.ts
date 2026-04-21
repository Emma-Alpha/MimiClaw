import { create } from 'zustand';
import { flattenActions } from '@/stores/utils/flattenActions';
import { createCronSlice } from './action';
import { initialCronState } from './initialState';
import type { CronStore, CronStoreAction } from './types';

export const useCronStore = create<CronStore>((...params) => ({
  ...initialCronState,
  ...flattenActions<CronStoreAction>([
    createCronSlice(...params),
  ]),
}));
