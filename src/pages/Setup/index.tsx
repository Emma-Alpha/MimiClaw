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
  XCircle,
} from 'lucide-react';
import { TitleBar } from '@/components/layout/TitleBar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useGatewayStore } from '@/stores/gateway';
import { useSettingsStore } from '@/stores/settings';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { SUPPORTED_LANGUAGES } from '@/i18n';
import { toast } from 'sonner';
import { invokeIpc } from '@/lib/api-client';
import { hostApiFetch } from '@/lib/host-api';
import { resolveCloudOnlyMode } from '@/lib/app-env';

interface SetupStep {
  id: string;
  title: string;
  description: string;
}

const STEP = {
  WELCOME: 0,
  RUNTIME: 1,
  PROVIDER: 2,
  INSTALLING: 3,
  COMPLETE: 4,
} as const;

const getSteps = (t: TFunction): SetupStep[] => [
  {
    id: 'welcome',
    title: t('steps.welcome.title'),
    description: t('steps.welcome.description'),
  },
  {
    id: 'runtime',
    title: t('steps.runtime.title'),
    description: t('steps.runtime.description'),
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
  {
    id: 'complete',
    title: t('steps.complete.title'),
    description: t('steps.complete.description'),
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
import clawxIcon from '@/assets/logo.png';

const providers = SETUP_PROVIDERS;

export function Setup() {
  const { t } = useTranslation(['setup', 'channels']);
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<number>(STEP.WELCOME);
  const isCloudOnlyBuild = resolveCloudOnlyMode();

  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [providerConfigured, setProviderConfigured] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [installedSkills, setInstalledSkills] = useState<string[]>([]);
  const [runtimeChecksPassed, setRuntimeChecksPassed] = useState(false);

  const steps = getSteps(t);
  const safeStepIndex = Number.isInteger(currentStep)
    ? Math.min(Math.max(currentStep, STEP.WELCOME), steps.length - 1)
    : STEP.WELCOME;
  const isFirstStep = safeStepIndex === STEP.WELCOME;
  const isLastStep = safeStepIndex === steps.length - 1;

  const markSetupComplete = useSettingsStore((state) => state.markSetupComplete);
  const remoteGatewayUrl = useSettingsStore((state) => state.remoteGatewayUrl);
  const isRemoteMode = !!remoteGatewayUrl?.trim();

  const canProceed = useMemo(() => {
    switch (safeStepIndex) {
      case STEP.WELCOME:
        return true;
      case STEP.RUNTIME:
        return isCloudOnlyBuild || isRemoteMode || runtimeChecksPassed;
      case STEP.PROVIDER:
        return isRemoteMode || providerConfigured;
      case STEP.INSTALLING:
        return false; 
      case STEP.COMPLETE:
        return true;
      default:
        return true;
    }
  }, [safeStepIndex, providerConfigured, runtimeChecksPassed, isRemoteMode, isCloudOnlyBuild]);

  const handleNext = async () => {
    if (isLastStep) {
      markSetupComplete();
      toast.success(t('complete.title'));
      navigate('/');
    } else {
      setCurrentStep((i) => i + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep((i) => Math.max(i - 1, 0));
  };

  const handleSkip = () => {
    markSetupComplete();
    navigate('/');
  };

  const handleInstallationComplete = useCallback((skills: string[]) => {
    setInstalledSkills(skills);
    setTimeout(() => {
      setCurrentStep((i) => i + 1);
    }, 1000);
  }, []);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground relative">
      {/* Subtle background decoration */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-background pointer-events-none" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />

      <TitleBar />
      <div className="flex-1 flex flex-col items-center justify-center p-4 z-10">
        
        {/* Sleek Progress Indicator */}
        <div className="mb-8 flex gap-2 items-center">
          {steps.map((s, i) => (
            <div 
              key={s.id} 
              className={cn(
                "h-1.5 rounded-full transition-all duration-500",
                i === safeStepIndex ? "w-8 bg-primary" : i < safeStepIndex ? "w-2 bg-primary/40" : "w-2 bg-border"
              )}
            />
          ))}
        </div>

        {/* Floating Setup Card */}
        <div className="w-full max-w-[480px] bg-card/60 backdrop-blur-2xl border border-white/10 dark:border-white/5 rounded-[32px] shadow-2xl shadow-black/5 overflow-hidden">
          <AnimatePresence mode="wait" custom={currentStep}>
            <motion.div
              key={safeStepIndex}
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.98 }}
              transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
              className="p-8 sm:p-10 flex flex-col min-h-[400px]"
            >
              <div className="flex-1 flex flex-col">
                {safeStepIndex === STEP.WELCOME && <WelcomeContent />}
                {safeStepIndex === STEP.RUNTIME && (
                  <RuntimeContent
                    onStatusChange={setRuntimeChecksPassed}
                    isRemoteMode={isRemoteMode}
                    isCloudOnlyBuild={isCloudOnlyBuild}
                  />
                )}
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
                    onComplete={handleInstallationComplete}
                    onSkip={() => setCurrentStep((i) => i + 1)}
                    isCloudOnlyBuild={isCloudOnlyBuild}
                  />
                )}
                {safeStepIndex === STEP.COMPLETE && (
                  <CompleteContent
                    selectedProvider={selectedProvider}
                    installedSkills={installedSkills}
                    isCloudOnlyBuild={isCloudOnlyBuild}
                  />
                )}
              </div>

              {/* Navigation Footer */}
              {safeStepIndex !== STEP.INSTALLING && (
                <div className="mt-10 flex items-center justify-between pt-4 border-t border-border/40">
                  <div className="flex gap-2">
                    {!isFirstStep && (
                      <Button variant="ghost" onClick={handleBack} className="text-muted-foreground hover:text-foreground">
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        {t('nav.back')}
                      </Button>
                    )}
                  </div>
                  <div className="flex gap-2 items-center">
                    {!isLastStep && safeStepIndex !== STEP.RUNTIME && (
                      <button 
                        onClick={handleSkip}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-2"
                      >
                        {t('nav.skipSetup')}
                      </button>
                    )}
                    <Button 
                      onClick={handleNext} 
                      disabled={!canProceed}
                      className="rounded-full px-6 shadow-md"
                    >
                      {isLastStep ? t('nav.getStarted') : t('nav.next')}
                      {!isLastStep && <ChevronRight className="h-4 w-4 ml-1" />}
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
  const { language, setLanguage } = useSettingsStore();

  return (
    <div className="flex flex-col items-center justify-center text-center space-y-8 flex-1 py-4">
      <div className="relative">
        <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
        <img 
          src={clawxIcon} 
          alt="Logo" 
          className="relative h-24 w-24 rounded-[28px] object-cover shadow-2xl ring-1 ring-white/10" 
        />
      </div>

      <div className="space-y-3">
        <h2 className="text-3xl font-semibold tracking-tight">{t('welcome.title')}</h2>
        <p className="text-muted-foreground text-sm max-w-[280px] mx-auto leading-relaxed">
          {t('welcome.description')}
        </p>
      </div>

      <div className="pt-4 w-full max-w-[240px]">
        <div className="flex bg-muted/50 p-1 rounded-2xl border border-white/5 shadow-inner">
          {SUPPORTED_LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => setLanguage(lang.code)}
              className={cn(
                "flex-1 py-2 text-sm font-medium rounded-xl transition-all duration-300",
                language === lang.code 
                  ? "bg-background text-foreground shadow-sm ring-1 ring-black/5 dark:ring-white/5" 
                  : "text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5"
              )}
            >
              {lang.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

interface RuntimeContentProps {
  onStatusChange: (canProceed: boolean) => void;
  isRemoteMode?: boolean;
  isCloudOnlyBuild?: boolean;
}

function RuntimeContent({ onStatusChange, isRemoteMode, isCloudOnlyBuild }: RuntimeContentProps) {
  const { t } = useTranslation('setup');
  const gatewayStatus = useGatewayStore((state) => state.status);
  const startGateway = useGatewayStore((state) => state.start);
  const remoteGatewayUrl = useSettingsStore((state) => state.remoteGatewayUrl);
  const cloudWorkspaceId = useSettingsStore((state) => state.cloudWorkspaceId);

  useEffect(() => {
    if (isRemoteMode || isCloudOnlyBuild) {
      onStatusChange(true);
    }
  }, [isCloudOnlyBuild, isRemoteMode, onStatusChange]);

  const [checks, setChecks] = useState({
    nodejs: { status: 'checking' as 'checking' | 'success' | 'error', message: '' },
    openclaw: { status: 'checking' as 'checking' | 'success' | 'error', message: '' },
    gateway: { status: 'checking' as 'checking' | 'success' | 'error', message: '' },
  });
  const [showLogs, setShowLogs] = useState(false);
  const [logContent, setLogContent] = useState('');
  const gatewayTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const runChecks = useCallback(async () => {
    setChecks({
      nodejs: { status: 'checking', message: '' },
      openclaw: { status: 'checking', message: '' },
      gateway: { status: 'checking', message: '' },
    });

    setChecks((prev) => ({
      ...prev,
      nodejs: { status: 'success', message: t('runtime.status.success') },
    }));

    try {
      const openclawStatus = await invokeIpc('openclaw:status') as {
        packageExists: boolean;
        isBuilt: boolean;
        dir: string;
        version?: string;
      };

      if (!openclawStatus.packageExists || !openclawStatus.isBuilt) {
        setChecks((prev) => ({
          ...prev,
          openclaw: { status: 'error', message: 'OpenClaw unavailable' },
        }));
      } else {
        setChecks((prev) => ({
          ...prev,
          openclaw: { status: 'success', message: `Ready` },
        }));
      }
    } catch (error) {
      setChecks((prev) => ({
        ...prev,
        openclaw: { status: 'error', message: `Check failed` },
      }));
    }

    const currentGateway = useGatewayStore.getState().status;
    if (currentGateway.state === 'running') {
      setChecks((prev) => ({ ...prev, gateway: { status: 'success', message: 'Running' } }));
    } else if (currentGateway.state === 'error') {
      setChecks((prev) => ({ ...prev, gateway: { status: 'error', message: 'Error' } }));
    }
  }, [t]);

  useEffect(() => {
    runChecks();
  }, [runChecks]);

  useEffect(() => {
    const allPassed = checks.nodejs.status === 'success'
      && checks.openclaw.status === 'success'
      && (checks.gateway.status === 'success' || gatewayStatus.state === 'running');
    onStatusChange(allPassed);
  }, [checks, gatewayStatus, onStatusChange]);

  useEffect(() => {
    if (gatewayStatus.state === 'running') {
      setChecks((prev) => ({ ...prev, gateway: { status: 'success', message: 'Running' } }));
    } else if (gatewayStatus.state === 'error') {
      setChecks((prev) => ({ ...prev, gateway: { status: 'error', message: 'Error' } }));
    } else if (gatewayStatus.state === 'starting' || gatewayStatus.state === 'reconnecting') {
      setChecks((prev) => ({ ...prev, gateway: { status: 'checking', message: 'Starting...' } }));
    }
  }, [gatewayStatus]);

  useEffect(() => {
    if (gatewayTimeoutRef.current) {
      clearTimeout(gatewayTimeoutRef.current);
      gatewayTimeoutRef.current = null;
    }
    if (gatewayStatus.state === 'running' || gatewayStatus.state === 'error') return;
    gatewayTimeoutRef.current = setTimeout(() => {
      setChecks((prev) => {
        if (prev.gateway.status === 'checking') return { ...prev, gateway: { status: 'error', message: 'Timeout' } };
        return prev;
      });
    }, 600 * 1000);
    return () => {
      if (gatewayTimeoutRef.current) clearTimeout(gatewayTimeoutRef.current);
    };
  }, [gatewayStatus.state]);

  const handleStartGateway = async () => {
    setChecks((prev) => ({ ...prev, gateway: { status: 'checking', message: 'Starting...' } }));
    await startGateway();
  };

  const handleShowLogs = async () => {
    try {
      const logs = await hostApiFetch<{ content: string }>('/api/logs?tailLines=100');
      setLogContent(logs.content);
      setShowLogs(true);
    } catch {
      setLogContent('(Failed to load logs)');
      setShowLogs(true);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-6 flex-1 justify-center">
      <div className="text-center space-y-2 mb-4">
        <h2 className="text-2xl font-semibold tracking-tight">{t('runtime.title')}</h2>
        <p className="text-muted-foreground text-sm">{t('steps.runtime.description')}</p>
      </div>

      {(isRemoteMode || isCloudOnlyBuild) ? (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 text-center space-y-3">
          <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-2">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <p className="font-medium">
            {isRemoteMode ? t('runtime.remoteModeTitle', '已配置远程网关') : t('runtime.cloudOnlyTitle')}
          </p>
          <p className="text-sm text-muted-foreground break-all">
            {isRemoteMode ? remoteGatewayUrl : (cloudWorkspaceId || 'Ready to connect')}
          </p>
        </div>
      ) : (
        <div className="space-y-4 w-full">
          <CheckItem 
            title="Node.js Environment" 
            status={checks.nodejs.status} 
          />
          <CheckItem 
            title="OpenClaw Runtime" 
            status={checks.openclaw.status} 
          />
          <CheckItem 
            title="Gateway Service" 
            status={checks.gateway.status} 
            action={checks.gateway.status === 'error' ? <Button variant="outline" size="sm" onClick={handleStartGateway}>Retry</Button> : null}
          />

          <div className="flex justify-center pt-4">
            <Button variant="ghost" size="sm" onClick={handleShowLogs} className="text-xs text-muted-foreground">
              {t('runtime.viewLogs')}
            </Button>
          </div>

          {showLogs && (
            <div className="mt-4 p-4 rounded-xl bg-black/50 border border-border/50 text-left overflow-hidden">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-medium text-muted-foreground">Logs</span>
                <button
                type="button"
                onClick={() => setShowLogs(false)} 
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Close
              </button>
              </div>
              <pre className="text-[10px] text-slate-300 font-mono h-32 overflow-auto break-all whitespace-pre-wrap">
                {logContent || 'No logs available.'}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CheckItem({ title, status, action }: { title: string, status: string, action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 border border-border/50">
      <div className="flex items-center gap-3">
        {status === 'success' && <CheckCircle2 className="w-5 h-5 text-green-500" />}
        {status === 'checking' && <Loader2 className="w-5 h-5 text-primary animate-spin" />}
        {status === 'error' && <XCircle className="w-5 h-5 text-red-500" />}
        <span className="font-medium text-sm">{title}</span>
      </div>
      {action}
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

  const canSubmit = selectedProvider && (requiresKey ? apiKey.length > 0 : true) && (showModelIdField ? modelId.trim().length > 0 : true) && !useOAuthFlow;

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
      <div className="flex flex-col h-full justify-center space-y-6">
        <div className="text-center space-y-2 mb-4">
          <h2 className="text-2xl font-semibold tracking-tight">{t('provider.title')}</h2>
        </div>
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 text-center space-y-3">
          <CheckCircle2 className="w-8 h-8 text-primary mx-auto mb-2" />
          <p className="font-medium">{t('provider.remoteModeTitle')}</p>
          <p className="text-sm text-muted-foreground">{t('provider.remoteModeDesc')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full flex-1">
      <div className="text-center space-y-2 mb-6">
        <h2 className="text-2xl font-semibold tracking-tight">{t('provider.title')}</h2>
        <p className="text-muted-foreground text-sm">{t('provider.description')}</p>
      </div>

      <div className="space-y-5 flex-1">
        <div className="space-y-2 relative" ref={providerMenuRef}>
          <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{t('provider.label')}</Label>
          <button
            type="button"
            onClick={() => setProviderMenuOpen(!providerMenuOpen)}
            className="w-full h-12 px-4 rounded-xl border border-input bg-background/50 hover:bg-accent/50 transition-colors flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              {selectedProviderData ? (
                <>
                  {getProviderIconUrl(selectedProviderData.id) ? (
                    <img src={getProviderIconUrl(selectedProviderData.id)} alt="" className={cn("w-5 h-5", shouldInvertInDark(selectedProviderData.id) && "dark:invert")} />
                  ) : <span>{selectedProviderData.icon}</span>}
                  <span className="font-medium">{selectedProviderData.name}</span>
                </>
              ) : <span className="text-muted-foreground">Select provider...</span>}
            </div>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </button>

          {providerMenuOpen && (
            <div className="absolute z-50 top-full left-0 right-0 mt-2 p-2 rounded-xl border border-border bg-popover shadow-xl max-h-56 overflow-auto">
              {providers.map(p => (
                <button
                  key={p.id}
                  onClick={() => {
                    onSelectProvider(p.id);
                    setProviderMenuOpen(false);
                    setKeyValid(null);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                    selectedProvider === p.id ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"
                  )}
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
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {showBaseUrlField && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t('provider.baseUrl')}</Label>
                <Input value={baseUrl} onChange={e => setBaseUrl(e.target.value)} className="h-11 rounded-xl bg-background/50" />
              </div>
            )}
            {showModelIdField && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t('provider.modelId')}</Label>
                <Input value={modelId} onChange={e => setModelId(e.target.value)} className="h-11 rounded-xl bg-background/50" />
              </div>
            )}
            {!useOAuthFlow && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t('provider.apiKey')}</Label>
                <div className="relative">
                  <Input 
                    type={showKey ? 'text' : 'password'} 
                    value={apiKey} 
                    onChange={e => { onApiKeyChange(e.target.value); setKeyValid(null); }} 
                    className="h-11 rounded-xl bg-background/50 pr-10" 
                    placeholder="••••••••••••••••"
                  />
                  <button type="button" onClick={() => setShowKey(!showKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {!useOAuthFlow && (
              <Button 
                onClick={handleValidateAndSave} 
                disabled={!canSubmit || validating} 
                className="w-full h-11 rounded-xl mt-4"
              >
                {validating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {t('provider.validateSave')}
              </Button>
            )}

            {keyValid !== null && (
              <p className={cn("text-xs text-center font-medium", keyValid ? "text-green-500" : "text-red-500")}>
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
  onComplete: (installedSkills: string[]) => void;
  onSkip: () => void;
  isCloudOnlyBuild?: boolean;
}

function InstallingContent({ skills, onComplete, isCloudOnlyBuild }: InstallingContentProps) {
  const { t } = useTranslation('setup');
  const [overallProgress, setOverallProgress] = useState(0);
  const installStarted = useRef(false);

  useEffect(() => {
    if (installStarted.current) return;
    installStarted.current = true;

    if (isCloudOnlyBuild) {
      setTimeout(() => {
        setOverallProgress(100);
        onComplete([]);
      }, 700);
      return;
    }

    const runRealInstall = async () => {
      try {
        setOverallProgress(10);
        const result = await invokeIpc('uv:install-all') as any;
        if (result.success) {
          setOverallProgress(100);
          await new Promise(r => setTimeout(r, 800));
          onComplete(skills.map(s => s.id));
        } else {
          toast.error('Setup failed');
        }
      } catch (err) {
        toast.error('Error');
      }
    };
    runRealInstall();
  }, [isCloudOnlyBuild, skills, onComplete]);

  return (
    <div className="flex flex-col h-full justify-center items-center text-center space-y-8">
      <div className="relative">
        <Loader2 className="w-16 h-16 animate-spin text-primary opacity-20" />
        <div className="absolute inset-0 flex items-center justify-center text-primary font-medium text-sm">
          {overallProgress}%
        </div>
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">{t('installing.title')}</h2>
        <p className="text-muted-foreground text-sm">{t('installing.subtitle')}</p>
      </div>
    </div>
  );
}

interface CompleteContentProps {
  selectedProvider: string | null;
  installedSkills: string[];
  isCloudOnlyBuild?: boolean;
}

function CompleteContent({ selectedProvider, installedSkills, isCloudOnlyBuild }: CompleteContentProps) {
  const { t } = useTranslation('setup');
  const providerData = providers.find((p) => p.id === selectedProvider);

  return (
    <div className="flex flex-col h-full justify-center items-center text-center space-y-6">
      <motion.div 
        initial={{ scale: 0.5, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", damping: 15 }}
        className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center text-green-500 mb-2"
      >
        <CheckCircle2 className="w-10 h-10" />
      </motion.div>
      <div className="space-y-2">
        <h2 className="text-3xl font-semibold tracking-tight">{t('complete.title')}</h2>
        <p className="text-muted-foreground">{t('complete.subtitle')}</p>
      </div>
      
      <div className="p-6 rounded-2xl bg-muted/30 border border-border/50 w-full text-left space-y-4">
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">{t('complete.provider')}</span>
          <span className="font-medium flex items-center gap-2">
            {providerData && getProviderIconUrl(providerData.id) && (
              <img src={getProviderIconUrl(providerData.id)} className={cn("w-4 h-4", shouldInvertInDark(providerData.id) && "dark:invert")} alt="" />
            )}
            {providerData?.name || '—'}
          </span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">Status</span>
          <span className="text-green-500 font-medium">Ready</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">{t('complete.skills', 'Skills')}</span>
          <span className="font-medium">{installedSkills.length}</span>
        </div>
        {isCloudOnlyBuild ? (
          <p className="text-xs text-muted-foreground">{t('complete.cloudLayout', 'Cloud build — runtime is managed for you.')}</p>
        ) : null}
      </div>
    </div>
  );
}

export default Setup;
