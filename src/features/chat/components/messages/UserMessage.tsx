import { useState } from 'react';
import { File } from 'lucide-react';
import { ChatItem } from '@lobehub/ui/chat';

import type { AttachedFileMeta, RawMessage } from '@/stores/chat';
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
  void message;
  const { styles, cx } = useMessageStyles();
  const [lightboxImg, setLightboxImg] = useState<LightboxImage | null>(null);

  const videoFiles = attachedFiles.filter((f) => f.mimeType.startsWith('video/'));
  const nonVideoFiles = attachedFiles.filter((f) => !f.mimeType.startsWith('video/'));

  const hasMedia = images.length > 0 || nonVideoFiles.length > 0 || videoFiles.length > 0;

  const mediaSection = hasMedia ? (
    <div
      className={cx(
        styles.userMediaSection,
        hasText && styles.userMediaSectionWithText,
      )}
    >
      {images.length > 0 && (
        <div className={styles.userMediaRow}>
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
        <div className={styles.userMediaRow}>
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

      <VideoFileListViewer files={videoFiles} />
    </div>
  ) : null;

  return (
    <div className={cx(styles.userTurn, styles.chatItem)}>
      {mediaSection}
      {hasText && (
        <ChatItem
          avatar={{
            avatar: <span className={styles.userAvatar}>我</span>,
            backgroundColor: 'transparent',
            title: '我',
          }}
          className={cx(styles.chatItem, styles.userChatItem)}
          message={text}
          placement="right"
          renderMessage={() => renderUserTextBubble(protocol, { className: styles.userMessageText, text })}
          showAvatar={false}
          showTitle={false}
          variant="bubble"
        />
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
    </div>
  );
}
