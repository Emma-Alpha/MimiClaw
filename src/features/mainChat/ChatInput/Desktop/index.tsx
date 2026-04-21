import { ActionIcon, Block, Flexbox } from '@lobehub/ui';
import { createStyles } from 'antd-style';
import { Minimize2 } from 'lucide-react';
import { createPortal } from 'react-dom';
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
  fullscreenMask: css`
    position: fixed;
    inset: 0;
    z-index: 2100;
    background: color-mix(in srgb, ${token.colorBgLayout} 74%, transparent);
    backdrop-filter: blur(10px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
  `,
  fullscreenCard: css`
    width: min(1000px, calc(100vw - 48px));
    max-height: calc(100vh - 48px);
    overflow: auto;
    background: ${token.colorBgContainer};
    border: 1px solid ${token.colorBorderSecondary};
    border-radius: ${token.borderRadiusLG}px;
    box-shadow: ${token.boxShadowSecondary};
    padding: 16px;
  `,
  fullscreenHeader: css`
    display: flex;
    justify-content: flex-end;
  `,
}));

export function DesktopChatInput() {
  const { styles } = useStyles();
  const { expanded, setExpanded } = useChatInputContext();

  const composerBody = (
    <Flexbox gap={12}>
      <RuntimeConfig />
      <ChatInputActionBar />
      <InputEditor />
      <SendArea />
      {expanded ? <TypoBar /> : null}
    </Flexbox>
  );

  return (
    <>
      {!expanded ? (
        <div className={styles.shell}>
          <Block className={styles.composer}>{composerBody}</Block>
        </div>
      ) : null}
      {expanded
        ? createPortal(
          <div className={styles.fullscreenMask}>
            <div className={styles.fullscreenCard}>
              <div className={styles.fullscreenHeader}>
                <ActionIcon
                  icon={Minimize2}
                  onClick={() => setExpanded(false)}
                  title="Exit fullscreen"
                />
              </div>
              {composerBody}
            </div>
          </div>,
          document.body,
        )
        : null}
    </>
  );
}
