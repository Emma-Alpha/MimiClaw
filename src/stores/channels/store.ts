import { create } from 'zustand';
import { flattenActions } from '@/stores/utils/flattenActions';
import { createChannelsSlice } from './action';
import { initialChannelsState } from './initialState';
import type { ChannelsStore, ChannelsStoreAction } from './types';

export const useChannelsStore = create<ChannelsStore>((...params) => ({
  ...initialChannelsState,
  ...flattenActions<ChannelsStoreAction>([
    createChannelsSlice(...params),
  ]),
}));
