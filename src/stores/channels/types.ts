import type { Channel, ChannelType } from '@/types/channel';

export interface AddChannelParams {
  type: ChannelType;
  name: string;
  token?: string;
}

export interface ChannelsStoreState {
  channels: Channel[];
  loading: boolean;
  error: string | null;
}

export interface ChannelsStoreAction {
  fetchChannels: () => Promise<void>;
  addChannel: (params: AddChannelParams) => Promise<Channel>;
  deleteChannel: (channelId: string) => Promise<void>;
  connectChannel: (channelId: string) => Promise<void>;
  disconnectChannel: (channelId: string) => Promise<void>;
  requestQrCode: (channelType: ChannelType) => Promise<{ qrCode: string; sessionId: string }>;
  setChannels: (channels: Channel[]) => void;
  updateChannel: (channelId: string, updates: Partial<Channel>) => void;
  clearError: () => void;
  scheduleAutoReconnect: (channelId: string) => void;
  clearAutoReconnect: (channelId: string) => void;
}

export type ChannelsStore = ChannelsStoreState & ChannelsStoreAction;
