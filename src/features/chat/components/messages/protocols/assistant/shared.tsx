import { Markdown } from '@lobehub/ui';
import { File } from 'lucide-react';

import { ThinkingPanel } from '../../../ThinkingPanel';
import { imageSrc } from '../../media-utils';
import {
  FileCard,
  ImagePreviewCard,
  ToolCard,
  ToolStatusBar,
} from '../../shared';
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
            <Markdown variant="chat" headerMultiple={0} animated={thinkingIsStreaming} {...markdownProps}>
              {content || ' '}
            </Markdown>
          )}
        />
      )}
      {tools.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {tools.map((tool, i) => (
            <ToolCard key={tool.id || i} name={tool.name} input={tool.input} />
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
                  style={{
                    width: 144,
                    height: 144,
                    borderRadius: 8,
                    border: '1px solid rgba(0,0,0,0.1)',
                    background: 'rgba(0,0,0,0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
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
