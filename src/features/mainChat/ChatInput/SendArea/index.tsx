import { SendButton } from '@lobehub/editor/react';
import { useCallback } from 'react';
import { createStyles } from 'antd-style';
import { useChatInputContext } from '../ChatInputProvider';

const useStyles = createStyles(({ css }) => ({
  sendButton: css`
    border-radius: 50% !important;

    button {
      border-radius: 50% !important;
    }
  `,
}));

export function SendArea() {
  const { styles } = useStyles();
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
      className={styles.sendButton}
      disabled={disabled}
      generating={sending}
      onClick={() => void handleSend()}
      onStop={onStop}
    />
  );
}
