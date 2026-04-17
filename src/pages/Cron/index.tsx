/**
 * Cron Page
 * Manage scheduled tasks
 */
import { useCallback, useEffect, useState } from 'react';
import type { MouseEvent } from 'react';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  History,
  Loader2,
  MessageSquare,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Timer,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { formatRelativeTime } from '@/lib/utils';
import { useCronStore } from '@/stores/cron';
import { useGatewayStore } from '@/stores/gateway';
import { CHANNEL_ICONS, type ChannelType } from '@/types/channel';
import type { CronJob, CronJobCreateInput, ScheduleType } from '@/types/cron';
import { useCronStyles } from './styles';

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

function parseCronSchedule(schedule: unknown, t: TFunction<'cron'>): string {
  if (schedule && typeof schedule === 'object') {
    const value = schedule as { kind?: string; expr?: string; everyMs?: number; at?: string };

    if (value.kind === 'cron' && typeof value.expr === 'string') {
      return parseCronExpr(value.expr, t);
    }

    if (value.kind === 'every' && typeof value.everyMs === 'number') {
      if (value.everyMs < 60_000) return t('schedule.everySeconds', { count: Math.round(value.everyMs / 1000) });
      if (value.everyMs < 3_600_000) return t('schedule.everyMinutes', { count: Math.round(value.everyMs / 60_000) });
      if (value.everyMs < 86_400_000) return t('schedule.everyHours', { count: Math.round(value.everyMs / 3_600_000) });
      return t('schedule.everyDays', { count: Math.round(value.everyMs / 86_400_000) });
    }

    if (value.kind === 'at' && typeof value.at === 'string') {
      try {
        return t('schedule.onceAt', { time: new Date(value.at).toLocaleString() });
      } catch {
        return t('schedule.onceAt', { time: value.at });
      }
    }

    return String(schedule);
  }

  if (typeof schedule === 'string') {
    return parseCronExpr(schedule, t);
  }

  return String(schedule ?? t('schedule.unknown'));
}

function parseCronExpr(cron: string, t: TFunction<'cron'>): string {
  const preset = schedulePresets.find((item) => item.value === cron);
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
  const initialSchedule = (() => {
    const schedule = job?.schedule;

    if (!schedule) return '0 9 * * *';
    if (typeof schedule === 'string') return schedule;
    if (typeof schedule === 'object' && 'expr' in schedule && typeof schedule.expr === 'string') {
      return schedule.expr;
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
    } catch (error) {
      toast.error(String(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.dialogOverlay} onClick={onClose}>
      <Card className={styles.dialogCard} onClick={(event) => event.stopPropagation()}>
        <CardHeader className={styles.dialogHeader}>
          <div className={styles.dialogTitleBlock}>
            <div className={styles.dialogEyebrow}>{t('title')}</div>
            <CardTitle className={styles.dialogTitle}>{job ? t('dialog.editTitle') : t('dialog.createTitle')}</CardTitle>
            <CardDescription className={styles.dialogDesc}>{t('dialog.description')}</CardDescription>
          </div>
          <Button
            type="text"
            onClick={onClose}
            className={styles.dialogCloseBtn}
            style={{ padding: 0, width: 36, height: 36, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X style={{ width: 16, height: 16 }} />
          </Button>
        </CardHeader>

        <CardContent className={styles.dialogBody}>
          <div className={styles.dialogField}>
            <Label htmlFor="name" className={styles.dialogLabel}>{t('dialog.taskName')}</Label>
            <Input
              id="name"
              placeholder={t('dialog.taskNamePlaceholder')}
              value={name}
              onChange={(event) => setName(event.target.value)}
              className={styles.dialogInput}
            />
          </div>

          <div className={styles.dialogField}>
            <Label htmlFor="message" className={styles.dialogLabel}>{t('dialog.message')}</Label>
            <Textarea
              id="message"
              placeholder={t('dialog.messagePlaceholder')}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={4}
              className={styles.dialogTextarea}
            />
          </div>

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
                      styles.presetBtn,
                      schedule === preset.value ? styles.presetBtnActive : styles.presetBtnInactive,
                    )}
                  >
                    <Timer style={{ width: 15, height: 15, marginRight: 8 }} />
                    {t(`presets.${preset.key}` as const)}
                  </Button>
                ))}
              </div>
            ) : (
              <Input
                placeholder={t('dialog.cronPlaceholder')}
                value={customSchedule}
                onChange={(event) => setCustomSchedule(event.target.value)}
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

          <div className={styles.enableRow}>
            <div>
              <Label className={styles.enableLabel}>{t('dialog.enableImmediately')}</Label>
              <p className={styles.enableDesc}>{t('dialog.enableImmediatelyDesc')}</p>
            </div>
            <Switch checked={enabled} onChange={setEnabled} />
          </div>

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

  const hasFailure = !!job.lastRun && !job.lastRun.success;
  const statusLabel = hasFailure ? t('stats.failed') : job.enabled ? t('stats.active') : t('stats.paused');

  const handleTrigger = async (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
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

  const handleDelete = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onDelete();
  };

  return (
    <Card
      className={cx(
        styles.jobCard,
        hasFailure && styles.jobCardFailed,
        !job.enabled && styles.jobCardPaused,
      )}
      onClick={onEdit}
    >
      <div className={styles.jobCardShell}>
        <div className={styles.jobCardHeader}>
          <div className={styles.jobCardIdentity}>
            <div
              className={cx(
                styles.jobCardIcon,
                hasFailure ? styles.jobCardIconFailed : job.enabled ? styles.jobCardIconActive : styles.jobCardIconPaused,
              )}
            >
              <Clock style={{ width: 18, height: 18 }} />
            </div>

            <div className={styles.jobCardTitleBlock}>
              <div className={styles.jobCardNameRow}>
                <h3 className={styles.jobCardName}>{job.name}</h3>
                <span
                  className={cx(
                    styles.jobCardStatus,
                    hasFailure ? styles.jobCardStatusFailed : job.enabled ? styles.jobCardStatusActive : styles.jobCardStatusPaused,
                  )}
                >
                  {statusLabel}
                </span>
              </div>

              <p className={styles.jobCardSchedule}>
                <Timer style={{ width: 14, height: 14 }} />
                {parseCronSchedule(job.schedule, t)}
              </p>
            </div>
          </div>

          <div className={styles.jobCardSwitchWrap} onClick={(event) => event.stopPropagation()}>
            <Switch checked={job.enabled} onChange={onToggle} />
          </div>
        </div>

        <div className={styles.jobCardMessageBlock}>
          <MessageSquare style={{ width: 15, height: 15, marginTop: 2, flexShrink: 0 }} />
          <p className={styles.jobCardMessage}>{job.message}</p>
        </div>

        <div className={styles.jobMetaRow}>
          {job.target && (
            <span className={styles.jobMetaPill}>
              {CHANNEL_ICONS[job.target.channelType as ChannelType]}
              {job.target.channelName}
            </span>
          )}

          {job.lastRun && (
            <span className={styles.jobMetaPill}>
              <History style={{ width: 14, height: 14 }} />
              {t('card.last')}: {formatRelativeTime(job.lastRun.time)}
            </span>
          )}

          {job.nextRun && job.enabled && (
            <span className={styles.jobMetaPill}>
              <Calendar style={{ width: 14, height: 14 }} />
              {t('card.next')}: {new Date(job.nextRun).toLocaleString()}
            </span>
          )}
        </div>

        {job.lastRun && !job.lastRun.success && job.lastRun.error && (
          <div className={styles.jobErrorBox}>
            <AlertCircle style={{ width: 16, height: 16, marginTop: 2, flexShrink: 0 }} />
            <span className={styles.jobErrorText}>{job.lastRun.error}</span>
          </div>
        )}

        <div className={styles.jobActionRow}>
          <Button
            type="default"
            size="small"
            onClick={handleTrigger}
            disabled={triggering}
            className={styles.jobRunButton}
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
            className={styles.jobDeleteButton}
          >
            <Trash2 style={{ width: 14, height: 14, marginRight: 6 }} />
            {t('common:actions.delete', 'Delete')}
          </Button>
        </div>
      </div>
    </Card>
  );
}

export function Cron() {
  const { t } = useTranslation('cron');
  const { styles, cx } = useCronStyles();
  const { jobs, loading, error, fetchJobs, createJob, updateJob, toggleJob, deleteJob, triggerJob } = useCronStore();
  const gatewayStatus = useGatewayStore((state) => state.status);
  const [showDialog, setShowDialog] = useState(false);
  const [editingJob, setEditingJob] = useState<CronJob | undefined>();
  const [jobToDelete, setJobToDelete] = useState<{ id: string } | null>(null);

  const isGatewayRunning = gatewayStatus.state === 'running';

  useEffect(() => {
    if (isGatewayRunning) {
      fetchJobs();
    }
  }, [fetchJobs, isGatewayRunning]);

  const safeJobs = Array.isArray(jobs) ? jobs : [];
  const activeJobs = safeJobs.filter((job) => job.enabled);
  const pausedJobs = safeJobs.filter((job) => !job.enabled);
  const failedJobs = safeJobs.filter((job) => job.lastRun && !job.lastRun.success);
  const nextUpcomingJob = [...activeJobs]
    .filter((job) => !!job.nextRun)
    .sort((a, b) => new Date(a.nextRun!).getTime() - new Date(b.nextRun!).getTime())[0];
  const latestRunJob = [...safeJobs]
    .filter((job) => !!job.lastRun)
    .sort((a, b) => new Date(b.lastRun!.time).getTime() - new Date(a.lastRun!.time).getTime())[0];
  const sortedJobs = [...safeJobs].sort((left, right) => {
    const leftFailure = left.lastRun && !left.lastRun.success ? 1 : 0;
    const rightFailure = right.lastRun && !right.lastRun.success ? 1 : 0;

    if (leftFailure !== rightFailure) return rightFailure - leftFailure;
    if (left.enabled !== right.enabled) return Number(right.enabled) - Number(left.enabled);

    const leftNext = left.nextRun ? new Date(left.nextRun).getTime() : Number.MAX_SAFE_INTEGER;
    const rightNext = right.nextRun ? new Date(right.nextRun).getTime() : Number.MAX_SAFE_INTEGER;

    return leftNext - rightNext;
  });

  const heroStatusLabel = !isGatewayRunning
    ? t('hero.statusOffline')
    : failedJobs.length > 0
      ? t('hero.statusIssue')
      : t('hero.statusReady');

  const handleSave = useCallback(async (input: CronJobCreateInput) => {
    if (editingJob) {
      await updateJob(editingJob.id, input);
      return;
    }

    await createJob(input);
  }, [createJob, editingJob, updateJob]);

  const handleToggle = useCallback(async (id: string, enabled: boolean) => {
    try {
      await toggleJob(id, enabled);
      toast.success(enabled ? t('toast.enabled') : t('toast.paused'));
    } catch {
      toast.error(t('toast.failedUpdate'));
    }
  }, [t, toggleJob]);

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
        <Card className={styles.heroCard}>
          <div className={styles.heroGrid}>
            <div className={styles.heroContent}>
              <div className={styles.heroCopyBlock}>
                <div className={styles.heroEyebrowRow}>
                  <span className={styles.heroEyebrow}>{t('hero.eyebrow')}</span>
                  <span
                    className={cx(
                      styles.heroStatusBadge,
                      !isGatewayRunning
                        ? styles.heroStatusOffline
                        : failedJobs.length > 0
                          ? styles.heroStatusIssue
                          : styles.heroStatusReady,
                    )}
                  >
                    {!isGatewayRunning ? (
                      <AlertCircle style={{ width: 14, height: 14 }} />
                    ) : failedJobs.length > 0 ? (
                      <XCircle style={{ width: 14, height: 14 }} />
                    ) : (
                      <CheckCircle2 style={{ width: 14, height: 14 }} />
                    )}
                    {heroStatusLabel}
                  </span>
                </div>

                <div className={styles.heroHeadingBlock}>
                  <h1 className={styles.heroTitle}>{t('title')}</h1>
                  <p className={styles.heroSubtitle}>{t('subtitle')}</p>
                </div>

                <div className={styles.heroActionRow}>
                  <Button
                    onClick={fetchJobs}
                    disabled={!isGatewayRunning}
                    className={styles.secondaryActionButton}
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
                    className={styles.primaryActionButton}
                  >
                    <Plus style={{ width: 14, height: 14, marginRight: 8 }} />
                    {t('newTask')}
                  </Button>
                </div>
              </div>

              <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                  <div className={cx(styles.statIconWrap, styles.statIconPrimary)}>
                    <Clock style={{ width: 18, height: 18 }} />
                  </div>
                  <div className={styles.statContent}>
                    <div className={styles.statValue}>{safeJobs.length}</div>
                    <div className={styles.statLabel}>{t('stats.total')}</div>
                  </div>
                </div>

                <div className={styles.statCard}>
                  <div className={cx(styles.statIconWrap, styles.statIconSuccess)}>
                    <Play style={{ width: 18, height: 18 }} />
                  </div>
                  <div className={styles.statContent}>
                    <div className={styles.statValue}>{activeJobs.length}</div>
                    <div className={styles.statLabel}>{t('stats.active')}</div>
                  </div>
                </div>

                <div className={styles.statCard}>
                  <div className={cx(styles.statIconWrap, styles.statIconWarning)}>
                    <Pause style={{ width: 18, height: 18 }} />
                  </div>
                  <div className={styles.statContent}>
                    <div className={styles.statValue}>{pausedJobs.length}</div>
                    <div className={styles.statLabel}>{t('stats.paused')}</div>
                  </div>
                </div>

                <div className={styles.statCard}>
                  <div className={cx(styles.statIconWrap, styles.statIconDanger)}>
                    <XCircle style={{ width: 18, height: 18 }} />
                  </div>
                  <div className={styles.statContent}>
                    <div className={styles.statValue}>{failedJobs.length}</div>
                    <div className={styles.statLabel}>{t('stats.failed')}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.heroAside}>
              <div className={styles.spotlightCard}>
                <div className={styles.spotlightLabel}>{t('card.next')}</div>
                {nextUpcomingJob ? (
                  <>
                    <div className={styles.spotlightTitle}>{nextUpcomingJob.name}</div>
                    <div className={styles.spotlightValue}>{new Date(nextUpcomingJob.nextRun!).toLocaleString()}</div>
                    <div className={styles.spotlightMeta}>{parseCronSchedule(nextUpcomingJob.schedule, t)}</div>
                  </>
                ) : (
                  <div className={styles.spotlightEmpty}>{t('hero.spotlightNextEmpty')}</div>
                )}
              </div>

              <div className={styles.spotlightCard}>
                <div className={styles.spotlightLabel}>{t('card.last')}</div>
                {latestRunJob?.lastRun ? (
                  <>
                    <div className={styles.spotlightRow}>
                      <div
                        className={cx(
                          styles.spotlightStateDot,
                          latestRunJob.lastRun.success ? styles.spotlightStateSuccess : styles.spotlightStateError,
                        )}
                      />
                      <div className={styles.spotlightTitle}>{latestRunJob.name}</div>
                    </div>
                    <div className={styles.spotlightValue}>{formatRelativeTime(latestRunJob.lastRun.time)}</div>
                    <div className={styles.spotlightMeta}>
                      {latestRunJob.lastRun.success ? t('hero.statusReady') : latestRunJob.lastRun.error || t('stats.failed')}
                    </div>
                  </>
                ) : (
                  <div className={styles.spotlightEmpty}>{t('hero.spotlightLastEmpty')}</div>
                )}
              </div>
            </div>
          </div>
        </Card>

        {!isGatewayRunning && (
          <div className={cx(styles.noticeCard, styles.noticeWarning)}>
            <AlertCircle className={styles.noticeIcon} />
            <span className={styles.noticeText}>{t('gatewayWarning')}</span>
          </div>
        )}

        {error && (
          <div className={cx(styles.noticeCard, styles.noticeError)}>
            <AlertCircle className={styles.noticeIcon} />
            <span className={styles.noticeText}>{error}</span>
          </div>
        )}

        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>{t('title')}</h2>
            <p className={styles.sectionDesc}>{t('hero.collectionHint')}</p>
          </div>
        </div>

        {sortedJobs.length === 0 ? (
          <Card className={styles.emptyStateCard}>
            <div className={styles.emptyIconWrap}>
              <Clock style={{ width: 28, height: 28 }} />
            </div>
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
          </Card>
        ) : (
          <div className={styles.jobGrid}>
            {sortedJobs.map((job) => (
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
          if (!jobToDelete) return;

          try {
            await deleteJob(jobToDelete.id);
            toast.success(t('toast.deleted'));
          } catch {
            toast.error(t('toast.failedDelete'));
          } finally {
            setJobToDelete(null);
          }
        }}
        onCancel={() => setJobToDelete(null)}
      />
    </div>
  );
}

export default Cron;
