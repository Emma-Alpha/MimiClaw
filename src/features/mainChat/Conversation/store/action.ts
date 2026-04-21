import type { StoreGetter, StoreSetter } from '@/stores/types';
import { initialConversationStoreState } from './initialState';
import type { ConversationStore, ConversationStoreAction } from './types';

type Setter = StoreSetter<ConversationStore>;
type Getter = StoreGetter<ConversationStore>;

export class ConversationStoreActionImpl {
  readonly #get: Getter;
  readonly #set: Setter;

  constructor(set: Setter, get: Getter, _api?: unknown) {
    void _api;
    this.#set = set;
    this.#get = get;
  }

  setMessages: ConversationStoreAction['setMessages'] = (dbMessages) => {
    this.#set({ dbMessages });
  };

  setPendingInterventions: ConversationStoreAction['setPendingInterventions'] = (pendingInterventions) => {
    this.#set({ pendingInterventions });
  };

  setMessageState: ConversationStoreAction['setMessageState'] = ({
    isInputLoading,
    sendMessageError,
  }) => {
    this.#set({
      isInputLoading,
      sendMessageError,
    });
  };

  reset: ConversationStoreAction['reset'] = () => {
    void this.#get();
    this.#set(initialConversationStoreState);
  };
}

export const createConversationStoreSlice = (set: Setter, get: Getter, api?: unknown) =>
  new ConversationStoreActionImpl(set, get, api);
