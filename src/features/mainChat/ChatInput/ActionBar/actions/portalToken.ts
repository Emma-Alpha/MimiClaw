import type { ActionHandlerContext } from '../context';

export function handlePortalTokenAction({ currentTopicTokens, editor }: ActionHandlerContext) {
  editor?.insertTextAtCursor(`\n[portal estimated tokens: ${currentTopicTokens}]`);
}
