import { createStyles } from 'antd-style';
import { useCallback, useRef } from 'react';
import type { TextAreaRef } from 'antd/es/input/TextArea';
import { Textarea } from '@/components/ui/textarea';
import { useChatInputContext } from '../ChatInputProvider';

const useStyles = createStyles(({ token, css }) => ({
  editor: css`
    border: 1px solid ${token.colorBorderSecondary};
    border-radius: ${token.borderRadiusLG}px;
    background: ${token.colorBgContainer};
    min-height: 88px;

    .ant-input {
      border: 0;
      box-shadow: none;
      padding: 10px 12px;
      resize: none;
    }
  `,
}));

export function InputEditor() {
  const { styles } = useStyles();
  const { disabled, setEditor, setMarkdown } = useChatInputContext();
  const textAreaRef = useRef<TextAreaRef | null>(null);

  const handleRef = useCallback(
    (instance: TextAreaRef | null) => {
      textAreaRef.current = instance;
      setEditor(instance?.resizableTextArea?.textArea ?? null);
    },
    [setEditor],
  );

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      setMarkdown(event.target.value);
    },
    [setMarkdown],
  );

  return (
    <div className={styles.editor} data-chat-input-editor="true">
      <Textarea
        autoFocus
        autoSize={{ maxRows: 8, minRows: 3 }}
        disabled={disabled}
        onChange={handleChange}
        placeholder="Send a message..."
        ref={handleRef}
      />
    </div>
  );
}
