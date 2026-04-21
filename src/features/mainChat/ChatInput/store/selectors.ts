import type { ChatInputStore } from './types';

export const chatInputStoreSelectors = {
  editor: (state: ChatInputStore) => state.editor,
  expanded: (state: ChatInputStore) => state.expanded,
  historyCount: (state: ChatInputStore) => state.historyCount,
  leftActions: (state: ChatInputStore) => state.leftActions,
  markdown: (state: ChatInputStore) => state.markdown,
  memoryTurnEnabled: (state: ChatInputStore) => state.memoryTurnEnabled,
  modelParams: (state: ChatInputStore) => state.modelParams,
  mentionItems: (state: ChatInputStore) => state.mentionItems,
  rightActions: (state: ChatInputStore) => state.rightActions,
  runtimeLeftLabel: (state: ChatInputStore) => state.runtimeLeftLabel,
  runtimeRightLabel: (state: ChatInputStore) => state.runtimeRightLabel,
  searchEnabled: (state: ChatInputStore) => state.searchEnabled,
  showTypoBar: (state: ChatInputStore) => state.showTypoBar,
  slashPlacement: (state: ChatInputStore) => state.slashPlacement,
};
