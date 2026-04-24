import { ActionIcon, Flexbox } from '@lobehub/ui';
import { ChatInput, ChatInputActionBar } from '@lobehub/editor/react';
import { createStyles, cx } from 'antd-style';
import { Maximize2, Minimize2 } from 'lucide-react';
import { ChatInputActionBar as MimiActionBar } from '../ActionBar';
import { InputEditor } from '../InputEditor';
import { RuntimeConfig } from '../RuntimeConfig';
import { SendArea } from '../SendArea';
import { TypoBar } from '../TypoBar';
import { useChatInputContext } from '../ChatInputProvider';
import { chatInputStoreSelectors, useChatInputStore } from '../store';
import { ContextContainer } from './ContextContainer';
import { TokenDisplay } from './TokenDisplay';
import { fileChatSelectors, useFileStore } from '@/stores/file';

const useStyles = createStyles(({ css, cssVar }) => ({
  container: css`
    width: 100%;
    max-width: calc(var(--chat-window-content-width, 800px) + (var(--chat-window-side-gap, 16px) * 2));
    margin: 0 auto;
    padding-block: 0 8px;
    padding-inline: var(--chat-window-side-gap, 16px);

    .show-on-hover {
      opacity: 0;
    }

    &:hover {
      .show-on-hover {
        opacity: 1;
      }
    }
  `,
  fullscreen: css`
    position: fixed;
    inset: 0;
    z-index: 2100;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    padding: 24px;
    background: color-mix(in srgb, ${cssVar.colorBgLayout} 74%, transparent);
    backdrop-filter: blur(10px);
  `,
  editorWrapper: css`
    [contenteditable="true"],
    [contenteditable="true"] *,
    .lexical-editor,
    .lexical-editor * {
      word-wrap: break-word !important;
      word-break: break-word !important;
      overflow-wrap: break-word !important;
      white-space: pre-wrap !important;
      max-width: 100% !important;
    }

    [contenteditable="true"] {
      padding-right: 12px !important;
    }
  `,
}));

export function DesktopChatInput() {
  const { styles } = useStyles();
  const { allowExpand, expanded, extraRightContent, leftContent, setExpanded } = useChatInputContext();
  const showTypoBar = useChatInputStore(chatInputStoreSelectors.showTypoBar);
  const hasFiles = useFileStore(fileChatSelectors.chatUploadFileListHasItem);

  const expandButton = allowExpand ? (
    <ActionIcon
      className="show-on-hover"
      icon={expanded ? Minimize2 : Maximize2}
      size={{ blockSize: 32, size: 16, strokeWidth: 2.3 }}
      style={{ zIndex: 10 }}
      title={expanded ? 'Exit fullscreen' : 'Expand editor'}
      onClick={() => setExpanded(!expanded)}
    />
  ) : null;

  const content = (
    <Flexbox className={cx(styles.container, expanded && styles.fullscreen)} gap={8}>
      <ChatInput
        className={styles.editorWrapper}
        footer={
          <ChatInputActionBar
            left={
              <Flexbox align="center" flex={1} gap={8} horizontal style={{ minWidth: 0, overflow: 'hidden' }}>
                {leftContent ?? <MimiActionBar />}
              </Flexbox>
            }
            right={
              <Flexbox align="center" flex="none" gap={6} horizontal style={{ marginRight: 12 }}>
                {expandButton}
                {extraRightContent}
                <SendArea />
              </Flexbox>
            }
          />
        }
        fullscreen={expanded}
        header={
          <Flexbox gap={0}>
            {showTypoBar && <TypoBar />}
            {hasFiles && <ContextContainer />}
          </Flexbox>
        }
        maxHeight={320}
        minHeight={36}
        resize
      >
        <InputEditor />
      </ChatInput>
    </Flexbox>
  );

  return content;
}
