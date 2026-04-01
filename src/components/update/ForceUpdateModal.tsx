/**
 * Full-screen update prompt (optional blocking). Driven by useUpdateStore.forcedUpdateModal.
 */
import { useCallback, useMemo } from 'react';
import { Loader2, ArrowUpCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useUpdateStore } from '@/stores/update';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import updateBg from '@/assets/update-bg.png';

export function ForceUpdateModal() {
  const { t } = useTranslation('settings');
  const modal = useUpdateStore((s) => s.forcedUpdateModal);
  const status = useUpdateStore((s) => s.status);
  const updateInfo = useUpdateStore((s) => s.updateInfo);
  const progress = useUpdateStore((s) => s.progress);
  const dismissForcedUpdateModal = useUpdateStore((s) => s.dismissForcedUpdateModal);
  const checkForUpdates = useUpdateStore((s) => s.checkForUpdates);
  const downloadUpdate = useUpdateStore((s) => s.downloadUpdate);
  const installUpdate = useUpdateStore((s) => s.installUpdate);

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
        'fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm',
        'p-6 animate-in fade-in duration-300',
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby="force-update-title"
    >
      <style>{`
        @keyframes float-illustration {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
      `}</style>
      
      <div className="relative animate-in zoom-in-95 duration-300">
        {/* Close button - show if dismissible */}
        {!modal.blockDismiss && (
          <button
            onClick={() => dismissForcedUpdateModal()}
            className="absolute -top-3 -right-3 z-30 flex items-center justify-center h-8 w-8 rounded-full bg-background shadow-lg border border-border/50 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        <div
          className={cn(
            'relative w-full max-w-lg rounded-[20px] bg-background shadow-2xl overflow-hidden',
            'flex flex-col'
          )}
        >
          {/* Illustration area */}
          <div className="relative w-full h-56 bg-gradient-to-b from-sky-50 to-white dark:from-sky-950/30 dark:to-background flex items-center justify-center">
            <img 
              src={updateBg} 
              alt="Update Illustration" 
              className="h-full w-auto object-contain" 
              style={{ animation: 'float-illustration 4s ease-in-out infinite' }}
            />
          </div>

          <div className="px-6 pb-6 pt-5 flex flex-col items-center text-center">
          <h2 id="force-update-title" className="text-xl font-bold tracking-tight text-foreground">
            {title}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
            {message}
          </p>
          {updateInfo?.version && (
            <div className="mt-3">
              <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                {t('updates.forceModal.target', { version: updateInfo.version })}
              </span>
            </div>
          )}
          
          {showProgress && (
            <div className="w-full mt-5 space-y-2 rounded-xl bg-muted/50 p-4 border border-border/50">
              <div className="flex justify-between items-center text-xs text-muted-foreground mb-2">
                <span className="font-medium">{t('updates.action.downloading')}</span>
                <span className="font-bold text-foreground">{Math.round(progress.percent)}%</span>
              </div>
              <Progress value={progress.percent} className="h-2 rounded-full" />
            </div>
          )}

          <div className="w-full mt-6 flex flex-col gap-3">
            <Button
              type="button"
              className="w-full h-12 text-base shadow-sm rounded-xl font-medium"
              onClick={primaryAction}
              disabled={status === 'checking' || status === 'downloading'}
            >
              {status === 'checking' || status === 'downloading' ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  {primaryLabel}
                </>
              ) : (
                <>
                  <ArrowUpCircle className="mr-2 h-5 w-5" />
                  {primaryLabel}
                </>
              )}
            </Button>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
