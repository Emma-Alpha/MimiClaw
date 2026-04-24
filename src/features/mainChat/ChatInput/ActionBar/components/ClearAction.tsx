import { Eraser } from 'lucide-react';
import { useCallback } from 'react';
import { useChatStore } from '@/stores/chat';
import { useChatInputContext } from '../../ChatInputProvider';
import { ActionWrapper } from './ActionWrapper';

export function ClearAction() {
  const { clearAttachments, editor } = useChatInputContext();
  const clearCurrentTopic = useChatStore((s) => s.clearCurrentTopic);
  const currentTopicId = useChatStore((s) => s.currentTopicId);

  const handleClick = useCallback(() => {
    clearCurrentTopic(currentTopicId);
    editor?.clearContent();
    clearAttachments();
  }, [clearAttachments, clearCurrentTopic, currentTopicId, editor]);

  return <ActionWrapper icon={Eraser} onClick={handleClick} title="Clear topic" />;
}
