import { useState } from 'react';
import { OpenClaw } from '@lobehub/icons';
import { ChatItem } from '@lobehub/ui/chat';

import type { EnhancedMarkdownProps } from '@/lib/markdown-enhancements';
import type { AttachedFileMeta, RawMessage } from '@/stores/chat';
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
  const [lightboxImg, setLightboxImg] = useState<LightboxImage | null>(null);

  const { Above, Below } = getAssistantProtocolComponents(protocol);

  const metaTime = isStreaming ? null : formatMetaTimestamp(message.timestamp);

  const metaRow = (
    <div className={styles.messageMetaRow}>
      <span className={styles.messageMetaAvatar} title="极智">
        <OpenClaw.Color size={14} />
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

  return (
    <>
      <ChatItem
        actions={hasText ? <AssistantActions className={styles.assistantActions} text={text} /> : undefined}
        avatar={{
          avatar: (
            <span className={styles.messageMetaAvatar}>
              <OpenClaw.Color size={14} />
            </span>
          ),
          backgroundColor: 'transparent',
          title: '极智',
        }}
        className={cx(styles.chatItem, styles.assistantChatItem)}
        aboveMessage={
          <>
            {metaRow}
            {assistantAboveMessage}
          </>
        }
        belowMessage={assistantBelowMessage}
        markdownProps={{ ...markdownProps, animated: isStreaming }}
        message={text}
        placement="left"
        renderMessage={(editableContent) => (
          <div className={styles.assistantRender}>{editableContent}</div>
        )}
        showTitle={false}
        showAvatar={false}
        variant="bubble"
      />

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
