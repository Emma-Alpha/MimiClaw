import { useState } from 'react';
import { RobotOutlined } from '@ant-design/icons';
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
  const { styles } = useMessageStyles();
  const [lightboxImg, setLightboxImg] = useState<LightboxImage | null>(null);

  const { Above, Below } = getAssistantProtocolComponents(protocol);

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
        actions={hasText ? <AssistantActions text={text} /> : undefined}
        avatar={{
          avatar: <RobotOutlined />,
          backgroundColor: 'rgba(0,0,0,0.06)',
          title: 'Assistant',
        }}
        className={styles.assistantItem}
        aboveMessage={assistantAboveMessage}
        belowMessage={assistantBelowMessage}
        markdownProps={{ ...markdownProps, animated: isStreaming }}
        message={text}
        placement="left"
        renderMessage={(editableContent) => (
          <div className={styles.assistantRender}>{editableContent}</div>
        )}
        showTitle={false}
        time={message.timestamp}
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
