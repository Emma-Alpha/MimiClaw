import type { ActionHandlerContext } from '../context';

export function handleSaveTopicAction({
  agentId,
  createTopic,
  currentSessionKey,
  currentTopicId,
}: ActionHandlerContext) {
  if (currentTopicId) return;
  createTopic(currentSessionKey, `Topic for ${agentId}`);
}
