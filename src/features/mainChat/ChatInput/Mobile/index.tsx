import { Flexbox } from '@lobehub/ui';
import { ChatInput, ChatInputActionBar } from '@lobehub/editor/react';
import { createStyles } from 'antd-style';
import { ChatInputActionBar as MimiActionBar } from '../ActionBar';
import { InputEditor } from '../InputEditor';
import { SendArea } from '../SendArea';
import { useChatInputContext } from '../ChatInputProvider';

const useStyles = createStyles(({ css }) => ({
  chatInput: css`
    overflow: hidden;
  `,
}));

export function MobileChatInput() {
  const { styles } = useStyles();
  const { leftContent } = useChatInputContext();
  return (
    <div style={{ padding: '8px 12px 12px' }}>
      <Flexbox gap={6}>
        <ChatInput
          className={styles.chatInput}
          footer={
            <ChatInputActionBar
              left={<div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>{leftContent ?? <MimiActionBar />}</div>}
              right={<div style={{ marginRight: 12 }}><SendArea /></div>}
            />
          }
          maxHeight={240}
          minHeight={36}
        >
          <InputEditor />
        </ChatInput>
      </Flexbox>
    </div>
  );
}
