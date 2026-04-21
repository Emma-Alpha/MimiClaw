import type { GatewayStoreState } from './types';

export const initialGatewayState: GatewayStoreState = {
  status: {
    state: 'stopped',
    port: 18789,
  },
  health: null,
  isInitialized: false,
  lastError: null,
};
