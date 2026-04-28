import type { ChatInputStoreState, ThinkingLevel } from './types';

const THINKING_LEVEL_STORAGE_KEY = 'mimiclaw:thinking-level';

function readStoredThinkingLevel(): ThinkingLevel {
  try {
    const raw = window.localStorage.getItem(THINKING_LEVEL_STORAGE_KEY);
    if (raw === 'low' || raw === 'medium' || raw === 'high' || raw === 'none') return raw;
  } catch { /* ignore */ }
  return 'none';
}

export function writeStoredThinkingLevel(level: ThinkingLevel): void {
  try {
    window.localStorage.setItem(THINKING_LEVEL_STORAGE_KEY, level);
  } catch { /* ignore */ }
}

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
  thinkingLevel: readStoredThinkingLevel(),
};
