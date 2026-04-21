import type { ProviderAccount } from '@/stores/providers';
import type { Skill } from '@/types/skill';
import type { ChatInputModelParams } from '../store';
import type { ChatInputEditorApi, MentionItem } from '../types';

export interface ActionHandlerContext {
  agentId: string;
  clearAttachments: () => void;
  clearCurrentTopic: (topicId?: string | null) => void;
  createTopic: (sessionId: string, title?: string) => string;
  currentSessionKey: string;
  currentTopicId: string | null;
  currentTopicTokens: number;
  defaultAccountId: string | null;
  editor: ChatInputEditorApi | null;
  enabledModels: ProviderAccount[];
  historyCount: number;
  isSttEnabled: boolean;
  isSttRecording: boolean;
  isSttTranscribing: boolean;
  memoryEnabled: boolean;
  memoryTurnEnabled: boolean;
  mentionItems: MentionItem[];
  modelParams: ChatInputModelParams;
  mode: 'agent' | 'chat';
  pickFiles: () => Promise<void>;
  promptTransformEnabled: boolean;
  searchEnabled: boolean;
  setHistoryCount: (count: number) => void;
  setChatMode: (mode: 'agent' | 'chat') => void;
  setDefaultAccount: (accountId: string) => Promise<void>;
  setExpanded: (next: boolean) => void;
  setMemoryTurnEnabled: (enabled: boolean) => void;
  setModelParams: (params: ChatInputModelParams) => void;
  setSearchEnabled: (value: boolean) => void;
  skills: Skill[];
  toggleRecording: () => Promise<void>;
  toggleSkillEnabled: (skillId: string) => Promise<void>;
}
