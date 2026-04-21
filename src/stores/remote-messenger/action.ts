import type { StoreGetter, StorePublicActions, StoreSetter } from '@/stores/types';
import type { RemoteMessengerStore, RemoteMessengerStoreAction } from './types';

type Setter = StoreSetter<RemoteMessengerStore>;
type Getter = StoreGetter<RemoteMessengerStore>;

export class RemoteMessengerActionImpl {
  readonly #set: Setter;

  constructor(set: Setter, get: Getter, _api?: unknown) {
    void get;
    void _api;
    this.#set = set;
  }

  setLoading = (loading: boolean) => this.#set({ loading });

  setSessions: RemoteMessengerStoreAction['setSessions'] = (sessions, syncedAt) =>
    this.#set((state) => {
    const knownIds = new Set(sessions.map((session) => session.id));
    const fallbackActiveId = sessions[0]?.id ?? null;
    return {
      sessions,
      lastSyncedAt: syncedAt,
      loading: false,
      syncError: null,
      activeSessionId:
        state.activeSessionId && knownIds.has(state.activeSessionId)
          ? state.activeSessionId
          : fallbackActiveId,
    };
    });

  setSyncError: RemoteMessengerStoreAction['setSyncError'] = (syncError) =>
    this.#set({ syncError, loading: false });

  setActiveSessionId: RemoteMessengerStoreAction['setActiveSessionId'] = (activeSessionId) =>
    this.#set({ activeSessionId });
}

export type RemoteMessengerAction = StorePublicActions<RemoteMessengerActionImpl>;

export const createRemoteMessengerSlice = (
  set: Setter,
  get: Getter,
  api?: unknown,
): RemoteMessengerStoreAction => new RemoteMessengerActionImpl(set, get, api);
