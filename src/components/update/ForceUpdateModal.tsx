/**
 * Full-screen update prompt (optional blocking). Driven by useUpdateStore.forcedUpdateModal.
 */
import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useUpdateStore } from '@/stores/update';
import { invokeIpc } from '@/lib/api-client';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

export function ForceUpdateModal() {
  const { t } = useTranslation('settings');
  const navigate = useNavigate();
  const modal = useUpdateStore((s) => s.forcedUpdateModal);
  const status = useUpdateStore((s) => s.status);
  const updateInfo = useUpdateStore((s) => s.updateInfo);
  const progress = useUpdateStore((s) => s.progress);
  const dismissForcedUpdateModal = useUpdateStore((s) => s.dismissForcedUpdateModal);
  const checkForUpdates = useUpdateStore((s) => s.checkForUpdates);
  const downloadUpdate = useUpdateStore((s) => s.downloadUpdate);
  const installUpdate = useUpdateStore((s) => s.installUpdate);

  const openLearnMore = useCallback(() => {
    const url = modal?.learnMoreUrl;
    if (url && window.electron?.openExternal) {
      void window.electron.openExternal(url);
    }
  }, [modal?.learnMoreUrl]);

  const goSettings = useCallback(() => {
    navigate('/settings');
  }, [navigate]);

  const primaryAction = useCallback(() => {
    if (status === 'downloaded') {
      installUpdate();
      return;
    }
    if (status === 'available') {
      void downloadUpdate();
      return;
    }
    void checkForUpdates();
  }, [status, checkForUpdates, downloadUpdate, installUpdate]);

  const primaryLabel = useMemo(() => {
    if (status === 'downloaded') return t('updates.action.install');
    if (status === 'available') return t('updates.action.download');
    if (status === 'checking' || status === 'downloading') {
      return status === 'checking' ? t('updates.action.checking') : t('updates.action.downloading');
    }
    return t('updates.forceModal.check');
  }, [status, t]);

  const showProgress = status === 'downloading' && progress != null;

  if (!modal) return null;

  const title = modal.title ?? t('updates.forceModal.titleDefault');
  const message =
    modal.message
    ?? (modal.reason === 'below-minimum'
      ? t('updates.forceModal.belowMinimum')
      : t('updates.forceModal.newVersion'));

  return (
    <div
      className={cn(
        'fixed inset-0 z-[200] flex items-center justify-center bg-background/80 backdrop-blur-sm',
        'p-6',
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby="force-update-title"
    >
      <div
        className={cn(
          'w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg',
        )}
      >
        <h2 id="force-update-title" className="text-lg font-semibold text-foreground">
          {title}
        </h2>
        <p className="mt-3 text-sm text-muted-foreground whitespace-pre-wrap">{message}</p>
        {updateInfo?.version && (
          <p className="mt-2 text-xs text-muted-foreground">
            {t('updates.forceModal.target', { version: updateInfo.version })}
          </p>
        )}
        {showProgress && (
          <div className="mt-4 space-y-2">
            <Progress value={progress.percent} className="h-2" />
            <p className="text-xs text-muted-foreground text-center">{Math.round(progress.percent)}%</p>
          </div>
        )}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
          {modal.learnMoreUrl ? (
            <Button type="button" variant="outline" onClick={openLearnMore}>
              {t('updates.forceModal.learnMore')}
            </Button>
          ) : null}
          {!modal.blockDismiss ? (
            <Button type="button" variant="outline" onClick={() => dismissForcedUpdateModal()}>
              {t('updates.forceModal.later')}
            </Button>
          ) : null}
          <Button type="button" variant="outline" onClick={goSettings}>
            {t('updates.forceModal.openSettings')}
          </Button>
          {modal.blockDismiss ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                void invokeIpc('app:quit');
              }}
            >
              {t('updates.forceModal.quit')}
            </Button>
          ) : null}
          <Button
            type="button"
            onClick={primaryAction}
            disabled={status === 'checking' || status === 'downloading'}
          >
            {status === 'checking' || status === 'downloading' ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {primaryLabel}
              </>
            ) : (
              primaryLabel
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
