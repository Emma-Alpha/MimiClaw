import { create } from 'zustand';
import { flattenActions } from '@/stores/utils/flattenActions';
import { createRemoteMessengerSlice } from './action';
import { initialRemoteMessengerState } from './initialState';
import type { RemoteMessengerStore, RemoteMessengerStoreAction } from './types';

export const useRemoteMessengerStore = create<RemoteMessengerStore>((...params) => ({
  ...initialRemoteMessengerState,
  ...flattenActions<RemoteMessengerStoreAction>([
    createRemoteMessengerSlice(...params),
  ]),
}));
