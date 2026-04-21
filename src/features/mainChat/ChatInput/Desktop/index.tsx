import { Block, Flexbox } from '@lobehub/ui';
import { createStyles } from 'antd-style';
import { ChatInputActionBar } from '../ActionBar';
import { InputEditor } from '../InputEditor';
import { RuntimeConfig } from '../RuntimeConfig';
import { SendArea } from '../SendArea';
import { TypoBar } from '../TypoBar';
import { useChatInputContext } from '../ChatInputProvider';

const useStyles = createStyles(({ token, css }) => ({
  shell: css`
    width: 100%;
    max-width: calc(var(--chat-window-content-width, 800px) + (var(--chat-window-side-gap, 16px) * 2));
    margin: 0 auto;
    padding: 8px var(--chat-window-side-gap, 16px) 14px;
  `,
  composer: css`
    background: ${token.colorBgContainer};
    border: 1px solid ${token.colorBorderSecondary};
    border-radius: ${token.borderRadiusLG}px;
    padding: 12px;
    box-shadow: ${token.boxShadowSecondary};
  `,
}));

export function DesktopChatInput() {
  const { styles } = useStyles();
  const { expanded } = useChatInputContext();

  return (
    <div className={styles.shell}>
      <Block className={styles.composer}>
        <Flexbox gap={12}>
          <RuntimeConfig />
          <ChatInputActionBar />
          <InputEditor />
          <SendArea />
          {expanded ? <TypoBar /> : null}
        </Flexbox>
      </Block>
    </div>
  );
}
