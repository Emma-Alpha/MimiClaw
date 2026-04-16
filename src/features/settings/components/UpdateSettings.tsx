/**
 * Update Settings Component
 * Displays update status and allows manual update checking/installation
 */
import { useEffect, useCallback, useMemo } from 'react';
import { Download, RefreshCw, Loader2, Rocket, XCircle } from 'lucide-react';
import { createStyles } from 'antd-style';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useUpdateStore } from '@/stores/update';
import { useTranslation } from 'react-i18next';

const useStyles = createStyles(({ css, token }) => ({
  root: css`
    display: flex;
    flex-direction: column;
    gap: 16px;
  `,
  row: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
  `,
  versionStack: css`
    display: flex;
    flex-direction: column;
    gap: 4px;
  `,
  label: css`
    font-size: ${token.fontSizeSM}px;
    font-weight: 500;
    color: ${token.colorText};
  `,
  versionValue: css`
    font-size: ${token.fontSizeSM}px;
    font-weight: 700;
    color: ${token.colorText};
  `,
  statusRow: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 0;
    border-top: 1px solid ${token.colorBorderSecondary};
    border-bottom: 1px solid ${token.colorBorderSecondary};
  `,
  statusText: css`
    font-size: ${token.fontSizeSM}px;
    color: ${token.colorTextSecondary};
  `,
  progressStack: css`
    display: flex;
    flex-direction: column;
    gap: 8px;
  `,
  progressRow: css`
    display: flex;
    justify-content: space-between;
    font-size: ${token.fontSizeSM}px;
    color: ${token.colorText};
  `,
  progressCaption: css`
    font-size: 12px;
    color: ${token.colorTextSecondary};
    text-align: center;
  `,
  updateInfo: css`
    border-radius: ${token.borderRadiusLG}px;
    background: ${token.colorFillTertiary};
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  `,
  updateInfoRow: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
  `,
  updateInfoTitle: css`
    font-weight: 500;
    color: ${token.colorText};
  `,
  updateInfoDate: css`
    font-size: ${token.fontSizeSM}px;
    color: ${token.colorTextSecondary};
  `,
  releaseNotes: css`
    font-size: ${token.fontSizeSM}px;
    color: ${token.colorTextSecondary};
  `,
  releaseNotesTitle: css`
    font-weight: 500;
    color: ${token.colorText};
    margin-bottom: 4px;
  `,
  releaseNotesPre: css`
    white-space: pre-wrap;
  `,
  errorBox: css`
    border-radius: ${token.borderRadiusLG}px;
    background: ${token.colorErrorBg};
    padding: 16px;
    font-size: ${token.fontSizeSM}px;
    color: ${token.colorError};
  `,
  errorTitle: css`
    font-weight: 500;
    margin-bottom: 4px;
  `,
  helpText: css`
    font-size: 12px;
    color: ${token.colorTextTertiary};
  `,
  initRow: css`
    display: flex;
    align-items: center;
    gap: 8px;
    color: ${token.colorTextSecondary};
  `,
}));

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

const iconSm = { width: 16, height: 16 };

export function UpdateSettings() {
  const { t } = useTranslation('settings');
  const { styles } = useStyles();
  const {
    status, currentVersion, updateInfo, progress, error,
    isInitialized, autoInstallCountdown,
    init, checkForUpdates, downloadUpdate, installUpdate,
    cancelAutoInstall, clearError,
  } = useUpdateStore();

  useEffect(() => { init(); }, [init]);

  const handleCheckForUpdates = useCallback(async () => {
    clearError();
    await checkForUpdates();
  }, [checkForUpdates, clearError]);

  const isMacOS = useMemo(() => window.electron?.platform === 'darwin', []);

  const renderStatusIcon = () => {
    switch (status) {
      case 'checking':
      case 'downloading':
        return <Loader2 className="animate-spin" style={{ ...iconSm, color: 'var(--ant-color-text-secondary)' }} />;
      case 'available':
        return <Download style={{ ...iconSm, color: 'var(--ant-color-primary)' }} />;
      case 'downloaded':
        return <Rocket style={{ ...iconSm, color: 'var(--ant-color-primary)' }} />;
      case 'error':
        return <RefreshCw style={{ ...iconSm, color: 'var(--ant-color-error)' }} />;
      default:
        return <RefreshCw style={{ ...iconSm, color: 'var(--ant-color-text-secondary)' }} />;
    }
  };

  const renderStatusText = () => {
    if (status === 'downloaded' && autoInstallCountdown != null && autoInstallCountdown >= 0) {
      return t('updates.status.autoInstalling', { seconds: autoInstallCountdown });
    }
    switch (status) {
      case 'checking': return t('updates.status.checking');
      case 'downloading': return t('updates.status.downloading');
      case 'available': return t('updates.status.available', { version: updateInfo?.version });
      case 'downloaded':
        return isMacOS
          ? t('updates.status.downloadedMac', { version: updateInfo?.version })
          : t('updates.status.downloaded', { version: updateInfo?.version });
      case 'error': return error || t('updates.status.failed');
      case 'not-available': return t('updates.status.latest');
      default: return t('updates.status.check');
    }
  };

  const renderAction = () => {
    switch (status) {
      case 'checking':
        return (
          <Button disabled variant="outline" size="sm">
            <Loader2 style={{ ...iconSm, marginRight: 8 }} className="animate-spin" />
            {t('updates.action.checking')}
          </Button>
        );
      case 'downloading':
        return (
          <Button disabled variant="outline" size="sm">
            <Loader2 style={{ ...iconSm, marginRight: 8 }} className="animate-spin" />
            {t('updates.action.downloading')}
          </Button>
        );
      case 'available':
        return (
          <Button onClick={downloadUpdate} size="sm">
            <Download style={{ ...iconSm, marginRight: 8 }} />
            {t('updates.action.download')}
          </Button>
        );
      case 'downloaded':
        if (autoInstallCountdown != null && autoInstallCountdown >= 0) {
          return (
            <Button onClick={cancelAutoInstall} size="sm" variant="outline">
              <XCircle style={{ ...iconSm, marginRight: 8 }} />
              {t('updates.action.cancelAutoInstall')}
            </Button>
          );
        }
        return (
          <Button onClick={installUpdate} size="sm" variant="default">
            <Rocket style={{ ...iconSm, marginRight: 8 }} />
            {t('updates.action.install')}
          </Button>
        );
      case 'error':
        return (
          <Button onClick={handleCheckForUpdates} variant="outline" size="sm">
            <RefreshCw style={{ ...iconSm, marginRight: 8 }} />
            {t('updates.action.retry')}
          </Button>
        );
      default:
        return (
          <Button onClick={handleCheckForUpdates} variant="outline" size="sm">
            <RefreshCw style={{ ...iconSm, marginRight: 8 }} />
            {t('updates.action.check')}
          </Button>
        );
    }
  };

  if (!isInitialized) {
    return (
      <div className={styles.initRow}>
        <Loader2 style={iconSm} className="animate-spin" />
        <span>Loading...</span>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <div className={styles.row}>
        <div className={styles.versionStack}>
          <p className={styles.label}>{t('updates.currentVersion')}</p>
          <p className={styles.versionValue}>v{currentVersion}</p>
        </div>
        {renderStatusIcon()}
      </div>

      <div className={styles.statusRow}>
        <p className={styles.statusText}>{renderStatusText()}</p>
        {renderAction()}
      </div>

      {status === 'downloading' && progress && (
        <div className={styles.progressStack}>
          <div className={styles.progressRow}>
            <span>{formatBytes(progress.transferred)} / {formatBytes(progress.total)}</span>
            <span>{formatBytes(progress.bytesPerSecond)}/s</span>
          </div>
          <Progress value={progress.percent} />
          <p className={styles.progressCaption}>
            {Math.round(progress.percent)}% complete
          </p>
        </div>
      )}

      {updateInfo && (status === 'available' || status === 'downloaded') && (
        <div className={styles.updateInfo}>
          <div className={styles.updateInfoRow}>
            <p className={styles.updateInfoTitle}>Version {updateInfo.version}</p>
            {updateInfo.releaseDate && (
              <p className={styles.updateInfoDate}>
                {new Date(updateInfo.releaseDate).toLocaleDateString()}
              </p>
            )}
          </div>
          {updateInfo.releaseNotes && (
            <div className={styles.releaseNotes}>
              <p className={styles.releaseNotesTitle}>{t('updates.whatsNew')}</p>
              <p className={styles.releaseNotesPre}>{updateInfo.releaseNotes}</p>
            </div>
          )}
        </div>
      )}

      {status === 'error' && error && (
        <div className={styles.errorBox}>
          <p className={styles.errorTitle}>{t('updates.errorDetails')}</p>
          <p>{error}</p>
        </div>
      )}

      <p className={styles.helpText}>
        {isMacOS ? t('updates.helpMac') : t('updates.help')}
      </p>
    </div>
  );
}

export default UpdateSettings;
