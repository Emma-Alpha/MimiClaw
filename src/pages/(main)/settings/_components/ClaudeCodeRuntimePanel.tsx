/**
 * Claude CLI Runtime status panel for the developer settings section.
 *
 * Shows the currently installed runtime version, install path, and exposes a
 * "Reinstall" action. Custom user-supplied CLI path takes precedence over the
 * runtime install when set — that input is rendered separately by the parent
 * settings page (it lives in the existing CodeAgent config form).
 */
import { memo, useCallback, useEffect, useState } from 'react';
import { createStyles } from 'antd-style';
import { Download, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { invokeIpc } from '@/lib/api-client';
import type {
  ClaudeCodeInstallProgress,
  ClaudeCodeRuntimeStatus,
} from '../../../../../shared/claude-code-runtime';

const usePanelStyles = createStyles(({ token, css }) => ({
  card: css`
    border: 1px solid ${token.colorBorderSecondary};
    border-radius: 12px;
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    background: ${token.colorFillQuaternary};
  `,
  header: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  `,
  title: css`
    font-size: 13px;
    font-weight: 600;
    color: ${token.colorText};
  `,
  metaRow: css`
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 12px;
    color: ${token.colorTextSecondary};
    word-break: break-all;
  `,
  pathLine: css`
    font-family: ${token.fontFamilyCode};
    font-size: 11px;
    color: ${token.colorTextTertiary};
  `,
  progressLine: css`
    font-size: 12px;
    color: ${token.colorPrimary};
  `,
  actions: css`
    display: flex;
    gap: 8px;
  `,
}));

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 MB';
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(mb >= 100 ? 0 : 1)} MB`;
}

function progressLabel(progress: ClaudeCodeInstallProgress | null): string | null {
  if (!progress) return null;
  switch (progress.stage) {
    case 'fetching-manifest':
      return '正在获取版本信息…';
    case 'downloading':
      return progress.totalBytes > 0
        ? `下载中 ${formatBytes(progress.downloadedBytes)} / ${formatBytes(progress.totalBytes)} (${Math.round(progress.percent)}%)`
        : '下载中…';
    case 'verifying':
      return '校验完整性中…';
    case 'finalizing':
      return '完成安装中…';
    case 'complete':
      return '已完成';
    case 'error':
      return progress.error ? `失败：${progress.error}` : '失败';
    default:
      return null;
  }
}

interface ClaudeCodeRuntimePanelProps {
  /** Optional callback so the parent (settings page) can refresh after a reinstall. */
  onAfterReinstall?: () => void;
}

const ClaudeCodeRuntimePanel = memo<ClaudeCodeRuntimePanelProps>(({ onAfterReinstall }) => {
  const { styles } = usePanelStyles();
  const [status, setStatus] = useState<ClaudeCodeRuntimeStatus | null>(null);
  const [installing, setInstalling] = useState(false);
  const [progress, setProgress] = useState<ClaudeCodeInstallProgress | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const refreshStatus = useCallback(async () => {
    setRefreshing(true);
    try {
      const next = (await invokeIpc('claude-code:get-status')) as ClaudeCodeRuntimeStatus;
      setStatus(next);
    } catch (err) {
      toast.error(`读取 Claude CLI 状态失败：${String(err)}`);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  useEffect(() => {
    const unsubscribe = window.electron.ipcRenderer.on(
      'claude-code:install-progress',
      (payload) => {
        setProgress(payload as ClaudeCodeInstallProgress);
      },
    );
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const handleReinstall = useCallback(async () => {
    setInstalling(true);
    setProgress(null);
    try {
      const result = (await invokeIpc('claude-code:install')) as { success: boolean; error?: string };
      if (result.success) {
        toast.success('Claude CLI 安装完成');
      } else {
        toast.error(`Claude CLI 安装失败：${result.error || '未知错误'}`);
      }
      await refreshStatus();
      onAfterReinstall?.();
    } catch (err) {
      toast.error(`Claude CLI 安装失败：${String(err)}`);
    } finally {
      setInstalling(false);
    }
  }, [refreshStatus, onAfterReinstall]);

  const installedVersion = status?.installedVersion;
  const installedPath = status?.installedBinaryPath;
  const expectedVersion = status?.expectedVersion;
  const liveLabel = progressLabel(progress);

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.title}>Claude CLI Runtime</span>
        {status?.installed ? (
          <Badge variant="outline">已安装 v{installedVersion}</Badge>
        ) : (
          <Badge variant="outline">未安装</Badge>
        )}
      </div>

      <div className={styles.metaRow}>
        <span>预期版本：v{expectedVersion ?? '—'}</span>
        {installedPath && <span className={styles.pathLine}>{installedPath}</span>}
        {!installedPath && (
          <span>首次启动会自动下载到应用私有目录，不会污染系统的 ~/.claude/。</span>
        )}
        {status?.customCliPath && (
          <span>
            自定义 CLI 路径：
            <span className={styles.pathLine}> {status.customCliPath}</span>
            {status.customCliPathValid ? ' ✓' : '（路径不存在）'}
          </span>
        )}
        {installing && liveLabel && <span className={styles.progressLine}>{liveLabel}</span>}
      </div>

      <div className={styles.actions}>
        <Button onClick={() => void handleReinstall()} disabled={installing}>
          {installing ? (
            <Loader2 size={14} className="animate-spin" style={{ marginRight: 6 }} />
          ) : (
            <Download size={14} style={{ marginRight: 6 }} />
          )}
          {installing
            ? '安装中…'
            : status?.installed && installedVersion === expectedVersion
            ? '重新下载'
            : '立即安装'}
        </Button>
        <Button onClick={() => void refreshStatus()} disabled={refreshing || installing} type="text">
          <RefreshCw
            size={14}
            className={refreshing ? 'animate-spin' : undefined}
            style={{ marginRight: 6 }}
          />
          刷新状态
        </Button>
      </div>
    </div>
  );
});

ClaudeCodeRuntimePanel.displayName = 'ClaudeCodeRuntimePanel';

export default ClaudeCodeRuntimePanel;
