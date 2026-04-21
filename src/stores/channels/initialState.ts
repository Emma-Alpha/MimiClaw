import type { ChannelsStoreState } from './types';

export const initialChannelsState: ChannelsStoreState = {
  channels: [],
  loading: false,
  error: null,
};
