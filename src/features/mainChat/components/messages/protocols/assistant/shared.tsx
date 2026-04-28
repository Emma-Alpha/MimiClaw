import { File } from 'lucide-react';

import { MessageMarkdown } from '@/components/MessageMarkdown';
import { useSettingsStore } from '@/stores/settings';
import { ThinkingPanel } from '../../../ThinkingPanel';
import { imageSrc } from '../../media-utils';
import {
  FileCard,
  ImagePreviewCard,
  ToolStatusBar,
} from '../../shared';
import { ToolAccordionItem } from '../../ToolAccordion';
import { useMessageStyles } from '../../styles';
import type {
  AssistantProtocolAboveProps,
  AssistantProtocolBelowProps,
} from './types';

export function AssistantStandardAbove({
  isStreaming,
  markdownProps,
  showThinking,
  streamingTools,
  thinking,
  tools,
}: AssistantProtocolAboveProps) {
  const { styles } = useMessageStyles();
  const transitionMode = useSettingsStore((state) => state.transitionMode);
  const visibleThinking = showThinking ? thinking : null;
  const thinkingIsStreaming = isStreaming && !!visibleThinking;
  const hasStreamingToolStatus = isStreaming && streamingTools.length > 0;

  return (
    <div className={styles.assistantSection}>
      {hasStreamingToolStatus && <ToolStatusBar tools={streamingTools} />}
      {visibleThinking && (
        <ThinkingPanel
          content={visibleThinking}
          isThinking={thinkingIsStreaming}
          showStreamingCursor={thinkingIsStreaming}
          variant="card"
          renderContent={(content: string) => (
            <MessageMarkdown
              animated={transitionMode === 'fadeIn' && thinkingIsStreaming}
              markdownProps={markdownProps}
            >
              {content}
            </MessageMarkdown>
          )}
        />
      )}
      {tools.length > 0 && (
        <div className={styles.assistantToolStack}>
          {tools.map((tool, i) => (
            <ToolAccordionItem key={tool.id || i} id={tool.id} name={tool.name} input={tool.input} />
          ))}
        </div>
      )}
    </div>
  );
}

export function AssistantStandardBelow({
  attachedFiles,
  images,
  onPreview,
}: AssistantProtocolBelowProps) {
  const { styles } = useMessageStyles();

  if (images.length === 0 && attachedFiles.length === 0) return null;

  return (
    <div className={styles.assistantSection}>
      {images.length > 0 && (
        <div className={styles.mediaRow}>
          {images.map((img, i) => {
            const src = imageSrc(img);
            if (!src) return null;

            return (
              <ImagePreviewCard
                key={`content-img-${src ?? img.mimeType}-${i}`}
                src={src}
                fileName="image"
                base64={img.data}
                mimeType={img.mimeType}
                onPreview={() =>
                  onPreview({
                    src,
                    fileName: 'image',
                    base64: img.data,
                    mimeType: img.mimeType,
                  })
                }
              />
            );
          })}
        </div>
      )}
      {attachedFiles.length > 0 && (
        <div className={styles.mediaRow}>
          {attachedFiles.map((file, i) => {
            const isImage = file.mimeType.startsWith('image/');
            const previewSrc = file.preview;
            if (isImage && images.length > 0) return null;

            if (isImage && previewSrc) {
              return (
                <ImagePreviewCard
                  key={`local-img-${file.fileName}-${i}`}
                  src={previewSrc}
                  fileName={file.fileName}
                  filePath={file.filePath}
                  mimeType={file.mimeType}
                  onPreview={() =>
                    onPreview({
                      src: previewSrc,
                      fileName: file.fileName,
                      filePath: file.filePath,
                      mimeType: file.mimeType,
                    })
                  }
                />
              );
            }

            if (isImage && !previewSrc) {
              return (
                <div
                  key={`local-nopreview-${file.fileName}-${i}`}
                  className={styles.mediaPlaceholder}
                >
                  <File style={{ width: 32, height: 32, opacity: 0.5 }} />
                </div>
              );
            }

            return <FileCard key={`local-file-${file.fileName}-${i}`} file={file} />;
          })}
        </div>
      )}
    </div>
  );
}
