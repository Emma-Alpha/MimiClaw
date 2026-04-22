import { Tag } from '@lobehub/ui';
import { memo } from 'react';
import { useChatStore, topicSelectors } from '@/stores/chat';

export const TokenDisplay = memo(() => {
  const tokens = useChatStore(topicSelectors.currentTopicTokens);

  return <Tag>{`${tokens} tokens`}</Tag>;
});
