import type { ActionHandlerContext } from '../context';

export function handleClearAction({
  clearAttachments,
  clearCurrentTopic,
  currentTopicId,
  editor,
}: ActionHandlerContext) {
  clearCurrentTopic(currentTopicId);
  editor?.clearContent();
  clearAttachments();
}
