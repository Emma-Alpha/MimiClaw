import type { StoreGetter, StorePublicActions, StoreSetter } from '@/stores/types';
import type { VoiceChatSessionsStore, VoiceChatSessionsStoreAction } from './types';

type Setter = StoreSetter<VoiceChatSessionsStore>;
type Getter = StoreGetter<VoiceChatSessionsStore>;

export class VoiceChatSessionsActionImpl {
  readonly #set: Setter;

  constructor(set: Setter, get: Getter, _api?: unknown) {
    void get;
    void _api;
    this.#set = set;
  }

  setLoading = (loading: boolean) => this.#set({ loading });

  setSessions: VoiceChatSessionsStoreAction['setSessions'] = (sessions, syncedAt) =>
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
          : sessions[0]?.id ?? null,
    };
    });

  setSyncError: VoiceChatSessionsStoreAction['setSyncError'] = (syncError) =>
    this.#set({ syncError, loading: false });

  setActiveSessionId: VoiceChatSessionsStoreAction['setActiveSessionId'] = (activeSessionId) =>
    this.#set({ activeSessionId });
}

export type VoiceChatSessionsAction = StorePublicActions<VoiceChatSessionsActionImpl>;

export const createVoiceChatSessionsSlice = (
  set: Setter,
  get: Getter,
  api?: unknown,
): VoiceChatSessionsStoreAction => new VoiceChatSessionsActionImpl(set, get, api);
