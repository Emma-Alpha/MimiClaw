import { useState } from 'react';
import { useUpdateStore } from '@/stores/update';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

export function UpdateAvailablePopup() {
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
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-6 animate-in fade-in duration-200">
      <div className="w-full max-w-[420px] rounded-2xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-bold text-foreground">
            发现新版本
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded-full text-muted-foreground font-medium">
              v{updateInfo.version}
            </span>
            <button onClick={handleDismiss} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1 bg-muted/10">
          {updateInfo.releaseNotes ? (
            <div className="prose prose-sm dark:prose-invert max-w-none text-sm text-muted-foreground whitespace-pre-wrap font-sans leading-relaxed">
              {updateInfo.releaseNotes.replace(/<[^>]*>?/gm, '')}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              新版本 v{updateInfo.version} 已经准备就绪，包含多项性能优化和问题修复。
            </p>
          )}
        </div>

        <div className="p-4 border-t bg-card flex gap-3 justify-end">
          <Button onClick={handleDownload} className="rounded-full px-6">
            立即下载
          </Button>
          <Button variant="outline" onClick={handleDismiss} className="rounded-full px-6">
            稍后提醒
          </Button>
        </div>
      </div>
    </div>
  );
}
