import type { ChatInputStoreState } from './types';

export const initialChatInputStoreState: ChatInputStoreState = {
  editor: null,
  editorInstance: null,
  expanded: false,
  historyCount: 0,
  leftActions: [],
  markdown: '',
  memoryTurnEnabled: false,
  modelParams: {
    frequencyPenalty: 0,
    label: 'Balanced',
    temperature: 0.7,
    topP: 1,
  },
  mentionItems: [],
  rightActions: [],
  searchEnabled: false,
  showTypoBar: false,
  slashPlacement: 'top',
  thinkingLevel: 'none',
};
