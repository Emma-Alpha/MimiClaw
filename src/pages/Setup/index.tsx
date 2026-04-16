/**
 * Setup Wizard Page
 * First-time setup experience for new users
 */
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';
import { TitleBar } from '@/components/layout/TitleBar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useSettingsStore } from '@/stores/settings';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { SUPPORTED_LANGUAGES } from '@/i18n';
import { toast } from 'sonner';
import { invokeIpc } from '@/lib/api-client';
import { hostApiFetch } from '@/lib/host-api';
import { resolveCloudOnlyMode } from '@/lib/app-env';
import { useSetupStyles } from './styles';

interface SetupStep {
  id: string;
  title: string;
  description: string;
}

// Steps: Welcome → Provider → Installing
const STEP = {
  WELCOME: 0,
  PROVIDER: 1,
  INSTALLING: 2,
} as const;

const getSteps = (t: TFunction): SetupStep[] => [
  {
    id: 'welcome',
    title: t('steps.welcome.title'),
    description: t('steps.welcome.description'),
  },
  {
    id: 'provider',
    title: t('steps.provider.title'),
    description: t('steps.provider.description'),
  },
  {
    id: 'installing',
    title: t('steps.installing.title'),
    description: t('steps.installing.description'),
  },
];

// Default skills to auto-install
interface DefaultSkill {
  id: string;
  name: string;
  description: string;
}

const getDefaultSkills = (t: TFunction): DefaultSkill[] => [
  { id: 'opencode', name: t('defaultSkills.opencode.name'), description: t('defaultSkills.opencode.description') },
  { id: 'python-env', name: t('defaultSkills.python-env.name'), description: t('defaultSkills.python-env.description') },
  { id: 'code-assist', name: t('defaultSkills.code-assist.name'), description: t('defaultSkills.code-assist.description') },
  { id: 'file-tools', name: t('defaultSkills.file-tools.name'), description: t('defaultSkills.file-tools.description') },
  { id: 'terminal', name: t('defaultSkills.terminal.name'), description: t('defaultSkills.terminal.description') },
];

import {
  SETUP_PROVIDERS,
  type ProviderAccount,
  type ProviderType,
  type ProviderTypeInfo,
  getProviderIconUrl,
  resolveProviderApiKeyForSave,
  resolveProviderModelForSave,
  shouldInvertInDark,
  shouldShowProviderModelId,
} from '@/lib/providers';
import {
  buildProviderAccountId,
  fetchProviderSnapshot,
  hasConfiguredCredentials,
  pickPreferredAccount,
} from '@/lib/provider-accounts';
import mimiclawIcon from '@/assets/logo.png';

const providers = SETUP_PROVIDERS;

export function Setup() {
  const { t } = useTranslation(['setup', 'channels']);
  const { styles } = useSetupStyles();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<number>(STEP.WELCOME);
  const isCloudOnlyBuild = resolveCloudOnlyMode();

  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [providerConfigured, setProviderConfigured] = useState(false);
  const [apiKey, setApiKey] = useState('');

  const steps = getSteps(t);
  const safeStepIndex = Number.isInteger(currentStep)
    ? Math.min(Math.max(currentStep, STEP.WELCOME), steps.length - 1)
    : STEP.WELCOME;
  const isFirstStep = safeStepIndex === STEP.WELCOME;

  const markSetupComplete = useSettingsStore((state) => state.markSetupComplete);
  const remoteGatewayUrl = useSettingsStore((state) => state.remoteGatewayUrl);
  const isRemoteMode = !!remoteGatewayUrl?.trim();

  const canProceed = useMemo(() => {
    switch (safeStepIndex) {
      case STEP.WELCOME:
        return true;
      case STEP.PROVIDER:
        return isRemoteMode || providerConfigured;
      case STEP.INSTALLING:
        return false; // Handled internally via inline Get Started button
      default:
        return true;
    }
  }, [safeStepIndex, providerConfigured, isRemoteMode]);

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
                {safeStepIndex === STEP.WELCOME && <WelcomeContent />}
                {safeStepIndex === STEP.PROVIDER && (
                  <ProviderContent
                    providers={providers}
                    selectedProvider={selectedProvider}
                    onSelectProvider={setSelectedProvider}
                    apiKey={apiKey}
                    onApiKeyChange={setApiKey}
                    onConfiguredChange={setProviderConfigured}
                    isRemoteMode={isRemoteMode}
                    isCloudOnlyBuild={isCloudOnlyBuild}
                  />
                )}
                {safeStepIndex === STEP.INSTALLING && (
                  <InstallingContent
                    skills={getDefaultSkills(t)}
                    onFinish={handleFinish}
                    selectedProvider={selectedProvider}
                    isCloudOnlyBuild={isCloudOnlyBuild}
                  />
                )}
              </div>

              {/* Navigation Footer — hidden during Installing (controlled inline) */}
              {safeStepIndex !== STEP.INSTALLING && (
                <div className={styles.navFooter}>
                  <div className={styles.navLeft}>
                    {!isFirstStep && (
                      <Button variant="ghost" onClick={handleBack} className={styles.btnGhostMuted}>
                        <ChevronLeft style={{ width: 16, height: 16, marginRight: 4 }} />
                        {t('nav.back')}
                      </Button>
                    )}
                  </div>
                  <div className={styles.navRight}>
                    {/* Skip is secondary — subtle text link to reduce misclick risk */}
                    <button onClick={handleSkip} className={styles.skipButton}>
                      {t('nav.skipSetup')}
                    </button>
                    <Button
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

function WelcomeContent() {
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

interface ProviderContentProps {
  providers: ProviderTypeInfo[];
  selectedProvider: string | null;
  onSelectProvider: (id: string | null) => void;
  apiKey: string;
  onApiKeyChange: (key: string) => void;
  onConfiguredChange: (configured: boolean) => void;
  isRemoteMode?: boolean;
  isCloudOnlyBuild?: boolean;
}

function ProviderContent({
  providers,
  selectedProvider,
  onSelectProvider,
  apiKey,
  onApiKeyChange,
  onConfiguredChange,
  isRemoteMode,
}: ProviderContentProps) {
  const { t } = useTranslation(['setup', 'settings']);
  const { styles, cx } = useSetupStyles();
  const devModeUnlocked = useSettingsStore((state) => state.devModeUnlocked);
  const [showKey, setShowKey] = useState(false);
  const [validating, setValidating] = useState(false);
  const [keyValid, setKeyValid] = useState<boolean | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [baseUrl, setBaseUrl] = useState('');
  const [modelId, setModelId] = useState('');
  const [apiProtocol, setApiProtocol] = useState<ProviderAccount['apiProtocol']>('openai-completions');
  const [providerMenuOpen, setProviderMenuOpen] = useState(false);
  const providerMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const snapshot = await fetchProviderSnapshot();
        const statusMap = new Map(snapshot.statuses.map((status) => [status.id, status]));
        const setupProviderTypes = new Set<string>(providers.map((p) => p.id));
        const setupCandidates = snapshot.accounts.filter((account) => setupProviderTypes.has(account.vendorId));
        const preferred =
          (snapshot.defaultAccountId
            && setupCandidates.find((account) => account.id === snapshot.defaultAccountId))
          || setupCandidates.find((account) => hasConfiguredCredentials(account, statusMap.get(account.id)))
          || setupCandidates[0];
        if (preferred && !cancelled) {
          onSelectProvider(preferred.vendorId);
          setSelectedAccountId(preferred.id);
          const typeInfo = providers.find((p) => p.id === preferred.vendorId);
          const requiresKey = typeInfo?.requiresApiKey ?? false;
          onConfiguredChange(!requiresKey || hasConfiguredCredentials(preferred, statusMap.get(preferred.id)));
          const storedKey = (await hostApiFetch<{ apiKey: string | null }>(
            `/api/providers/${encodeURIComponent(preferred.id)}/api-key`,
          )).apiKey;
          onApiKeyChange(storedKey || '');
        }
      } catch (error) {
        // ignore
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!selectedProvider) return;
      try {
        const snapshot = await fetchProviderSnapshot();
        const statusMap = new Map(snapshot.statuses.map((status) => [status.id, status]));
        const preferredAccount = pickPreferredAccount(snapshot.accounts, snapshot.defaultAccountId, selectedProvider, statusMap);
        const accountIdForLoad = preferredAccount?.id || selectedProvider;
        setSelectedAccountId(preferredAccount?.id || null);

        const savedProvider = await hostApiFetch<any>(`/api/providers/${encodeURIComponent(accountIdForLoad)}`);
        const storedKey = (await hostApiFetch<any>(`/api/providers/${encodeURIComponent(accountIdForLoad)}/api-key`)).apiKey;
        if (!cancelled) {
          onApiKeyChange(storedKey || '');
          const info = providers.find((p) => p.id === selectedProvider);
          setBaseUrl(savedProvider?.baseUrl || info?.defaultBaseUrl || '');
          setModelId(savedProvider?.model || info?.defaultModelId || '');
          setApiProtocol(savedProvider?.apiProtocol || 'openai-completions');
        }
      } catch (error) {}
    })();
    return () => { cancelled = true; };
  }, [selectedProvider]);

  const selectedProviderData = providers.find((p) => p.id === selectedProvider);
  const showBaseUrlField = selectedProviderData?.showBaseUrl ?? false;
  const showModelIdField = shouldShowProviderModelId(selectedProviderData, devModeUnlocked);
  const requiresKey = selectedProviderData?.requiresApiKey ?? false;
  const isOAuth = selectedProviderData?.isOAuth ?? false;
  const supportsApiKey = selectedProviderData?.supportsApiKey ?? false;
  const useOAuthFlow = isOAuth && !supportsApiKey;

  const canSubmit = selectedProvider
    && (requiresKey ? apiKey.length > 0 : true)
    && (showBaseUrlField ? baseUrl.trim().length > 0 : true)
    && (showModelIdField ? modelId.trim().length > 0 : true)
    && !useOAuthFlow;

  const handleValidateAndSave = async () => {
    if (!selectedProvider) return;
    setValidating(true);
    setKeyValid(null);

    try {
      if (requiresKey && apiKey) {
        const result = await invokeIpc('provider:validateKey', selectedAccountId || selectedProvider, apiKey, {
          baseUrl: baseUrl.trim() || undefined,
          apiProtocol: (selectedProvider === 'custom' || selectedProvider === 'ollama') ? apiProtocol : undefined,
        }) as any;
        setKeyValid(result.valid);
        if (!result.valid) {
          toast.error(result.error || t('provider.invalid'));
          setValidating(false);
          return;
        }
      } else {
        setKeyValid(true);
      }

      const effectiveModelId = resolveProviderModelForSave(selectedProviderData, modelId, devModeUnlocked);
      const snapshot = await fetchProviderSnapshot();
      const accountIdForSave = buildProviderAccountId(selectedProvider as ProviderType, selectedAccountId, snapshot.vendors);
      const effectiveApiKey = resolveProviderApiKeyForSave(selectedProvider, apiKey);

      const accountPayload: ProviderAccount = {
        id: accountIdForSave,
        vendorId: selectedProvider as ProviderType,
        label: selectedProvider === 'custom' ? t('settings:aiProviders.custom') : (selectedProviderData?.name || selectedProvider),
        authMode: selectedProvider === 'ollama' ? 'local' : 'api_key',
        baseUrl: baseUrl.trim() || undefined,
        apiProtocol: (selectedProvider === 'custom' || selectedProvider === 'ollama') ? apiProtocol : undefined,
        model: effectiveModelId,
        enabled: true,
        isDefault: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const saveResult = selectedAccountId
        ? await hostApiFetch<any>(`/api/provider-accounts/${encodeURIComponent(accountIdForSave)}`, {
            method: 'PUT',
            body: JSON.stringify({
              updates: { label: accountPayload.label, authMode: accountPayload.authMode, baseUrl: accountPayload.baseUrl, apiProtocol: accountPayload.apiProtocol, model: accountPayload.model, enabled: accountPayload.enabled },
              apiKey: effectiveApiKey,
            }),
          })
        : await hostApiFetch<any>('/api/provider-accounts', {
            method: 'POST',
            body: JSON.stringify({ account: accountPayload, apiKey: effectiveApiKey }),
          });

      if (!saveResult.success) throw new Error(saveResult.error);

      await hostApiFetch<any>('/api/provider-accounts/default', {
        method: 'PUT',
        body: JSON.stringify({ accountId: accountIdForSave }),
      });

      setSelectedAccountId(accountIdForSave);
      onConfiguredChange(true);
      toast.success(t('provider.valid'));
    } catch (error) {
      onConfiguredChange(false);
      toast.error(t('provider.saveFailed') + ': ' + String(error));
    } finally {
      setValidating(false);
    }
  };

  if (isRemoteMode) {
    return (
      <div className={styles.providerRemoteRoot}>
        <div className={styles.providerHeader}>
          <h2 className={styles.providerTitle}>{t('provider.title')}</h2>
        </div>
        <div className={styles.providerRemoteBox}>
          <CheckCircle2 style={{ width: 32, height: 32, color: 'var(--ant-color-primary)', margin: '0 auto 8px' }} />
          <p className={styles.providerRemoteTitle}>{t('provider.remoteModeTitle')}</p>
          <p className={styles.providerRemoteDesc}>{t('provider.remoteModeDesc')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.providerRoot}>
      <div className={styles.providerHeader}>
        <h2 className={styles.providerTitle}>{t('provider.title')}</h2>
        <p className={styles.providerDesc}>{t('provider.description')}</p>
      </div>

      <div className={styles.providerFields}>
        <div className={styles.providerSelectorWrapper} ref={providerMenuRef}>
          <Label className={styles.providerFieldLabel}>{t('provider.label')}</Label>
          <button
            type="button"
            onClick={() => setProviderMenuOpen(!providerMenuOpen)}
            className={styles.providerSelector}
          >
            <div className={styles.providerSelectorLeft}>
              {selectedProviderData ? (
                <>
                  {getProviderIconUrl(selectedProviderData.id) ? (
                    <img src={getProviderIconUrl(selectedProviderData.id)} alt="" className={cn("w-5 h-5", shouldInvertInDark(selectedProviderData.id) && "dark:invert")} />
                  ) : <span>{selectedProviderData.icon}</span>}
                  <span style={{ fontWeight: 500 }}>{selectedProviderData.name}</span>
                </>
              ) : <span className={styles.providerSelectorPlaceholder}>{t('provider.selectPlaceholder', { defaultValue: '选择 AI 提供商...' })}</span>}
            </div>
            <ChevronDown style={{ width: 16, height: 16, color: 'var(--ant-color-text-secondary)' }} />
          </button>

          {providerMenuOpen && (
            <div className={styles.providerDropdown}>
              {providers.map(p => (
                <button
                  key={p.id}
                  onClick={() => {
                    onSelectProvider(p.id);
                    setProviderMenuOpen(false);
                    setKeyValid(null);
                  }}
                  className={selectedProvider === p.id ? styles.providerDropdownItemActive : styles.providerDropdownItemInactive}
                >
                  {getProviderIconUrl(p.id) ? (
                    <img src={getProviderIconUrl(p.id)} alt="" className={cn("w-4 h-4", shouldInvertInDark(p.id) && "dark:invert")} />
                  ) : <span>{p.icon}</span>}
                  {p.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedProvider && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {showBaseUrlField && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Label className={styles.providerFieldSmallLabel}>{t('provider.baseUrl')}</Label>
                <Input value={baseUrl} onChange={e => { setBaseUrl(e.target.value); setKeyValid(null); onConfiguredChange(false); }} className={styles.inputXl} />
              </div>
            )}
            {showModelIdField && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Label className={styles.providerFieldSmallLabel}>{t('provider.modelId')}</Label>
                <Input value={modelId} onChange={e => setModelId(e.target.value)} className={styles.inputXl} />
              </div>
            )}
            {!useOAuthFlow && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Label className={styles.providerFieldSmallLabel}>{t('provider.apiKey')}</Label>
                <div className={styles.providerKeyRow}>
                  <Input
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={e => { onApiKeyChange(e.target.value); setKeyValid(null); }}
                    className={styles.inputXlRight}
                    placeholder="••••••••••••••••"
                  />
                  <button type="button" onClick={() => setShowKey(!showKey)} className={styles.providerEyeBtn}>
                    {showKey ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
                  </button>
                </div>
              </div>
            )}

            {!useOAuthFlow && (
              <Button
                onClick={handleValidateAndSave}
                disabled={!canSubmit || validating}
                className={styles.btnWideXl}
              >
                {validating ? <Loader2 style={{ width: 16, height: 16, marginRight: 8 }} className="animate-spin" /> : null}
                {t('provider.validateSave')}
              </Button>
            )}

            {keyValid !== null && (
              <p className={cx(styles.providerValidMsg, keyValid ? styles.providerValidMsgOk : styles.providerValidMsgErr)}>
                {keyValid ? `✓ ${t('provider.valid')}` : `✗ ${t('provider.invalid')}`}
              </p>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}

interface InstallingContentProps {
  skills: DefaultSkill[];
  onFinish: () => void;
  selectedProvider: string | null;
  isCloudOnlyBuild?: boolean;
}

type InstallPhase = 'installing' | 'complete' | 'error';

function InstallingContent({ skills, onFinish, selectedProvider, isCloudOnlyBuild }: InstallingContentProps) {
  const { t } = useTranslation('setup');
  const { styles } = useSetupStyles();
  const [phase, setPhase] = useState<InstallPhase>('installing');
  const [overallProgress, setOverallProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const installStarted = useRef(false);

  const runInstall = useCallback(async () => {
    installStarted.current = true;
    setPhase('installing');
    setOverallProgress(0);
    setErrorMsg('');

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
    const providerData = providers.find((p) => p.id === selectedProvider);
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
          {providerData && (
            <div className={styles.completeSummaryRow}>
              <span className={styles.completeSummaryLabel}>{t('complete.provider')}</span>
              <span className={styles.completeSummaryValue}>
                {getProviderIconUrl(providerData.id) && (
                  <img src={getProviderIconUrl(providerData.id)} className={cn("w-4 h-4", shouldInvertInDark(providerData.id) && "dark:invert")} alt="" />
                )}
                {providerData.name}
              </span>
            </div>
          )}
          <div className={styles.completeSummaryRow}>
            <span className={styles.completeSummaryLabel}>{t('complete.status', { defaultValue: '状态' })}</span>
            <span className={styles.completeStatusValue}>{t('complete.ready', { defaultValue: '就绪' })}</span>
          </div>
          <div className={styles.completeSummaryRow}>
            <span className={styles.completeSummaryLabel}>{t('complete.skills', { defaultValue: '技能包' })}</span>
            <span className={styles.completeSummaryValue}>{isCloudOnlyBuild ? '—' : skills.length}</span>
          </div>
        </div>

        <Button onClick={onFinish} className={styles.btnRoundedFullWide}>
          {t('nav.getStarted')}
        </Button>
      </div>
    );
  }

  // Error state
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
          <Button variant="outline" onClick={handleRetry} className={styles.btnFlexRounded}>
            <RotateCcw style={{ width: 16, height: 16, marginRight: 8 }} />
            {t('installing.retry', { defaultValue: '重试' })}
          </Button>
          <Button variant="ghost" onClick={onFinish} className={styles.btnFlexRoundedMuted}>
            {t('nav.skipSetup')}
          </Button>
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
          <p className={styles.installingSubtitle}>{t('installing.subtitle')}</p>
        </div>
      </div>
    </div>
  );
}

export default Setup;
