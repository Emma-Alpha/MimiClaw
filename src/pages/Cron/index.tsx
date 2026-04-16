/**
 * Cron Page
 * Manage scheduled tasks
 */
import { useEffect, useState, useCallback } from 'react';
import {
  Plus,
  Clock,
  Play,
  Trash2,
  RefreshCw,
  X,
  Calendar,
  AlertCircle,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Loader2,
  Timer,
  History,
  Pause,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useCronStore } from '@/stores/cron';
import { useGatewayStore } from '@/stores/gateway';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { formatRelativeTime } from '@/lib/utils';
import { toast } from 'sonner';
import type { CronJob, CronJobCreateInput, ScheduleType } from '@/types/cron';
import { CHANNEL_ICONS, type ChannelType } from '@/types/channel';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useCronStyles } from './styles';

// Common cron schedule presets
const schedulePresets: { key: string; value: string; type: ScheduleType }[] = [
  { key: 'everyMinute', value: '* * * * *', type: 'interval' },
  { key: 'every5Min', value: '*/5 * * * *', type: 'interval' },
  { key: 'every15Min', value: '*/15 * * * *', type: 'interval' },
  { key: 'everyHour', value: '0 * * * *', type: 'interval' },
  { key: 'daily9am', value: '0 9 * * *', type: 'daily' },
  { key: 'daily6pm', value: '0 18 * * *', type: 'daily' },
  { key: 'weeklyMon', value: '0 9 * * 1', type: 'weekly' },
  { key: 'monthly1st', value: '0 9 1 * *', type: 'monthly' },
];

// Parse cron schedule to human-readable format
// Handles both plain cron strings and Gateway CronSchedule objects:
//   { kind: "cron", expr: "...", tz?: "..." }
//   { kind: "every", everyMs: number }
//   { kind: "at", at: "..." }
function parseCronSchedule(schedule: unknown, t: TFunction<'cron'>): string {
  // Handle Gateway CronSchedule object format
  if (schedule && typeof schedule === 'object') {
    const s = schedule as { kind?: string; expr?: string; tz?: string; everyMs?: number; at?: string };
    if (s.kind === 'cron' && typeof s.expr === 'string') {
      return parseCronExpr(s.expr, t);
    }
    if (s.kind === 'every' && typeof s.everyMs === 'number') {
      const ms = s.everyMs;
      if (ms < 60_000) return t('schedule.everySeconds', { count: Math.round(ms / 1000) });
      if (ms < 3_600_000) return t('schedule.everyMinutes', { count: Math.round(ms / 60_000) });
      if (ms < 86_400_000) return t('schedule.everyHours', { count: Math.round(ms / 3_600_000) });
      return t('schedule.everyDays', { count: Math.round(ms / 86_400_000) });
    }
    if (s.kind === 'at' && typeof s.at === 'string') {
      try {
        return t('schedule.onceAt', { time: new Date(s.at).toLocaleString() });
      } catch {
        return t('schedule.onceAt', { time: s.at });
      }
    }
    return String(schedule);
  }

  // Handle plain cron string
  if (typeof schedule === 'string') {
    return parseCronExpr(schedule, t);
  }

  return String(schedule ?? t('schedule.unknown'));
}

// Parse a plain cron expression string to human-readable text
function parseCronExpr(cron: string, t: TFunction<'cron'>): string {
  const preset = schedulePresets.find((p) => p.value === cron);
  if (preset) return t(`presets.${preset.key}` as const);

  const parts = cron.split(' ');
  if (parts.length !== 5) return cron;

  const [minute, hour, dayOfMonth, , dayOfWeek] = parts;

  if (minute === '*' && hour === '*') return t('presets.everyMinute');
  if (minute.startsWith('*/')) return t('schedule.everyMinutes', { count: Number(minute.slice(2)) });
  if (hour === '*' && minute === '0') return t('presets.everyHour');
  if (dayOfWeek !== '*' && dayOfMonth === '*') {
    return t('schedule.weeklyAt', { day: dayOfWeek, time: `${hour}:${minute.padStart(2, '0')}` });
  }
  if (dayOfMonth !== '*') {
    return t('schedule.monthlyAtDay', { day: dayOfMonth, time: `${hour}:${minute.padStart(2, '0')}` });
  }
  if (hour !== '*') {
    return t('schedule.dailyAt', { time: `${hour}:${minute.padStart(2, '0')}` });
  }

  return cron;
}

function estimateNextRun(scheduleExpr: string): string | null {
  const now = new Date();
  const next = new Date(now.getTime());

  if (scheduleExpr === '* * * * *') {
    next.setSeconds(0, 0);
    next.setMinutes(next.getMinutes() + 1);
    return next.toLocaleString();
  }

  if (scheduleExpr === '*/5 * * * *') {
    const delta = 5 - (next.getMinutes() % 5 || 5);
    next.setSeconds(0, 0);
    next.setMinutes(next.getMinutes() + delta);
    return next.toLocaleString();
  }

  if (scheduleExpr === '*/15 * * * *') {
    const delta = 15 - (next.getMinutes() % 15 || 15);
    next.setSeconds(0, 0);
    next.setMinutes(next.getMinutes() + delta);
    return next.toLocaleString();
  }

  if (scheduleExpr === '0 * * * *') {
    next.setMinutes(0, 0, 0);
    next.setHours(next.getHours() + 1);
    return next.toLocaleString();
  }

  if (scheduleExpr === '0 9 * * *' || scheduleExpr === '0 18 * * *') {
    const targetHour = scheduleExpr === '0 9 * * *' ? 9 : 18;
    next.setSeconds(0, 0);
    next.setHours(targetHour, 0, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    return next.toLocaleString();
  }

  if (scheduleExpr === '0 9 * * 1') {
    next.setSeconds(0, 0);
    next.setHours(9, 0, 0, 0);
    const day = next.getDay();
    const daysUntilMonday = day === 1 ? 7 : (8 - day) % 7;
    next.setDate(next.getDate() + daysUntilMonday);
    return next.toLocaleString();
  }

  if (scheduleExpr === '0 9 1 * *') {
    next.setSeconds(0, 0);
    next.setDate(1);
    next.setHours(9, 0, 0, 0);
    if (next <= now) next.setMonth(next.getMonth() + 1);
    return next.toLocaleString();
  }

  return null;
}

// Create/Edit Task Dialog
interface TaskDialogProps {
  job?: CronJob;
  onClose: () => void;
  onSave: (input: CronJobCreateInput) => Promise<void>;
}

function TaskDialog({ job, onClose, onSave }: TaskDialogProps) {
  const { t } = useTranslation('cron');
  const { styles, cx } = useCronStyles();
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState(job?.name || '');
  const [message, setMessage] = useState(job?.message || '');
  // Extract cron expression string from CronSchedule object or use as-is if string
  const initialSchedule = (() => {
    const s = job?.schedule;
    if (!s) return '0 9 * * *';
    if (typeof s === 'string') return s;
    if (typeof s === 'object' && 'expr' in s && typeof (s as { expr: string }).expr === 'string') {
      return (s as { expr: string }).expr;
    }
    return '0 9 * * *';
  })();
  const [schedule, setSchedule] = useState(initialSchedule);
  const [customSchedule, setCustomSchedule] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [enabled, setEnabled] = useState(job?.enabled ?? true);
  const schedulePreview = estimateNextRun(useCustom ? customSchedule : schedule);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error(t('toast.nameRequired'));
      return;
    }
    if (!message.trim()) {
      toast.error(t('toast.messageRequired'));
      return;
    }

    const finalSchedule = useCustom ? customSchedule : schedule;
    if (!finalSchedule.trim()) {
      toast.error(t('toast.scheduleRequired'));
      return;
    }

    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        message: message.trim(),
        schedule: finalSchedule,
        enabled,
      });
      onClose();
      toast.success(job ? t('toast.updated') : t('toast.created'));
    } catch (err) {
      toast.error(String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.dialogOverlay} onClick={onClose}>
      <Card className={styles.dialogCard} onClick={(e) => e.stopPropagation()}>
        <CardHeader className={styles.dialogHeader}>
          <div>
            <CardTitle className={styles.dialogTitle}>{job ? t('dialog.editTitle') : t('dialog.createTitle')}</CardTitle>
            <CardDescription className={styles.dialogDesc}>{t('dialog.description')}</CardDescription>
          </div>
          <Button type="text" onClick={onClose} className={styles.dialogCloseBtn} style={{ padding: 0, width: 32, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <X style={{ width: 16, height: 16 }} />
          </Button>
        </CardHeader>
        <CardContent className={styles.dialogBody}>
          {/* Name */}
          <div className={styles.dialogField}>
            <Label htmlFor="name" className={styles.dialogLabel}>{t('dialog.taskName')}</Label>
            <Input
              id="name"
              placeholder={t('dialog.taskNamePlaceholder')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={styles.dialogInput}
            />
          </div>

          {/* Message */}
          <div className={styles.dialogField}>
            <Label htmlFor="message" className={styles.dialogLabel}>{t('dialog.message')}</Label>
            <Textarea
              id="message"
              placeholder={t('dialog.messagePlaceholder')}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              className={styles.dialogTextarea}
            />
          </div>

          {/* Schedule */}
          <div className={styles.dialogField}>
            <Label className={styles.dialogLabel}>{t('dialog.schedule')}</Label>
            {!useCustom ? (
              <div className={styles.presetGrid}>
                {schedulePresets.map((preset) => (
                  <Button
                    key={preset.value}
                    type={schedule === preset.value ? 'primary' : 'default'}
                    size="small"
                    onClick={() => setSchedule(preset.value)}
                    className={cx(
                      styles.presetBtnBase,
                      schedule === preset.value ? styles.presetBtnActive : styles.presetBtnInactive
                    )}
                  >
                    <Timer style={{ width: 16, height: 16, marginRight: 8, opacity: 0.7 }} />
                    {t(`presets.${preset.key}` as const)}
                  </Button>
                ))}
              </div>
            ) : (
              <Input
                placeholder={t('dialog.cronPlaceholder')}
                value={customSchedule}
                onChange={(e) => setCustomSchedule(e.target.value)}
                className={styles.dialogInput}
              />
            )}
            <div className={styles.scheduleFooter}>
              <p className={styles.schedulePreview}>
                {schedulePreview ? `${t('card.next')}: ${schedulePreview}` : t('dialog.cronPlaceholder')}
              </p>
              <Button
                type="text"
                size="small"
                onClick={() => setUseCustom(!useCustom)}
                className={styles.toggleCustomBtn}
              >
                {useCustom ? t('dialog.usePresets') : t('dialog.useCustomCron')}
              </Button>
            </div>
          </div>

          {/* Enabled */}
          <div className={styles.enableRow}>
            <div>
              <Label className={styles.enableLabel}>{t('dialog.enableImmediately')}</Label>
              <p className={styles.enableDesc}>{t('dialog.enableImmediatelyDesc')}</p>
            </div>
            <Switch checked={enabled} onChange={setEnabled} />
          </div>

          {/* Actions */}
          <div className={styles.dialogFooter}>
            <Button onClick={onClose} className={styles.dialogCancelBtn}>
              {t('common:actions.cancel', 'Cancel')}
            </Button>
            <Button type="primary" onClick={handleSubmit} disabled={saving} className={styles.dialogSubmitBtn}>
              {saving ? (
                <>
                  <Loader2 style={{ width: 16, height: 16, marginRight: 8 }} className="animate-spin" />
                  {t('common:status.saving', 'Saving...')}
                </>
              ) : (
                <>
                  <CheckCircle2 style={{ width: 16, height: 16, marginRight: 8 }} />
                  {job ? t('dialog.saveChanges') : t('dialog.createTitle')}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Job Card Component
interface CronJobCardProps {
  job: CronJob;
  onToggle: (enabled: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
  onTrigger: () => Promise<void>;
}

function CronJobCard({ job, onToggle, onEdit, onDelete, onTrigger }: CronJobCardProps) {
  const { t } = useTranslation('cron');
  const { styles, cx } = useCronStyles();
  const [triggering, setTriggering] = useState(false);

  const handleTrigger = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setTriggering(true);
    try {
      await onTrigger();
      toast.success(t('toast.triggered'));
    } catch (error) {
      console.error('Failed to trigger cron job:', error);
      toast.error(t('toast.failedTrigger', { error: error instanceof Error ? error.message : String(error) }));
    } finally {
      setTriggering(false);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete();
  };

  return (
    <div
      className={cx(styles.jobCard, 'job-card')}
      onClick={onEdit}
    >
      <div className={styles.jobCardTop}>
        <div className={styles.jobCardLeft}>
          <div className={styles.jobCardIconCircle}>
            <Clock style={{ width: 20, height: 20, color: job.enabled ? 'inherit' : 'var(--ant-color-text-secondary)' }} />
          </div>
          <div className={styles.jobCardNameCol}>
            <div className={styles.jobCardNameRow}>
              <h3 className={styles.jobCardName}>{job.name}</h3>
              <div
                className={cx(
                  styles.jobCardStatusDot,
                  job.enabled ? styles.jobCardStatusDotActive : styles.jobCardStatusDotPaused
                )}
                title={job.enabled ? t('stats.active') : t('stats.paused')}
              />
            </div>
            <p className={styles.jobCardScheduleRow}>
              <Timer style={{ width: 14, height: 14 }} />
              {parseCronSchedule(job.schedule, t)}
            </p>
          </div>
        </div>

        <div className={styles.jobCardRight} onClick={e => e.stopPropagation()}>
          <Switch
            checked={job.enabled}
            onChange={onToggle}
          />
        </div>
      </div>

      <div className={styles.jobCardBody}>
        <div className={styles.jobCardMessageRow}>
          <MessageSquare style={{ width: 14, height: 14, marginTop: 2, color: 'var(--ant-color-text-secondary)', flexShrink: 0 }} />
          <p className={styles.jobCardMessage}>{job.message}</p>
        </div>

        {/* Metadata */}
        <div className={styles.jobCardMeta}>
          {job.target && (
            <span className={styles.jobCardMetaItem}>
              {CHANNEL_ICONS[job.target.channelType as ChannelType]}
              {job.target.channelName}
            </span>
          )}

          {job.lastRun && (
            <span className={styles.jobCardMetaItem}>
              <History style={{ width: 14, height: 14 }} />
              {t('card.last')}: {formatRelativeTime(job.lastRun.time)}
              {job.lastRun.success ? (
                <CheckCircle2 style={{ width: 14, height: 14, color: '#22c55e' }} />
              ) : (
                <XCircle style={{ width: 14, height: 14, color: '#ef4444' }} />
              )}
            </span>
          )}

          {job.nextRun && job.enabled && (
            <span className={styles.jobCardMetaItem}>
              <Calendar style={{ width: 14, height: 14 }} />
              {t('card.next')}: {new Date(job.nextRun).toLocaleString()}
            </span>
          )}
        </div>

        {/* Last Run Error */}
        {job.lastRun && !job.lastRun.success && job.lastRun.error && (
          <div className={styles.jobCardErrorBox}>
            <AlertCircle style={{ width: 16, height: 16, marginTop: 2, flexShrink: 0 }} />
            <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {job.lastRun.error}
            </span>
          </div>
        )}

        {/* Actions */}
        <div className={styles.jobCardActions}>
          <Button
            type="text"
            size="small"
            onClick={handleTrigger}
            disabled={triggering}
            className={styles.jobCardTriggerBtn}
          >
            {triggering ? (
              <Loader2 style={{ width: 14, height: 14, marginRight: 6 }} className="animate-spin" />
            ) : (
              <Play style={{ width: 14, height: 14, marginRight: 6 }} />
            )}
            {t('card.runNow')}
          </Button>
          <Button
            type="text"
            size="small"
            onClick={handleDelete}
            className={styles.jobCardDeleteBtn}
          >
            <Trash2 style={{ width: 14, height: 14, marginRight: 6 }} />
            {t('common:actions.delete', 'Delete')}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function Cron() {
  const { t } = useTranslation('cron');
  const { styles } = useCronStyles();
  const { jobs, loading, error, fetchJobs, createJob, updateJob, toggleJob, deleteJob, triggerJob } = useCronStore();
  const gatewayStatus = useGatewayStore((state) => state.status);
  const [showDialog, setShowDialog] = useState(false);
  const [editingJob, setEditingJob] = useState<CronJob | undefined>();
  const [jobToDelete, setJobToDelete] = useState<{ id: string } | null>(null);

  const isGatewayRunning = gatewayStatus.state === 'running';

  // Fetch jobs on mount
  useEffect(() => {
    if (isGatewayRunning) {
      fetchJobs();
    }
  }, [fetchJobs, isGatewayRunning]);

  // Statistics
  const safeJobs = Array.isArray(jobs) ? jobs : [];
  const activeJobs = safeJobs.filter((j) => j.enabled);
  const pausedJobs = safeJobs.filter((j) => !j.enabled);
  const failedJobs = safeJobs.filter((j) => j.lastRun && !j.lastRun.success);

  const handleSave = useCallback(async (input: CronJobCreateInput) => {
    if (editingJob) {
      await updateJob(editingJob.id, input);
    } else {
      await createJob(input);
    }
  }, [editingJob, createJob, updateJob]);

  const handleToggle = useCallback(async (id: string, enabled: boolean) => {
    try {
      await toggleJob(id, enabled);
      toast.success(enabled ? t('toast.enabled') : t('toast.paused'));
    } catch {
      toast.error(t('toast.failedUpdate'));
    }
  }, [toggleJob, t]);

  if (loading) {
    return (
      <div className={styles.loadingWrapper}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className={styles.pageRoot}>
      <div className={styles.pageInner}>
        {/* Header */}
        <div className={styles.header}>
          <div>
            <h1 className={styles.headerTitle} style={{ fontFamily: 'Georgia, Cambria, "Times New Roman", Times, serif' }}>
              {t('title')}
            </h1>
            <p className={styles.headerSubtitle}>{t('subtitle')}</p>
          </div>
          <div className={styles.headerActions}>
            <Button
              onClick={fetchJobs}
              disabled={!isGatewayRunning}
              className={styles.headerRefreshBtn}
            >
              <RefreshCw style={{ width: 14, height: 14, marginRight: 8 }} />
              {t('refresh')}
            </Button>
            <Button
              type="primary"
              onClick={() => {
                setEditingJob(undefined);
                setShowDialog(true);
              }}
              disabled={!isGatewayRunning}
              className={styles.headerNewTaskBtn}
            >
              <Plus style={{ width: 14, height: 14, marginRight: 8 }} />
              {t('newTask')}
            </Button>
          </div>
        </div>

        {/* Content Area */}
        <div className={styles.contentArea}>
          {/* Gateway Warning */}
          {!isGatewayRunning && (
            <div className={styles.gatewayWarning}>
              <AlertCircle className={styles.gatewayWarningIcon} />
              <span className={styles.gatewayWarningText}>{t('gatewayWarning')}</span>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className={styles.errorBanner}>
              <AlertCircle style={{ width: 20, height: 20 }} />
              <span className={styles.errorText}>{error}</span>
            </div>
          )}

          {/* Statistics */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statIconRow}>
                <div className={styles.statIconCircle} style={{ background: 'rgba(var(--ant-color-primary-rgb, 22,119,255), 0.1)' }}>
                  <Clock style={{ width: 20, height: 20, color: 'var(--ant-color-primary)' }} />
                </div>
              </div>
              <div className={styles.statBottom}>
                <p className={styles.statValue}>{safeJobs.length}</p>
                <p className={styles.statLabel}>{t('stats.total')}</p>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIconRow}>
                <div className={styles.statIconCircle} style={{ background: 'rgba(34,197,94,0.1)' }}>
                  <Play style={{ width: 20, height: 20, color: '#16a34a', marginLeft: 2 }} />
                </div>
              </div>
              <div className={styles.statBottom}>
                <p className={styles.statValue}>{activeJobs.length}</p>
                <p className={styles.statLabel}>{t('stats.active')}</p>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIconRow}>
                <div className={styles.statIconCircle} style={{ background: 'rgba(234,179,8,0.1)' }}>
                  <Pause style={{ width: 20, height: 20, color: '#ca8a04' }} />
                </div>
              </div>
              <div className={styles.statBottom}>
                <p className={styles.statValue}>{pausedJobs.length}</p>
                <p className={styles.statLabel}>{t('stats.paused')}</p>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIconRow}>
                <div className={styles.statIconCircle} style={{ background: 'rgba(255,77,79,0.1)' }}>
                  <XCircle style={{ width: 20, height: 20, color: 'var(--ant-color-error)' }} />
                </div>
              </div>
              <div className={styles.statBottom}>
                <p className={styles.statValue}>{failedJobs.length}</p>
                <p className={styles.statLabel}>{t('stats.failed')}</p>
              </div>
            </div>
          </div>

          {/* Jobs List */}
          {safeJobs.length === 0 ? (
            <div className={styles.emptyState}>
              <Clock className={styles.emptyIcon} style={{ width: 40, height: 40 }} />
              <h3 className={styles.emptyTitle}>{t('empty.title')}</h3>
              <p className={styles.emptyDesc}>{t('empty.description')}</p>
              <Button
                type="primary"
                onClick={() => {
                  setEditingJob(undefined);
                  setShowDialog(true);
                }}
                disabled={!isGatewayRunning}
                className={styles.emptyCreateBtn}
              >
                <Plus style={{ width: 16, height: 16, marginRight: 8 }} />
                {t('empty.create')}
              </Button>
            </div>
          ) : (
            <div className={styles.jobGrid}>
              {safeJobs.map((job) => (
                <CronJobCard
                  key={job.id}
                  job={job}
                  onToggle={(enabled) => handleToggle(job.id, enabled)}
                  onEdit={() => {
                    setEditingJob(job);
                    setShowDialog(true);
                  }}
                  onDelete={() => setJobToDelete({ id: job.id })}
                  onTrigger={() => triggerJob(job.id)}
                />
              ))}
            </div>
          )}

        </div>
      </div>

      {/* Create/Edit Dialog */}
      {showDialog && (
        <TaskDialog
          job={editingJob}
          onClose={() => {
            setShowDialog(false);
            setEditingJob(undefined);
          }}
          onSave={handleSave}
        />
      )}

      <ConfirmDialog
        open={!!jobToDelete}
        title={t('common:actions.confirm', 'Confirm')}
        message={t('card.deleteConfirm')}
        confirmLabel={t('common:actions.delete', 'Delete')}
        cancelLabel={t('common:actions.cancel', 'Cancel')}
        variant="destructive"
        onConfirm={async () => {
          if (jobToDelete) {
            await deleteJob(jobToDelete.id);
            setJobToDelete(null);
            toast.success(t('toast.deleted'));
          }
        }}
        onCancel={() => setJobToDelete(null)}
      />
    </div>
  );
}

export default Cron;
