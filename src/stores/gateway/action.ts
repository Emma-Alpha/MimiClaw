import { invokeIpc } from '@/lib/api-client';
import { subscribeHostEvent } from '@/lib/host-events';
import { hostApiFetch } from '@/lib/host-api';
import type { StoreGetter, StorePublicActions, StoreSetter } from '@/stores/types';
import type { GatewayStatus } from '@/types/gateway';
import type { GatewayStore, GatewayStoreAction, GatewayHealth } from './types';

type Setter = StoreSetter<GatewayStore>;
type Getter = StoreGetter<GatewayStore>;

let gatewayInitPromise: Promise<void> | null = null;
let gatewayEventUnsubscribers: Array<() => void> | null = null;

function extractPetTerminalLine(message: Record<string, unknown>): string | null {
  const content = message.content;

  if (Array.isArray(content)) {
    for (const block of content) {
      if (typeof block !== 'object' || block === null) continue;
      const b = block as Record<string, unknown>;
      if (b.type === 'tool_use' || b.type === 'toolCall') {
        const toolName = String(b.name ?? b.function ?? '');
        const input = typeof b.input === 'object' && b.input !== null ? b.input as Record<string, unknown> : {};
        const cmd = input.command ?? input.cmd ?? input.script ?? input.code;
        if (cmd) return `$ ${String(cmd).split('\n')[0].slice(0, 60)}`;
        const filePath = input.path ?? input.file_path ?? input.filepath;
        if (filePath) return `› ${toolName} ${String(filePath).split(/[\\/]/).slice(-2).join('/')}`;
        if (toolName) return `› ${toolName}`;
      }
    }
    for (let i = content.length - 1; i >= 0; i--) {
      const block = content[i] as Record<string, unknown>;
      if (typeof block !== 'object' || block === null) continue;
      if (block.type === 'text' && typeof block.text === 'string') {
        const lastLine = block.text.trim().split('\n').filter(Boolean).pop() ?? '';
        if (lastLine) return lastLine.slice(0, 72);
      }
    }
  }

  if (typeof content === 'string' && content.trim()) {
    const lastLine = content.trim().split('\n').filter(Boolean).pop() ?? '';
    if (lastLine) return lastLine.slice(0, 72);
  }

  const toolCalls = (message.tool_calls ?? message.toolCalls) as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(toolCalls) && toolCalls.length > 0) {
    const tc = toolCalls[0] as Record<string, unknown>;
    const fn = tc.function as Record<string, unknown> | undefined;
    const toolName = String(fn?.name ?? tc.name ?? '');
    try {
      const args = JSON.parse(String(fn?.arguments ?? '{}')) as Record<string, unknown>;
      const cmd = args.command ?? args.cmd ?? args.script;
      if (cmd) return `$ ${String(cmd).split('\n')[0].slice(0, 60)}`;
    } catch {
      // ignore
    }
    if (toolName) return `› ${toolName}`;
  }

  return null;
}

function pushPetLineFromMessage(msg: unknown): void {
  if (!msg || typeof msg !== 'object') return;
  const line = extractPetTerminalLine(msg as Record<string, unknown>);
  if (line) {
    void invokeIpc('pet:pushTerminalLine', line).catch(() => {});
  }
}

function mapChannelStatus(status: string): 'connected' | 'connecting' | 'disconnected' | 'error' {
  switch (status) {
    case 'connected':
    case 'running':
      return 'connected';
    case 'connecting':
    case 'starting':
      return 'connecting';
    case 'error':
    case 'failed':
      return 'error';
    default:
      return 'disconnected';
  }
}

export class GatewayActionImpl {
  readonly #get: Getter;
  readonly #set: Setter;

  constructor(set: Setter, get: Getter, _api?: unknown) {
    void _api;
    this.#set = set;
    this.#get = get;
  }

  readonly #handleGatewayNotification = (notification: { method?: string; params?: Record<string, unknown> } | undefined): void => {
    const payload = notification;
    if (!payload || payload.method !== 'agent' || !payload.params || typeof payload.params !== 'object') {
      return;
    }

    const p = payload.params;
    const data = (p.data && typeof p.data === 'object') ? (p.data as Record<string, unknown>) : {};
    const hasChatData = (p.state ?? data.state) || (p.message ?? data.message);

    if (hasChatData) {
      const normalizedEvent: Record<string, unknown> = {
        ...p,
        ...data,
        message: p.message ?? data.message,
      };
      pushPetLineFromMessage(normalizedEvent.message);
    }
  };

  readonly #handleGatewayChatMessage = (_data: unknown): void => {
    // Gateway chat messages are no longer consumed — Code Agent uses its own event stream.
  };

  init = async () => {
    if (this.#get().isInitialized) return;
    if (gatewayInitPromise) {
      await gatewayInitPromise;
      return;
    }

    gatewayInitPromise = (async () => {
      try {
        const status = await hostApiFetch<GatewayStatus>('/api/gateway/status');
        this.#set({ status, isInitialized: true });

        if (!gatewayEventUnsubscribers) {
          const unsubscribers: Array<() => void> = [];
          unsubscribers.push(subscribeHostEvent<GatewayStatus>('gateway:status', (payload) => {
            this.#set({ status: payload });
          }));
          unsubscribers.push(subscribeHostEvent<{ message?: string }>('gateway:error', (payload) => {
            this.#set({ lastError: payload.message || 'Gateway error' });
          }));
          unsubscribers.push(subscribeHostEvent<{ method?: string; params?: Record<string, unknown> }>(
            'gateway:notification',
            (payload) => {
              this.#handleGatewayNotification(payload);
            },
          ));
          unsubscribers.push(subscribeHostEvent('gateway:chat-message', (payload) => {
            this.#handleGatewayChatMessage(payload);
          }));
          unsubscribers.push(subscribeHostEvent<{ channelId?: string; status?: string }>(
            'gateway:channel-status',
            (update) => {
              import('../channels')
                .then(({ useChannelsStore }) => {
                  if (!update.channelId || !update.status) return;
                  const state = useChannelsStore.getState();
                  const channel = state.channels.find((item) => item.type === update.channelId);
                  if (channel) {
                    const newStatus = mapChannelStatus(update.status);
                    state.updateChannel(channel.id, { status: newStatus });

                    if (newStatus === 'disconnected' || newStatus === 'error') {
                      state.scheduleAutoReconnect(channel.id);
                    } else if (newStatus === 'connected' || newStatus === 'connecting') {
                      state.clearAutoReconnect(channel.id);
                    }
                  }
                })
                .catch(() => {});
            },
          ));
          gatewayEventUnsubscribers = unsubscribers;
        }
      } catch (error) {
        console.error('Failed to initialize Gateway:', error);
        this.#set({ lastError: String(error) });
      } finally {
        gatewayInitPromise = null;
      }
    })();

    await gatewayInitPromise;
  };

  start = async () => {
    try {
      this.#set({ status: { ...this.#get().status, state: 'starting' }, lastError: null });
      const result = await hostApiFetch<{ success: boolean; error?: string }>('/api/gateway/start', {
        method: 'POST',
      });
      if (!result.success) {
        this.#set({
          status: { ...this.#get().status, state: 'error', error: result.error },
          lastError: result.error || 'Failed to start Gateway',
        });
      }
    } catch (error) {
      this.#set({
        status: { ...this.#get().status, state: 'error', error: String(error) },
        lastError: String(error),
      });
    }
  };

  stop = async () => {
    try {
      await hostApiFetch('/api/gateway/stop', { method: 'POST' });
      this.#set({ status: { ...this.#get().status, state: 'stopped' }, lastError: null });
    } catch (error) {
      console.error('Failed to stop Gateway:', error);
      this.#set({ lastError: String(error) });
    }
  };

  restart = async () => {
    try {
      this.#set({ status: { ...this.#get().status, state: 'starting' }, lastError: null });
      const result = await hostApiFetch<{ success: boolean; error?: string }>('/api/gateway/restart', {
        method: 'POST',
      });
      if (!result.success) {
        this.#set({
          status: { ...this.#get().status, state: 'error', error: result.error },
          lastError: result.error || 'Failed to restart Gateway',
        });
      }
    } catch (error) {
      this.#set({
        status: { ...this.#get().status, state: 'error', error: String(error) },
        lastError: String(error),
      });
    }
  };

  checkHealth = async () => {
    try {
      const result = await hostApiFetch<GatewayHealth>('/api/gateway/health');
      this.#set({ health: result });
      return result;
    } catch (error) {
      const health: GatewayHealth = { ok: false, error: String(error) };
      this.#set({ health });
      return health;
    }
  };

  rpc = async <T>(method: string, params?: unknown, timeoutMs?: number): Promise<T> => {
    const response = await invokeIpc<{
      success: boolean;
      result?: T;
      error?: string;
    }>('gateway:rpc', method, params, timeoutMs);
    if (!response.success) {
      throw new Error(response.error || `Gateway RPC failed: ${method}`);
    }
    return response.result as T;
  };

  setStatus: GatewayStoreAction['setStatus'] = (status) => this.#set({ status });

  clearError = () => this.#set({ lastError: null });
}

export type GatewayAction = StorePublicActions<GatewayActionImpl>;

export const createGatewaySlice = (set: Setter, get: Getter, api?: unknown): GatewayStoreAction =>
  new GatewayActionImpl(set, get, api);
