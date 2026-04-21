import type { ChatInputActionKey, ChatInputEditorApi, MentionItem } from '../types';

export interface ChatInputModelParams {
  frequencyPenalty: number;
  label: string;
  temperature: number;
  topP: number;
}

export interface ChatInputStoreState {
  editor: ChatInputEditorApi | null;
  expanded: boolean;
  historyCount: number;
  leftActions: ChatInputActionKey[];
  markdown: string;
  memoryTurnEnabled: boolean;
  modelParams: ChatInputModelParams;
  mentionItems: MentionItem[];
  rightActions: ChatInputActionKey[];
  searchEnabled: boolean;
  showTypoBar: boolean;
  slashPlacement: 'top' | 'bottom';
}

export interface ChatInputStoreAction {
  setHistoryCount: (count: number) => void;
  setMemoryTurnEnabled: (enabled: boolean) => void;
  setModelParams: (params: ChatInputModelParams) => void;
  setSearchEnabled: (enabled: boolean) => void;
  reset: () => void;
  setActionConfig: (left: ChatInputActionKey[], right: ChatInputActionKey[]) => void;
  setEditor: (editor: ChatInputEditorApi | null) => void;
  setExpanded: (expanded: boolean) => void;
  setMarkdown: (markdown: string) => void;
  setMentionItems: (items: MentionItem[]) => void;
  setShowTypoBar: (show: boolean) => void;
  setSlashPlacement: (placement: 'top' | 'bottom') => void;
}

export type ChatInputStore = ChatInputStoreState & ChatInputStoreAction;
