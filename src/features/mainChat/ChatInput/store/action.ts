import type { StoreGetter, StoreSetter } from '@/stores/types';
import { initialChatInputStoreState } from './initialState';
import type { ChatInputStore, ChatInputStoreAction } from './types';

type Setter = StoreSetter<ChatInputStore>;
type Getter = StoreGetter<ChatInputStore>;

export class ChatInputStoreActionImpl {
  readonly #get: Getter;
  readonly #set: Setter;

  constructor(set: Setter, get: Getter, _api?: unknown) {
    void _api;
    this.#set = set;
    this.#get = get;
  }

  setEditor: ChatInputStoreAction['setEditor'] = (editor) => {
    this.#set({ editor });
  };

  setEditorInstance: ChatInputStoreAction['setEditorInstance'] = (editorInstance) => {
    this.#set({ editorInstance });
  };

  setExpanded: ChatInputStoreAction['setExpanded'] = (expanded) => {
    this.#set({ expanded, showTypoBar: expanded });
  };

  setHistoryCount: ChatInputStoreAction['setHistoryCount'] = (historyCount) => {
    this.#set({ historyCount: Math.max(0, Math.round(historyCount)) });
  };

  setMemoryTurnEnabled: ChatInputStoreAction['setMemoryTurnEnabled'] = (memoryTurnEnabled) => {
    this.#set({ memoryTurnEnabled });
  };

  setModelParams: ChatInputStoreAction['setModelParams'] = (modelParams) => {
    this.#set({ modelParams });
  };

  setSearchEnabled: ChatInputStoreAction['setSearchEnabled'] = (searchEnabled) => {
    this.#set({ searchEnabled });
  };

  setShowTypoBar: ChatInputStoreAction['setShowTypoBar'] = (showTypoBar) => {
    this.#set({ showTypoBar });
  };

  setMarkdown: ChatInputStoreAction['setMarkdown'] = (markdown) => {
    this.#set({ markdown });
  };

  setActionConfig: ChatInputStoreAction['setActionConfig'] = (leftActions, rightActions) => {
    this.#set({ leftActions, rightActions });
  };

  setMentionItems: ChatInputStoreAction['setMentionItems'] = (mentionItems) => {
    this.#set({ mentionItems });
  };

  setRuntimeLabels: ChatInputStoreAction['setRuntimeLabels'] = (runtimeLeftLabel, runtimeRightLabel) => {
    this.#set({ runtimeLeftLabel, runtimeRightLabel });
  };

  setSlashPlacement: ChatInputStoreAction['setSlashPlacement'] = (slashPlacement) => {
    this.#set({ slashPlacement });
  };

  setThinkingLevel: ChatInputStoreAction['setThinkingLevel'] = (thinkingLevel) => {
    this.#set({ thinkingLevel });
  };

  reset: ChatInputStoreAction['reset'] = () => {
    const currentEditor = this.#get().editor;
    const currentEditorInstance = this.#get().editorInstance;
    this.#set({
      ...initialChatInputStoreState,
      editor: currentEditor,
      editorInstance: currentEditorInstance,
    });
  };
}

export const createChatInputStoreSlice = (set: Setter, get: Getter, api?: unknown) =>
  new ChatInputStoreActionImpl(set, get, api);
