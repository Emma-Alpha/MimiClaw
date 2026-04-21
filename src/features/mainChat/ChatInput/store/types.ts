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
  /**
   * Override label shown on the left side of RuntimeConfig.
   * When undefined, falls back to the default Local/Cloud label.
   */
  runtimeLeftLabel?: string;
  /**
   * Override label shown on the right side of RuntimeConfig.
   * When undefined, falls back to the default auto-approve label.
   */
  runtimeRightLabel?: string;
  searchEnabled: boolean;
  showTypoBar: boolean;
  slashPlacement: 'top' | 'bottom';
}

export interface ChatInputStoreAction {
  setHistoryCount: (count: number) => void;
  setMemoryTurnEnabled: (enabled: boolean) => void;
  setModelParams: (params: ChatInputModelParams) => void;
  setRuntimeLabels: (left: string | undefined, right: string | undefined) => void;
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
