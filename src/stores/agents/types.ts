import type { AgentSummary, AgentsSnapshot } from '@/types/agent';
import type { ChannelType } from '@/types/channel';

export interface AgentsStoreState {
  agents: AgentSummary[];
  defaultAgentId: string;
  configuredChannelTypes: string[];
  channelOwners: Record<string, string>;
  channelAccountOwners: Record<string, string>;
  loading: boolean;
  error: string | null;
}

export interface AgentsStoreAction {
  fetchAgents: () => Promise<void>;
  createAgent: (name: string) => Promise<void>;
  updateAgent: (agentId: string, name: string) => Promise<void>;
  deleteAgent: (agentId: string) => Promise<void>;
  assignChannel: (agentId: string, channelType: ChannelType) => Promise<void>;
  removeChannel: (agentId: string, channelType: ChannelType) => Promise<void>;
  clearError: () => void;
}

export type AgentsStore = AgentsStoreState & AgentsStoreAction;

export type AgentsSnapshotResponse = AgentsSnapshot & { success?: boolean };
