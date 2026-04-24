import { Sparkles } from 'lucide-react';
import { useCallback } from 'react';
import { useChatStore, topicSelectors } from '@/stores/chat';
import { useChatInputContext } from '../../ChatInputProvider';
import { ActionWrapper } from './ActionWrapper';

export function PortalTokenAction() {
  const { editor } = useChatInputContext();
  const currentTopicTokens = useChatStore(topicSelectors.currentTopicTokens);

  const handleClick = useCallback(() => {
    editor?.insertTextAtCursor(`\n[portal estimated tokens: ${currentTopicTokens}]`);
  }, [currentTopicTokens, editor]);

  return <ActionWrapper icon={Sparkles} onClick={handleClick} title="Portal token usage" />;
}
