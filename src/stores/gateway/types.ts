import type { GatewayStatus } from '@/types/gateway';

export interface GatewayHealth {
  ok: boolean;
  error?: string;
  uptime?: number;
}

export interface GatewayStoreState {
  status: GatewayStatus;
  health: GatewayHealth | null;
  isInitialized: boolean;
  lastError: string | null;
}

export interface GatewayStoreAction {
  init: () => Promise<void>;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  restart: () => Promise<void>;
  checkHealth: () => Promise<GatewayHealth>;
  rpc: <T>(method: string, params?: unknown, timeoutMs?: number) => Promise<T>;
  setStatus: (status: GatewayStatus) => void;
  clearError: () => void;
}

export type GatewayStore = GatewayStoreState & GatewayStoreAction;
