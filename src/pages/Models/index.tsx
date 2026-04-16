import { useEffect, useReducer, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import AnimatedNumber from '@/components/ui/animated-number';
import { useGatewayStore } from '@/stores/gateway';
import { useSettingsStore } from '@/stores/settings';
import { hostApiFetch } from '@/lib/host-api';
import { trackUiEvent } from '@/lib/telemetry';
import { ProvidersSettings } from '@/features/settings/components/ProvidersSettings';
import { FeedbackState } from '@/components/common/FeedbackState';
import {
  filterUsageHistoryByWindow,
  groupUsageHistory,
  type UsageGroupBy,
  type UsageHistoryEntry,
  type UsageWindow,
} from './usage-history';
import { useModelsStyles } from './styles';

const DEFAULT_USAGE_FETCH_MAX_ATTEMPTS = 2;
const WINDOWS_USAGE_FETCH_MAX_ATTEMPTS = 3;
const USAGE_FETCH_RETRY_DELAY_MS = 1500;

export function Models() {
  const { t } = useTranslation(['dashboard', 'settings']);
  const { styles } = useModelsStyles();
  const gatewayStatus = useGatewayStore((state) => state.status);
  const devModeUnlocked = useSettingsStore((state) => state.devModeUnlocked);
  const isGatewayRunning = gatewayStatus.state === 'running';
  const usageFetchMaxAttempts = window.electron.platform === 'win32'
    ? WINDOWS_USAGE_FETCH_MAX_ATTEMPTS
    : DEFAULT_USAGE_FETCH_MAX_ATTEMPTS;

  const [usageGroupBy, setUsageGroupBy] = useState<UsageGroupBy>('model');
  const [usageWindow, setUsageWindow] = useState<UsageWindow>('7d');
  const [usagePage, setUsagePage] = useState(1);
  const [selectedUsageEntry, setSelectedUsageEntry] = useState<UsageHistoryEntry | null>(null);

  type FetchState = {
    status: 'idle' | 'loading' | 'done';
    data: UsageHistoryEntry[];
  };
  type FetchAction =
    | { type: 'start' }
    | { type: 'done'; data: UsageHistoryEntry[] }
    | { type: 'reset' };

  const [fetchState, dispatchFetch] = useReducer(
    (state: FetchState, action: FetchAction): FetchState => {
      switch (action.type) {
        case 'start':
          return { status: 'loading', data: state.data };
        case 'done':
          return { status: 'done', data: action.data };
        case 'reset':
          return { status: 'idle', data: [] };
        default:
          return state;
      }
    },
    { status: 'idle' as const, data: [] as UsageHistoryEntry[] },
  );

  const usageFetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const usageFetchGenerationRef = useRef(0);

  useEffect(() => {
    trackUiEvent('models.page_viewed');
  }, []);

  useEffect(() => {
    if (usageFetchTimerRef.current) {
      clearTimeout(usageFetchTimerRef.current);
      usageFetchTimerRef.current = null;
    }

    if (!isGatewayRunning) {
      dispatchFetch({ type: 'reset' });
      return;
    }

    dispatchFetch({ type: 'start' });
    const generation = usageFetchGenerationRef.current + 1;
    usageFetchGenerationRef.current = generation;
    const restartMarker = `${gatewayStatus.pid ?? 'na'}:${gatewayStatus.connectedAt ?? 'na'}`;
    trackUiEvent('models.token_usage_fetch_started', {
      generation,
      restartMarker,
    });

    // Safety timeout: if the fetch cycle hasn't resolved after 30 s,
    // force-resolve to "done" with empty data to avoid an infinite spinner.
    const safetyTimeout = setTimeout(() => {
      if (usageFetchGenerationRef.current !== generation) return;
      trackUiEvent('models.token_usage_fetch_safety_timeout', {
        generation,
        restartMarker,
      });
      dispatchFetch({ type: 'done', data: [] });
    }, 30_000);

    const fetchUsageHistoryWithRetry = async (attempt: number) => {
      trackUiEvent('models.token_usage_fetch_attempt', {
        generation,
        attempt,
        restartMarker,
      });
      try {
        const entries = await hostApiFetch<UsageHistoryEntry[]>('/api/usage/recent-token-history');
        if (usageFetchGenerationRef.current !== generation) return;

        const normalized = Array.isArray(entries) ? entries : [];
        setUsagePage(1);
        trackUiEvent('models.token_usage_fetch_succeeded', {
          generation,
          attempt,
          records: normalized.length,
          restartMarker,
        });

        if (normalized.length === 0 && attempt < usageFetchMaxAttempts) {
          trackUiEvent('models.token_usage_fetch_retry_scheduled', {
            generation,
            attempt,
            reason: 'empty',
            restartMarker,
          });
          usageFetchTimerRef.current = setTimeout(() => {
            void fetchUsageHistoryWithRetry(attempt + 1);
          }, USAGE_FETCH_RETRY_DELAY_MS);
        } else {
          if (normalized.length === 0) {
            trackUiEvent('models.token_usage_fetch_exhausted', {
              generation,
              attempt,
              reason: 'empty',
              restartMarker,
            });
          }
          dispatchFetch({ type: 'done', data: normalized });
        }
      } catch (error) {
        if (usageFetchGenerationRef.current !== generation) return;
        trackUiEvent('models.token_usage_fetch_failed_attempt', {
          generation,
          attempt,
          restartMarker,
          message: error instanceof Error ? error.message : String(error),
        });
        if (attempt < usageFetchMaxAttempts) {
          trackUiEvent('models.token_usage_fetch_retry_scheduled', {
            generation,
            attempt,
            reason: 'error',
            restartMarker,
          });
          usageFetchTimerRef.current = setTimeout(() => {
            void fetchUsageHistoryWithRetry(attempt + 1);
          }, USAGE_FETCH_RETRY_DELAY_MS);
          return;
        }
        dispatchFetch({ type: 'done', data: [] });
        trackUiEvent('models.token_usage_fetch_exhausted', {
          generation,
          attempt,
          reason: 'error',
          restartMarker,
        });
      }
    };

    void fetchUsageHistoryWithRetry(1);

    return () => {
      clearTimeout(safetyTimeout);
      if (usageFetchTimerRef.current) {
        clearTimeout(usageFetchTimerRef.current);
        usageFetchTimerRef.current = null;
      }
    };
  }, [isGatewayRunning, gatewayStatus.connectedAt, gatewayStatus.pid, usageFetchMaxAttempts]);

  const usageHistory = fetchState.data;
  const visibleUsageHistory = isGatewayRunning ? usageHistory : [];
  const filteredUsageHistory = filterUsageHistoryByWindow(visibleUsageHistory, usageWindow);
  const usageGroups = groupUsageHistory(filteredUsageHistory, usageGroupBy);
  const usagePageSize = 5;
  const usageTotalPages = Math.max(1, Math.ceil(filteredUsageHistory.length / usagePageSize));
  const safeUsagePage = Math.min(usagePage, usageTotalPages);
  const pagedUsageHistory = filteredUsageHistory.slice((safeUsagePage - 1) * usagePageSize, safeUsagePage * usagePageSize);
  const usageLoading = isGatewayRunning && fetchState.status === 'loading';

  return (
    <div className={styles.pageRoot}>
      <div className={styles.inner}>
        {/* Header */}
        <div className={styles.headerRow}>
          <div>
            <h1 className={styles.pageTitle}>
              {t('dashboard:models.title')}
            </h1>
            <p className={styles.pageSubtitle}>
              {t('dashboard:models.subtitle')}
            </p>
          </div>
        </div>

        {/* Content Area */}
        <div className={styles.scrollArea}>

          {/* AI Providers Section */}
          <ProvidersSettings />

          {/* Token Usage History Section */}
          <div>
            <h2 className={styles.sectionTitle}>
              {t('dashboard:recentTokenHistory.title', 'Token Usage History')}
            </h2>
            <div>
              {usageLoading ? (
                <div className={styles.usageStateBox}>
                  <FeedbackState state="loading" title={t('dashboard:recentTokenHistory.loading')} />
                </div>
              ) : visibleUsageHistory.length === 0 ? (
                <div className={styles.usageStateBox}>
                  <FeedbackState state="empty" title={t('dashboard:recentTokenHistory.empty')} />
                </div>
              ) : filteredUsageHistory.length === 0 ? (
                <div className={styles.usageStateBox}>
                  <FeedbackState state="empty" title={t('dashboard:recentTokenHistory.emptyForWindow')} />
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  <div className={styles.usageControls}>
                    <div className={styles.usageControlsLeft}>
                      <div className={styles.usageToggleGroup}>
                        <Button
                          size="small"
                          onClick={() => {
                            setUsageGroupBy('model');
                            setUsagePage(1);
                          }}
                          className={usageGroupBy === 'model' ? styles.usageToggleActive : styles.usageToggleInactive}
                        >
                          {t('dashboard:recentTokenHistory.groupByModel')}
                        </Button>
                        <Button
                          size="small"
                          onClick={() => {
                            setUsageGroupBy('day');
                            setUsagePage(1);
                          }}
                          className={usageGroupBy === 'day' ? styles.usageToggleActive : styles.usageToggleInactive}
                        >
                          {t('dashboard:recentTokenHistory.groupByTime')}
                        </Button>
                      </div>
                      <div className={styles.usageToggleGroup}>
                        <Button
                          size="small"
                          onClick={() => {
                            setUsageWindow('7d');
                            setUsagePage(1);
                          }}
                          className={usageWindow === '7d' ? styles.usageToggleActive : styles.usageToggleInactive}
                        >
                          {t('dashboard:recentTokenHistory.last7Days')}
                        </Button>
                        <Button
                          size="small"
                          onClick={() => {
                            setUsageWindow('30d');
                            setUsagePage(1);
                          }}
                          className={usageWindow === '30d' ? styles.usageToggleActive : styles.usageToggleInactive}
                        >
                          {t('dashboard:recentTokenHistory.last30Days')}
                        </Button>
                        <Button
                          size="small"
                          onClick={() => {
                            setUsageWindow('all');
                            setUsagePage(1);
                          }}
                          className={usageWindow === 'all' ? styles.usageToggleActive : styles.usageToggleInactive}
                        >
                          {t('dashboard:recentTokenHistory.allTime')}
                        </Button>
                      </div>
                    </div>
                    <p className={styles.usageCountText}>
                      {t('dashboard:recentTokenHistory.showingLast', { count: filteredUsageHistory.length })}
                    </p>
                  </div>

                  <UsageBarChart
                    groups={usageGroups}
                    emptyLabel={t('dashboard:recentTokenHistory.empty')}
                    totalLabel={t('dashboard:recentTokenHistory.totalTokens')}
                    inputLabel={t('dashboard:recentTokenHistory.inputShort')}
                    outputLabel={t('dashboard:recentTokenHistory.outputShort')}
                    cacheLabel={t('dashboard:recentTokenHistory.cacheShort')}
                  />

                  <div className={styles.usageEntryList}>
                    {pagedUsageHistory.map((entry) => (
                      <div
                        key={`${entry.sessionId}-${entry.timestamp}`}
                        className={styles.usageEntry}
                      >
                        <div className={styles.usageEntryTop}>
                          <div className={styles.usageEntryLeft}>
                            <p className={styles.usageEntryModel}>
                              {entry.model || t('dashboard:recentTokenHistory.unknownModel')}
                            </p>
                            <p className={styles.usageEntryMeta}>
                              {[entry.provider, entry.agentId, entry.sessionId].filter(Boolean).join(' • ')}
                            </p>
                          </div>
                          <div className={styles.usageEntryRight}>
                            <p className={styles.usageEntryTotal}>
                              <AnimatedNumber
                                value={entry.totalTokens}
                                duration={800}
                                formatter={(v) => formatTokenCount(Math.round(v))}
                              />
                            </p>
                            <p className={styles.usageEntryTime}>
                              {formatUsageTimestamp(entry.timestamp)}
                            </p>
                          </div>
                        </div>
                        <div className={styles.usageTokenDetails}>
                          <span className={styles.tokenDetailItem}>
                            <div className={styles.tokenDotSky} />
                            {t('dashboard:recentTokenHistory.input', { value: formatTokenCount(entry.inputTokens) })}
                          </span>
                          <span className={styles.tokenDetailItem}>
                            <div className={styles.tokenDotViolet} />
                            {t('dashboard:recentTokenHistory.output', { value: formatTokenCount(entry.outputTokens) })}
                          </span>
                          {entry.cacheReadTokens > 0 && (
                            <span className={styles.tokenDetailItem}>
                              <div className={styles.tokenDotAmber} />
                              {t('dashboard:recentTokenHistory.cacheRead', { value: formatTokenCount(entry.cacheReadTokens) })}
                            </span>
                          )}
                          {entry.cacheWriteTokens > 0 && (
                            <span className={styles.tokenDetailItem}>
                              <div className={styles.tokenDotAmber} />
                              {t('dashboard:recentTokenHistory.cacheWrite', { value: formatTokenCount(entry.cacheWriteTokens) })}
                            </span>
                          )}
                          {typeof entry.costUsd === 'number' && Number.isFinite(entry.costUsd) && (
                            <span className={styles.costBadge}>
                              {t('dashboard:recentTokenHistory.cost', { amount: entry.costUsd.toFixed(4) })}
                            </span>
                          )}
                          {devModeUnlocked && entry.content && (
                            <Button
                              size="small"
                              className={styles.viewContentBtn}
                              onClick={() => setSelectedUsageEntry(entry)}
                            >
                              {t('dashboard:recentTokenHistory.viewContent')}
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className={styles.paginationRow}>
                    <p className={styles.paginationText}>
                      {t('dashboard:recentTokenHistory.page', { current: safeUsagePage, total: usageTotalPages })}
                    </p>
                    <div className={styles.paginationButtons}>
                      <Button
                        size="small"
                        onClick={() => setUsagePage((page) => Math.max(1, page - 1))}
                        disabled={safeUsagePage <= 1}
                        className={styles.paginationBtn}
                      >
                        <ChevronLeft style={{ width: 16, height: 16, marginRight: 4 }} />
                        {t('dashboard:recentTokenHistory.prev')}
                      </Button>
                      <Button
                        size="small"
                        onClick={() => setUsagePage((page) => Math.min(usageTotalPages, page + 1))}
                        disabled={safeUsagePage >= usageTotalPages}
                        className={styles.paginationBtn}
                      >
                        {t('dashboard:recentTokenHistory.next')}
                        <ChevronRight style={{ width: 16, height: 16, marginLeft: 4 }} />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
      {devModeUnlocked && selectedUsageEntry && (
        <UsageContentPopup
          entry={selectedUsageEntry}
          onClose={() => setSelectedUsageEntry(null)}
          title={t('dashboard:recentTokenHistory.contentDialogTitle')}
          closeLabel={t('dashboard:recentTokenHistory.close')}
          unknownModelLabel={t('dashboard:recentTokenHistory.unknownModel')}
        />
      )}
    </div>
  );
}

function formatTokenCount(value: number): string {
  return Intl.NumberFormat().format(value);
}

function formatUsageTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function UsageBarChart({
  groups,
  emptyLabel,
  totalLabel,
  inputLabel,
  outputLabel,
  cacheLabel,
}: {
  groups: Array<{
    label: string;
    totalTokens: number;
    inputTokens: number;
    outputTokens: number;
    cacheTokens: number;
  }>;
  emptyLabel: string;
  totalLabel: string;
  inputLabel: string;
  outputLabel: string;
  cacheLabel: string;
}) {
  const { styles } = useModelsStyles();

  if (groups.length === 0) {
    return (
      <div className={styles.chartEmpty}>
        {emptyLabel}
      </div>
    );
  }

  const maxTokens = Math.max(...groups.map((group) => group.totalTokens), 1);

  return (
    <div className={styles.chartContainer}>
      <div className={styles.chartLegend}>
        <span className={styles.chartLegendItem}>
          <span className={styles.chartLegendDotSky} />
          {inputLabel}
        </span>
        <span className={styles.chartLegendItem}>
          <span className={styles.chartLegendDotViolet} />
          {outputLabel}
        </span>
        <span className={styles.chartLegendItem}>
          <span className={styles.chartLegendDotAmber} />
          {cacheLabel}
        </span>
      </div>
      {groups.map((group) => (
        <div key={group.label} className={styles.chartRow}>
          <div className={styles.chartRowHeader}>
            <span className={styles.chartLabel}>{group.label}</span>
            <span className={styles.chartTotal}>
              {totalLabel}: <AnimatedNumber
                value={group.totalTokens}
                duration={900}
                formatter={(v) => formatTokenCount(Math.round(v))}
              />
            </span>
          </div>
          <div className={styles.chartTrack}>
            <div
              className={styles.chartFill}
              style={{
                width: group.totalTokens > 0
                  ? `${Math.max((group.totalTokens / maxTokens) * 100, 6)}%`
                  : '0%',
              }}
            >
              {group.inputTokens > 0 && (
                <div
                  className={styles.chartSegmentSky}
                  style={{ width: `${(group.inputTokens / group.totalTokens) * 100}%` }}
                />
              )}
              {group.outputTokens > 0 && (
                <div
                  className={styles.chartSegmentViolet}
                  style={{ width: `${(group.outputTokens / group.totalTokens) * 100}%` }}
                />
              )}
              {group.cacheTokens > 0 && (
                <div
                  className={styles.chartSegmentAmber}
                  style={{ width: `${(group.cacheTokens / group.totalTokens) * 100}%` }}
                />
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default Models;

function UsageContentPopup({
  entry,
  onClose,
  title,
  closeLabel,
  unknownModelLabel,
}: {
  entry: UsageHistoryEntry;
  onClose: () => void;
  title: string;
  closeLabel: string;
  unknownModelLabel: string;
}) {
  const { styles } = useModelsStyles();

  return (
    <div className={styles.popupOverlay} role="dialog" aria-modal="true">
      <div className={styles.popupCard}>
        <div className={styles.popupHeader}>
          <div className={styles.popupHeaderLeft}>
            <p className={styles.popupTitle}>{title}</p>
            <p className={styles.popupSubtitle}>
              {(entry.model || unknownModelLabel)} • {formatUsageTimestamp(entry.timestamp)}
            </p>
          </div>
          <Button
            type="text"
            className={styles.popupCloseBtn}
            onClick={onClose}
            aria-label={closeLabel}
            style={{ padding: 0, width: 32, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X style={{ width: 16, height: 16 }} />
          </Button>
        </div>
        <div className={styles.popupBody}>
          <pre className={styles.popupPre}>
            {entry.content}
          </pre>
        </div>
        <div className={styles.popupFooter}>
          <Button onClick={onClose}>
            {closeLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
