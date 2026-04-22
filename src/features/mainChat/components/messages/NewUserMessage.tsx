import { useState } from 'react';
import { theme } from 'antd';
import { File, Folder, User } from 'lucide-react';
import type { Descendant } from 'slate';

import ChatItem from '@/components/ChatItem';
import type { AttachedFileMeta, RawMessage } from '@/stores/chat';
import { ReadOnlySlateMessage } from '@/components/common/ReadOnlySlateMessage';
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

export interface UserMessagePathTag {
  absolutePath: string;
  name: string;
  isDirectory: boolean;
}

export interface UserMessageImagePreview {
  preview: string | null;
  fileName: string;
}

function hasInlineElements(content: Descendant[]): boolean {
  for (const node of content) {
    if (typeof node === 'object' && node !== null) {
      const t = (node as { type?: string }).type;
      if (t === 'path' || t === 'skill') return true;
      if ('children' in node && Array.isArray((node as { children: unknown[] }).children)) {
        if (hasInlineElements((node as { children: Descendant[] }).children)) return true;
      }
    }
  }
  return false;
}

interface NewUserMessageProps {
  text?: string;
  attachedFiles?: AttachedFileMeta[];
  hasText?: boolean;
  images?: ExtractedImage[];
  message?: RawMessage;
  protocol?: MessageProtocol;
  imagePreviews?: UserMessageImagePreview[];
  pathTags?: UserMessagePathTag[];
  richContent?: Descendant[];
}

export function NewUserMessage({
  text = '',
  attachedFiles = [],
  images = [],
  message,
  protocol = 'generic',
  hasText,
  imagePreviews,
  pathTags,
  richContent,
}: NewUserMessageProps) {
  const { styles, cx } = useMessageStyles();
  const { token } = theme.useToken();
  const [lightboxImg, setLightboxImg] = useState<LightboxImage | null>(null);

  const videoFiles = attachedFiles.filter((f) => f.mimeType.startsWith('video/'));
  const nonVideoFiles = attachedFiles.filter((f) => !f.mimeType.startsWith('video/'));

  const hasMedia = images.length > 0 || nonVideoFiles.length > 0 || videoFiles.length > 0;
  const hasRich = !!richContent && richContent.length > 0 && hasInlineElements(richContent);
  const hasPathTags = !!pathTags && pathTags.length > 0;
  const hasImagePreviews = !!imagePreviews && imagePreviews.length > 0;

  const effectiveHasText =
    hasText ?? (text.trim().length > 0 || hasRich || hasPathTags || hasImagePreviews);

  const mediaSection = hasMedia ? (
    <div
      className={cx(
        styles.userMediaSection,
        effectiveHasText && styles.userMediaSectionWithText,
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

  const renderBubbleContent = () => {
    if (hasRich) {
      return (
        <div className={styles.userMessageText}>
          {hasImagePreviews && (
            <div className={styles.pathTagRow} style={{ marginBottom: 6 }}>
              {imagePreviews!.map((img) =>
                img.preview ? (
                  <img
                    key={img.fileName}
                    src={img.preview}
                    alt={img.fileName}
                    title={img.fileName}
                    style={{ maxWidth: 120, maxHeight: 90, borderRadius: 6, objectFit: 'cover', display: 'block' }}
                  />
                ) : (
                  <span key={img.fileName} style={{ fontSize: token.fontSizeSM - 1, opacity: 0.6 }}>{img.fileName}</span>
                ),
              )}
            </div>
          )}
          <ReadOnlySlateMessage content={richContent!} />
        </div>
      );
    }

    if (hasPathTags || hasImagePreviews) {
      const hasBody = text.trim().length > 0;
      return (
        <div className={styles.userMessageText}>
          {hasImagePreviews && (
            <div className={styles.pathTagRow} style={{ marginBottom: hasPathTags || hasBody ? 6 : 0 }}>
              {imagePreviews!.map((img) =>
                img.preview ? (
                  <img
                    key={img.fileName}
                    src={img.preview}
                    alt={img.fileName}
                    title={img.fileName}
                    style={{ maxWidth: 120, maxHeight: 90, borderRadius: 6, objectFit: 'cover', display: 'block' }}
                  />
                ) : (
                  <span key={img.fileName} style={{ fontSize: token.fontSizeSM - 1, opacity: 0.6 }}>{img.fileName}</span>
                ),
              )}
            </div>
          )}
          {hasPathTags && (
            <div className={styles.pathTagRow} style={{ marginBottom: hasBody ? 6 : 0 }}>
              {pathTags!.map((tag) => (
                <span key={tag.absolutePath} className={styles.pathTag} title={tag.absolutePath}>
                  {tag.isDirectory ? (
                    <Folder size={12} style={{ flexShrink: 0 }} />
                  ) : (
                    <File size={12} style={{ flexShrink: 0 }} />
                  )}
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {tag.name}
                  </span>
                </span>
              ))}
            </div>
          )}
          {hasBody && <span>{text}</span>}
        </div>
      );
    }

    return renderUserTextBubble(protocol, { className: styles.userMessageText, text });
  };

  return (
    <>
      <ChatItem
        id={message?.id}
        avatar={{
          title: '用户',
          backgroundColor: '#1890ff',
        }}
        showTitle={true}
        showAvatar={true}
        time={message?.timestamp ? (message.timestamp < 1e12 ? message.timestamp * 1000 : message.timestamp) : undefined}
        placement="right"
        message={
          <div>
            {mediaSection}
            {effectiveHasText && renderBubbleContent()}
          </div>
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
