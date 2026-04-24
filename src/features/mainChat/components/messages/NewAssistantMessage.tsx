import { useState } from 'react';
import { OpenClaw } from '@lobehub/icons';
import { useResponsive } from 'antd-style';

import ChatItem from '@/components/ChatItem';
import ActionButtons from '@/components/ChatItem/components/ActionButtons';
import { MessageMarkdown } from '@/components/MessageMarkdown';
import type { EnhancedMarkdownProps } from '@/lib/markdown-enhancements';
import type { AttachedFileMeta, RawMessage } from '@/stores/chat';
import { getAssistantProtocolComponents } from './protocols/assistant';
import type { AssistantToolEntry } from './protocols/assistant/types';
import { ImageLightbox } from './shared';
import { useMessageStyles } from './styles';
import type {
  ExtractedImage,
  LightboxImage,
  MessageProtocol,
  StreamingToolStatus,
} from './types';
import {
  extractUsageFromMessage,
  extractModelFromMessage,
  extractProviderFromMessage,
  extractPerformanceFromMessage,
  extractElapsedFromMessage,
} from '../../utils/extractUsage';

interface NewAssistantMessageProps {
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
): number | undefined {
  if (typeof timestamp !== 'number' || !Number.isFinite(timestamp)) return undefined;
  const ms = timestamp < 1e12 ? timestamp * 1000 : timestamp;
  return ms;
}

export function NewAssistantMessage({
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
}: NewAssistantMessageProps) {
  const { styles } = useMessageStyles();
  const { mobile } = useResponsive();
  const [lightboxImg, setLightboxImg] = useState<LightboxImage | null>(null);

  const { Above, Below } = getAssistantProtocolComponents(protocol);

  const metaTime = isStreaming ? undefined : formatMetaTimestamp(message.timestamp);

  const assistantIconSize = mobile ? 20 : 24;

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

  const hasAboveMessageContent =
    (showThinking && !!thinking) ||
    (isStreaming && streamingTools.length > 0) ||
    tools.length > 0;

  const handleCopy = () => {
    if (text) {
      navigator.clipboard.writeText(text);
    }
  };

  // Extract real usage data from message
  const usage = extractUsageFromMessage(message);
  const model = extractModelFromMessage(message);
  const provider = extractProviderFromMessage(message);
  const performance = extractPerformanceFromMessage(message);
  const elapsed = extractElapsedFromMessage(message);


  return (
    <>
      <ChatItem
        id={message.id}
        avatar={{
          avatar: <OpenClaw.Color size={assistantIconSize} />,
          backgroundColor: 'transparent',
          title: '极智',
        }}
        showTitle={true}
        showAvatar={true}
        time={metaTime}
        placement="left"
        loading={isStreaming}
        model={model}
        provider={provider}
        usage={usage}
        performance={performance}
        elapsed={elapsed}
        message={
          hasRenderableText ? (
            <div className={styles.assistantRender}>
              {hasAboveMessageContent && (
                <div style={{ marginBottom: 12, width: '100%' }}>
                  {assistantAboveMessage}
                </div>
              )}
              <MessageMarkdown animated={isStreaming} markdownProps={markdownProps}>{text}</MessageMarkdown>
              {assistantBelowMessage}
            </div>
          ) : (
            <div>
              {assistantAboveMessage}
              {assistantBelowMessage}
            </div>
          )
        }
        actions={
          hasRenderableText ? (
            <ActionButtons text={text} onCopy={handleCopy} showRegenerate={!isStreaming} />
          ) : undefined
        }
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
