import type { ActionHandlerContext } from '../context';

function formatMentionLabel(label: string) {
  return label.startsWith('@') ? label : `@${label}`;
}

export function handleMentionAction({ editor, mentionItems }: ActionHandlerContext) {
  const firstMention = mentionItems[0];
  if (!firstMention) return;
  editor?.insertTextAtCursor(`${formatMentionLabel(firstMention.label)} `);
}
