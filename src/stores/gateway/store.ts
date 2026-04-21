import { create } from 'zustand';
import { flattenActions } from '@/stores/utils/flattenActions';
import { createGatewaySlice } from './action';
import { initialGatewayState } from './initialState';
import type { GatewayStore, GatewayStoreAction } from './types';

export const useGatewayStore = create<GatewayStore>((...params) => ({
  ...initialGatewayState,
  ...flattenActions<GatewayStoreAction>([
    createGatewaySlice(...params),
  ]),
}));
