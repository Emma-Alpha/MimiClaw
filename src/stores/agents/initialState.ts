import type { AgentsStoreState } from './types';

export const initialAgentsState: AgentsStoreState = {
  agents: [],
  defaultAgentId: 'main',
  configuredChannelTypes: [],
  channelOwners: {},
  channelAccountOwners: {},
  loading: false,
  error: null,
};
