import type { ActionHandlerContext } from '../context';

export function handleMainTokenAction({ currentTopicTokens, editor }: ActionHandlerContext) {
  editor?.insertTextAtCursor(`\n[estimated tokens: ${currentTopicTokens}]`);
}
