import { useMemo } from 'react';
import { useChatStore } from '@/stores/chat';
import { useGatewayStore } from '@/stores/gateway';
import { useSettingsStore } from '@/stores/settings';
import type { ChatInputActionKey } from './ChatInput/types';
import { MainConversationInput } from './Conversation';

export function MainChatInput() {
  const gatewayStatus = useGatewayStore((s) => s.status);
  const currentAgentId = useChatStore((s) => s.currentAgentId);
  const currentSessionKey = useChatStore((s) => s.currentSessionKey);
  const currentTopicId = useChatStore((s) => s.currentTopicId);
  const isDevMode = useSettingsStore((s) => s.preference.isDevMode);

  const leftActions = useMemo<ChatInputActionKey[]>(() => {
    const baseActions: ChatInputActionKey[] = [
      'model',
      'search',
      'memory',
      'agentMode',
      'fileUpload',
      'tools',
      'typo',
      'mainToken',
      'mention',
      'saveTopic',
      'clear',
    ];

    if (isDevMode) {
      baseActions.splice(6, 0, 'params');
    }

    return baseActions;
  }, [isDevMode]);

  const rightActions = useMemo<ChatInputActionKey[]>(() => ['promptTransform'], []);

  return (
    <div style={{ opacity: gatewayStatus.state !== 'running' ? 0.8 : 1 }}>
      <MainConversationInput
        agentId={currentAgentId}
        leftActions={leftActions}
        rightActions={rightActions}
        sessionId={currentSessionKey}
        topicId={currentTopicId}
      />
    </div>
  );
}
