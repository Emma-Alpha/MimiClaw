import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { Button } from 'antd';
import { ActionIconGroup } from '@lobehub/ui';
import {
  AlertCircle,
  CheckCircle2,
  Check,
  Copy,
  File,
  FileArchive,
  FileText,
  Film,
  FolderOpen,
  Loader2,
  Music,
  Wrench,
  X,
  ZoomIn,
} from 'lucide-react';
import { createPortal } from 'react-dom';

import { invokeIpc } from '@/lib/api-client';
import type { AttachedFileMeta } from '@/stores/chat';
import { useMessageStyles } from './styles';
import type { StreamingToolStatus } from './types';

function formatDuration(durationMs?: number): string | null {
  if (!durationMs || !Number.isFinite(durationMs)) return null;
  if (durationMs < 1000) return `${Math.round(durationMs)}ms`;
  return `${(durationMs / 1000).toFixed(1)}s`;
}

export function ToolStatusBar({ tools }: { tools: StreamingToolStatus[] }) {
  const { styles, cx } = useMessageStyles();

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
            {isRunning && (
              <Loader2
                style={{
                  width: 14,
                  height: 14,
                  flexShrink: 0,
                  animation: 'spin 1s linear infinite',
                }}
              />
            )}
            {!isRunning && !isError && (
              <CheckCircle2
                style={{ width: 14, height: 14, color: '#22c55e', flexShrink: 0 }}
              />
            )}
            {isError && <AlertCircle style={{ width: 14, height: 14, flexShrink: 0 }} />}
            <Wrench style={{ width: 12, height: 12, flexShrink: 0, opacity: 0.6 }} />
            <span className={styles.toolStatusText}>{tool.name}</span>
            {duration && (
              <span className={styles.toolStatusDuration}>
                {tool.summary ? `(${duration})` : duration}
              </span>
            )}
            {tool.summary && (
              <span className={styles.toolStatusSummary}>{tool.summary}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function AssistantActions({ className, text }: { className?: string; text: string }) {
  const [copied, setCopied] = useState(false);

  const copyContent = useCallback(() => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);

  const items = [
    {
      icon: copied ? Check : Copy,
      key: 'copy',
      label: copied ? 'Copied' : 'Copy',
      onClick: copyContent,
    },
  ];

  return (
    <span className={className}>
      <ActionIconGroup
        items={items}
        onActionClick={({ key }) => {
          if (key === 'copy') copyContent();
        }}
        size="small"
        variant="borderless"
      />
    </span>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function FileIconComp({
  mimeType,
  style,
}: {
  mimeType: string;
  style?: CSSProperties;
}) {
  if (mimeType.startsWith('video/')) return <Film style={style} />;
  if (mimeType.startsWith('audio/')) return <Music style={style} />;
  if (
    mimeType.startsWith('text/') ||
    mimeType === 'application/json' ||
    mimeType === 'application/xml'
  ) {
    return <FileText style={style} />;
  }
  if (
    mimeType.includes('zip') ||
    mimeType.includes('compressed') ||
    mimeType.includes('archive') ||
    mimeType.includes('tar') ||
    mimeType.includes('rar') ||
    mimeType.includes('7z')
  ) {
    return <FileArchive style={style} />;
  }
  if (mimeType === 'application/pdf') return <FileText style={style} />;

  return <File style={style} />;
}

export function FileCard({ file }: { file: AttachedFileMeta }) {
  const { styles } = useMessageStyles();

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
      <FileIconComp
        mimeType={file.mimeType}
        style={{ width: 20, height: 20, flexShrink: 0, opacity: 0.6 }}
      />
      <div className={styles.fileCardMeta}>
        <p className={styles.fileCardName}>{file.fileName}</p>
        <p className={styles.fileCardSize}>
          {file.fileSize > 0 ? formatFileSize(file.fileSize) : 'File'}
        </p>
      </div>
    </button>
  );
}

export function ImageThumbnail({
  src,
  fileName,
  filePath,
  base64,
  mimeType,
  onPreview,
}: {
  src: string;
  fileName: string;
  filePath?: string;
  base64?: string;
  mimeType?: string;
  onPreview: () => void;
}) {
  void filePath;
  void base64;
  void mimeType;

  const { styles } = useMessageStyles();

  return (
    <button
      type="button"
      className={styles.imageThumbnail}
      onClick={onPreview}
      onKeyDown={(e) => e.key === 'Enter' && onPreview()}
    >
      <img src={src} alt={fileName} />
      <div className="overlay">
        <ZoomIn
          style={{
            width: 24,
            height: 24,
            filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))',
          }}
        />
      </div>
    </button>
  );
}

export function ImagePreviewCard({
  src,
  fileName,
  filePath,
  base64,
  mimeType,
  onPreview,
}: {
  src: string;
  fileName: string;
  filePath?: string;
  base64?: string;
  mimeType?: string;
  onPreview: () => void;
}) {
  void filePath;
  void base64;
  void mimeType;

  const { styles } = useMessageStyles();

  return (
    <button
      type="button"
      className={styles.imagePreviewCard}
      onClick={onPreview}
      onKeyDown={(e) => e.key === 'Enter' && onPreview()}
    >
      <img src={src} alt={fileName} />
      <div className="overlay">
        <ZoomIn
          style={{
            width: 24,
            height: 24,
            filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))',
          }}
        />
      </div>
    </button>
  );
}

export function ImageLightbox({
  src,
  fileName,
  filePath,
  base64,
  mimeType,
  onClose,
}: {
  src: string;
  fileName: string;
  filePath?: string;
  base64?: string;
  mimeType?: string;
  onClose: () => void;
}) {
  void src;
  void fileName;
  void base64;
  void mimeType;

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

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
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.8)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
    >
      {/* biome-ignore lint/a11y/noStaticElementInteractions: stop propagation */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: stop propagation */}
      <div
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={src}
          alt={fileName}
          style={{
            maxWidth: '90vw',
            maxHeight: '85vh',
            borderRadius: 8,
            boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
            objectFit: 'contain',
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {filePath && (
            <Button
              type="text"
              icon={<FolderOpen style={{ width: 16, height: 16 }} />}
              style={{
                background: 'rgba(255,255,255,0.1)',
                color: 'white',
                border: 'none',
              }}
              onClick={handleShowInFolder}
              title="在文件夹中显示"
            />
          )}
          <Button
            type="text"
            icon={<X style={{ width: 16, height: 16 }} />}
            style={{
              background: 'rgba(255,255,255,0.1)',
              color: 'white',
              border: 'none',
            }}
            onClick={onClose}
            title="关闭"
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}
