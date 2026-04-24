import { PlusSquare } from 'lucide-react';
import { useCallback } from 'react';
import { useChatStore } from '@/stores/chat';
import { useChatInputContext } from '../../ChatInputProvider';
import { ActionWrapper } from './ActionWrapper';

export function SaveTopicAction() {
  const { agentId } = useChatInputContext();
  const createTopic = useChatStore((s) => s.createTopic);
  const currentSessionKey = useChatStore((s) => s.currentSessionKey);
  const currentTopicId = useChatStore((s) => s.currentTopicId);

  const handleClick = useCallback(() => {
    if (currentTopicId) return;
    createTopic(currentSessionKey, `Topic for ${agentId}`);
  }, [agentId, createTopic, currentSessionKey, currentTopicId]);

  return <ActionWrapper icon={PlusSquare} onClick={handleClick} title="Save topic" />;
}
