/**
 * Setup Wizard Page
 * First-time setup experience for new users
 */
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';
import { TitleBar } from '@/components/layout/TitleBar';
import { Button } from '@/components/ui/button';
import { useSettingsStore } from '@/stores/settings';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { SUPPORTED_LANGUAGES } from '@/i18n';
import { toast } from 'sonner';
import { invokeIpc } from '@/lib/api-client';
import { resolveCloudOnlyMode } from '@/lib/app-env';
import {
  fetchFallbackConfigStatus,
} from '@/lib/fallback-config';
import { useSetupStyles } from './styles';
import mimiclawIcon from '@/assets/logo.png';
import type { ClaudeCodeInstallProgress } from '../../../shared/claude-code-runtime';

interface SetupStep {
  id: string;
  title: string;
  description: string;
}

// Steps: Welcome → Installing
const STEP = {
  WELCOME: 0,
  INSTALLING: 1,
} as const;

const getSteps = (t: TFunction): SetupStep[] => [
  {
    id: 'welcome',
    title: t('steps.welcome.title'),
    description: t('steps.welcome.description'),
  },
  {
    id: 'installing',
    title: t('steps.installing.title'),
    description: t('steps.installing.description'),
  },
];

export function Setup() {
  const { t } = useTranslation(['setup', 'channels']);
  const { styles } = useSetupStyles();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<number>(STEP.WELCOME);
  const isCloudOnlyBuild = resolveCloudOnlyMode();
  const [preinstalledSkillsCount, setPreinstalledSkillsCount] = useState<number | null>(null);

  // Fetch the real preinstalled skills count from the bundled manifest so the
  // "complete" summary shows an accurate number instead of a hardcoded list.
  useEffect(() => {
    if (isCloudOnlyBuild) return;
    let cancelled = false;
    void (async () => {
      try {
        const skills = (await invokeIpc('setup:getPreinstalledSkills')) as Array<{ slug: string }>;
        if (!cancelled) {
          setPreinstalledSkillsCount(Array.isArray(skills) ? skills.length : 0);
        }
      } catch {
        if (!cancelled) setPreinstalledSkillsCount(0);
      }
    })();
    return () => { cancelled = true; };
  }, [isCloudOnlyBuild]);

  const [hasAttemptedFallbackAutoApply, setHasAttemptedFallbackAutoApply] = useState(false);
  const [showFallbackAutoApplyPanel, setShowFallbackAutoApplyPanel] = useState(false);
  const [fallbackAutoApplyPassword, setFallbackAutoApplyPassword] = useState('');
  const [showFallbackAutoApplyPassword, setShowFallbackAutoApplyPassword] = useState(false);
  const [applyingFallbackBundle] = useState(false);
  const [fallbackBundleSource, setFallbackBundleSource] = useState<'local' | 'bundled' | null>(null);

  const steps = getSteps(t);
  const safeStepIndex = Number.isInteger(currentStep)
    ? Math.min(Math.max(currentStep, STEP.WELCOME), steps.length - 1)
    : STEP.WELCOME;
  const isFirstStep = safeStepIndex === STEP.WELCOME;

  const markSetupComplete = useSettingsStore((state) => state.markSetupComplete);

  const canProceed = useMemo(() => {
    switch (safeStepIndex) {
      case STEP.WELCOME:
        return true;
      case STEP.INSTALLING:
        return false; // Handled internally via inline Get Started button
      default:
        return true;
    }
  }, [safeStepIndex]);

  useEffect(() => {
    if (safeStepIndex !== STEP.WELCOME || hasAttemptedFallbackAutoApply) return;

    let cancelled = false;
    const run = async () => {
      try {
        const status = await fetchFallbackConfigStatus();
        if (!status.exists || cancelled) return;
        if (!cancelled) {
          setFallbackBundleSource(status.source ?? 'local');
          setShowFallbackAutoApplyPanel(true);
        }
      } catch {
        // ignore auto apply failures in setup
      } finally {
        if (!cancelled) {
          setHasAttemptedFallbackAutoApply(true);
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [hasAttemptedFallbackAutoApply, safeStepIndex, t]);

  const handleNext = async () => {
    setCurrentStep((i) => i + 1);
  };

  const handleBack = () => {
    setCurrentStep((i) => Math.max(i - 1, 0));
  };

  const handleSkip = () => {
    markSetupComplete();
    navigate('/');
  };

  const handleFinish = useCallback(() => {
    markSetupComplete();
    toast.success(t('complete.title'));
    navigate('/');
  }, [markSetupComplete, navigate, t]);

  return (
    <div className={styles.pageRoot}>
      {/* Subtle background decoration */}
      <div className={styles.bgGradient} />
      <div className={styles.bgBlob1} />
      <div className={styles.bgBlob2} />

      <TitleBar hideSidebarToggle />
      <div className={styles.centerArea}>

        {/* Step progress indicator */}
        <div className={styles.stepProgress}>
          {steps.map((s, i) => (
            <div
              key={s.id}
              className={
                i === safeStepIndex
                  ? styles.stepDotActive
                  : i < safeStepIndex
                    ? styles.stepDotPast
                    : styles.stepDotFuture
              }
            />
          ))}
        </div>

        {/* Floating Setup Card */}
        <div className={styles.setupCard}>
          <AnimatePresence mode="wait" custom={currentStep}>
            <motion.div
              key={safeStepIndex}
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.98 }}
              transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
              className={styles.stepContent}
            >
              <div className={styles.stepContentInner}>
                {safeStepIndex === STEP.WELCOME && (
                  <WelcomeContent
                    showFallbackAutoApplyPanel={showFallbackAutoApplyPanel}
                    fallbackBundleSource={fallbackBundleSource}
                    fallbackAutoApplyPassword={fallbackAutoApplyPassword}
                    showFallbackAutoApplyPassword={showFallbackAutoApplyPassword}
                    applyingFallbackBundle={applyingFallbackBundle}
                    onFallbackAutoApplyPasswordChange={setFallbackAutoApplyPassword}
                    onToggleFallbackAutoApplyPassword={() => setShowFallbackAutoApplyPassword((value) => !value)}
                    onSkipFallbackAutoApply={() => setShowFallbackAutoApplyPanel(false)}
                  />
                )}
                {safeStepIndex === STEP.INSTALLING && (
                  <InstallingContent
                    skillsCount={preinstalledSkillsCount}
                    onFinish={handleFinish}
                    isCloudOnlyBuild={isCloudOnlyBuild}
                  />
                )}
              </div>

              {/* Navigation Footer — hidden during Installing (controlled inline) */}
              {safeStepIndex !== STEP.INSTALLING && (
                <div className={styles.navFooter}>
                  <div className={styles.navLeft}>
                    {!isFirstStep && (
                      <Button type="text" onClick={handleBack} className={styles.btnGhostMuted}>
                        <ChevronLeft style={{ width: 16, height: 16, marginRight: 4 }} />
                        {t('nav.back')}
                      </Button>
                    )}
                  </div>
                  <div className={styles.navRight}>
                    {/* Cloud-only builds may skip — they don't need the local CLI.
                        Local builds require the CLI install to complete. */}
                    {isCloudOnlyBuild && (
                      <button onClick={handleSkip} className={styles.skipButton}>
                        {t('nav.skipSetup')}
                      </button>
                    )}
                    <Button
                      type="primary"
                      onClick={handleNext}
                      disabled={!canProceed}
                      className={styles.btnRoundedFull}
                    >
                      {t('nav.next')}
                      <ChevronRight style={{ width: 16, height: 16, marginLeft: 4 }} />
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ==================== Step Content Components ====================

interface WelcomeContentProps {
  applyingFallbackBundle?: boolean;
  fallbackAutoApplyPassword?: string;
  fallbackBundleSource?: 'local' | 'bundled' | null;
  onFallbackAutoApplyPasswordChange?: (value: string) => void;
  onSkipFallbackAutoApply?: () => void;
  onToggleFallbackAutoApplyPassword?: () => void;
  showFallbackAutoApplyPanel?: boolean;
  showFallbackAutoApplyPassword?: boolean;
}

function WelcomeContent(_props: WelcomeContentProps) {
  const { t } = useTranslation('setup');
  const { styles } = useSetupStyles();
  const { language, setLanguage } = useSettingsStore();

  return (
    <div className={styles.welcomeRoot}>
      <div className={styles.welcomeIconWrapper}>
        <div className={styles.welcomeIconGlow} />
        <img
          src={mimiclawIcon}
          alt="Logo"
          className={styles.welcomeIcon}
        />
      </div>

      <div className={styles.welcomeTextGroup}>
        <h2 className={styles.welcomeTitle}>{t('welcome.title')}</h2>
        <p className={styles.welcomeDesc}>{t('welcome.description')}</p>
      </div>

      <div className={styles.langSwitcherWrapper}>
        <div className={styles.langSwitcher}>
          {SUPPORTED_LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => setLanguage(lang.code)}
              className={language === lang.code ? styles.langBtnActive : styles.langBtnInactive}
            >
              {lang.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

interface InstallingContentProps {
  skillsCount: number | null;
  onFinish: () => void;
  isCloudOnlyBuild?: boolean;
}

type InstallPhase = 'installing' | 'complete' | 'error';

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 MB';
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(mb >= 100 ? 0 : 1)} MB`;
}

function InstallingContent({ skillsCount, onFinish, isCloudOnlyBuild }: InstallingContentProps) {
  const { t } = useTranslation('setup');
  const { styles } = useSetupStyles();
  const [phase, setPhase] = useState<InstallPhase>('installing');
  const [overallProgress, setOverallProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [cliProgress, setCliProgress] = useState<ClaudeCodeInstallProgress | null>(null);
  const installStarted = useRef(false);

  // Subscribe to Claude CLI install progress for the entire installing phase.
  useEffect(() => {
    if (isCloudOnlyBuild) return;
    const unsubscribe = window.electron.ipcRenderer.on(
      'claude-code:install-progress',
      (payload) => {
        const progress = payload as ClaudeCodeInstallProgress;
        setCliProgress(progress);
        // Map CLI stages to overall progress: uv/python uses 0-30%, CLI 30-95%, finalize 95-100%.
        if (progress.stage === 'fetching-manifest') {
          setOverallProgress(35);
        } else if (progress.stage === 'downloading') {
          const cliPercent = progress.totalBytes > 0
            ? Math.min(progress.percent, 100)
            : 0;
          setOverallProgress(35 + Math.round(cliPercent * 0.6));
        } else if (progress.stage === 'verifying') {
          setOverallProgress(96);
        } else if (progress.stage === 'finalizing') {
          setOverallProgress(98);
        } else if (progress.stage === 'complete') {
          setOverallProgress(100);
        } else if (progress.stage === 'error') {
          // Keep existing progress; the IPC promise will surface the error.
        }
      },
    );
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [isCloudOnlyBuild]);

  const runInstall = useCallback(async () => {
    installStarted.current = true;
    setPhase('installing');
    setOverallProgress(0);
    setErrorMsg('');
    setCliProgress(null);

    if (isCloudOnlyBuild) {
      await new Promise(r => setTimeout(r, 700));
      setOverallProgress(100);
      setPhase('complete');
      return;
    }

    try {
      setOverallProgress(10);
      const result = await invokeIpc('uv:install-all') as any;
      if (result.success) {
        setOverallProgress(100);
        await new Promise(r => setTimeout(r, 600));
        setPhase('complete');
      } else {
        setErrorMsg(result.error || t('installing.failed', { defaultValue: '安装失败，请重试' }));
        setPhase('error');
      }
    } catch (err) {
      setErrorMsg(String(err));
      setPhase('error');
    }
  }, [isCloudOnlyBuild, t]);

  useEffect(() => {
    if (installStarted.current) return;
    runInstall();
  }, [runInstall]);

  const handleRetry = () => {
    installStarted.current = false;
    runInstall();
  };

  // Complete state — merged inline
  if (phase === 'complete') {
    return (
      <div className={styles.completeRoot}>
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 15 }}
          className={styles.completeIconCircle}
        >
          <CheckCircle2 style={{ width: 40, height: 40 }} />
        </motion.div>
        <div className={styles.completeTextGroup}>
          <h2 className={styles.completeTitle}>{t('complete.title')}</h2>
          <p className={styles.completeSubtitle}>{t('complete.subtitle')}</p>
        </div>

        <div className={styles.completeSummaryBox}>
          <div className={styles.completeSummaryRow}>
            <span className={styles.completeSummaryLabel}>{t('complete.status', { defaultValue: '状态' })}</span>
            <span className={styles.completeStatusValue}>{t('complete.ready', { defaultValue: '就绪' })}</span>
          </div>
          <div className={styles.completeSummaryRow}>
            <span className={styles.completeSummaryLabel}>{t('complete.skills', { defaultValue: '技能包' })}</span>
            <span className={styles.completeSummaryValue}>
              {isCloudOnlyBuild ? '—' : skillsCount ?? '—'}
            </span>
          </div>
        </div>

        <Button type="primary" onClick={onFinish} className={styles.btnRoundedFullWide}>
          {t('nav.getStarted')}
        </Button>
      </div>
    );
  }

  // Error state — Claude CLI install is required, so we don't allow skipping
  // for non-cloud builds. Cloud-only builds keep the skip path.
  if (phase === 'error') {
    return (
      <div className={styles.errorRoot}>
        <div className={styles.errorIconCircle}>
          <AlertCircle style={{ width: 32, height: 32 }} />
        </div>
        <div className={styles.errorTextGroup}>
          <h2 className={styles.errorTitle}>{t('installing.errorTitle', { defaultValue: '安装遇到问题' })}</h2>
          <p className={styles.errorDesc}>
            {errorMsg || t('installing.errorDesc', { defaultValue: '请检查网络连接后重试' })}
          </p>
        </div>
        <div className={styles.errorButtons}>
          <Button onClick={handleRetry} className={styles.btnFlexRounded}>
            <RotateCcw style={{ width: 16, height: 16, marginRight: 8 }} />
            {t('installing.retry', { defaultValue: '重试' })}
          </Button>
          {isCloudOnlyBuild && (
            <Button type="text" onClick={onFinish} className={styles.btnFlexRoundedMuted}>
              {t('nav.skipSetup')}
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Installing state
  return (
    <div className={styles.installingRoot}>
      <div className={styles.installingSpinnerWrapper}>
        <Loader2 style={{ width: 64, height: 64, color: 'var(--ant-color-primary)', opacity: 0.2 }} className="animate-spin" />
        <div className={styles.installingProgressText}>
          {overallProgress}%
        </div>
      </div>

      {/* Animated progress bar */}
      <div className={styles.installingProgressBarWrapper}>
        <div className={styles.installingTrack}>
          <motion.div
            className={styles.installingBar}
            initial={{ width: '0%' }}
            animate={{ width: `${overallProgress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <h2 className={styles.installingTitle}>{t('installing.title')}</h2>
          <p className={styles.installingSubtitle}>
            {cliProgress?.stage === 'downloading' && cliProgress.totalBytes > 0
              ? t('installing.downloadingClaude', {
                  defaultValue: '正在下载 Claude CLI {{downloaded}} / {{total}}',
                  downloaded: formatBytes(cliProgress.downloadedBytes),
                  total: formatBytes(cliProgress.totalBytes),
                })
              : cliProgress?.stage === 'fetching-manifest'
              ? t('installing.fetchingManifest', { defaultValue: '正在获取 Claude CLI 版本信息…' })
              : cliProgress?.stage === 'verifying'
              ? t('installing.verifyingClaude', { defaultValue: '正在校验 Claude CLI 完整性…' })
              : cliProgress?.stage === 'finalizing'
              ? t('installing.finalizingClaude', { defaultValue: '正在完成安装…' })
              : t('installing.subtitle')}
          </p>
        </div>
      </div>
    </div>
  );
}

export default Setup;
