import { hostApiFetch } from '@/lib/host-api';
import {
  isChannelRuntimeConnected,
  pickChannelRuntimeStatus,
  type ChannelRuntimeAccountSnapshot,
} from '@/lib/channel-status';
import { toOpenClawChannelType, toUiChannelType } from '@/lib/channel-alias';
import { useGatewayStore } from '@/stores/gateway';
import type { StoreGetter, StorePublicActions, StoreSetter } from '@/stores/types';
import { CHANNEL_NAMES, type Channel, type ChannelType } from '@/types/channel';
import type { ChannelsStore, ChannelsStoreAction } from './types';

type Setter = StoreSetter<ChannelsStore>;
type Getter = StoreGetter<ChannelsStore>;

const reconnectTimers = new Map<string, NodeJS.Timeout>();
const reconnectAttempts = new Map<string, number>();

function splitChannelId(channelId: string): { channelType: string; accountId?: string } {
  const separatorIndex = channelId.indexOf('-');
  if (separatorIndex === -1) {
    return { channelType: channelId };
  }
  return {
    channelType: channelId.slice(0, separatorIndex),
    accountId: channelId.slice(separatorIndex + 1),
  };
}

export class ChannelsActionImpl {
  readonly #get: Getter;
  readonly #set: Setter;

  constructor(set: Setter, get: Getter, _api?: unknown) {
    void _api;
    this.#set = set;
    this.#get = get;
  }

  fetchChannels = async () => {
    this.#set({ loading: true, error: null });
    try {
      const data = await useGatewayStore.getState().rpc<{
        channelOrder?: string[];
        channels?: Record<string, unknown>;
        channelAccounts?: Record<string, Array<{
          accountId?: string;
          configured?: boolean;
          connected?: boolean;
          running?: boolean;
          lastError?: string;
          name?: string;
          linked?: boolean;
          lastConnectedAt?: number | null;
          lastInboundAt?: number | null;
          lastOutboundAt?: number | null;
          lastProbeAt?: number | null;
          probe?: {
            ok?: boolean;
          } | null;
        }>>;
        channelDefaultAccountId?: Record<string, string>;
      }>('channels.status', { probe: true });
      if (data) {
        const channels: Channel[] = [];
        const channelOrder = data.channelOrder || Object.keys(data.channels || {});
        for (const channelId of channelOrder) {
          const uiChannelId = toUiChannelType(channelId) as ChannelType;
          if (!uiChannelId) continue;
          const gatewayChannelId = toOpenClawChannelType(channelId);
          const summary = (data.channels as Record<string, unknown> | undefined)?.[channelId] as Record<string, unknown> | undefined;
          const configured =
            typeof summary?.configured === 'boolean'
              ? summary.configured
              : typeof (summary as { running?: boolean })?.running === 'boolean'
                ? true
                : false;
          if (!configured) continue;

          const accounts = data.channelAccounts?.[channelId] || [];
          const defaultAccountId = data.channelDefaultAccountId?.[channelId];
          const summarySignal = summary as { error?: string; lastError?: string } | undefined;
          const primaryAccount =
            (defaultAccountId ? accounts.find((a) => a.accountId === defaultAccountId) : undefined)
            || accounts.find((a) => isChannelRuntimeConnected(a as ChannelRuntimeAccountSnapshot))
            || accounts[0];

          const status: Channel['status'] = pickChannelRuntimeStatus(accounts, summarySignal);
          const summaryError =
            typeof summarySignal?.error === 'string'
              ? summarySignal.error
              : typeof summarySignal?.lastError === 'string'
                ? summarySignal.lastError
                : undefined;

          channels.push({
            id: `${uiChannelId}-${primaryAccount?.accountId || 'default'}`,
            type: uiChannelId,
            name: primaryAccount?.name || CHANNEL_NAMES[uiChannelId] || uiChannelId,
            status,
            accountId: primaryAccount?.accountId,
            error:
              (typeof primaryAccount?.lastError === 'string' ? primaryAccount.lastError : undefined)
              || (typeof summaryError === 'string' ? summaryError : undefined),
            metadata: {
              gatewayChannelId,
            },
          });
        }

        this.#set({ channels, loading: false });
      } else {
        this.#set({ channels: [], loading: false });
      }
    } catch {
      this.#set({ channels: [], loading: false });
    }
  };

  addChannel: ChannelsStoreAction['addChannel'] = async (params) => {
    try {
      const result = await useGatewayStore.getState().rpc<Channel>('channels.add', params);

      if (result) {
        this.#set((state) => ({
          channels: [...state.channels, result],
        }));
        return result;
      }

      const newChannel: Channel = {
        id: `local-${Date.now()}`,
        type: params.type,
        name: params.name,
        status: 'disconnected',
      };
      this.#set((state) => ({
        channels: [...state.channels, newChannel],
      }));
      return newChannel;
    } catch {
      const newChannel: Channel = {
        id: `local-${Date.now()}`,
        type: params.type,
        name: params.name,
        status: 'disconnected',
      };
      this.#set((state) => ({
        channels: [...state.channels, newChannel],
      }));
      return newChannel;
    }
  };

  deleteChannel: ChannelsStoreAction['deleteChannel'] = async (channelId) => {
    const { channelType } = splitChannelId(channelId);
    const gatewayChannelType = toOpenClawChannelType(channelType);

    try {
      await hostApiFetch(`/api/channels/config/${encodeURIComponent(channelType)}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Failed to delete channel config:', error);
    }

    try {
      await useGatewayStore.getState().rpc('channels.delete', { channelId: gatewayChannelType });
    } catch (error) {
      console.error('Failed to delete channel from gateway:', error);
    }

    this.#set((state) => ({
      channels: state.channels.filter((c) => c.id !== channelId),
    }));
  };

  connectChannel: ChannelsStoreAction['connectChannel'] = async (channelId) => {
    const { updateChannel } = this.#get();
    updateChannel(channelId, { status: 'connecting', error: undefined });

    try {
      const { channelType, accountId } = splitChannelId(channelId);
      await useGatewayStore.getState().rpc('channels.connect', {
        channelId: `${toOpenClawChannelType(channelType)}${accountId ? `-${accountId}` : ''}`,
      });
      updateChannel(channelId, { status: 'connected' });
    } catch (error) {
      updateChannel(channelId, { status: 'error', error: String(error) });
    }
  };

  disconnectChannel: ChannelsStoreAction['disconnectChannel'] = async (channelId) => {
    const { updateChannel, clearAutoReconnect } = this.#get();
    clearAutoReconnect(channelId);

    try {
      const { channelType, accountId } = splitChannelId(channelId);
      await useGatewayStore.getState().rpc('channels.disconnect', {
        channelId: `${toOpenClawChannelType(channelType)}${accountId ? `-${accountId}` : ''}`,
      });
    } catch (error) {
      console.error('Failed to disconnect channel:', error);
    }

    updateChannel(channelId, { status: 'disconnected', error: undefined });
  };

  requestQrCode: ChannelsStoreAction['requestQrCode'] = async (channelType) => {
    return await useGatewayStore.getState().rpc<{ qrCode: string; sessionId: string }>(
      'channels.requestQr',
      { type: toOpenClawChannelType(channelType) },
    );
  };

  setChannels: ChannelsStoreAction['setChannels'] = (channels) => this.#set({ channels });

  updateChannel: ChannelsStoreAction['updateChannel'] = (channelId, updates) => {
    this.#set((state) => ({
      channels: state.channels.map((channel) =>
        channel.id === channelId ? { ...channel, ...updates } : channel,
      ),
    }));
  };

  clearError = () => this.#set({ error: null });

  scheduleAutoReconnect: ChannelsStoreAction['scheduleAutoReconnect'] = (channelId) => {
    if (reconnectTimers.has(channelId)) return;

    const attempts = reconnectAttempts.get(channelId) || 0;
    const delay = Math.min(5000 * Math.pow(2, attempts), 120000);

    console.log(`[Watchdog] Scheduling auto-reconnect for ${channelId} in ${delay}ms (attempt ${attempts + 1})`);

    const timer = setTimeout(() => {
      reconnectTimers.delete(channelId);
      const state = this.#get();
      const channel = state.channels.find((c) => c.id === channelId);

      if (channel && (channel.status === 'disconnected' || channel.status === 'error')) {
        reconnectAttempts.set(channelId, attempts + 1);
        console.log(`[Watchdog] Executing auto-reconnect for ${channelId} (attempt ${attempts + 1})`);
        state.connectChannel(channelId).catch(() => {});
      }
    }, delay);

    reconnectTimers.set(channelId, timer);
  };

  clearAutoReconnect: ChannelsStoreAction['clearAutoReconnect'] = (channelId) => {
    const timer = reconnectTimers.get(channelId);
    if (timer) {
      clearTimeout(timer);
      reconnectTimers.delete(channelId);
    }
    reconnectAttempts.delete(channelId);
  };
}

export type ChannelsAction = StorePublicActions<ChannelsActionImpl>;

export const createChannelsSlice = (
  set: Setter,
  get: Getter,
  api?: unknown,
): ChannelsStoreAction => new ChannelsActionImpl(set, get, api);
