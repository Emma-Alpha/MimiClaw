import { SendButton } from '@lobehub/editor/react';
import { useCallback } from 'react';
import { useChatInputContext } from '../ChatInputProvider';

export function SendArea() {
  const { attachments, clearAttachments, disabled, editor, onSend, onStop, sending } = useChatInputContext();

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
    <SendButton
      disabled={disabled}
      generating={sending}
      onClick={() => void handleSend()}
      onStop={onStop}
    />
  );
}
