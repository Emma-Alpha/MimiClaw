/**
 * Chat Message Component
 * Renders user / assistant / system / toolresult messages
 * with markdown, thinking sections, images, and tool cards.
 * Uses @lobehub/ui Avatar + Markdown, antd-style createStyles.
 */
import { useState, useCallback, useEffect, memo } from 'react';
import { ChevronDown, ChevronRight, Wrench, FileText, Film, Music, FileArchive, File, X, FolderOpen, ZoomIn, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { ActionIcon, Markdown } from '@lobehub/ui';
import { ChatItem } from '@lobehub/ui/chat';
import { Button } from 'antd';
import { CopyOutlined, CheckOutlined, RobotOutlined } from '@ant-design/icons';
import { createStyles } from 'antd-style';
import { createPortal } from 'react-dom';
import { invokeIpc } from '@/lib/api-client';
import type { RawMessage, AttachedFileMeta } from '@/stores/chat';
import { extractText, extractThinking, extractImages, extractToolUse, formatTimestamp } from './message-utils';

const useStyles = createStyles(({ token, css }) => ({
  messageRow: css`
    display: flex;
    gap: 12px;
    position: relative;
  `,
  messageRowUser: css`
    flex-direction: row-reverse;
  `,
  assistantItem: css`
    width: 100%;
  `,
  contentCol: css`
    display: flex;
    flex-direction: column;
    width: 100%;
    min-width: 0;
    max-width: 80%;
    gap: 8px;
  `,
  contentColUser: css`
    align-items: flex-end;
  `,
  contentColAssistant: css`
    align-items: flex-start;
  `,
  assistantSection: css`
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 100%;
  `,
  mediaRow: css`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  `,
  assistantRender: css`
    position: relative;
    min-height: 1.5em;
  `,
  bubbleUser: css`
    position: relative;
    border-radius: 16px;
    padding: 12px 16px;
    background: #F3F4F6;
    color: ${token.colorText};
    word-break: break-word;
    font-size: 14px;
    white-space: pre-wrap;
    box-shadow: 0 2px 8px rgba(0,0,0,0.02);
  `,
  bubbleAssistant: css`
    position: relative;
    border-radius: 16px;
    padding: 12px 16px;
    background: #ffffff;
    color: ${token.colorText};
    width: 100%;
    word-break: break-word;
    font-size: 14px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.02);
    border: 1px solid rgba(0,0,0,0.04);
  `,
  thinkingBlock: css`
    width: 100%;
    border-radius: ${token.borderRadiusLG}px;
    border: 1px solid ${token.colorBorderSecondary};
    background: ${token.colorFillQuaternary};
    font-size: 14px;
    overflow: hidden;
  `,
  thinkingHeader: css`
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 8px 12px;
    color: ${token.colorTextSecondary};
    cursor: pointer;
    background: none;
    border: none;
    transition: color 0.2s;

    &:hover {
      color: ${token.colorText};
    }
  `,
  thinkingBody: css`
    padding: 0 12px 12px;
    color: ${token.colorTextSecondary};
    opacity: 0.8;
  `,
  toolCard: css`
    border-radius: ${token.borderRadiusLG}px;
    border: 1px solid ${token.colorBorderSecondary};
    background: ${token.colorFillQuaternary};
    font-size: 14px;
    overflow: hidden;
  `,
  toolCardHeader: css`
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 6px 12px;
    color: ${token.colorTextSecondary};
    cursor: pointer;
    background: none;
    border: none;
    transition: color 0.2s;

    &:hover {
      color: ${token.colorText};
    }
  `,
  toolCardBody: css`
    padding: 0 12px 8px;
    font-size: 12px;
    color: ${token.colorTextSecondary};
    overflow-x: auto;
  `,
  toolStatusBar: css`
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 4px;
  `,
  toolStatusItem: css`
    display: flex;
    align-items: center;
    gap: 8px;
    border-radius: ${token.borderRadius}px;
    border: 1px solid ${token.colorBorderSecondary};
    padding: 6px 12px;
    font-size: 12px;
    transition: background 0.2s;
  `,
  toolStatusRunning: css`
    border-color: ${token.colorPrimaryBorder};
    background: ${token.colorPrimaryBg};
    color: ${token.colorText};
  `,
  toolStatusDone: css`
    border-color: ${token.colorBorderSecondary};
    background: ${token.colorFillQuaternary};
    color: ${token.colorTextSecondary};
  `,
  toolStatusError: css`
    border-color: ${token.colorErrorBorder};
    background: ${token.colorErrorBg};
    color: ${token.colorError};
  `,
  fileCard: css`
    display: flex;
    align-items: center;
    gap: 12px;
    border-radius: ${token.borderRadiusLG}px;
    border: 1px solid ${token.colorBorderSecondary};
    padding: 8px 12px;
    background: ${token.colorFillQuaternary};
    max-width: 220px;
    cursor: pointer;
    transition: background 0.2s;

    &:hover {
      background: ${token.colorFillTertiary};
    }
  `,
  imageThumbnail: css`
    position: relative;
    width: 144px;
    height: 144px;
    border-radius: ${token.borderRadiusLG}px;
    border: 1px solid ${token.colorBorderSecondary};
    overflow: hidden;
    cursor: zoom-in;

    img { width: 100%; height: 100%; object-fit: cover; }

    .overlay {
      position: absolute;
      inset: 0;
      background: transparent;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s;

      svg { opacity: 0; color: white; transition: opacity 0.2s; }
    }

    &:hover .overlay {
      background: rgba(0,0,0,0.25);
      svg { opacity: 1; }
    }
  `,
  imagePreviewCard: css`
    position: relative;
    max-width: 320px;
    border-radius: ${token.borderRadiusLG}px;
    border: 1px solid ${token.colorBorderSecondary};
    overflow: hidden;
    cursor: zoom-in;

    img { display: block; width: 100%; }

    .overlay {
      position: absolute;
      inset: 0;
      background: transparent;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s;

      svg { opacity: 0; color: white; transition: opacity 0.2s; }
    }

    &:hover .overlay {
      background: rgba(0,0,0,0.2);
      svg { opacity: 1; }
    }
  `,
  streamCursor: css`
    display: inline-block;
    width: 8px;
    height: 16px;
    background: ${token.colorTextSecondary};
    opacity: 0.5;
    margin-left: 2px;
    animation: blink 1s step-end infinite;

    @keyframes blink {
      50% { opacity: 0; }
    }
  `,
}));

interface ChatMessageProps {
  message: RawMessage;
  showThinking: boolean;
  isStreaming?: boolean;
  streamingTools?: Array<{
    id?: string;
    toolCallId?: string;
    name: string;
    status: 'running' | 'completed' | 'error';
    durationMs?: number;
    summary?: string;
  }>;
}

interface ExtractedImage { url?: string; data?: string; mimeType: string; }

function imageSrc(img: ExtractedImage): string | null {
  if (img.url) return img.url;
  if (img.data) return `data:${img.mimeType};base64,${img.data}`;
  return null;
}

export const ChatMessage = memo(function ChatMessage({
  message,
  showThinking,
  isStreaming = false,
  streamingTools = [],
}: ChatMessageProps) {
  const { styles, cx } = useStyles();

  const isUser = message.role === 'user';
  const role = typeof message.role === 'string' ? message.role.toLowerCase() : '';
  const isToolResult = role === 'toolresult' || role === 'tool_result';
  const text = extractText(message);
  const hasText = text.trim().length > 0;
  const thinking = extractThinking(message);
  const images = extractImages(message);
  const tools = extractToolUse(message);
  const visibleThinking = showThinking ? thinking : null;
  const visibleTools = tools;

  const attachedFiles = message._attachedFiles || [];
  const [lightboxImg, setLightboxImg] = useState<{ src: string; fileName: string; filePath?: string; base64?: string; mimeType?: string } | null>(null);

  if (isToolResult) return null;

  const hasStreamingToolStatus = isStreaming && streamingTools.length > 0;
  if (!hasText && !visibleThinking && images.length === 0 && visibleTools.length === 0 && attachedFiles.length === 0 && !hasStreamingToolStatus) return null;

  const assistantAboveMessage = !isUser && (
    <div className={styles.assistantSection}>
      {hasStreamingToolStatus && <ToolStatusBar tools={streamingTools} />}
      {visibleThinking && <ThinkingBlock content={visibleThinking} />}
      {visibleTools.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {visibleTools.map((tool, i) => (
            <ToolCard key={tool.id || i} name={tool.name} input={tool.input} />
          ))}
        </div>
      )}
    </div>
  );

  const assistantBelowMessage = !isUser && (images.length > 0 || attachedFiles.length > 0) && (
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
                onPreview={() => setLightboxImg({ src, fileName: 'image', base64: img.data, mimeType: img.mimeType })}
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
                  onPreview={() => setLightboxImg({ src: previewSrc, fileName: file.fileName, filePath: file.filePath, mimeType: file.mimeType })}
                />
              );
            }
            if (isImage && !previewSrc) {
              return (
                <div key={`local-nopreview-${file.fileName}-${i}`} style={{ width: 144, height: 144, borderRadius: 8, border: '1px solid rgba(0,0,0,0.1)', background: 'rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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

  if (!isUser) {
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
          message={text}
          placement="left"
          renderMessage={(editableContent) => (
            <div className={styles.assistantRender}>
              {editableContent}
              {isStreaming && <span className={styles.streamCursor} />}
            </div>
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

  return (
    <div className={cx(styles.messageRow, isUser && styles.messageRowUser)}>
      {/* Content column */}
      <div className={cx(styles.contentCol, isUser ? styles.contentColUser : styles.contentColAssistant)}>
        {/* Images (user) — above text */}
        {isUser && images.length > 0 && (
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
                  onPreview={() => setLightboxImg({ src, fileName: 'image', base64: img.data, mimeType: img.mimeType })}
                />
              );
            })}
          </div>
        )}

        {/* File attachments (user) */}
        {isUser && attachedFiles.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {attachedFiles.map((file, i) => {
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
                    onPreview={() => setLightboxImg({ src: previewSrc, fileName: file.fileName, filePath: file.filePath, mimeType: file.mimeType })}
                  />
                ) : (
                  <div key={`local-nopreview-${file.fileName}-${i}`} style={{ width: 144, height: 144, borderRadius: 8, border: '1px solid rgba(0,0,0,0.1)', background: 'rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <File style={{ width: 32, height: 32, opacity: 0.5 }} />
                  </div>
                );
              }
              return <FileCard key={`local-file-${file.fileName}-${i}`} file={file} />;
            })}
          </div>
        )}

        {/* Main text bubble */}
        {hasText && (
          <MessageBubble text={text} isUser={isUser} isStreaming={isStreaming} />
        )}

        {/* User timestamp */}
        {isUser && message.timestamp && (
          <span style={{ fontSize: 12, color: 'var(--ant-color-text-quaternary)' }}>{formatTimestamp(message.timestamp)}</span>
        )}
      </div>

      {/* Lightbox */}
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
});

// ── Message Bubble ───────────────────────────────────────────────

function MessageBubble({ text, isUser, isStreaming }: { text: string; isUser: boolean; isStreaming: boolean }) {
  const { styles } = useStyles();

  if (isUser) {
    return (
      <div className={styles.bubbleUser}>
        {text}
      </div>
    );
  }

  return (
    <div className={styles.bubbleAssistant}>
      <Markdown>{text}</Markdown>
      {isStreaming && <span className={styles.streamCursor} />}
    </div>
  );
}

// ── Thinking Block ───────────────────────────────────────────────

function ThinkingBlock({ content }: { content: string }) {
  const { styles } = useStyles();
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={styles.thinkingBlock}>
      <button type="button" className={styles.thinkingHeader} onClick={() => setExpanded(!expanded)}>
        {expanded ? <ChevronDown style={{ width: 14, height: 14 }} /> : <ChevronRight style={{ width: 14, height: 14 }} />}
        <span style={{ fontWeight: 500 }}>Thinking</span>
      </button>
      {expanded && (
        <div className={styles.thinkingBody}>
          <Markdown>{content}</Markdown>
        </div>
      )}
    </div>
  );
}

// ── Tool Card ────────────────────────────────────────────────────

function ToolCard({ name, input }: { name: string; input: unknown }) {
  const { styles } = useStyles();
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={styles.toolCard}>
      <button type="button" className={styles.toolCardHeader} onClick={() => setExpanded(!expanded)}>
        <CheckCircle2 style={{ width: 14, height: 14, color: '#22c55e', flexShrink: 0 }} />
        <Wrench style={{ width: 12, height: 12, flexShrink: 0, opacity: 0.6 }} />
        <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{name}</span>
        {expanded ? <ChevronDown style={{ width: 12, height: 12, marginLeft: 'auto' }} /> : <ChevronRight style={{ width: 12, height: 12, marginLeft: 'auto' }} />}
      </button>
      {expanded && input != null && (
        <pre className={styles.toolCardBody}>
          {typeof input === 'string' ? input : JSON.stringify(input, null, 2)}
        </pre>
      )}
    </div>
  );
}

// ── Tool Status Bar ──────────────────────────────────────────────

function formatDuration(durationMs?: number): string | null {
  if (!durationMs || !Number.isFinite(durationMs)) return null;
  if (durationMs < 1000) return `${Math.round(durationMs)}ms`;
  return `${(durationMs / 1000).toFixed(1)}s`;
}

function ToolStatusBar({
  tools,
}: {
  tools: Array<{
    id?: string;
    toolCallId?: string;
    name: string;
    status: 'running' | 'completed' | 'error';
    durationMs?: number;
    summary?: string;
  }>;
}) {
  const { styles, cx } = useStyles();

  return (
    <div className={styles.toolStatusBar}>
      {tools.map((tool) => {
        const duration = formatDuration(tool.durationMs);
        const isRunning = tool.status === 'running';
        const isError = tool.status === 'error';
        return (
          <div
            key={tool.toolCallId || tool.id || tool.name}
            className={cx(
              styles.toolStatusItem,
              isRunning && styles.toolStatusRunning,
              !isRunning && !isError && styles.toolStatusDone,
              isError && styles.toolStatusError,
            )}
          >
            {isRunning && <Loader2 style={{ width: 14, height: 14, flexShrink: 0, animation: 'spin 1s linear infinite' }} />}
            {!isRunning && !isError && <CheckCircle2 style={{ width: 14, height: 14, color: '#22c55e', flexShrink: 0 }} />}
            {isError && <AlertCircle style={{ width: 14, height: 14, flexShrink: 0 }} />}
            <Wrench style={{ width: 12, height: 12, flexShrink: 0, opacity: 0.6 }} />
            <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 500 }}>{tool.name}</span>
            {duration && <span style={{ fontSize: 11, opacity: 0.6 }}>{tool.summary ? `(${duration})` : duration}</span>}
            {tool.summary && <span style={{ fontSize: 11, opacity: 0.7, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tool.summary}</span>}
          </div>
        );
      })}
    </div>
  );
}

// ── Assistant Hover Bar ──────────────────────────────────────────

function AssistantActions({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const copyContent = useCallback(() => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);

  return (
    <ActionIcon
      icon={copied ? CheckOutlined : CopyOutlined}
      size="small"
      onClick={copyContent}
      style={copied ? { color: '#22c55e' } : undefined}
    />
  );
}

// ── File Helpers ─────────────────────────────────────────────────

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function FileIconComp({ mimeType, style }: { mimeType: string; style?: React.CSSProperties }) {
  if (mimeType.startsWith('video/')) return <Film style={style} />;
  if (mimeType.startsWith('audio/')) return <Music style={style} />;
  if (mimeType.startsWith('text/') || mimeType === 'application/json' || mimeType === 'application/xml') return <FileText style={style} />;
  if (mimeType.includes('zip') || mimeType.includes('compressed') || mimeType.includes('archive') || mimeType.includes('tar') || mimeType.includes('rar') || mimeType.includes('7z')) return <FileArchive style={style} />;
  if (mimeType === 'application/pdf') return <FileText style={style} />;
  return <File style={style} />;
}

function FileCard({ file }: { file: AttachedFileMeta }) {
  const { styles } = useStyles();

  const handleOpen = useCallback(() => {
    if (file.filePath) {
      invokeIpc('shell:openPath', file.filePath);
    }
  }, [file.filePath]);

  return (
    <button
      type="button"
      className={styles.fileCard}
      onClick={handleOpen}
      title={file.filePath ? 'Open file' : undefined}
    >
      <FileIconComp mimeType={file.mimeType} style={{ width: 20, height: 20, flexShrink: 0, opacity: 0.6 }} />
      <div style={{ minWidth: 0, overflow: 'hidden' }}>
        <p style={{ fontSize: 12, fontWeight: 500, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.fileName}</p>
        <p style={{ fontSize: 10, margin: 0, opacity: 0.6 }}>
          {file.fileSize > 0 ? formatFileSize(file.fileSize) : 'File'}
        </p>
      </div>
    </button>
  );
}

// ── Image Thumbnail ──────────────────────────────────────────────

function ImageThumbnail({ src, fileName, filePath, base64, mimeType, onPreview }: {
  src: string; fileName: string; filePath?: string; base64?: string; mimeType?: string; onPreview: () => void;
}) {
  void filePath; void base64; void mimeType;
  const { styles } = useStyles();
  return (
    <button
      type="button"
      className={styles.imageThumbnail}
      onClick={onPreview}
      onKeyDown={(e) => e.key === 'Enter' && onPreview()}
    >
      <img src={src} alt={fileName} />
      <div className="overlay">
        <ZoomIn style={{ width: 24, height: 24, filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }} />
      </div>
    </button>
  );
}

// ── Image Preview Card ───────────────────────────────────────────

function ImagePreviewCard({ src, fileName, filePath, base64, mimeType, onPreview }: {
  src: string; fileName: string; filePath?: string; base64?: string; mimeType?: string; onPreview: () => void;
}) {
  void filePath; void base64; void mimeType;
  const { styles } = useStyles();
  return (
    <button
      type="button"
      className={styles.imagePreviewCard}
      onClick={onPreview}
      onKeyDown={(e) => e.key === 'Enter' && onPreview()}
    >
      <img src={src} alt={fileName} />
      <div className="overlay">
        <ZoomIn style={{ width: 24, height: 24, filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }} />
      </div>
    </button>
  );
}

// ── Image Lightbox ───────────────────────────────────────────────

function ImageLightbox({ src, fileName, filePath, base64, mimeType, onClose }: {
  src: string; fileName: string; filePath?: string; base64?: string; mimeType?: string; onClose: () => void;
}) {
  void src; void base64; void mimeType; void fileName;

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleShowInFolder = useCallback(() => {
    if (filePath) invokeIpc('shell:showItemInFolder', filePath);
  }, [filePath]);

  return createPortal(
    // biome-ignore lint/a11y/useKeyWithClickEvents: keyboard handled via Escape key listener
    // biome-ignore lint/a11y/noStaticElementInteractions: lightbox backdrop
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      {/* biome-ignore lint/a11y/noStaticElementInteractions: stop propagation */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: stop propagation */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }} onClick={(e) => e.stopPropagation()}>
        <img src={src} alt={fileName} style={{ maxWidth: '90vw', maxHeight: '85vh', borderRadius: 8, boxShadow: '0 25px 50px rgba(0,0,0,0.5)', objectFit: 'contain' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {filePath && (
            <Button
              type="text"
              icon={<FolderOpen style={{ width: 16, height: 16 }} />}
              style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none' }}
              onClick={handleShowInFolder}
              title="在文件夹中显示"
            />
          )}
          <Button
            type="text"
            icon={<X style={{ width: 16, height: 16 }} />}
            style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none' }}
            onClick={onClose}
            title="关闭"
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}
