import { useState } from 'react';
import { File } from 'lucide-react';

import type { AttachedFileMeta, RawMessage } from '@/stores/chat';
import { formatTimestamp } from '../../lib/message-utils';
import { renderUserTextBubble } from './protocols/user';
import {
  FileCard,
  ImageLightbox,
  ImageThumbnail,
} from './shared';
import { VideoFileListViewer } from './VideoFileListViewer';
import { imageSrc } from './media-utils';
import { useMessageStyles } from './styles';
import type { ExtractedImage, LightboxImage, MessageProtocol } from './types';

interface UserMessageProps {
  attachedFiles: AttachedFileMeta[];
  hasText: boolean;
  images: ExtractedImage[];
  message: RawMessage;
  protocol: MessageProtocol;
  text: string;
}

export function UserMessage({
  attachedFiles,
  hasText,
  images,
  message,
  protocol,
  text,
}: UserMessageProps) {
  const { styles, cx } = useMessageStyles();
  const [lightboxImg, setLightboxImg] = useState<LightboxImage | null>(null);

  const videoFiles = attachedFiles.filter((f) => f.mimeType.startsWith('video/'));
  const nonVideoFiles = attachedFiles.filter((f) => !f.mimeType.startsWith('video/'));

  return (
    <div className={cx(styles.messageRow, styles.messageRowUser)}>
      <div className={cx(styles.contentCol, styles.contentColUser)}>
        {images.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {images.map((img, i) => {
              const src = imageSrc(img);
              if (!src) return null;

              return (
                <ImageThumbnail
                  key={`content-img-${src ?? img.mimeType}-${i}`}
                  src={src}
                  fileName="image"
                  base64={img.data}
                  mimeType={img.mimeType}
                  onPreview={() =>
                    setLightboxImg({
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

        {nonVideoFiles.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {nonVideoFiles.map((file, i) => {
              const isImage = file.mimeType.startsWith('image/');
              if (isImage && images.length > 0) return null;

              if (isImage) {
                const previewSrc = file.preview;
                return previewSrc ? (
                  <ImageThumbnail
                    key={`local-img-${file.fileName}-${i}`}
                    src={previewSrc}
                    fileName={file.fileName}
                    filePath={file.filePath}
                    mimeType={file.mimeType}
                    onPreview={() =>
                      setLightboxImg({
                        src: previewSrc,
                        fileName: file.fileName,
                        filePath: file.filePath,
                        mimeType: file.mimeType,
                      })
                    }
                  />
                ) : (
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

        <VideoFileListViewer files={videoFiles} />

        {hasText && renderUserTextBubble(protocol, { className: styles.bubbleUser, text })}

        {message.timestamp && (
          <span
            style={{
              fontSize: 'var(--mimi-font-size-sm)',
              color: 'var(--ant-color-text-quaternary)',
            }}
          >
            {formatTimestamp(message.timestamp)}
          </span>
        )}
      </div>

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
    </div>
  );
}
