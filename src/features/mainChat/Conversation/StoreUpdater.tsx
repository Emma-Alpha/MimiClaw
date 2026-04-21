import { useEffect } from 'react';
import { useChatStore } from '@/stores/chat';
import { useConversationContext } from './ConversationProvider';

export function ConversationStoreUpdater() {
  const { sessionId, topicId } = useConversationContext();
  const currentSessionKey = useChatStore((s) => s.currentSessionKey);
  const currentTopicId = useChatStore((s) => s.currentTopicId);
  const mode = useChatStore((s) => s.mode);
  const setChatMode = useChatStore((s) => s.setChatMode);
  const switchSession = useChatStore((s) => s.switchSession);
  const switchTopic = useChatStore((s) => s.switchTopic);

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

  return null;
}
