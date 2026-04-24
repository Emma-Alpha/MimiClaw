import { AtSign } from 'lucide-react';
import { useCallback } from 'react';
import { useChatInputContext } from '../../ChatInputProvider';
import { ActionWrapper } from './ActionWrapper';

export function MentionAction() {
  const { editor, mentionItems = [] } = useChatInputContext();

  const handleClick = useCallback(() => {
    const firstMention = mentionItems[0];
    if (!firstMention) return;
    const label = firstMention.label.startsWith('@') ? firstMention.label : `@${firstMention.label}`;
    editor?.insertTextAtCursor(`${label} `);
  }, [editor, mentionItems]);

  return <ActionWrapper icon={AtSign} onClick={handleClick} title="Mention agent" />;
}
