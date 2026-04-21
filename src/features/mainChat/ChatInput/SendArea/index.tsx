import { ActionIcon, Flexbox } from '@lobehub/ui';
import { Expand, Minimize2, Send, Square } from 'lucide-react';
import { useCallback } from 'react';
import { useChatInputContext } from '../ChatInputProvider';

export function SendArea() {
  const { allowExpand, attachments, clearAttachments, disabled, editor, expanded, onSend, onStop, sending, setExpanded } = useChatInputContext();

  const handleSend = useCallback(async () => {
    if (!editor || !onSend) return;
    await onSend({
      attachments,
      clearAttachments,
      clearContent: editor.clearContent,
      getMarkdownContent: editor.getMarkdownContent,
      getEditorData: editor.getEditorData,
    });
  }, [attachments, clearAttachments, editor, onSend]);

  return (
    <Flexbox align="center" gap={8} horizontal justify="space-between">
      {allowExpand ? (
        <ActionIcon
          icon={expanded ? Minimize2 : Expand}
          onClick={() => setExpanded(!expanded)}
          title={expanded ? 'Exit fullscreen' : 'Expand editor'}
        />
      ) : <span />}
      <ActionIcon
        disabled={disabled}
        icon={sending ? Square : Send}
        onClick={sending ? onStop : () => void handleSend()}
        title={sending ? 'Stop generation' : 'Send message'}
      />
    </Flexbox>
  );
}
