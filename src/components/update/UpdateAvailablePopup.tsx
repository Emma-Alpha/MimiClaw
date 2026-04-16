import { useState } from 'react';
import { createStyles } from 'antd-style';
import { useUpdateStore } from '@/stores/update';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

const useStyles = createStyles(({ token, css }) => ({
  backdrop: css`
    position: fixed;
    inset: 0;
    z-index: 200;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(4px);
    padding: 24px;
    animation: fadeIn 0.2s ease;
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `,
  panel: css`
    width: 100%;
    max-width: 420px;
    border-radius: 16px;
    border: 1px solid ${token.colorBorderSecondary};
    background: ${token.colorBgContainer};
    box-shadow: ${token.boxShadow};
    overflow: hidden;
    display: flex;
    flex-direction: column;
    max-height: 80vh;
    animation: zoomIn 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
    @keyframes zoomIn {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }
  `,
  header: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 24px;
    border-bottom: 1px solid ${token.colorBorderSecondary};
  `,
  headerTitle: css`
    font-size: var(--mimi-font-size-sm);
    font-weight: 700;
    color: ${token.colorText};
  `,
  headerRight: css`
    display: flex;
    align-items: center;
    gap: 12px;
  `,
  versionBadge: css`
    font-size: var(--mimi-font-size-xs);
    font-family: ${token.fontFamilyCode};
    background: ${token.colorFillTertiary};
    padding: 2px 8px;
    border-radius: 9999px;
    color: ${token.colorTextSecondary};
    font-weight: 500;
  `,
  closeBtn: css`
    background: none;
    border: none;
    cursor: pointer;
    color: ${token.colorTextSecondary};
    padding: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: color 0.15s ease;

    &:hover {
      color: ${token.colorText};
    }
  `,
  body: css`
    padding: 24px;
    overflow-y: auto;
    flex: 1;
    background: ${token.colorFillQuaternary};
  `,
  releaseNotes: css`
    font-size: var(--mimi-font-size-sm);
    color: ${token.colorTextSecondary};
    white-space: pre-wrap;
    line-height: 1.6;
    font-family: inherit;
  `,
  footer: css`
    padding: 16px;
    border-top: 1px solid ${token.colorBorderSecondary};
    background: ${token.colorBgContainer};
    display: flex;
    gap: 12px;
    justify-content: flex-end;
  `,
}));

export function UpdateAvailablePopup() {
  const { styles } = useStyles();
  const status = useUpdateStore((s) => s.status);
  const updateInfo = useUpdateStore((s) => s.updateInfo);
  const downloadUpdate = useUpdateStore((s) => s.downloadUpdate);
  const forcedUpdateModal = useUpdateStore((s) => s.forcedUpdateModal);

  const [dismissedVersion, setDismissedVersion] = useState<string | null>(null);

  // If there's a forced update modal, don't show the soft popup
  if (forcedUpdateModal) return null;

  // Only show when available and not dismissed
  if (status !== 'available' || !updateInfo) return null;
  if (dismissedVersion === updateInfo.version) return null;

  const handleDownload = () => {
    void downloadUpdate();
  };

  const handleDismiss = () => {
    setDismissedVersion(updateInfo.version);
  };

  return (
    <div className={styles.backdrop}>
      <div className={styles.panel}>
        <div className={styles.header}>
          <h2 className={styles.headerTitle}>发现新版本</h2>
          <div className={styles.headerRight}>
            <span className={styles.versionBadge}>v{updateInfo.version}</span>
            <button type="button" onClick={handleDismiss} className={styles.closeBtn}>
              <X style={{ width: 20, height: 20 }} />
            </button>
          </div>
        </div>

        <div className={styles.body}>
          {updateInfo.releaseNotes ? (
            <pre className={styles.releaseNotes}>
              {updateInfo.releaseNotes.replace(/<[^>]*>?/gm, '')}
            </pre>
          ) : (
            <p className={styles.releaseNotes}>
              新版本 v{updateInfo.version} 已经准备就绪，包含多项性能优化和问题修复。
            </p>
          )}
        </div>

        <div className={styles.footer}>
          <Button type="primary" onClick={handleDownload} style={{ borderRadius: 9999, padding: '0 24px' }}>
            立即下载
          </Button>
          <Button onClick={handleDismiss} style={{ borderRadius: 9999, padding: '0 24px' }}>
            稍后提醒
          </Button>
        </div>
      </div>
    </div>
  );
}
