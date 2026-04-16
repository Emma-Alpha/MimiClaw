/**
 * VideoFileListViewer
 * Renders locally-attached video files as inline <video> players.
 * Adapted from lobe-chat's VideoFileListViewer — uses AttachedFileMeta
 * instead of ChatVideoItem, and resolves src via file:// for Electron.
 */
import { useCallback } from 'react';
import { Film, FolderOpen } from 'lucide-react';

import { invokeIpc } from '@/lib/api-client';
import type { AttachedFileMeta } from '@/stores/chat';
import { useMessageStyles } from './styles';

/** Convert an AttachedFileMeta to a playable video src URL. */
function videoSrc(file: AttachedFileMeta): string | null {
  if (file.filePath) return `file://${encodeURI(file.filePath)}`;
  if (file.preview) return file.preview;
  return null;
}

function VideoItem({ file }: { file: AttachedFileMeta }) {
  const { styles } = useMessageStyles();
  const src = videoSrc(file);

  const handleShowInFolder = useCallback(() => {
    if (file.filePath) invokeIpc('shell:showItemInFolder', file.filePath);
  }, [file.filePath]);

  return (
    <div className={styles.videoItem}>
      {src ? (
        <video controls preload="metadata">
          <source src={src} type={file.mimeType} />
        </video>
      ) : (
        <div className={styles.videoPlaceholder}>
          <Film style={{ width: 28, height: 28, opacity: 0.4 }} />
          <span>{file.fileName}</span>
        </div>
      )}
      <div className={styles.videoFooter}>
        <span className={styles.videoFileName} title={file.fileName}>
          {file.fileName}
        </span>
        {file.filePath && (
          <button
            type="button"
            className={styles.videoFolderBtn}
            title="在文件夹中显示"
            onClick={handleShowInFolder}
          >
            <FolderOpen style={{ width: 13, height: 13 }} />
          </button>
        )}
      </div>
    </div>
  );
}

interface VideoFileListViewerProps {
  files: AttachedFileMeta[];
}

export function VideoFileListViewer({ files }: VideoFileListViewerProps) {
  if (files.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {files.map((file, i) => (
        <VideoItem key={file.filePath ?? `video-${i}`} file={file} />
      ))}
    </div>
  );
}
