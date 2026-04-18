import { useState } from 'react';
import { OpenClaw } from '@lobehub/icons';
import { ChatItem } from '@lobehub/ui/chat';
import { useResponsive } from "antd-style";

import type { EnhancedMarkdownProps } from '@/lib/markdown-enhancements';
import type { AttachedFileMeta, RawMessage } from '@/stores/chat';
import { useSettingsStore } from '@/stores/settings';
import { getAssistantProtocolComponents } from './protocols/assistant';
import type { AssistantToolEntry } from './protocols/assistant/types';
import { AssistantActions, ImageLightbox } from './shared';
import { useMessageStyles } from './styles';
import type {
  ExtractedImage,
  LightboxImage,
  MessageProtocol,
  StreamingToolStatus,
} from './types';

interface AssistantMessageProps {
  attachedFiles: AttachedFileMeta[];
  hasText: boolean;
  images: ExtractedImage[];
  isStreaming: boolean;
  markdownProps: EnhancedMarkdownProps;
  message: RawMessage;
  protocol: MessageProtocol;
  showThinking: boolean;
  streamingTools: StreamingToolStatus[];
  text: string;
  thinking: string | null;
  tools: AssistantToolEntry[];
}

function formatMetaTimestamp(
  timestamp: number | null | undefined,
): { dateTime: string; label: string } | null {
  if (typeof timestamp !== 'number' || !Number.isFinite(timestamp)) return null;
  const ms = timestamp < 1e12 ? timestamp * 1000 : timestamp;
  const date = new Date(ms);
  if (Number.isNaN(date.getTime())) return null;

  const now = new Date();
  const isSameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  const labelFormatter = new Intl.DateTimeFormat('zh-CN', {
    month: isSameDay ? undefined : '2-digit',
    day: isSameDay ? undefined : '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  return {
    dateTime: date.toISOString(),
    label: labelFormatter.format(date),
  };
}

export function AssistantMessage({
  attachedFiles,
  hasText,
  images,
  isStreaming,
  markdownProps,
  message,
  protocol,
  showThinking,
  streamingTools,
  text,
  thinking,
  tools,
}: AssistantMessageProps) {
  const { styles, cx } = useMessageStyles();
  const { mobile } = useResponsive();
  const transitionMode = useSettingsStore((state) => state.transitionMode);
  const [lightboxImg, setLightboxImg] = useState<LightboxImage | null>(null);

  const { Above, Below } = getAssistantProtocolComponents(protocol);

  const metaTime = isStreaming ? null : formatMetaTimestamp(message.timestamp);

  const assistantAvatarSize = mobile ? 32 : 40;
  const assistantIconSize = mobile ? 20 : 24;

  // Meta row: avatar at the Lobe-standard 32/40px, applied via inline style for responsiveness
  const metaRow = (
    <div className={styles.messageMetaRow}>
      <span
        className={styles.messageMetaAvatar}
        title="极智"
        style={{ width: assistantAvatarSize, height: assistantAvatarSize }}
      >
        <OpenClaw.Color size={assistantIconSize} />
      </span>
      <span className={styles.messageMetaLabel}>极智</span>
      {metaTime ? (
        <>
          <span className={styles.messageMetaDot}>·</span>
          <time className={styles.messageMetaTime} dateTime={metaTime.dateTime}>
            {metaTime.label}
          </time>
        </>
      ) : null}
      {isStreaming ? (
        <span className={styles.messageMetaStreaming}>处理中</span>
      ) : null}
    </div>
  );

  const assistantAboveMessage = (
    <Above
      isStreaming={isStreaming}
      markdownProps={markdownProps}
      showThinking={showThinking}
      streamingTools={streamingTools}
      thinking={thinking}
      tools={tools}
    />
  );

  const assistantBelowMessage = (
    <Below
      attachedFiles={attachedFiles}
      images={images}
      onPreview={(payload) => setLightboxImg(payload)}
    />
  );

  const hasRenderableText = hasText && text.trim().length > 0;

  // Determines whether aboveMessage has visible content (ThinkingPanel / tools / streaming status)
  // so we can add a gap between aboveMessage and the text content only when needed.
  const hasAboveMessageContent =
    (showThinking && !!thinking) ||
    (isStreaming && streamingTools.length > 0) ||
    tools.length > 0;

  return (
    <>
      {hasRenderableText ? (
        <ChatItem
          // actions removed — AssistantActions is now in belowMessage to maintain vertical flow
          avatar={{
            avatar: <OpenClaw.Color size={assistantIconSize} />,
            backgroundColor: 'transparent',
            title: '极智',
          }}
          className={cx(styles.chatItem, styles.assistantChatItem)}
          aboveMessage={
            <>
              {metaRow}
              {/* Wrap with margin-bottom only when there is visible content (ThinkingPanel/tools).
                  @lobehub/ui's messageContainer has no gap between aboveMessage and messageContent,
                  so we must inject spacing here directly. */}
              {hasAboveMessageContent ? (
                <div style={{ marginBottom: 12, width: '100%' }}>
                  {assistantAboveMessage}
                </div>
              ) : (
                assistantAboveMessage
              )}
            </>
          }
          belowMessage={
            <>
              {hasText && (
                <div style={{ marginTop: 8, width: '100%' }}>
                  <AssistantActions className={styles.assistantActions} text={text} />
                </div>
              )}
              {assistantBelowMessage}
            </>
          }
          message={text}
          placement="left"
          renderMessage={(editableContent) => (
            <div className={styles.assistantRender}>{editableContent}</div>
          )}
          showTitle={false}
          showAvatar={false}
          variant="bubble"
          markdownProps={{ ...markdownProps, animated: transitionMode === 'fadeIn' && isStreaming }}
        />
      ) : (
        <div className={styles.chatItem} style={{ paddingInline: '12px', paddingBlock: '24px 12px', boxSizing: 'border-box' }}>
          {metaRow}
          {assistantAboveMessage}
          {assistantBelowMessage}
        </div>
      )}

      {lightboxImg && (
        <ImageLightbox
          src={lightboxImg.src}
          fileName={lightboxImg.fileName}
          filePath={lightboxImg.filePath}
          base64={lightboxImg.base64}
          mimeType={lightboxImg.mimeType}
          onClose={() => setLightboxImg(null)}
        />
      )}
    </>
  );
}
