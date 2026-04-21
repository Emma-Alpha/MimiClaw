import { useEffect } from 'react';
import {
  dataSelectors as chatDataSelectors,
  messageStateSelectors as chatMessageStateSelectors,
  useChatStore,
} from '@/stores/chat';
import { useConversationContext } from './ConversationProvider';
import { useConversationStore } from './store';

export function ConversationStoreUpdater() {
  const { sessionId, topicId } = useConversationContext();
  const currentSessionKey = useChatStore((s) => s.currentSessionKey);
  const currentTopicId = useChatStore((s) => s.currentTopicId);
  const mode = useChatStore((s) => s.mode);
  const dbMessages = useChatStore(chatDataSelectors.dbMessages);
  const pendingInterventions = useChatStore(chatDataSelectors.pendingInterventions);
  const isInputLoading = useChatStore(chatMessageStateSelectors.isInputLoading);
  const sendMessageError = useChatStore(chatMessageStateSelectors.sendMessageError);
  const setChatMode = useChatStore((s) => s.setChatMode);
  const switchSession = useChatStore((s) => s.switchSession);
  const switchTopic = useChatStore((s) => s.switchTopic);
  const setMessages = useConversationStore((s) => s.setMessages);
  const setMessageState = useConversationStore((s) => s.setMessageState);
  const setPendingInterventions = useConversationStore((s) => s.setPendingInterventions);
  const resetConversationStore = useConversationStore((s) => s.reset);

  useEffect(() => {
    if (mode !== 'chat') {
      setChatMode('chat');
    }
  }, [mode, setChatMode]);

  useEffect(() => {
    if (sessionId && sessionId !== currentSessionKey) {
      switchSession(sessionId);
    }
  }, [currentSessionKey, sessionId, switchSession]);

  useEffect(() => {
    if (topicId !== currentTopicId) {
      switchTopic(topicId);
    }
  }, [currentTopicId, switchTopic, topicId]);

  useEffect(() => {
    setMessages(dbMessages);
  }, [dbMessages, setMessages]);

  useEffect(() => {
    setPendingInterventions(pendingInterventions);
  }, [pendingInterventions, setPendingInterventions]);

  useEffect(() => {
    setMessageState({
      isInputLoading,
      sendMessageError,
    });
  }, [isInputLoading, sendMessageError, setMessageState]);

  useEffect(() => () => {
    resetConversationStore();
  }, [resetConversationStore]);

  return null;
}
