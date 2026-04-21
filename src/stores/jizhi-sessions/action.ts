import type { StoreGetter, StorePublicActions, StoreSetter } from '@/stores/types';
import type { JizhiSessionsStore, JizhiSessionsStoreAction } from './types';

type Setter = StoreSetter<JizhiSessionsStore>;
type Getter = StoreGetter<JizhiSessionsStore>;

export class JizhiSessionsActionImpl {
  readonly #set: Setter;

  constructor(set: Setter, get: Getter, _api?: unknown) {
    void get;
    void _api;
    this.#set = set;
  }

  setLoading = (loading: boolean) => this.#set({ loading });

  setSessions: JizhiSessionsStoreAction['setSessions'] = (sessions, syncedAt) =>
    this.#set((state) => {
    const knownIds = new Set(sessions.map((session) => session.id));
    return {
      sessions,
      lastSyncedAt: syncedAt,
      loading: false,
      syncError: null,
      activeSessionId:
        state.activeSessionId && knownIds.has(state.activeSessionId)
          ? state.activeSessionId
          : (sessions[0]?.id ?? null),
    };
    });

  setSyncError: JizhiSessionsStoreAction['setSyncError'] = (syncError) =>
    this.#set({ syncError, loading: false });

  setActiveSessionId: JizhiSessionsStoreAction['setActiveSessionId'] = (activeSessionId) =>
    this.#set({ activeSessionId });
}

export type JizhiSessionsAction = StorePublicActions<JizhiSessionsActionImpl>;

export const createJizhiSessionsSlice = (
  set: Setter,
  get: Getter,
  api?: unknown,
): JizhiSessionsStoreAction => new JizhiSessionsActionImpl(set, get, api);
