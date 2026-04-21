import { create } from 'zustand';
import { flattenActions } from '@/stores/utils/flattenActions';
import { createProviderSlice } from './action';
import { initialProviderState } from './initialState';
import type { ProviderStore, ProviderStoreAction } from './types';

export const useProviderStore = create<ProviderStore>((...params) => ({
  ...initialProviderState,
  ...flattenActions<ProviderStoreAction>([
    createProviderSlice(...params),
  ]),
}));
