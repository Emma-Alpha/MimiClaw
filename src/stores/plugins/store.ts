import { create } from 'zustand';

import { flattenActions } from '@/stores/utils/flattenActions';

import { createPluginsSlice } from './action';
import { initialPluginsState } from './initialState';
import type { PluginsStore, PluginsStoreAction } from './types';

export const usePluginsStore = create<PluginsStore>((...params) => ({
  ...initialPluginsState,
  ...flattenActions<PluginsStoreAction>([
    createPluginsSlice(...params),
  ]),
}));
