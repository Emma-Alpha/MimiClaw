import { createContext, useContext, useMemo, type PropsWithChildren } from 'react';
import { useAgentsStore } from '@/stores/agents';
import { useChatStore } from '@/stores/chat';
import type { ChatInputActionKey, MentionItem } from '../ChatInput/types';

export interface ConversationContextValue {
  agentId: string;
  leftActions?: ChatInputActionKey[];
  mentionItems: MentionItem[];
  rightActions?: ChatInputActionKey[];
  sessionId: string;
  topicId: string | null;
  sendMessage: ReturnType<typeof useChatStore.getState>['sendMessage'];
  stopGenerating: ReturnType<typeof useChatStore.getState>['abortRun'];
  error: string | null;
  isInputLoading: boolean;
}

const DEFAULT_LEFT_ACTIONS: ChatInputActionKey[] = ['fileUpload'];
const DEFAULT_RIGHT_ACTIONS: ChatInputActionKey[] = [];

const ConversationContext = createContext<ConversationContextValue | null>(null);

export interface ConversationProviderProps extends PropsWithChildren {
  agentId: string;
  leftActions?: ChatInputActionKey[];
  rightActions?: ChatInputActionKey[];
  sessionId: string;
  topicId: string | null;
}

export function ConversationProvider({
  agentId,
  leftActions = DEFAULT_LEFT_ACTIONS,
  rightActions = DEFAULT_RIGHT_ACTIONS,
  sessionId,
  topicId,
  children,
}: ConversationProviderProps) {
  const agents = useAgentsStore((s) => s.agents);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const stopGenerating = useChatStore((s) => s.abortRun);
  const error = useChatStore((s) => s.error);
  const isInputLoading = useChatStore((s) => s.loading || s.sending);

  const mentionItems = useMemo(
    () => agents
      .filter((agent) => agent.id !== agentId)
      .map((agent) => ({
        id: agent.id,
        label: `@${agent.name || agent.id}`,
        description: agent.id,
      })),
    [agentId, agents],
  );

  const value = useMemo(() => ({
    agentId,
    leftActions,
    mentionItems,
    rightActions,
    sessionId,
    topicId,
    sendMessage,
    stopGenerating,
    error,
    isInputLoading,
  }), [agentId, error, isInputLoading, leftActions, mentionItems, rightActions, sendMessage, sessionId, stopGenerating, topicId]);

  return <ConversationContext.Provider value={value}>{children}</ConversationContext.Provider>;
}

export function useConversationContext() {
  const context = useContext(ConversationContext);
  if (!context) {
    throw new Error('useConversationContext must be used within ConversationProvider');
  }
  return context;
}

