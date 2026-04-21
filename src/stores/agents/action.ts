import { hostApiFetch } from '@/lib/host-api';
import type { StoreGetter, StorePublicActions, StoreSetter } from '@/stores/types';
import type { AgentsStore, AgentsStoreAction, AgentsSnapshotResponse } from './types';

type Setter = StoreSetter<AgentsStore>;
type Getter = StoreGetter<AgentsStore>;

function applySnapshot(snapshot: AgentsSnapshotResponse | undefined) {
  return snapshot ? {
    agents: snapshot.agents ?? [],
    defaultAgentId: snapshot.defaultAgentId ?? 'main',
    configuredChannelTypes: snapshot.configuredChannelTypes ?? [],
    channelOwners: snapshot.channelOwners ?? {},
    channelAccountOwners: snapshot.channelAccountOwners ?? {},
  } : {};
}

export class AgentsActionImpl {
  readonly #get: Getter;
  readonly #set: Setter;

  constructor(set: Setter, get: Getter, _api?: unknown) {
    void _api;
    this.#set = set;
    this.#get = get;
  }

  fetchAgents = async () => {
    this.#set({ loading: true, error: null });
    try {
      const snapshot = await hostApiFetch<AgentsSnapshotResponse>('/api/agents');
      this.#set({
        ...applySnapshot(snapshot),
        loading: false,
      });
    } catch (error) {
      this.#set({ loading: false, error: String(error) });
    }
  };

  createAgent = async (name: string) => {
    this.#set({ error: null });
    try {
      const snapshot = await hostApiFetch<AgentsSnapshotResponse>('/api/agents', {
        method: 'POST',
        body: JSON.stringify({ name }),
      });
      this.#set(applySnapshot(snapshot));
    } catch (error) {
      this.#set({ error: String(error) });
      throw error;
    }
  };

  updateAgent = async (agentId: string, name: string) => {
    this.#set({ error: null });
    try {
      const snapshot = await hostApiFetch<AgentsSnapshotResponse>(
        `/api/agents/${encodeURIComponent(agentId)}`,
        {
          method: 'PUT',
          body: JSON.stringify({ name }),
        },
      );
      this.#set(applySnapshot(snapshot));
    } catch (error) {
      this.#set({ error: String(error) });
      throw error;
    }
  };

  deleteAgent = async (agentId: string) => {
    this.#set({ error: null });
    try {
      const snapshot = await hostApiFetch<AgentsSnapshotResponse>(
        `/api/agents/${encodeURIComponent(agentId)}`,
        { method: 'DELETE' },
      );
      this.#set(applySnapshot(snapshot));
    } catch (error) {
      this.#set({ error: String(error) });
      throw error;
    }
  };

  assignChannel: AgentsStoreAction['assignChannel'] = async (agentId, channelType) => {
    this.#set({ error: null });
    try {
      const snapshot = await hostApiFetch<AgentsSnapshotResponse>(
        `/api/agents/${encodeURIComponent(agentId)}/channels/${encodeURIComponent(channelType)}`,
        { method: 'PUT' },
      );
      this.#set(applySnapshot(snapshot));
    } catch (error) {
      this.#set({ error: String(error) });
      throw error;
    }
  };

  removeChannel: AgentsStoreAction['removeChannel'] = async (agentId, channelType) => {
    this.#set({ error: null });
    try {
      const snapshot = await hostApiFetch<AgentsSnapshotResponse>(
        `/api/agents/${encodeURIComponent(agentId)}/channels/${encodeURIComponent(channelType)}`,
        { method: 'DELETE' },
      );
      this.#set(applySnapshot(snapshot));
    } catch (error) {
      this.#set({ error: String(error) });
      throw error;
    }
  };

  clearError = () => this.#set({ error: null });

  protected getState = () => this.#get();
}

export type AgentsAction = StorePublicActions<AgentsActionImpl>;

export const createAgentsSlice = (set: Setter, get: Getter, api?: unknown): AgentsStoreAction =>
  new AgentsActionImpl(set, get, api);
