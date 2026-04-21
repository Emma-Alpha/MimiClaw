import { create } from 'zustand';
import { flattenActions } from '@/stores/utils/flattenActions';
import { createUpdateSlice } from './action';
import { initialUpdateState } from './initialState';
import type { UpdateStore, UpdateStoreAction } from './types';

export const useUpdateStore = create<UpdateStore>((...params) => ({
  ...initialUpdateState,
  ...flattenActions<UpdateStoreAction>([
    createUpdateSlice(...params),
  ]),
}));
