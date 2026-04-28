/**
 * Settings Page
 * Application configuration
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  RefreshCw,
  ExternalLink,
  Copy,
  FileText,
  Eye,
  EyeOff,
  Globe,
  List,
} from 'lucide-react';
import { Form, type FormGroupItemType } from '@lobehub/ui';
import { SettingHeader } from './components/SettingHeader';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useSettingsStore } from '@/stores/settings';
// Gateway store removed — stub for compatibility
const useGatewayStore = () => ({
  status: { state: 'running', port: 0, pid: 0, connectedAt: 0 },
  restart: async () => {},
});
import { useUpdateStore } from '@/stores/update';
import { UpdateSettings } from '@/features/settings/components/UpdateSettings';
import {
  getGatewayWsDiagnosticEnabled,
  invokeIpc,
  setGatewayWsDiagnosticEnabled,
  toUserMessage,
} from '@/lib/api-client';
import {
  clearUiTelemetry,
  getUiTelemetrySnapshot,
  subscribeUiTelemetry,
  trackUiEvent,
  type UiTelemetryEntry,
} from '@/lib/telemetry';
import { useTranslation } from 'react-i18next';
import {
  hostApiFetch,
  fetchCloudGatewayStatus,
  startCloudGatewayFromRenderer,
  stopCloudGatewayFromRenderer,
  restartCloudGatewayFromRenderer,
  type CloudGatewayState,
} from '@/lib/host-api';
import {
  fetchCodeAgentHealth,
  fetchCodeAgentModels,
  fetchCodeAgentStatus,
  fetchLatestCodeAgentRun,
  restartCodeAgent,
  runCodeAgentTask,
  startCodeAgent,
  stopCodeAgent,
} from '@/lib/code-agent';
import type { CodeAgentModelInfo } from '@/lib/code-agent';
import { subscribeHostEvent } from '@/lib/host-events';
import { cn } from '@/lib/utils';
import { useSettingsStyles } from './styles';
import SettingsAppearance from './appearance';
import { PET_IDLE_ANIMATIONS, PET_ANIMATION_LABEL_KEYS, type PetAnimation } from '@/lib/pet-floating';
import {
  fetchVolcengineSpeechConfig,
  saveVolcengineSpeechConfig,
  type VolcengineSpeechConfigState,
  type VolcengineSpeechLanguage,
} from '@/lib/volcengine-speech';
import {
  fetchVoiceChatConfig,
  saveVoiceChatConfig,
} from '@/lib/voice-chat';
import {
} from '@/lib/fallback-config';
import type {
  CodeAgentExecutionMode,
  CodeAgentHealth,
  CodeAgentPermissionMode,
  CodeAgentRunRecord,
  CodeAgentRuntimeConfig,
  CodeAgentStatus,
} from '../../../shared/code-agent';
import {
  DEFAULT_VOICE_CHAT_ENDPOINT,
  type VoiceChatConfigState,
} from '../../../shared/voice-chat';

const CODE_AGENT_WORKSPACE_ROOT_STORAGE_KEY = 'mimiclaw:code-agent-workspace-root';

// ── Form adapter components ─────────────────────────────────────────────────
// Thin wrappers that translate antd Form's value/onChange contract to our
// shadcn controls so they work inside @lobehub/ui's <Form> component.

function FormSwitch({
  checked,
  onChange,
  disabled,
}: {
  checked?: boolean;
  onChange?: (v: boolean) => void;
  disabled?: boolean;
}) {
  return <Switch checked={checked} onChange={onChange} disabled={disabled} />;
}

function readStoredCodeAgentWorkspaceRoot(): string {
  try {
    return window.localStorage.getItem(CODE_AGENT_WORKSPACE_ROOT_STORAGE_KEY)?.trim() ?? '';
  } catch {
    return '';
  }
}

function writeStoredCodeAgentWorkspaceRoot(value: string): void {
  try {
    if (value) {
      window.localStorage.setItem(CODE_AGENT_WORKSPACE_ROOT_STORAGE_KEY, value);
    } else {
      window.localStorage.removeItem(CODE_AGENT_WORKSPACE_ROOT_STORAGE_KEY);
    }
  } catch {
    // ignore localStorage write failures
  }
}

function inferCodeAgentWorkspaceRoot(candidate: string | null | undefined): string {
  if (!candidate) return '';
  const trimmed = candidate.trim();
  if (!trimmed) return '';

  const withoutVendor = trimmed.replace(/[\\/]vendor[\\/]claude-code$/, '');
  if (withoutVendor !== trimmed) {
    return withoutVendor;
  }

  return trimmed;
}

type ControlUiInfo = {
  url: string;
  token: string;
  port: number;
};

export function Settings() {
  const { t } = useTranslation('settings');
  const { styles } = useSettingsStyles();
  const {
    gatewayAutoStart,
    setGatewayAutoStart,
    remoteGatewayUrl,
    setRemoteGatewayUrl,
    remoteGatewayToken,
    setRemoteGatewayToken,
    proxyEnabled,
    proxyServer,
    proxyHttpServer,
    proxyHttpsServer,
    proxyAllServer,
    proxyBypassRules,
    codeAgent,
    setProxyEnabled,
    setProxyServer,
    setProxyHttpServer,
    setProxyHttpsServer,
    setProxyAllServer,
    setProxyBypassRules,
    autoCheckUpdate,
    setAutoCheckUpdate,
    autoDownloadUpdate,
    setAutoDownloadUpdate,
    devModeUnlocked,
    setDevModeUnlocked,
    telemetryEnabled,
    setTelemetryEnabled,
    petEnabled,
    setPetEnabled,
    petAnimation,
    setPetAnimation,
    xiaojiuEnabled,
    setXiaojiuEnabled,
    jizhiEnabled,
    setJizhiEnabled,
  } = useSettingsStore();

  const { status: gatewayStatus, restart: restartGateway } = useGatewayStore();
  const currentVersion = useUpdateStore((state) => state.currentVersion);
  const updateSetAutoDownload = useUpdateStore((state) => state.setAutoDownload);
  const [controlUiInfo, setControlUiInfo] = useState<ControlUiInfo | null>(null);
  const [openclawCliCommand, setOpenclawCliCommand] = useState('');
  const [openclawCliError, setOpenclawCliError] = useState<string | null>(null);
  const [remoteGatewayUrlDraft, setRemoteGatewayUrlDraft] = useState('');
  const [remoteGatewayTokenDraft, setRemoteGatewayTokenDraft] = useState('');
  const [showRemoteGatewayToken, setShowRemoteGatewayToken] = useState(false);
  const [proxyServerDraft, setProxyServerDraft] = useState('');
  const [proxyHttpServerDraft, setProxyHttpServerDraft] = useState('');
  const [proxyHttpsServerDraft, setProxyHttpsServerDraft] = useState('');
  const [proxyAllServerDraft, setProxyAllServerDraft] = useState('');
  const [proxyBypassRulesDraft, setProxyBypassRulesDraft] = useState('');
  const [proxyEnabledDraft, setProxyEnabledDraft] = useState(false);
  const [savingProxy, setSavingProxy] = useState(false);
  const [wsDiagnosticEnabled, setWsDiagnosticEnabled] = useState(false);
  const [cloudGateway, setCloudGateway] = useState<CloudGatewayState | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [cloudGatewayLoading, setCloudGatewayLoading] = useState(false);
  const [showTelemetryViewer, setShowTelemetryViewer] = useState(false);
  const [telemetryEntries, setTelemetryEntries] = useState<UiTelemetryEntry[]>([]);
  const [speechConfig, setSpeechConfig] = useState<VolcengineSpeechConfigState | null>(null);
  const [speechLoading, setSpeechLoading] = useState(true);
  const [speechSaving, setSpeechSaving] = useState(false);
  const [speechAppIdDraft, setSpeechAppIdDraft] = useState('');
  const [speechClusterDraft, setSpeechClusterDraft] = useState('');
  const [speechLanguageDraft, setSpeechLanguageDraft] = useState<VolcengineSpeechLanguage>('zh-CN');
  const [speechEndpointDraft, setSpeechEndpointDraft] = useState('wss://openspeech.bytedance.com/api/v2/asr');
  const [speechTokenDraft, setSpeechTokenDraft] = useState('');
  const [showSpeechToken, setShowSpeechToken] = useState(false);
  const [voiceChatConfig, setVoiceChatConfig] = useState<VoiceChatConfigState | null>(null);
  const [voiceChatLoading, setVoiceChatLoading] = useState(true);
  const [voiceChatSaving, setVoiceChatSaving] = useState(false);
  const [voiceChatAppIdDraft, setVoiceChatAppIdDraft] = useState('');
  const [voiceChatAccessKeyDraft, setVoiceChatAccessKeyDraft] = useState('');
  const [voiceChatEndpointDraft, setVoiceChatEndpointDraft] = useState(DEFAULT_VOICE_CHAT_ENDPOINT);
  const [showVoiceChatAccessKey, setShowVoiceChatAccessKey] = useState(false);
  const isWindows = window.electron.platform === 'win32';
  const showCliTools = true;
  const [showLogs, setShowLogs] = useState(false);
  const [logContent, setLogContent] = useState('');
  const [doctorRunningMode, setDoctorRunningMode] = useState<'diagnose' | 'fix' | null>(null);
  const [doctorResult, setDoctorResult] = useState<{
    mode: 'diagnose' | 'fix';
    success: boolean;
    exitCode: number | null;
    stdout: string;
    stderr: string;
    command: string;
    cwd: string;
    durationMs: number;
    timedOut?: boolean;
    error?: string;
  } | null>(null);
  const [codeAgentStatus, setCodeAgentStatus] = useState<CodeAgentStatus | null>(null);
  const [codeAgentHealth, setCodeAgentHealth] = useState<CodeAgentHealth | null>(null);
  const [codeAgentLastRun, setCodeAgentLastRun] = useState<CodeAgentRunRecord | null>(null);
  const [codeAgentWorkspaceRoot, setCodeAgentWorkspaceRoot] = useState(() => readStoredCodeAgentWorkspaceRoot());
  const [codeAgentPrompt, setCodeAgentPrompt] = useState('');
  const [codeAgentBusyAction, setCodeAgentBusyAction] = useState<'health' | 'start' | 'stop' | 'restart' | 'run' | null>(null);
  const [showCodeAgentRunDetails, setShowCodeAgentRunDetails] = useState(false);
  const [codeAgentConfigDraft, setCodeAgentConfigDraft] = useState<CodeAgentRuntimeConfig>(codeAgent);
  const [codeAgentAllowedToolsDraft, setCodeAgentAllowedToolsDraft] = useState(codeAgent.allowedTools.join('\n'));
  const [codeAgentDisallowedToolsDraft, setCodeAgentDisallowedToolsDraft] = useState(codeAgent.disallowedTools.join('\n'));
  const [savingCodeAgentConfig, setSavingCodeAgentConfig] = useState(false);
  const [showCodeAgentApiKey, setShowCodeAgentApiKey] = useState(false);
  const [availableModels, setAvailableModels] = useState<CodeAgentModelInfo[]>([]);
  const [fetchingModels, setFetchingModels] = useState(false);

  type SettingsSection = 'appearance' | 'voicePet' | 'gateway' | 'updates' | 'developer' | 'about';
  const [searchParams] = useSearchParams();
  const activeSection = (searchParams.get('section') as SettingsSection) ?? 'appearance';

  const refreshCloudGateway = useCallback(async () => {
    try {
      const status = await fetchCloudGatewayStatus();
      setCloudGateway(status);
    } catch {
      // ignore if cloud not available
    }
  }, []);

  const loadSpeechConfig = useCallback(async () => {
    setSpeechLoading(true);
    try {
      const config = await fetchVolcengineSpeechConfig();
      setSpeechConfig(config);
      setSpeechAppIdDraft(config.appId);
      setSpeechClusterDraft(config.cluster);
      setSpeechLanguageDraft(config.language);
      setSpeechEndpointDraft(config.endpoint);
      setSpeechTokenDraft('');
    } catch (error) {
      toast.error(`${t('speech.loadFailed')}: ${String(error)}`);
    } finally {
      setSpeechLoading(false);
    }
  }, [t]);

  const loadVoiceChatRealtimeConfig = useCallback(async () => {
    setVoiceChatLoading(true);
    try {
      const config = await fetchVoiceChatConfig();
      setVoiceChatConfig(config);
      setVoiceChatAppIdDraft(config.appId);
      setVoiceChatAccessKeyDraft('');
      setVoiceChatEndpointDraft(config.endpoint);
    } catch (error) {
      toast.error(`${t('voiceChat.loadFailed')}: ${String(error)}`);
    } finally {
      setVoiceChatLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (!jizhiEnabled) {
      setCloudGateway({ cloudMode: false });
      return;
    }
    void refreshCloudGateway();
    const timer = setInterval(() => { void refreshCloudGateway(); }, 10_000);
    return () => clearInterval(timer);
  }, [jizhiEnabled, refreshCloudGateway]);

  useEffect(() => {
    void loadSpeechConfig();
  }, [loadSpeechConfig]);

  useEffect(() => {
    void loadVoiceChatRealtimeConfig();
  }, [loadVoiceChatRealtimeConfig]);

  const handleCloudGatewayAction = async (action: 'start' | 'stop' | 'restart') => {
    setCloudGatewayLoading(true);
    try {
      if (action === 'start') await startCloudGatewayFromRenderer();
      else if (action === 'stop') await stopCloudGatewayFromRenderer();
      else await restartCloudGatewayFromRenderer();
      await refreshCloudGateway();
    } catch (err) {
      toast.error(String(err));
    } finally {
      setCloudGatewayLoading(false);
    }
  };

  const handleResetAllData = async () => {
    setResetting(true);
    try {
      // Delete all provider accounts (also clears API keys from keychain)
      const snapshot = await hostApiFetch<{ accounts: { id: string }[] }>('/api/provider-accounts');
      await Promise.all(
        snapshot.accounts.map((account) =>
          hostApiFetch(`/api/provider-accounts/${encodeURIComponent(account.id)}`, { method: 'DELETE' }).catch(() => {})
        )
      );
      // Clear electron-store
      await invokeIpc('settings:reset');
      // Relaunch so the setup wizard re-appears
      await invokeIpc('app:relaunch');
    } catch (err) {
      toast.error(String(err));
      setResetting(false);
      setShowResetConfirm(false);
    }
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

  const handleOpenLogDir = async () => {
    try {
      const { dir: logDir } = await hostApiFetch<{ dir: string | null }>('/api/logs/dir');
      if (logDir) {
        await invokeIpc('shell:showItemInFolder', logDir);
      }
    } catch {
      // ignore
    }
  };

  const handleRunOpenClawDoctor = async (mode: 'diagnose' | 'fix') => {
    setDoctorRunningMode(mode);
    try {
      const result = await hostApiFetch<{
        mode: 'diagnose' | 'fix';
        success: boolean;
        exitCode: number | null;
        stdout: string;
        stderr: string;
        command: string;
        cwd: string;
        durationMs: number;
        timedOut?: boolean;
        error?: string;
      }>('/api/app/openclaw-doctor', {
        method: 'POST',
        body: JSON.stringify({ mode }),
      });
      setDoctorResult(result);
      if (result.success) {
        toast.success(mode === 'fix' ? t('developer.doctorFixSucceeded') : t('developer.doctorSucceeded'));
      } else {
        toast.error(result.error || (mode === 'fix' ? t('developer.doctorFixFailed') : t('developer.doctorFailed')));
      }
    } catch (error) {
      const message = toUserMessage(error) || (mode === 'fix' ? t('developer.doctorFixRunFailed') : t('developer.doctorRunFailed'));
      toast.error(message);
      setDoctorResult({
        mode,
        success: false,
        exitCode: null,
        stdout: '',
        stderr: '',
        command: 'openclaw doctor',
        cwd: '',
        durationMs: 0,
        error: message,
      });
    } finally {
      setDoctorRunningMode(null);
    }
  };

  const handleCopyDoctorOutput = async () => {
    if (!doctorResult) return;
    const payload = [
      `command: ${doctorResult.command}`,
      `cwd: ${doctorResult.cwd}`,
      `exitCode: ${doctorResult.exitCode ?? 'null'}`,
      `durationMs: ${doctorResult.durationMs}`,
      '',
      '[stdout]',
      doctorResult.stdout.trim() || '(empty)',
      '',
      '[stderr]',
      doctorResult.stderr.trim() || '(empty)',
    ].join('\n');

    try {
      await navigator.clipboard.writeText(payload);
      toast.success(t('developer.doctorCopied'));
    } catch (error) {
      toast.error(`Failed to copy doctor output: ${String(error)}`);
    }
  };

  const refreshCodeAgentData = useCallback(async () => {
    const [statusResult, healthResult, latestRunResult] = await Promise.allSettled([
      fetchCodeAgentStatus(),
      fetchCodeAgentHealth(),
      fetchLatestCodeAgentRun(),
    ]);

    if (statusResult.status === 'fulfilled') {
      setCodeAgentStatus(statusResult.value);
    }

    if (healthResult.status === 'fulfilled') {
      setCodeAgentHealth(healthResult.value);
    } else {
      setCodeAgentHealth(null);
    }

    if (latestRunResult.status === 'fulfilled') {
      setCodeAgentLastRun(latestRunResult.value);
    }
  }, []);

  const handleCodeAgentHealthCheck = async () => {
    setCodeAgentBusyAction('health');
    try {
      const [status, health] = await Promise.all([
        fetchCodeAgentStatus(),
        fetchCodeAgentHealth(),
      ]);
      setCodeAgentStatus(status);
      setCodeAgentHealth(health);
      toast.success(t('developer.codeAgentHealthChecked'));
    } catch (error) {
      toast.error(`${t('developer.codeAgentHealthCheckFailed')}: ${toUserMessage(error)}`);
    } finally {
      setCodeAgentBusyAction(null);
    }
  };

  const handleCodeAgentLifecycleAction = async (action: 'start' | 'stop' | 'restart') => {
    setCodeAgentBusyAction(action);
    try {
      if (action === 'start') {
        const result = await startCodeAgent();
        setCodeAgentStatus(result.status);
      } else if (action === 'stop') {
        const result = await stopCodeAgent();
        setCodeAgentStatus(result.status);
      } else {
        const result = await restartCodeAgent();
        setCodeAgentStatus(result.status);
      }

      await refreshCodeAgentData();
    } catch (error) {
      const message = toUserMessage(error);
      if (action === 'start') {
        toast.error(`${t('developer.codeAgentStartFailed')}: ${message}`);
      } else if (action === 'stop') {
        toast.error(`${t('developer.codeAgentStopFailed')}: ${message}`);
      } else {
        toast.error(`${t('developer.codeAgentRestartFailed')}: ${message}`);
      }
    } finally {
      setCodeAgentBusyAction(null);
    }
  };

  const handleCodeAgentRun = async () => {
    const workspaceRoot = codeAgentWorkspaceRoot.trim();
    const prompt = codeAgentPrompt.trim();

    if (!workspaceRoot) {
      toast.error(t('developer.codeAgentWorkspaceRequired'));
      return;
    }
    if (!prompt) {
      toast.error(t('developer.codeAgentPromptRequired'));
      return;
    }

    setCodeAgentBusyAction('run');
    try {
      const result = await runCodeAgentTask({
        workspaceRoot,
        prompt,
      });
      const latestRun = await fetchLatestCodeAgentRun();
      setCodeAgentLastRun(latestRun ?? {
        startedAt: Date.now(),
        completedAt: Date.now(),
        request: { workspaceRoot, prompt },
        result,
      });
      setShowCodeAgentRunDetails(true);
      await refreshCodeAgentData();
      toast.success(t('developer.codeAgentRunSucceeded'));
    } catch (error) {
      const message = toUserMessage(error);
      toast.error(`${t('developer.codeAgentRunFailed')}: ${message}`);
      try {
        setCodeAgentLastRun(await fetchLatestCodeAgentRun());
      } catch {
        // ignore
      }
    } finally {
      setCodeAgentBusyAction(null);
    }
  };

  const handleSaveCodeAgentConfig = async () => {
    setSavingCodeAgentConfig(true);
    try {
      const nextConfig: CodeAgentRuntimeConfig = {
        ...codeAgentConfigDraft,
        cliPath: codeAgentConfigDraft.cliPath.trim(),
        model: codeAgentConfigDraft.model.trim(),
        fallbackModel: codeAgentConfigDraft.fallbackModel.trim(),
        baseUrl: codeAgentConfigDraft.baseUrl.trim(),
        apiKey: codeAgentConfigDraft.apiKey.trim(),
        appendSystemPrompt: codeAgentConfigDraft.appendSystemPrompt.trim(),
        allowedTools: [...new Set(
          codeAgentAllowedToolsDraft
            .split(/[\n,]+/)
            .map((tool) => tool.trim())
            .filter(Boolean),
        )],
        disallowedTools: [...new Set(
          codeAgentDisallowedToolsDraft
            .split(/[\n,]+/)
            .map((tool) => tool.trim())
            .filter(Boolean),
        )],
      };

      await hostApiFetch<{ success: boolean }>('/api/settings', {
        method: 'PUT',
        body: JSON.stringify({ codeAgent: nextConfig }),
      });
      useSettingsStore.setState({ codeAgent: nextConfig });
      setCodeAgentConfigDraft(nextConfig);
      setCodeAgentAllowedToolsDraft(nextConfig.allowedTools.join('\n'));
      setCodeAgentDisallowedToolsDraft(nextConfig.disallowedTools.join('\n'));
      toast.success(t('developer.codeAgentConfigSaved'));
      await refreshCodeAgentData();
    } catch (error) {
      toast.error(`${t('developer.codeAgentConfigSaveFailed')}: ${toUserMessage(error)}`);
    } finally {
      setSavingCodeAgentConfig(false);
    }
  };



  const handleFetchModels = async () => {
    const baseUrl = codeAgentConfigDraft.baseUrl.trim();
    const apiKey = codeAgentConfigDraft.apiKey.trim();
    if (!baseUrl || !apiKey) {
      toast.error(t('developer.codeAgentFetchModelsRequiresConfig'));
      return;
    }
    setFetchingModels(true);
    try {
      const models = await fetchCodeAgentModels(baseUrl, apiKey);
      setAvailableModels(models);
      if (models.length === 0) {
        toast.warning(t('developer.codeAgentFetchModelsEmpty'));
      } else {
        toast.success(t('developer.codeAgentFetchModelsSuccess', { count: models.length }));
      }
    } catch (error) {
      toast.error(`${t('developer.codeAgentFetchModelsFailed')}: ${toUserMessage(error)}`);
    } finally {
      setFetchingModels(false);
    }
  };

  const refreshControlUiInfo = async () => {
    try {
      const result = await hostApiFetch<{
        success: boolean;
        url?: string;
        token?: string;
        port?: number;
      }>('/api/gateway/control-ui');
      if (result.success && result.url && result.token && typeof result.port === 'number') {
        setControlUiInfo({ url: result.url, token: result.token, port: result.port });
      }
    } catch {
      // Ignore refresh errors
    }
  };

  const handleCopyGatewayToken = async () => {
    if (!controlUiInfo?.token) return;
    try {
      await navigator.clipboard.writeText(controlUiInfo.token);
      toast.success(t('developer.tokenCopied'));
    } catch (error) {
      toast.error(`Failed to copy token: ${String(error)}`);
    }
  };

  useEffect(() => {
    if (!showCliTools) return;
    let cancelled = false;

    (async () => {
      try {
        const result = await invokeIpc<{
          success: boolean;
          command?: string;
          error?: string;
        }>('openclaw:getCliCommand');
        if (cancelled) return;
        if (result.success && result.command) {
          setOpenclawCliCommand(result.command);
          setOpenclawCliError(null);
        } else {
          setOpenclawCliCommand('');
          setOpenclawCliError(result.error || 'OpenClaw CLI unavailable');
        }
      } catch (error) {
        if (cancelled) return;
        setOpenclawCliCommand('');
        setOpenclawCliError(String(error));
      }
    })();

    return () => { cancelled = true; };
  }, [devModeUnlocked, showCliTools]);

  const handleCopyCliCommand = async () => {
    if (!openclawCliCommand) return;
    try {
      await navigator.clipboard.writeText(openclawCliCommand);
      toast.success(t('developer.cmdCopied'));
    } catch (error) {
      toast.error(`Failed to copy command: ${String(error)}`);
    }
  };

  useEffect(() => {
    const unsubscribe = window.electron.ipcRenderer.on(
      'openclaw:cli-installed',
      (...args: unknown[]) => {
        const installedPath = typeof args[0] === 'string' ? args[0] : '';
        toast.success(`openclaw CLI installed at ${installedPath}`);
      },
    );
    return () => { unsubscribe?.(); };
  }, []);

  useEffect(() => {
    setWsDiagnosticEnabled(getGatewayWsDiagnosticEnabled());
  }, []);

  useEffect(() => {
    if (!devModeUnlocked) return;
    setTelemetryEntries(getUiTelemetrySnapshot(200));
    const unsubscribe = subscribeUiTelemetry((entry) => {
      setTelemetryEntries((prev) => {
        const next = [...prev, entry];
        if (next.length > 200) {
          next.splice(0, next.length - 200);
        }
        return next;
      });
    });
    return unsubscribe;
  }, [devModeUnlocked]);

  useEffect(() => {
    if (!devModeUnlocked) return;

    void refreshCodeAgentData();

    const unsubscribeStatus = subscribeHostEvent<CodeAgentStatus>('code-agent:status', (payload) => {
      setCodeAgentStatus(payload);
    });
    const unsubscribeRunCompleted = subscribeHostEvent<CodeAgentRunRecord>('code-agent:run-completed', (payload) => {
      setCodeAgentLastRun(payload);
      setShowCodeAgentRunDetails(true);
    });
    const unsubscribeRunFailed = subscribeHostEvent<CodeAgentRunRecord>('code-agent:run-failed', (payload) => {
      setCodeAgentLastRun(payload);
      setShowCodeAgentRunDetails(true);
    });
    const unsubscribeError = subscribeHostEvent<{ message?: string }>('code-agent:error', (payload) => {
      if (payload?.message) {
        toast.error(payload.message);
      }
    });

    return () => {
      unsubscribeStatus();
      unsubscribeRunCompleted();
      unsubscribeRunFailed();
      unsubscribeError();
    };
  }, [devModeUnlocked, refreshCodeAgentData]);

  useEffect(() => {
    setCodeAgentConfigDraft(codeAgent);
    setCodeAgentAllowedToolsDraft(codeAgent.allowedTools.join('\n'));
    setCodeAgentDisallowedToolsDraft(codeAgent.disallowedTools.join('\n'));
  }, [codeAgent]);

  useEffect(() => {
    const trimmed = codeAgentWorkspaceRoot.trim();
    writeStoredCodeAgentWorkspaceRoot(trimmed);
  }, [codeAgentWorkspaceRoot]);

  useEffect(() => {
    if (codeAgentWorkspaceRoot.trim()) return;

    const inferredWorkspaceRoot = inferCodeAgentWorkspaceRoot(
      codeAgentLastRun?.request.workspaceRoot
      || codeAgentHealth?.vendorPath
      || codeAgentStatus?.vendorPath,
    );

    if (inferredWorkspaceRoot) {
      setCodeAgentWorkspaceRoot(inferredWorkspaceRoot);
    }
  }, [
    codeAgentWorkspaceRoot,
    codeAgentLastRun?.request.workspaceRoot,
    codeAgentHealth?.vendorPath,
    codeAgentStatus?.vendorPath,
  ]);

  useEffect(() => {
    setRemoteGatewayUrlDraft(remoteGatewayUrl);
  }, [remoteGatewayUrl]);

  useEffect(() => {
    setRemoteGatewayTokenDraft(remoteGatewayToken);
  }, [remoteGatewayToken]);

  useEffect(() => {
    setProxyEnabledDraft(proxyEnabled);
  }, [proxyEnabled]);

  useEffect(() => {
    setProxyServerDraft(proxyServer);
  }, [proxyServer]);

  useEffect(() => {
    setProxyHttpServerDraft(proxyHttpServer);
  }, [proxyHttpServer]);

  useEffect(() => {
    setProxyHttpsServerDraft(proxyHttpsServer);
  }, [proxyHttpsServer]);

  useEffect(() => {
    setProxyAllServerDraft(proxyAllServer);
  }, [proxyAllServer]);

  useEffect(() => {
    setProxyBypassRulesDraft(proxyBypassRules);
  }, [proxyBypassRules]);

  const handleSaveProxySettings = async () => {
    setSavingProxy(true);
    try {
      const normalizedProxyServer = proxyServerDraft.trim();
      const normalizedHttpServer = proxyHttpServerDraft.trim();
      const normalizedHttpsServer = proxyHttpsServerDraft.trim();
      const normalizedAllServer = proxyAllServerDraft.trim();
      const normalizedBypassRules = proxyBypassRulesDraft.trim();
      await invokeIpc('settings:setMany', {
        proxyEnabled: proxyEnabledDraft,
        proxyServer: normalizedProxyServer,
        proxyHttpServer: normalizedHttpServer,
        proxyHttpsServer: normalizedHttpsServer,
        proxyAllServer: normalizedAllServer,
        proxyBypassRules: normalizedBypassRules,
      });

      setProxyServer(normalizedProxyServer);
      setProxyHttpServer(normalizedHttpServer);
      setProxyHttpsServer(normalizedHttpsServer);
      setProxyAllServer(normalizedAllServer);
      setProxyBypassRules(normalizedBypassRules);
      setProxyEnabled(proxyEnabledDraft);

      toast.success(t('gateway.proxySaved'));
      trackUiEvent('settings.proxy_saved', { enabled: proxyEnabledDraft });
    } catch (error) {
      toast.error(`${t('gateway.proxySaveFailed')}: ${toUserMessage(error)}`);
    } finally {
      setSavingProxy(false);
    }
  };

  const telemetryStats = useMemo(() => {
    let errorCount = 0;
    let slowCount = 0;
    for (const entry of telemetryEntries) {
      if (entry.event.endsWith('_error') || entry.event.includes('request_error')) {
        errorCount += 1;
      }
      const durationMs = typeof entry.payload.durationMs === 'number'
        ? entry.payload.durationMs
        : Number.NaN;
      if (Number.isFinite(durationMs) && durationMs >= 800) {
        slowCount += 1;
      }
    }
    return { total: telemetryEntries.length, errorCount, slowCount };
  }, [telemetryEntries]);

  const telemetryByEvent = useMemo(() => {
    const map = new Map<string, {
      event: string;
      count: number;
      errorCount: number;
      slowCount: number;
      totalDuration: number;
      timedCount: number;
      lastTs: string;
    }>();

    for (const entry of telemetryEntries) {
      const current = map.get(entry.event) ?? {
        event: entry.event,
        count: 0,
        errorCount: 0,
        slowCount: 0,
        totalDuration: 0,
        timedCount: 0,
        lastTs: entry.ts,
      };

      current.count += 1;
      current.lastTs = entry.ts;

      if (entry.event.endsWith('_error') || entry.event.includes('request_error')) {
        current.errorCount += 1;
      }

      const durationMs = typeof entry.payload.durationMs === 'number'
        ? entry.payload.durationMs
        : Number.NaN;
      if (Number.isFinite(durationMs)) {
        current.totalDuration += durationMs;
        current.timedCount += 1;
        if (durationMs >= 800) {
          current.slowCount += 1;
        }
      }

      map.set(entry.event, current);
    }

    return [...map.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);
  }, [telemetryEntries]);

  const handleCopyTelemetry = async () => {
    try {
      const serialized = telemetryEntries.map((entry) => JSON.stringify(entry)).join('\n');
      await navigator.clipboard.writeText(serialized);
      toast.success(t('developer.telemetryCopied'));
    } catch (error) {
      toast.error(`${t('common:status.error')}: ${String(error)}`);
    }
  };

  const handleClearTelemetry = () => {
    clearUiTelemetry();
    setTelemetryEntries([]);
    toast.success(t('developer.telemetryCleared'));
  };

  const handleWsDiagnosticToggle = (enabled: boolean) => {
    setGatewayWsDiagnosticEnabled(enabled);
    setWsDiagnosticEnabled(enabled);
    toast.success(
      enabled
        ? t('developer.wsDiagnosticEnabled')
        : t('developer.wsDiagnosticDisabled'),
    );
  };

  const handleSaveSpeechConfig = async () => {
    setSpeechSaving(true);
    try {
      const next = await saveVolcengineSpeechConfig({
        appId: speechAppIdDraft,
        cluster: speechClusterDraft,
        language: speechLanguageDraft,
        endpoint: speechEndpointDraft,
        token: speechTokenDraft,
      });
      setSpeechConfig(next);
      setSpeechTokenDraft('');
      toast.success(t('speech.saved'));
    } catch (error) {
      toast.error(`${t('speech.saveFailed')}: ${String(error)}`);
    } finally {
      setSpeechSaving(false);
    }
  };

  const handleSaveVoiceChatRealtimeConfig = async () => {
    setVoiceChatSaving(true);
    try {
      const next = await saveVoiceChatConfig({
        appId: voiceChatAppIdDraft,
        accessKey: voiceChatAccessKeyDraft,
        endpoint: voiceChatEndpointDraft,
      });
      setVoiceChatConfig(next);
      setVoiceChatAccessKeyDraft('');
      toast.success(t('voiceChat.saved'));
    } catch (error) {
      toast.error(`${t('voiceChat.saveFailed')}: ${String(error)}`);
    } finally {
      setVoiceChatSaving(false);
    }
  };

  return (
    <div className={styles.contentArea}>
        <div className={styles.contentInner}>
          <SettingHeader
            title={
              activeSection === 'appearance' ? t('appearance.title') :
              activeSection === 'voicePet' ? t('voicePet.title') :
              activeSection === 'gateway' ? t('gateway.title') :
              activeSection === 'updates' ? t('updates.title') :
              activeSection === 'developer' ? t('developer.title') :
              t('about.title')
            }
          />

          {/* Appearance */}
          {activeSection === 'appearance' && (
            <div className={styles.section}>
              <SettingsAppearance />
            </div>
          )}

          {/* Voice & Pet */}
          {activeSection === 'voicePet' && (
            <div className={styles.section}>
              <Form
                collapsible={false}
                initialValues={{
                  petEnabled,
                  petAnimation,
                  xiaojiuEnabled,
                  jizhiEnabled,
                }}
                items={
                  [
                    {
                      title: t('pet.title'),
                      children: [
                        {
                          label: t('pet.title'),
                          desc: t('pet.description'),
                          children: <FormSwitch />,
                          name: 'petEnabled',
                          valuePropName: 'checked',
                          minWidth: undefined,
                        },
                        {
                          label: t('pet.animation'),
                          desc: t('pet.tip'),
                          children: (
                            <Select
                              value={petAnimation}
                              onChange={(val) => setPetAnimation(val as PetAnimation)}
                              disabled={!petEnabled}
                              style={{ borderRadius: 12, fontSize: 13, minWidth: 180 }}
                              options={PET_IDLE_ANIMATIONS.map((animation) => ({
                                value: animation,
                                label: t(PET_ANIMATION_LABEL_KEYS[animation]),
                              }))}
                            />
                          ),
                          minWidth: undefined,
                        },
                        {
                          label: t('pet.xiaojiuLabel', { defaultValue: '接入小九' }),
                          desc: t('pet.xiaojiuDesc', { defaultValue: '启用后可快速调用小九相关功能。' }),
                          children: <FormSwitch disabled={!petEnabled} />,
                          name: 'xiaojiuEnabled',
                          valuePropName: 'checked',
                          minWidth: undefined,
                        },
                        {
                          label: t('pet.jizhiLabel', { defaultValue: '接入极智' }),
                          desc: t('pet.jizhiDesc', { defaultValue: '启用后可快速调用极智相关功能。' }),
                          children: <FormSwitch disabled={!petEnabled} />,
                          name: 'jizhiEnabled',
                          valuePropName: 'checked',
                          minWidth: undefined,
                        },
                      ],
                    },
                  ] as FormGroupItemType[]
                }
                itemsType="group"
                variant="filled"
                onValuesChange={(changedValues: Record<string, unknown>) => {
                  if ('petEnabled' in changedValues) setPetEnabled(changedValues.petEnabled as boolean);
                  if ('petAnimation' in changedValues) setPetAnimation(changedValues.petAnimation as PetAnimation);
                  if ('xiaojiuEnabled' in changedValues) setXiaojiuEnabled(changedValues.xiaojiuEnabled as boolean);
                  if ('jizhiEnabled' in changedValues) setJizhiEnabled(changedValues.jizhiEnabled as boolean);
                }}
                itemMinWidth="max(30%, 180px)"
                style={{ width: '100%' }}
              />

              <Form.Group
                title={t('speech.title')}
                variant="filled"
                extra={
                  <Badge
                    variant="outline"
                    className={styles.statusTag}
                    style={{
                      border: 'none',
                      background: speechConfig?.configured ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                      color: speechConfig?.configured ? '#059669' : '#d97706',
                    }}
                  >
                    {speechLoading
                      ? t('speech.loading')
                      : speechConfig?.configured
                        ? t('speech.configured')
                        : t('speech.missing')}
                  </Badge>
                }
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: '0 16px 16px' }}>
                  <p className={styles.hintText12}>{t('speech.description')}</p>

                  <div className={styles.speechGrid}>
                    <div className={styles.formField}>
                      <Label htmlFor="speech-appid" className={styles.fieldLabelSmall}>{t('speech.appId')}</Label>
                      <Input
                        id="speech-appid"
                        value={speechAppIdDraft}
                        onChange={(event) => setSpeechAppIdDraft(event.target.value)}
                        placeholder={t('speech.appIdPlaceholder')}
                        className={styles.fieldInputMono}
                      />
                    </div>
                    <div className={styles.formField}>
                      <Label htmlFor="speech-cluster" className={styles.fieldLabelSmall}>{t('speech.cluster')}</Label>
                      <Input
                        id="speech-cluster"
                        value={speechClusterDraft}
                        onChange={(event) => setSpeechClusterDraft(event.target.value)}
                        placeholder={t('speech.clusterPlaceholder')}
                        className={styles.fieldInputMono}
                      />
                    </div>
                    <div className={styles.formField}>
                      <Label htmlFor="speech-language" className={styles.fieldLabelSmall}>{t('speech.language')}</Label>
                      <Select
                        id="speech-language"
                        value={speechLanguageDraft}
                        onChange={(val) => setSpeechLanguageDraft(val as VolcengineSpeechLanguage)}
                        className={styles.fieldSelect}
                        options={[
                          { value: 'zh-CN', label: t('speech.languages.zhCN') },
                          { value: 'en-US', label: t('speech.languages.enUS') },
                        ]}
                      />
                    </div>
                    <div className={styles.formField}>
                      <Label htmlFor="speech-endpoint" className={styles.fieldLabelSmall}>{t('speech.endpoint')}</Label>
                      <Input
                        id="speech-endpoint"
                        value={speechEndpointDraft}
                        onChange={(event) => setSpeechEndpointDraft(event.target.value)}
                        placeholder="wss://openspeech.bytedance.com/api/v2/asr"
                        className={styles.fieldInputMono}
                      />
                    </div>
                  </div>

                  <div className={styles.formField}>
                    <Label htmlFor="speech-token" className={styles.fieldLabelSmall}>{t('speech.token')}</Label>
                    <div className={styles.inputWithEye}>
                      <Input
                        id="speech-token"
                        type={showSpeechToken ? 'text' : 'password'}
                        value={speechTokenDraft}
                        onChange={(event) => setSpeechTokenDraft(event.target.value)}
                        placeholder={speechConfig?.hasToken ? (speechConfig.tokenMasked ?? t('speech.tokenConfigured')) : t('speech.tokenPlaceholder')}
                        className={styles.fieldInputMono}
                        style={{ paddingRight: 40 }}
                      />
                      <button type="button" onClick={() => setShowSpeechToken((value) => !value)} className={styles.eyeBtn}>
                        {showSpeechToken ? <EyeOff style={{ height: 16, width: 16 }} /> : <Eye style={{ height: 16, width: 16 }} />}
                      </button>
                    </div>
                    <p className={styles.hintText12}>
                      {speechConfig?.hasToken
                        ? t('speech.tokenSaved', { token: speechConfig.tokenMasked ?? '***' })
                        : t('speech.tokenHelp')}
                    </p>
                  </div>

                  <div className={styles.speechBtnRow}>
                    <Button
                      type="primary"
                      className={styles.smallActionButton}
                      onClick={() => void handleSaveSpeechConfig()}
                      disabled={speechSaving}
                    >
                      {speechSaving ? t('speech.saving') : t('speech.save')}
                    </Button>
                    <Button
                      className={styles.smallActionButton}
                      onClick={() => { void loadSpeechConfig(); }}
                      disabled={speechLoading || speechSaving}
                    >
                      {t('common:actions.refresh')}
                    </Button>
                    <p className={styles.hintText12} style={{ marginLeft: 8 }}>
                      {t('speech.tip')}
                    </p>
                  </div>
                </div>
              </Form.Group>

              <Form.Group
                title={t('voiceChat.title')}
                variant="filled"
                extra={
                  <Badge
                    variant="outline"
                    className={styles.statusTag}
                    style={{
                      background: voiceChatConfig?.configured ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                      color: voiceChatConfig?.configured ? '#047857' : '#b45309',
                      border: voiceChatConfig?.configured ? '1px solid rgba(16,185,129,0.2)' : '1px solid rgba(245,158,11,0.2)',
                    }}
                  >
                    {voiceChatLoading
                      ? t('voiceChat.loading')
                      : voiceChatConfig?.configured
                        ? t('voiceChat.configured')
                        : t('voiceChat.missing')}
                  </Badge>
                }
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '0 16px 16px' }}>
                  <p className={styles.hintText12}>{t('voiceChat.description')}</p>

                  <div className={styles.grid2}>
                    <div className={styles.formField}>
                      <Label htmlFor="voice-chat-app-id" className={styles.fieldLabelSmall}>{t('voiceChat.appId')}</Label>
                      <Input
                        id="voice-chat-app-id"
                        value={voiceChatAppIdDraft}
                        onChange={(event) => setVoiceChatAppIdDraft(event.target.value)}
                        placeholder={t('voiceChat.appIdPlaceholder')}
                        className={styles.fieldInputMono}
                      />
                    </div>
                    <div className={styles.formField}>
                      <Label htmlFor="voice-chat-access-key" className={styles.fieldLabelSmall}>{t('voiceChat.accessKey')}</Label>
                      <div className={styles.inputWithEye}>
                        <Input
                          id="voice-chat-access-key"
                          type={showVoiceChatAccessKey ? 'text' : 'password'}
                          value={voiceChatAccessKeyDraft}
                          onChange={(event) => setVoiceChatAccessKeyDraft(event.target.value)}
                          placeholder={voiceChatConfig?.hasAccessKey ? (voiceChatConfig.accessKeyMasked ?? t('voiceChat.accessKeyConfigured')) : t('voiceChat.accessKeyPlaceholder')}
                          className={styles.fieldInputMono}
                          style={{ paddingRight: 40 }}
                        />
                        <button type="button" onClick={() => setShowVoiceChatAccessKey((value) => !value)} className={styles.eyeBtn}>
                          {showVoiceChatAccessKey ? <EyeOff style={{ height: 16, width: 16 }} /> : <Eye style={{ height: 16, width: 16 }} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className={styles.formField}>
                    <Label htmlFor="voice-chat-endpoint" className={styles.fieldLabelSmall}>{t('voiceChat.endpoint')}</Label>
                    <Input
                      id="voice-chat-endpoint"
                      value={voiceChatEndpointDraft}
                      onChange={(event) => setVoiceChatEndpointDraft(event.target.value)}
                      placeholder={t('voiceChat.endpointPlaceholder')}
                      className={styles.fieldInputMono}
                    />
                    <p className={styles.hintText12}>
                      {t('voiceChat.endpointHelp', { endpoint: DEFAULT_VOICE_CHAT_ENDPOINT })}
                    </p>
                  </div>

                  <p className={styles.hintText12}>
                    {voiceChatConfig?.hasAccessKey
                      ? voiceChatConfig.accessKeySource === 'speech-asr'
                        ? t('voiceChat.accessKeyReused', { token: voiceChatConfig.accessKeyMasked ?? '***' })
                        : t('voiceChat.accessKeySaved', { token: voiceChatConfig.accessKeyMasked ?? '***' })
                      : t('voiceChat.accessKeyHelp')}
                  </p>

                  <div className={styles.flexWrapRow}>
                    <Button
                      type="primary"
                      className={styles.smallActionButton}
                      onClick={() => void handleSaveVoiceChatRealtimeConfig()}
                      disabled={voiceChatSaving}
                    >
                      {voiceChatSaving ? t('voiceChat.saving') : t('voiceChat.save')}
                    </Button>
                    <Button
                      className={styles.smallActionButton}
                      onClick={() => { void loadVoiceChatRealtimeConfig(); }}
                      disabled={voiceChatLoading || voiceChatSaving}
                    >
                      {t('common:actions.refresh')}
                    </Button>
                    <p className={styles.hintText12}>{t('voiceChat.tip')}</p>
                  </div>
                </div>
              </Form.Group>
            </div>
          )}

          {/* Gateway */}
          {activeSection === 'gateway' && (
            <div className={styles.sectionGap6}>
              <div className={styles.settingRowSmCol}>
                <div>
                  <Label className={styles.settingLabel}>{t('gateway.status')}</Label>
                  <p className={styles.settingDesc}>{t('gateway.port')}: {gatewayStatus.port}</p>
                </div>
                <div className={styles.buttonGroup}>
                  <div className={cn(
                    styles.statusBadge,
                    gatewayStatus.state === 'running' ? styles.statusRunning :
                      gatewayStatus.state === 'error' ? styles.statusError : styles.statusDefault
                  )}>
                    <div className={cn(
                      styles.statusDot,
                      gatewayStatus.state === 'running' ? styles.statusDotGreen :
                        gatewayStatus.state === 'error' ? styles.statusDotRed : styles.statusDotGray
                    )} />
                    {gatewayStatus.state}
                  </div>
                  <Button size="small" className={styles.smallActionButton} onClick={restartGateway} style={{ border: '1px solid var(--ant-color-border-secondary)', background: 'transparent' }}>
                    <RefreshCw style={{ height: 14, width: 14, marginRight: 6 }} />
                    {t('common:actions.restart')}
                  </Button>
                  <Button size="small" className={styles.smallActionButton} onClick={handleShowLogs} style={{ border: '1px solid var(--ant-color-border-secondary)', background: 'transparent' }}>
                    <FileText style={{ height: 14, width: 14, marginRight: 6 }} />
                    {t('gateway.logs')}
                  </Button>
                </div>
              </div>

              {showLogs && (
                <div className={styles.logPanel}>
                  <div className={styles.logPanelHeader}>
                    <p className={styles.logPanelTitle}>{t('gateway.appLogs')}</p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Button type="text" size="small" className={styles.smallTextActionButton} onClick={handleOpenLogDir}>
                        <ExternalLink style={{ height: 12, width: 12, marginRight: 6 }} />
                        {t('gateway.openFolder')}
                      </Button>
                      <Button type="text" size="small" className={styles.smallTextActionButton} onClick={() => setShowLogs(false)}>
                        {t('common:actions.close')}
                      </Button>
                    </div>
                  </div>
                  <pre className={styles.logContent}>{logContent || t('chat:noLogs')}</pre>
                </div>
              )}

              <div className={styles.settingRow}>
                <div>
                  <Label className={styles.settingLabel}>{t('gateway.autoStart')}</Label>
                  <p className={styles.settingDesc}>{t('gateway.autoStartDesc')}</p>
                </div>
                <Switch checked={gatewayAutoStart} onChange={setGatewayAutoStart} />
              </div>

              
            {/* OpenClaw API */}
            <Form.Group
              title="OpenClaw API"
              variant="filled"
              extra={<List style={{ height: 16, width: 16, color: 'var(--ant-color-text-secondary)' }} />}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '0 16px 16px' }}>
                <p className={styles.hintText12}>{t('developer.codeAgentConfigDesc')}</p>

                <div className={styles.formField}>
                  <Label className={styles.fieldLabelSmall}>{t('developer.codeAgentBaseUrl')}</Label>
                  <Input
                    type="text"
                    placeholder="http://127.0.0.1:18789"
                    value={codeAgent.baseUrl}
                    onChange={(e) => {
                      const nextConfig = { ...codeAgent, baseUrl: e.target.value };
                      useSettingsStore.setState({ codeAgent: nextConfig });
                      hostApiFetch('/api/settings', {
                        method: 'PUT',
                        body: JSON.stringify({ codeAgent: nextConfig }),
                      });
                    }}
                    style={{ fontSize: 13, fontFamily: 'monospace' }}
                  />
                </div>

                <div className={styles.formField}>
                  <Label className={styles.fieldLabelSmall}>{t('developer.codeAgentApiKey')}</Label>
                  <Input
                    type="password"
                    placeholder={t('developer.codeAgentApiKeyPlaceholder')}
                    value={codeAgent.apiKey}
                    onChange={(e) => {
                      const nextConfig = { ...codeAgent, apiKey: e.target.value };
                      useSettingsStore.setState({ codeAgent: nextConfig });
                      hostApiFetch('/api/settings', {
                        method: 'PUT',
                        body: JSON.stringify({ codeAgent: nextConfig }),
                      });
                    }}
                    style={{ fontSize: 13, fontFamily: 'monospace' }}
                  />
                  <p className={styles.hintText}>{t('developer.codeAgentApiKeyDesc')}</p>
                </div>
              </div>
            </Form.Group>

            {/* Remote Gateway */}
              <Form.Group
                title={t('gateway.remoteTitle')}
                variant="filled"
                extra={<Globe style={{ height: 16, width: 16, color: 'var(--ant-color-text-secondary)' }} />}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '0 16px 16px' }}>
                  <p className={styles.hintText12}>{t('gateway.remoteDesc')}</p>

                  <div className={styles.formField}>
                    <Label className={styles.fieldLabelSmall}>{t('gateway.remoteUrl')}</Label>
                    <Input
                      type="text"
                      placeholder="ws://your-gateway-host:18789/ws"
                      value={remoteGatewayUrlDraft}
                      onChange={(e) => setRemoteGatewayUrlDraft(e.target.value)}
                      onBlur={() => {
                        if (remoteGatewayUrlDraft !== remoteGatewayUrl) {
                          setRemoteGatewayUrl(remoteGatewayUrlDraft);
                        }
                      }}
                      style={{ fontSize: 13, fontFamily: 'monospace' }}
                    />
                    <p className={styles.hintText}>{t('gateway.remoteUrlHelp')}</p>
                  </div>

                  <div className={styles.formField}>
                    <Label className={styles.fieldLabelSmall}>{t('gateway.remoteToken')}</Label>
                    <div className={styles.inputWithEye}>
                      <Input
                        type={showRemoteGatewayToken ? 'text' : 'password'}
                        placeholder={t('gateway.remoteTokenPlaceholder')}
                        value={remoteGatewayTokenDraft}
                        onChange={(e) => setRemoteGatewayTokenDraft(e.target.value)}
                        onBlur={() => {
                          if (remoteGatewayTokenDraft !== remoteGatewayToken) {
                            setRemoteGatewayToken(remoteGatewayTokenDraft);
                          }
                        }}
                        style={{ fontSize: 13, fontFamily: 'monospace', paddingRight: 40 }}
                      />
                      <button type="button" onClick={() => setShowRemoteGatewayToken((v) => !v)} className={styles.eyeBtn}>
                        {showRemoteGatewayToken ? <EyeOff style={{ height: 16, width: 16 }} /> : <Eye style={{ height: 16, width: 16 }} />}
                      </button>
                    </div>
                  </div>

                  {remoteGatewayUrl && (
                    <p className={styles.amberText}>{t('gateway.remoteActive')}</p>
                  )}
                </div>
              </Form.Group>

              {/* Cloud Workspace */}
              {cloudGateway?.cloudMode && (
                <div className={styles.infoPanel}>
                  <div className={styles.infoPanelHeader}>
                    <Globe style={{ height: 16, width: 16, color: 'var(--ant-color-text-secondary)' }} />
                    <Label className={styles.settingLabel}>{t('gateway.cloudTitle')}</Label>
                  </div>
                  <p className={styles.hintText12}>{t('gateway.cloudDesc')}</p>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span className={styles.hintText12}>{t('gateway.cloudGatewayState')}：</span>
                    <span className={
                      cloudGateway.gatewayState === 'running' ? styles.cloudStateRunning :
                        cloudGateway.gatewayState === 'starting' ? styles.cloudStateStarting :
                          cloudGateway.gatewayState === 'error' ? styles.cloudStateError :
                            styles.cloudStateStopped
                    }>
                      {t(`gateway.cloudGatewayState${(cloudGateway.gatewayState ?? 'Stopped').charAt(0).toUpperCase()}${(cloudGateway.gatewayState ?? 'stopped').slice(1)}`)}
                    </span>
                  </div>

                  {cloudGateway.gatewayWsUrl && (
                    <p className={styles.monoText}>{cloudGateway.gatewayWsUrl}</p>
                  )}

                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button size="small" className={styles.smallActionButton} disabled={cloudGatewayLoading || cloudGateway.gatewayState === 'running'} onClick={() => void handleCloudGatewayAction('start')}>
                      {t('gateway.cloudGatewayStart')}
                    </Button>
                    <Button size="small" className={styles.smallActionButton} disabled={cloudGatewayLoading || cloudGateway.gatewayState !== 'running'} onClick={() => void handleCloudGatewayAction('stop')}>
                      {t('gateway.cloudGatewayStop')}
                    </Button>
                    <Button size="small" className={styles.smallActionButton} disabled={cloudGatewayLoading} onClick={() => void handleCloudGatewayAction('restart')}>
                      {t('gateway.cloudGatewayRestart')}
                    </Button>
                  </div>
                </div>
              )}

              <div className={styles.settingRow}>
                <div>
                  <Label className={styles.settingLabel}>{t('advanced.devMode')}</Label>
                  <p className={styles.settingDesc}>{t('advanced.devModeDesc')}</p>
                </div>
                <Switch checked={devModeUnlocked} onChange={setDevModeUnlocked} />
              </div>

              <div className={styles.settingRow}>
                <div>
                  <Label className={styles.settingLabel}>{t('advanced.telemetry')}</Label>
                  <p className={styles.settingDesc}>{t('advanced.telemetryDesc')}</p>
                </div>
                <Switch checked={telemetryEnabled} onChange={setTelemetryEnabled} />
              </div>

              {/* Reset all data */}
              <div className={styles.resetSection}>
                <div className={styles.settingRow}>
                  <div>
                    <Label className={styles.destructiveLabel}>{t('advanced.resetData')}</Label>
                    <p className={styles.settingDesc}>{t('advanced.resetDataDesc')}</p>
                  </div>
                  <Button type="primary" danger size="small" className={styles.smallActionButton} style={{ flexShrink: 0 }} onClick={() => setShowResetConfirm(true)} disabled={resetting}>
                    {t('advanced.resetDataBtn')}
                  </Button>
                </div>
              </div>

            </div>
          )}

          <ConfirmDialog
            open={showResetConfirm}
            title={t('advanced.resetConfirmTitle')}
            message={t('advanced.resetConfirmMsg')}
            confirmLabel={t('advanced.resetConfirmOk')}
            cancelLabel={t('advanced.resetConfirmCancel')}
            variant="destructive"
            onConfirm={handleResetAllData}
            onCancel={() => setShowResetConfirm(false)}
            onError={(err) => toast.error(String(err))}
          />

          {/* Developer */}
          {activeSection === 'developer' && devModeUnlocked && (
            <div className={styles.sectionGap8}>
              {/* Gateway Proxy */}
              <div className={styles.sectionGap6} style={{ gap: 16 }}>
                <div className={styles.settingRow}>
                  <div>
                    <Label className={styles.settingLabelMuted}>Gateway Proxy</Label>
                    <p className={styles.settingDesc}>{t('gateway.proxyDesc')}</p>
                  </div>
                  <Switch checked={proxyEnabledDraft} onChange={setProxyEnabledDraft} />
                </div>

                    {proxyEnabledDraft && (
                      <div className={styles.proxySection}>
                        <div className={styles.proxyGrid}>
                          <div className={styles.formField}>
                            <Label htmlFor="proxy-server" className={styles.fieldLabelSmall}>{t('gateway.proxyServer')}</Label>
                            <Input id="proxy-server" value={proxyServerDraft} onChange={(event) => setProxyServerDraft(event.target.value)} placeholder="http://127.0.0.1:7890" className={styles.fieldInputMono} />
                            <p className={styles.hintText}>{t('gateway.proxyServerHelp')}</p>
                          </div>
                          <div className={styles.formField}>
                            <Label htmlFor="proxy-http-server" className={styles.fieldLabelSmall}>{t('gateway.proxyHttpServer')}</Label>
                            <Input id="proxy-http-server" value={proxyHttpServerDraft} onChange={(event) => setProxyHttpServerDraft(event.target.value)} placeholder={proxyServerDraft || 'http://127.0.0.1:7890'} className={styles.fieldInputMono} />
                            <p className={styles.hintText}>{t('gateway.proxyHttpServerHelp')}</p>
                          </div>
                          <div className={styles.formField}>
                            <Label htmlFor="proxy-https-server" className={styles.fieldLabelSmall}>{t('gateway.proxyHttpsServer')}</Label>
                            <Input id="proxy-https-server" value={proxyHttpsServerDraft} onChange={(event) => setProxyHttpsServerDraft(event.target.value)} placeholder={proxyServerDraft || 'http://127.0.0.1:7890'} className={styles.fieldInputMono} />
                            <p className={styles.hintText}>{t('gateway.proxyHttpsServerHelp')}</p>
                          </div>
                          <div className={styles.formField}>
                            <Label htmlFor="proxy-all-server" className={styles.fieldLabelSmall}>{t('gateway.proxyAllServer')}</Label>
                            <Input id="proxy-all-server" value={proxyAllServerDraft} onChange={(event) => setProxyAllServerDraft(event.target.value)} placeholder={proxyServerDraft || 'socks5://127.0.0.1:7891'} className={styles.fieldInputMono} />
                            <p className={styles.hintText}>{t('gateway.proxyAllServerHelp')}</p>
                          </div>
                        </div>

                        <div className={styles.formField}>
                          <Label htmlFor="proxy-bypass" className={styles.fieldLabelSmall}>{t('gateway.proxyBypass')}</Label>
                          <Input id="proxy-bypass" value={proxyBypassRulesDraft} onChange={(event) => setProxyBypassRulesDraft(event.target.value)} placeholder="<local>;localhost;127.0.0.1;::1" className={styles.fieldInputMono} />
                          <p className={styles.hintText}>{t('gateway.proxyBypassHelp')}</p>
                        </div>

                        <div className={styles.flexRow} style={{ paddingTop: 8 }}>
                          <Button onClick={handleSaveProxySettings} disabled={savingProxy} style={{ borderRadius: 12, height: 40, padding: '0 20px', background: 'transparent', border: '1px solid var(--ant-color-border-secondary)' }}>
                            <RefreshCw style={{ height: 16, width: 16, marginRight: 8, animation: savingProxy ? 'spin 1s linear infinite' : undefined }} />
                            {savingProxy ? t('common:status.saving') : t('common:actions.save')}
                          </Button>
                          <p className={styles.hintText12}>{t('gateway.proxyRestartNote')}</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className={styles.sectionGap6} style={{ gap: 16, paddingTop: 16 }}>
                    <Label className={styles.settingLabelMuted}>{t('developer.gatewayToken')}</Label>
                    <p className={styles.settingDesc}>{t('developer.gatewayTokenDesc')}</p>
                    <div className={styles.flexWrapRow}>
                      <Input readOnly value={controlUiInfo?.token || ''} placeholder={t('developer.tokenUnavailable')} className={styles.monoInputFull} />
                      <Button onClick={refreshControlUiInfo} disabled={!devModeUnlocked} style={{ borderRadius: 12, height: 40, padding: '0 16px', background: 'transparent', border: '1px solid var(--ant-color-border-secondary)' }}>
                        <RefreshCw style={{ height: 16, width: 16, marginRight: 8 }} />
                        {t('common:actions.load')}
                      </Button>
                      <Button onClick={handleCopyGatewayToken} disabled={!controlUiInfo?.token} style={{ borderRadius: 12, height: 40, padding: '0 16px', background: 'transparent', border: '1px solid var(--ant-color-border-secondary)' }}>
                        <Copy style={{ height: 16, width: 16, marginRight: 8 }} />
                        {t('common:actions.copy')}
                      </Button>
                    </div>
                  </div>

                  {showCliTools && (
                    <div className={styles.sectionGap6} style={{ gap: 12 }}>
                      <Label className={styles.settingLabel}>{t('developer.cli')}</Label>
                      <p className={styles.settingDesc}>{t('developer.cliDesc')}</p>
                      {isWindows && <p className={styles.hintText12}>{t('developer.cliPowershell')}</p>}
                      <div className={styles.flexWrapRow}>
                        <Input readOnly value={openclawCliCommand} placeholder={openclawCliError || t('developer.cmdUnavailable')} className={styles.monoInputFull} />
                        <Button onClick={handleCopyCliCommand} disabled={!openclawCliCommand} style={{ borderRadius: 12, height: 40, padding: '0 16px', background: 'transparent', border: '1px solid var(--ant-color-border-secondary)' }}>
                          <Copy style={{ height: 16, width: 16, marginRight: 8 }} />
                          {t('common:actions.copy')}
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className={styles.sectionGap6} style={{ gap: 16 }}>
                    <div className={styles.settingRow}>
                      <div>
                        <Label className={styles.settingLabel}>{t('developer.doctor')}</Label>
                        <p className={styles.settingDesc}>{t('developer.doctorDesc')}</p>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <Button onClick={() => void handleRunOpenClawDoctor('diagnose')} disabled={doctorRunningMode !== null} style={{ borderRadius: 12, height: 40, padding: '0 16px', background: 'transparent', border: '1px solid var(--ant-color-border-secondary)' }}>
                          <RefreshCw style={{ height: 16, width: 16, marginRight: 8, animation: doctorRunningMode === 'diagnose' ? 'spin 1s linear infinite' : undefined }} />
                          {doctorRunningMode === 'diagnose' ? t('common:status.running') : t('developer.runDoctor')}
                        </Button>
                        <Button onClick={() => void handleRunOpenClawDoctor('fix')} disabled={doctorRunningMode !== null} style={{ borderRadius: 12, height: 40, padding: '0 16px', background: 'transparent', border: '1px solid var(--ant-color-border-secondary)' }}>
                          <RefreshCw style={{ height: 16, width: 16, marginRight: 8, animation: doctorRunningMode === 'fix' ? 'spin 1s linear infinite' : undefined }} />
                          {doctorRunningMode === 'fix' ? t('common:status.running') : t('developer.runDoctorFix')}
                        </Button>
                        <Button onClick={handleCopyDoctorOutput} disabled={!doctorResult} style={{ borderRadius: 12, height: 40, padding: '0 16px', background: 'transparent', border: '1px solid var(--ant-color-border-secondary)' }}>
                          <Copy style={{ height: 16, width: 16, marginRight: 8 }} />
                          {t('common:actions.copy')}
                        </Button>
                      </div>
                    </div>

                    {doctorResult && (
                      <div className={styles.outputPanel}>
                        <div className={styles.badgeRow}>
                          <Badge variant={doctorResult.success ? 'secondary' : 'destructive'} className={styles.statusTag}>
                            {doctorResult.mode === 'fix'
                              ? (doctorResult.success ? t('developer.doctorFixOk') : t('developer.doctorFixIssue'))
                              : (doctorResult.success ? t('developer.doctorOk') : t('developer.doctorIssue'))}
                          </Badge>
                          <Badge variant="outline" className={styles.statusTag}>
                            {t('developer.doctorExitCode')}: {doctorResult.exitCode ?? 'null'}
                          </Badge>
                          <Badge variant="outline" className={styles.statusTag}>
                            {t('developer.doctorDuration')}: {Math.round(doctorResult.durationMs)}ms
                          </Badge>
                        </div>
                        <div className={styles.metaText}>
                          <p>{t('developer.doctorCommand')}: {doctorResult.command}</p>
                          <p>{t('developer.doctorWorkingDir')}: {doctorResult.cwd || '-'}</p>
                          {doctorResult.error && <p>{t('developer.doctorError')}: {doctorResult.error}</p>}
                        </div>
                        <div className={styles.outputGrid2}>
                          <div className={styles.formField}>
                            <p className={styles.outputLabel}>{t('developer.doctorStdout')}</p>
                            <pre className={styles.outputPre}>{doctorResult.stdout.trim() || t('developer.doctorOutputEmpty')}</pre>
                          </div>
                          <div className={styles.formField}>
                            <p className={styles.outputLabel}>{t('developer.doctorStderr')}</p>
                            <pre className={styles.outputPre}>{doctorResult.stderr.trim() || t('developer.doctorOutputEmpty')}</pre>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className={styles.sectionGap6} style={{ gap: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                      <div>
                        <Label className={styles.settingLabel}>{t('developer.codeAgent')}</Label>
                        <p className={styles.settingDesc}>{t('developer.codeAgentDesc')}</p>
                      </div>
                      <div className={styles.flexWrapRow}>
                        <Button onClick={() => void handleCodeAgentHealthCheck()} disabled={codeAgentBusyAction !== null} style={{ borderRadius: 12, height: 40, padding: '0 16px', background: 'transparent', border: '1px solid var(--ant-color-border-secondary)' }}>
                          <RefreshCw style={{ height: 16, width: 16, marginRight: 8, animation: codeAgentBusyAction === 'health' ? 'spin 1s linear infinite' : undefined }} />
                          {t('developer.codeAgentCheckHealth')}
                        </Button>
                        <Button onClick={() => void handleCodeAgentLifecycleAction('start')} disabled={codeAgentBusyAction !== null || codeAgentStatus?.state === 'running'} style={{ borderRadius: 12, height: 40, padding: '0 16px', background: 'transparent', border: '1px solid var(--ant-color-border-secondary)' }}>
                          {t('developer.codeAgentStart')}
                        </Button>
                        <Button onClick={() => void handleCodeAgentLifecycleAction('stop')} disabled={codeAgentBusyAction !== null || codeAgentStatus?.state !== 'running'} style={{ borderRadius: 12, height: 40, padding: '0 16px', background: 'transparent', border: '1px solid var(--ant-color-border-secondary)' }}>
                          {t('developer.codeAgentStop')}
                        </Button>
                        <Button onClick={() => void handleCodeAgentLifecycleAction('restart')} disabled={codeAgentBusyAction !== null} style={{ borderRadius: 12, height: 40, padding: '0 16px', background: 'transparent', border: '1px solid var(--ant-color-border-secondary)' }}>
                          {t('common:actions.restart')}
                        </Button>
                      </div>
                    </div>

                    <div className={styles.codeAgentCard}>
                      <div className={styles.badgeRow}>
                        <Badge variant="outline" className={styles.statusTag}>
                          {t('developer.codeAgentExecutionMode')}: {codeAgentHealth?.executionMode || codeAgentStatus?.executionMode || codeAgentConfigDraft.executionMode}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={styles.statusTag}
                          style={{
                            ...(codeAgentStatus?.state === 'running' ? { borderColor: 'rgba(34,197,94,0.3)', color: '#15803d', background: 'rgba(34,197,94,0.1)' } : {}),
                            ...(codeAgentStatus?.state === 'error' ? { borderColor: 'rgba(239,68,68,0.3)', color: '#dc2626', background: 'rgba(239,68,68,0.1)' } : {}),
                          }}
                        >
                          {t('developer.codeAgentStatus')}: {codeAgentStatus?.state || '-'}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={styles.statusTag}
                          style={{
                            ...(codeAgentStatus?.state === 'running' && codeAgentHealth?.ok ? { borderColor: 'rgba(34,197,94,0.3)', color: '#15803d', background: 'rgba(34,197,94,0.1)' } : {}),
                            ...(codeAgentStatus?.state === 'running' && codeAgentHealth && !codeAgentHealth.ok ? { borderColor: 'rgba(245,158,11,0.3)', color: '#b45309', background: 'rgba(245,158,11,0.1)' } : {}),
                            ...(codeAgentStatus?.state === 'error' ? { borderColor: 'rgba(239,68,68,0.3)', color: '#dc2626', background: 'rgba(239,68,68,0.1)' } : {}),
                          }}
                        >
                          {t('developer.codeAgentHealth')}: {(() => {
                            const state = codeAgentStatus?.state;
                            if (!state || state === 'stopped') return t('developer.codeAgentHealthStopped', { defaultValue: '未启动' });
                            if (state === 'starting') return t('developer.codeAgentHealthStarting', { defaultValue: '启动中' });
                            if (state === 'error') return t('developer.codeAgentHealthError', { defaultValue: 'error' });
                            if (codeAgentHealth?.ok) return t('developer.codeAgentHealthOk', { defaultValue: 'ok' });
                            if (codeAgentHealth) return t('developer.codeAgentHealthError', { defaultValue: 'error' });
                            return '-';
                          })()}
                        </Badge>
                        <Badge variant="outline" className={styles.statusTag}>
                          {t('developer.codeAgentRuntime')}: {codeAgentStatus?.runtime || codeAgentHealth?.runtime || '-'}
                        </Badge>
                        <Badge variant="outline" className={styles.statusTag}>
                          {t('developer.codeAgentVendor')}: {(codeAgentStatus?.vendorPresent ?? codeAgentHealth?.vendorPresent) ? t('developer.codeAgentYes') : t('developer.codeAgentNo')}
                        </Badge>
                        {typeof codeAgentHealth?.protocolVersion === 'number' && (
                          <Badge variant="outline" className={styles.statusTag}>
                            {t('developer.codeAgentProtocol')}: v{codeAgentHealth.protocolVersion}
                          </Badge>
                        )}
                        {codeAgentHealth?.cliVersion && (
                          <Badge variant="outline" className={styles.statusTag}>
                            {t('developer.codeAgentCliVersion')}: {codeAgentHealth.cliVersion}
                          </Badge>
                        )}
                      </div>

                      <div className={styles.outputGrid2}>
                        <div className={styles.metaText}>
                          <p>{t('developer.codeAgentAdapter')}: {codeAgentStatus?.adapter || codeAgentHealth?.adapter || '-'}</p>
                          <p>{t('developer.codeAgentSidecarPath')}: {codeAgentStatus?.sidecarPath || codeAgentHealth?.sidecarPath || '-'}</p>
                          <p>{t('developer.codeAgentVendorPath')}: {codeAgentStatus?.vendorPath || codeAgentHealth?.vendorPath || '-'}</p>
                          {(codeAgentHealth?.executionMode ?? codeAgentStatus?.executionMode) === 'snapshot' && (
                            <p>{t('developer.codeAgentSnapshotEntry')}: {codeAgentHealth?.snapshotEntryPath || '-'}</p>
                          )}
                          <p>{t('developer.codeAgentCliPath')}: {codeAgentHealth?.cliPath || codeAgentStatus?.cliPath || codeAgentConfigDraft.cliPath || '-'}</p>
                          <p>{t('developer.codeAgentConfigSource')}: {codeAgentHealth?.configSource === 'default_provider'
                            ? `${t('developer.codeAgentConfigSourceDefaultProvider')}${codeAgentHealth.configSourceLabel ? ` (${codeAgentHealth.configSourceLabel})` : ''}`
                            : codeAgentHealth?.configSource === 'claude_settings'
                              ? t('developer.codeAgentConfigSourceClaudeSettings')
                              : t('developer.codeAgentConfigSourceSettings')}</p>
                        </div>
                        <div className={styles.metaText}>
                          <p>{t('developer.codeAgentPid')}: {codeAgentStatus?.pid ?? '-'}</p>
                          <p>{t('developer.codeAgentStartedAt')}: {codeAgentStatus?.startedAt ? new Date(codeAgentStatus.startedAt).toLocaleString() : '-'}</p>
                          <p>{t('developer.codeAgentBun')}: {(codeAgentStatus?.bunAvailable ?? codeAgentHealth?.bunAvailable) ? t('developer.codeAgentYes') : t('developer.codeAgentNo')}</p>
                          <p>{t('developer.codeAgentRunnable')}: {codeAgentHealth?.runnable === undefined ? '-' : (codeAgentHealth.runnable ? t('developer.codeAgentRunnableYes') : t('developer.codeAgentRunnableNo'))}</p>
                          <p>{t('developer.codeAgentCliFound')}: {codeAgentHealth?.cliFound === undefined ? '-' : (codeAgentHealth.cliFound ? t('developer.codeAgentYes') : t('developer.codeAgentNo'))}</p>
                          <p>{t('developer.codeAgentInheritedApiKey')}: {codeAgentHealth?.inheritedApiKey === undefined ? '-' : (codeAgentHealth.inheritedApiKey ? t('developer.codeAgentYes') : t('developer.codeAgentNo'))}</p>
                          {codeAgentStatus?.lastError && <p>{t('developer.codeAgentError')}: {codeAgentStatus.lastError}</p>}
                          {codeAgentHealth?.error && <p>{t('developer.codeAgentError')}: {codeAgentHealth.error}</p>}
                        </div>
                      </div>

                      {codeAgentHealth?.diagnostics && codeAgentHealth.diagnostics.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <p className={styles.outputLabel}>{t('developer.codeAgentDiagnostics')}</p>
                          <pre className={styles.outputPreSmall}>
                            {codeAgentHealth.diagnostics.join('\n')}
                          </pre>
                        </div>
                      )}

                      <div className={styles.codeAgentInnerCard}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 600 }}>{t('developer.codeAgentConfig')}</p>
                            <p className={styles.settingDescSmall}>{t('developer.codeAgentConfigDesc')}</p>
                            <p className={styles.hintText}>{t('developer.codeAgentConfigAutoMapHint')}</p>
                          </div>
                          <Button
                            onClick={() => void handleSaveCodeAgentConfig()}
                            disabled={savingCodeAgentConfig}
                            style={{ borderRadius: 12, height: 36, padding: '0 16px', background: 'transparent', border: '1px solid var(--ant-color-border-secondary)' }}
                          >
                            <RefreshCw style={{ height: 16, width: 16, marginRight: 8, animation: savingCodeAgentConfig ? 'spin 1s linear infinite' : undefined }} />
                            {savingCodeAgentConfig ? t('common:status.saving') : t('common:actions.save')}
                          </Button>
                        </div>

                        <div className={styles.grid2}>
                          <div className={styles.formField}>
                            <Label htmlFor="code-agent-execution-mode" className={styles.fieldLabelSmall}>
                              {t('developer.codeAgentExecutionMode')}
                            </Label>
                            <Select
                              id="code-agent-execution-mode"
                              value={codeAgentConfigDraft.executionMode}
                              onChange={(val) => setCodeAgentConfigDraft((prev) => ({
                                ...prev,
                                executionMode: val as CodeAgentExecutionMode,
                              }))}
                              className={styles.fieldSelect}
                              options={[
                                { value: 'cli', label: t('developer.codeAgentExecutionModeCli') },
                                { value: 'snapshot', label: t('developer.codeAgentExecutionModeSnapshot') },
                              ]}
                            />
                          </div>

                          <div className={styles.formField}>
                            <Label htmlFor="code-agent-permission-mode" className={styles.fieldLabelSmall}>
                              {t('developer.codeAgentPermissionMode')}
                            </Label>
                            <Select
                              id="code-agent-permission-mode"
                              value={codeAgentConfigDraft.permissionMode}
                              onChange={(val) => setCodeAgentConfigDraft((prev) => ({
                                ...prev,
                                permissionMode: val as CodeAgentPermissionMode,
                              }))}
                              className={styles.fieldSelect}
                              options={[
                                { value: 'default', label: t('developer.codeAgentPermissionDefault') },
                                { value: 'acceptEdits', label: t('developer.codeAgentPermissionAcceptEdits') },
                                { value: 'auto', label: t('developer.codeAgentPermissionAuto') },
                                { value: 'plan', label: t('developer.codeAgentPermissionPlan') },
                                { value: 'dontAsk', label: t('developer.codeAgentPermissionDontAsk') },
                                { value: 'bypassPermissions', label: t('developer.codeAgentPermissionBypass') },
                              ]}
                            />
                          </div>

                          <div className={styles.formField}>
                            <Label htmlFor="code-agent-cli-path" className={styles.fieldLabelSmall}>
                              {t('developer.codeAgentCliPath')}
                            </Label>
                            <Input
                              id="code-agent-cli-path"
                              value={codeAgentConfigDraft.cliPath}
                              onChange={(event) => setCodeAgentConfigDraft((prev) => ({ ...prev, cliPath: event.target.value }))}
                              placeholder="claude"
                              className={styles.fieldInputMono}
                            />
                          </div>

                          <div className={styles.formField}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <Label htmlFor="code-agent-model" className={styles.fieldLabelSmall}>
                                {t('developer.codeAgentModel')}
                              </Label>
                              <Button
                                size="small"
                                onClick={() => void handleFetchModels()}
                                disabled={fetchingModels || !codeAgentConfigDraft.baseUrl.trim() || !codeAgentConfigDraft.apiKey.trim()}
                                style={{ borderRadius: 8, fontSize: 12, padding: '2px 8px', height: 24 }}
                              >
                                <List style={{ marginRight: 4, height: 14, width: 14 }} className={fetchingModels ? 'animate-spin' : ''} />
                                {fetchingModels ? t('developer.codeAgentFetchingModels') : t('developer.codeAgentFetchModels')}
                              </Button>
                            </div>
                            {availableModels.length > 0 ? (
                              <Select
                                id="code-agent-model"
                                value={codeAgentConfigDraft.model}
                                onChange={(val) => setCodeAgentConfigDraft((prev) => ({ ...prev, model: val }))}
                                style={{ borderRadius: 12 }}
                                options={[
                                  { value: '', label: t('developer.codeAgentModelAutoDetect') },
                                  ...availableModels.map((m) => ({ value: m.id, label: m.name || m.id })),
                                ]}
                              />
                            ) : (
                              <Input
                                id="code-agent-model"
                                value={codeAgentConfigDraft.model}
                                onChange={(event) => setCodeAgentConfigDraft((prev) => ({ ...prev, model: event.target.value }))}
                                placeholder="sonnet"
                                className={styles.fieldInput}
                              />
                            )}
                          </div>

                          <div className={styles.formField}>
                            <Label htmlFor="code-agent-usage-protocol" className={styles.fieldLabelSmall}>
                              {t('developer.codeAgentUsageProtocol')}
                            </Label>
                            <Select
                              id="code-agent-usage-protocol"
                              value={codeAgentConfigDraft.usageProtocol || 'auto'}
                              onChange={(val) => setCodeAgentConfigDraft((prev) => ({ ...prev, usageProtocol: val as any }))}
                              style={{ borderRadius: 12 }}
                              options={[
                                { value: 'auto', label: t('developer.codeAgentUsageProtocolAuto') },
                                { value: 'anthropic-messages', label: t('developer.codeAgentUsageProtocolAnthropic') },
                                { value: 'openai-completions', label: t('developer.codeAgentUsageProtocolOpenAI') },
                              ]}
                            />
                            <div style={{ fontSize: 11, color: 'var(--ant-color-text-quaternary)', marginTop: 2 }}>
                              {t('developer.codeAgentUsageProtocolDesc')}
                            </div>
                          </div>

                          <div className={styles.formField}>
                            <Label htmlFor="code-agent-fallback-model" className={styles.fieldLabelSmall}>
                              {t('developer.codeAgentFallbackModel')}
                            </Label>
                            {availableModels.length > 0 ? (
                              <Select
                                id="code-agent-fallback-model"
                                value={codeAgentConfigDraft.fallbackModel}
                                onChange={(val) => setCodeAgentConfigDraft((prev) => ({ ...prev, fallbackModel: val }))}
                                style={{ borderRadius: 12 }}
                                options={[
                                  { value: '', label: t('developer.codeAgentModelAutoDetect') },
                                  ...availableModels.map((m) => ({ value: m.id, label: m.name || m.id })),
                                ]}
                              />
                            ) : (
                              <Input
                                id="code-agent-fallback-model"
                                value={codeAgentConfigDraft.fallbackModel}
                                onChange={(event) => setCodeAgentConfigDraft((prev) => ({ ...prev, fallbackModel: event.target.value }))}
                                placeholder="opus"
                                className={styles.fieldInput}
                              />
                            )}
                          </div>

                          <div className={styles.formField}>
                            <Label htmlFor="code-agent-base-url" className={styles.fieldLabelSmall}>
                              {t('developer.codeAgentBaseUrl')}
                            </Label>
                            <Input
                              id="code-agent-base-url"
                              value={codeAgentConfigDraft.baseUrl}
                              onChange={(event) => setCodeAgentConfigDraft((prev) => ({ ...prev, baseUrl: event.target.value }))}
                              placeholder="https://api.anthropic.com"
                              className={styles.fieldInput}
                            />
                          </div>
                        </div>

                        <div className={styles.formField}>
                          <Label htmlFor="code-agent-api-key" className={styles.fieldLabelSmall}>
                            {t('developer.codeAgentApiKey')}
                          </Label>
                          <div className={styles.inputWithEye}>
                            <Input
                              id="code-agent-api-key"
                              type={showCodeAgentApiKey ? 'text' : 'password'}
                              value={codeAgentConfigDraft.apiKey}
                              onChange={(event) => setCodeAgentConfigDraft((prev) => ({ ...prev, apiKey: event.target.value }))}
                              placeholder={t('developer.codeAgentApiKeyPlaceholder')}
                              className={styles.fieldInput}
                            />
                            <button
                              type="button"
                              onClick={() => setShowCodeAgentApiKey((prev) => !prev)}
                              className={styles.eyeBtn}
                            >
                              {showCodeAgentApiKey ? <EyeOff style={{ height: 16, width: 16 }} /> : <Eye style={{ height: 16, width: 16 }} />}
                            </button>
                          </div>
                          <p className={styles.hintText}>{t('developer.codeAgentApiKeyDesc')}</p>
                        </div>

                        <div className={styles.grid2}>
                          <div className={styles.formField}>
                            <Label htmlFor="code-agent-allowed-tools" className={styles.fieldLabelSmall}>
                              {t('developer.codeAgentAllowedTools')}
                            </Label>
                            <Textarea
                              id="code-agent-allowed-tools"
                              value={codeAgentAllowedToolsDraft}
                              onChange={(event) => setCodeAgentAllowedToolsDraft(event.target.value)}
                              placeholder={t('developer.codeAgentAllowedToolsPlaceholder')}
                              className={styles.fieldTextareaMono}
                            />
                          </div>

                          <div className={styles.formField}>
                            <Label htmlFor="code-agent-disallowed-tools" className={styles.fieldLabelSmall}>
                              {t('developer.codeAgentDisallowedTools')}
                            </Label>
                            <Textarea
                              id="code-agent-disallowed-tools"
                              value={codeAgentDisallowedToolsDraft}
                              onChange={(event) => setCodeAgentDisallowedToolsDraft(event.target.value)}
                              placeholder={t('developer.codeAgentDisallowedToolsPlaceholder')}
                              className={styles.fieldTextareaMono}
                            />
                          </div>

                          <div className={styles.formField}>
                            <Label htmlFor="code-agent-system-prompt" className={styles.fieldLabelSmall}>
                              {t('developer.codeAgentAppendSystemPrompt')}
                            </Label>
                            <Textarea
                              id="code-agent-system-prompt"
                              value={codeAgentConfigDraft.appendSystemPrompt}
                              onChange={(event) => setCodeAgentConfigDraft((prev) => ({ ...prev, appendSystemPrompt: event.target.value }))}
                              placeholder={t('developer.codeAgentAppendSystemPromptPlaceholder')}
                              className={styles.fieldTextarea}
                            />
                          </div>
                        </div>
                      </div>

                      <div className={styles.grid12}>
                        <div className={styles.formField}>
                          <Label htmlFor="code-agent-workspace" className={styles.fieldLabelSmall}>
                            {t('developer.codeAgentWorkspace')}
                          </Label>
                          <Input
                            id="code-agent-workspace"
                            value={codeAgentWorkspaceRoot}
                            onChange={(event) => setCodeAgentWorkspaceRoot(event.target.value)}
                            placeholder={t('developer.codeAgentWorkspacePlaceholder')}
                            className={styles.fieldInputMono}
                          />
                        </div>
                        <div className={styles.formField}>
                          <Label htmlFor="code-agent-prompt" className={styles.fieldLabelSmall}>
                            {t('developer.codeAgentPrompt')}
                          </Label>
                          <Textarea
                            id="code-agent-prompt"
                            value={codeAgentPrompt}
                            onChange={(event) => setCodeAgentPrompt(event.target.value)}
                            placeholder={t('developer.codeAgentPromptPlaceholder')}
                            className={styles.fieldTextarea}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                        <p className={styles.hintText12}>
                          {t('developer.codeAgentLatest')}
                        </p>
                        <Button
                          type="primary"
                          onClick={() => void handleCodeAgentRun()}
                          disabled={codeAgentBusyAction !== null}
                          style={{ borderRadius: 12, height: 40, padding: '0 20px', background: 'transparent', border: '1px solid var(--ant-color-border-secondary)' }}
                        >
                          <RefreshCw style={{ height: 16, width: 16, marginRight: 8, animation: codeAgentBusyAction === 'run' ? 'spin 1s linear infinite' : undefined }} />
                          {codeAgentBusyAction === 'run' ? t('common:status.running') : t('developer.codeAgentRun')}
                        </Button>
                      </div>

                      <div className={styles.codeAgentInnerCard}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                          <div className={styles.badgeRow}>
                            <Badge variant="secondary" className={styles.statusTag}>
                              {t('developer.codeAgentLastRun')}
                            </Badge>
                            {codeAgentLastRun?.result?.status && (
                              <Badge variant="outline" className={styles.statusTag}>
                                {codeAgentLastRun.result.status}
                              </Badge>
                            )}
                            {codeAgentLastRun?.error && (
                              <Badge variant="destructive" className={styles.statusTag}>
                                {t('common:status.error')}
                              </Badge>
                            )}
                          </div>
                          <Button
                            type="text"
                            size="small"
                            onClick={() => setShowCodeAgentRunDetails((prev) => !prev)}
                            className={styles.smallTextActionButton}
                            disabled={!codeAgentLastRun}
                          >
                            {showCodeAgentRunDetails ? t('common:actions.hide') : t('common:actions.show')}
                          </Button>
                        </div>

                        {!codeAgentLastRun ? (
                          <p className={styles.hintText12}>{t('developer.codeAgentNoRun')}</p>
                        ) : (
                          <div className={styles.metaText}>
                            <p>{t('developer.codeAgentRunId')}: {codeAgentLastRun.result?.runId || '-'}</p>
                            <p>{t('developer.codeAgentWorkspace')}: {codeAgentLastRun.request.workspaceRoot || '-'}</p>
                            <p>{t('developer.codeAgentStartedAt')}: {new Date(codeAgentLastRun.startedAt).toLocaleString()}</p>
                            <p>{t('developer.codeAgentCompletedAt')}: {codeAgentLastRun.completedAt ? new Date(codeAgentLastRun.completedAt).toLocaleString() : '-'}</p>
                            {codeAgentLastRun.error && <p>{t('developer.codeAgentError')}: {codeAgentLastRun.error}</p>}
                            {codeAgentLastRun.request.prompt && (
                              <p>{t('developer.codeAgentPrompt')}: {codeAgentLastRun.request.prompt}</p>
                            )}
                          </div>
                        )}

                        {codeAgentLastRun?.result?.summary && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <p className={styles.outputLabel}>{t('developer.codeAgentSummary')}</p>
                            <p className={styles.hintText12} style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                              {codeAgentLastRun.result.summary}
                            </p>
                          </div>
                        )}

                        {showCodeAgentRunDetails && codeAgentLastRun?.result && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {codeAgentLastRun.result.diagnostics && codeAgentLastRun.result.diagnostics.length > 0 && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <p className={styles.outputLabel}>{t('developer.codeAgentDiagnostics')}</p>
                                <pre className={styles.outputPreSmall}>
                                  {codeAgentLastRun.result.diagnostics.join('\n')}
                                </pre>
                              </div>
                            )}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                              <p className={styles.outputLabel}>{t('developer.codeAgentOutput')}</p>
                              <pre className={styles.outputPreDark}>
                                {codeAgentLastRun.result.output || t('developer.doctorOutputEmpty')}
                              </pre>
                            </div>
                            {codeAgentLastRun.result.metadata && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <p className={styles.outputLabel}>{t('developer.codeAgentMetadata')}</p>
                                <pre className={styles.outputPreDark}>
                                  {JSON.stringify(codeAgentLastRun.result.metadata, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className={styles.section}>
                    <div className={styles.borderedPanel}>
                      <div>
                        <Label className={styles.settingLabel}>{t('developer.wsDiagnostic')}</Label>
                        <p className={styles.settingDesc}>
                          {t('developer.wsDiagnosticDesc')}
                        </p>
                      </div>
                      <Switch
                        checked={wsDiagnosticEnabled}
                        onChange={handleWsDiagnosticToggle}
                      />
                    </div>

                    <div className={styles.settingRow}>
                      <div>
                        <Label className={styles.settingLabel}>{t('developer.telemetryViewer')}</Label>
                        <p className={styles.settingDesc}>
                          {t('developer.telemetryViewerDesc')}
                        </p>
                      </div>
                      <Button
                        size="small"
                        onClick={() => setShowTelemetryViewer((prev) => !prev)}
                        className={styles.smallActionButton}
                        style={{ height: 36, padding: '0 20px', background: 'transparent', border: '1px solid var(--ant-color-border-secondary)' }}
                      >
                        {showTelemetryViewer
                          ? t('common:actions.hide')
                          : t('common:actions.show')}
                      </Button>
                    </div>

                    {showTelemetryViewer && (
                      <div className={styles.telemetryPanel}>
                        <div className={styles.flexWrapRow}>
                          <Badge variant="secondary" className={styles.statusTag}>{t('developer.telemetryTotal')}: {telemetryStats.total}</Badge>
                          <Badge variant={telemetryStats.errorCount > 0 ? 'destructive' : 'secondary'} className={styles.statusTag}>
                            {t('developer.telemetryErrors')}: {telemetryStats.errorCount}
                          </Badge>
                          <Badge variant={telemetryStats.slowCount > 0 ? 'secondary' : 'outline'} className={styles.statusTag}>
                            {t('developer.telemetrySlow')}: {telemetryStats.slowCount}
                          </Badge>
                          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                            <Button size="small" className={styles.smallActionButton} onClick={handleCopyTelemetry} style={{ background: 'transparent', border: '1px solid var(--ant-color-border-secondary)' }}>
                              <Copy style={{ height: 14, width: 14, marginRight: 6 }} />
                              {t('common:actions.copy')}
                            </Button>
                            <Button size="small" className={styles.smallActionButton} onClick={handleClearTelemetry} style={{ background: 'transparent', border: '1px solid var(--ant-color-border-secondary)' }}>
                              {t('common:actions.clear')}
                            </Button>
                          </div>
                        </div>

                        <div className={styles.telemetryTableWrap}>
                          {telemetryByEvent.length > 0 && (
                            <div className={styles.telemetryAggHeader}>
                              <p className={styles.telemetryAggTitle}>
                                {t('developer.telemetryAggregated')}
                              </p>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
                                {telemetryByEvent.map((item) => (
                                  <div
                                    key={item.event}
                                    className={styles.telemetryRow}
                                  >
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }} title={item.event}>{item.event}</span>
                                    <span className={styles.telemetryTs}>n={item.count}</span>
                                    <span className={styles.telemetryTs}>
                                      avg={item.timedCount > 0 ? Math.round(item.totalDuration / item.timedCount) : 0}ms
                                    </span>
                                    <span className={styles.telemetryTs}>slow={item.slowCount}</span>
                                    <span className={styles.telemetryTs}>err={item.errorCount}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          <div className={styles.telemetryEntries}>
                            {telemetryEntries.length === 0 ? (
                              <div className={styles.telemetryTs} style={{ textAlign: 'center', padding: '16px 0' }}>{t('developer.telemetryEmpty')}</div>
                            ) : (
                              telemetryEntries
                                .slice()
                                .reverse()
                                .map((entry) => (
                                  <div key={entry.id} className={styles.telemetryEntry}>
                                    <div className={styles.telemetryEntryHeader}>
                                      <span className={styles.telemetryEventName}>{entry.event}</span>
                                      <span className={styles.telemetryTs}>{entry.ts}</span>
                                    </div>
                                    <pre style={{ whiteSpace: 'pre-wrap', fontSize: 11, overflowX: 'auto' }} className={styles.telemetryTs}>
                                      {JSON.stringify({ count: entry.count, ...entry.payload }, null, 2)}
                                    </pre>
                                  </div>
                                ))
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
          )}

          {/* Updates */}
          {activeSection === 'updates' && (
            <div className={styles.sectionGap6}>
              <UpdateSettings />

              <div className={styles.settingRow}>
                <div>
                  <Label className={styles.settingLabel}>{t('updates.autoCheck')}</Label>
                  <p className={styles.settingDesc}>
                    {t('updates.autoCheckDesc')}
                  </p>
                </div>
                <Switch
                  checked={autoCheckUpdate}
                  onChange={setAutoCheckUpdate}
                />
              </div>

              <div className={styles.settingRow}>
                <div>
                  <Label className={styles.settingLabel}>{t('updates.autoDownload')}</Label>
                  <p className={styles.settingDesc}>
                    {t('updates.autoDownloadDesc')}
                  </p>
                </div>
                <Switch
                  checked={autoDownloadUpdate}
                  onChange={(value) => {
                    setAutoDownloadUpdate(value);
                    updateSetAutoDownload(value);
                  }}
                />
              </div>
            </div>
          )}

          {/* About */}
          {activeSection === 'about' && (
            <div className={styles.aboutText}>
              <p>
                <strong style={{ fontWeight: 600 }}>{t('about.appName')}</strong> - {t('about.tagline')}
              </p>
              <p>{t('about.basedOn')}</p>
              <p>{t('about.version', { version: currentVersion })}</p>
              <div className={styles.aboutLinks}>
                <Button
                  type="link"
                  style={{ height: 'auto', padding: 0, fontSize: 14, color: '#3b82f6', fontWeight: 500 }}
                  onClick={() => window.electron.openExternal('https://jizhi.gz4399.com')}
                >
                  {t('about.docs')}
                </Button>
                <Button
                  type="link"
                  style={{ height: 'auto', padding: 0, fontSize: 14, color: '#3b82f6', fontWeight: 500 }}
                  onClick={() => window.electron.openExternal('https://jizhi.gz4399.com')}
                >
                  {t('about.github')}
                </Button>
                <Button
                  type="link"
                  style={{ height: 'auto', padding: 0, fontSize: 14, color: '#3b82f6', fontWeight: 500 }}
                  onClick={() => window.electron.openExternal('https://icnnp7d0dymg.feishu.cn/wiki/UyfOwQ2cAiJIP6kqUW8cte5Bnlc')}
                >
                  {t('about.faq')}
                </Button>
              </div>
            </div>
          )}

        </div>
    </div>
  );
}

export default Settings;
