/**
 * Settings Page
 * Application configuration
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Sun,
  Moon,
  Monitor,
  RefreshCw,
  ExternalLink,
  Copy,
  FileText,
  Eye,
  EyeOff,
  Globe,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useSettingsStore } from '@/stores/settings';
import { useGatewayStore } from '@/stores/gateway';
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
import { SUPPORTED_LANGUAGES } from '@/i18n';
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
  fetchCodeAgentStatus,
  fetchLatestCodeAgentRun,
  restartCodeAgent,
  runCodeAgentTask,
  startCodeAgent,
  stopCodeAgent,
} from '@/lib/code-agent';
import { subscribeHostEvent } from '@/lib/host-events';
import { cn } from '@/lib/utils';
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
  const {
    theme,
    setTheme,
    language,
    setLanguage,
    launchAtStartup,
    setLaunchAtStartup,
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
  const [savingCodeAgentConfig, setSavingCodeAgentConfig] = useState(false);
  const [showCodeAgentApiKey, setShowCodeAgentApiKey] = useState(false);

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
        cliPath: codeAgentConfigDraft.cliPath.trim() || 'claude',
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
      };

      await hostApiFetch<{ success: boolean }>('/api/settings', {
        method: 'PUT',
        body: JSON.stringify({ codeAgent: nextConfig }),
      });
      useSettingsStore.setState({ codeAgent: nextConfig });
      setCodeAgentConfigDraft(nextConfig);
      setCodeAgentAllowedToolsDraft(nextConfig.allowedTools.join('\n'));
      toast.success(t('developer.codeAgentConfigSaved'));
      await refreshCodeAgentData();
    } catch (error) {
      toast.error(`${t('developer.codeAgentConfigSaveFailed')}: ${toUserMessage(error)}`);
    } finally {
      setSavingCodeAgentConfig(false);
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
    <div className="flex flex-col -m-6 dark:bg-background h-[calc(100vh-2.5rem)] overflow-hidden">
      <div className="w-full max-w-4xl mx-auto flex flex-col h-full p-8 pt-12">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start justify-between mb-12 shrink-0 gap-4">
          <div>
            <h1 className="text-sm md:text-sm font-semibold text-foreground mb-2 tracking-tight">
              {t('title')}
            </h1>
            <p className="text-[14px] text-muted-foreground font-medium">
              {t('subtitle')}
            </p>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto pr-2 pb-10 min-h-0 -mr-2 space-y-12">

          {/* Appearance */}
          <div>
            <h2 className="text-sm font-semibold text-foreground mb-6 tracking-tight">
              {t('appearance.title')}
            </h2>
            <div className="space-y-8">
              <div className="flex items-center gap-8">
                <Label className="text-[14px] font-medium text-foreground/80 min-w-[60px]">{t('appearance.theme')}</Label>
                <div className="inline-flex gap-1 bg-muted/50 p-1 rounded-2xl border border-white/5 shadow-inner">
                  <button
                    type="button"
                    onClick={() => setTheme('light')}
                    className={cn(
                      "flex items-center justify-center gap-2 px-5 py-2 text-sm font-medium rounded-xl transition-all duration-300",
                      theme === 'light'
                        ? "bg-background text-foreground shadow-sm ring-1 ring-black/5 dark:ring-white/5"
                        : "text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5"
                    )}
                  >
                    <Sun className="h-4 w-4" />
                    {t('appearance.light')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme('dark')}
                    className={cn(
                      "flex items-center justify-center gap-2 px-5 py-2 text-sm font-medium rounded-xl transition-all duration-300",
                      theme === 'dark'
                        ? "bg-background text-foreground shadow-sm ring-1 ring-black/5 dark:ring-white/5"
                        : "text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5"
                    )}
                  >
                    <Moon className="h-4 w-4" />
                    {t('appearance.dark')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme('system')}
                    className={cn(
                      "flex items-center justify-center gap-2 px-5 py-2 text-sm font-medium rounded-xl transition-all duration-300",
                      theme === 'system'
                        ? "bg-background text-foreground shadow-sm ring-1 ring-black/5 dark:ring-white/5"
                        : "text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5"
                    )}
                  >
                    <Monitor className="h-4 w-4" />
                    {t('appearance.system')}
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-8">
                <Label className="text-[14px] font-medium text-foreground/80 min-w-[60px]">{t('appearance.language')}</Label>
                <div className="inline-flex gap-1 bg-muted/50 p-1 rounded-2xl border border-white/5 shadow-inner">
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <button
                      type="button"
                      key={lang.code}
                      onClick={() => setLanguage(lang.code)}
                      className={cn(
                        "flex items-center justify-center px-6 py-2 text-sm font-medium rounded-xl transition-all duration-300",
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
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-[14px] font-medium text-foreground/80">{t('appearance.launchAtStartup')}</Label>
                  <p className="text-[13px] text-muted-foreground mt-1">
                    {t('appearance.launchAtStartupDesc')}
                  </p>
                </div>
                <Switch
                  checked={launchAtStartup}
                  onCheckedChange={setLaunchAtStartup}
                />
              </div>

              <div className="rounded-3xl bg-muted/40 p-6 border-none">
                <div className="flex flex-col gap-6">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <Label className="text-[14px] font-semibold text-foreground">{t('pet.title')}</Label>
                      <p className="text-[13px] text-muted-foreground mt-1">
                        {t('pet.description')}
                      </p>
                    </div>
                    <Switch
                      checked={petEnabled}
                      onCheckedChange={setPetEnabled}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pet-animation" className="text-[13px] font-medium text-foreground/80">
                      {t('pet.animation')}
                    </Label>
                    <Select
                      id="pet-animation"
                      value={petAnimation}
                      onChange={(event) => setPetAnimation(event.target.value as PetAnimation)}
                      disabled={!petEnabled}
                      className="h-10 rounded-xl bg-background border-none shadow-sm text-[13px]"
                    >
                      {PET_IDLE_ANIMATIONS.map((animation) => (
                        <option key={animation} value={animation}>
                          {t(PET_ANIMATION_LABEL_KEYS[animation])}
                        </option>
                      ))}
                    </Select>
                    <p className="text-[12px] text-muted-foreground">
                      {t('pet.tip')}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-4 mt-2 pt-4 border-t border-border/40">
                    <div>
                      <Label className="text-[13px] font-medium text-foreground/80">接入小九</Label>
                      <p className="text-[12px] text-muted-foreground mt-1">
                        启用后可快速调用小九相关功能。
                      </p>
                    </div>
                    <Switch
                      checked={xiaojiuEnabled}
                      onCheckedChange={setXiaojiuEnabled}
                      disabled={!petEnabled}
                    />
                  </div>

                  <div className="flex items-center justify-between gap-4 mt-0 pt-4 border-t border-border/40">
                    <div>
                      <Label className="text-[13px] font-medium text-foreground/80">接入极智</Label>
                      <p className="text-[12px] text-muted-foreground mt-1">
                        启用后可快速调用极智相关功能。
                      </p>
                    </div>
                    <Switch
                      checked={jizhiEnabled}
                      onCheckedChange={setJizhiEnabled}
                      disabled={!petEnabled}
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-3xl bg-muted/40 p-6 border-none">
                <div className="flex flex-col gap-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <Label className="text-[14px] font-semibold text-foreground">{t('speech.title')}</Label>
                      <p className="text-[13px] text-muted-foreground mt-1">
                        {t('speech.description')}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        'rounded-full border-none px-3 py-1 text-[12px]',
                        speechConfig?.configured
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
                      )}
                    >
                      {speechLoading
                        ? t('speech.loading')
                        : speechConfig?.configured
                          ? t('speech.configured')
                          : t('speech.missing')}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="speech-appid" className="text-[13px] font-medium text-foreground/80">{t('speech.appId')}</Label>
                      <Input
                        id="speech-appid"
                        value={speechAppIdDraft}
                        onChange={(event) => setSpeechAppIdDraft(event.target.value)}
                        placeholder={t('speech.appIdPlaceholder')}
                        className="h-10 rounded-xl bg-background border-none shadow-sm font-mono text-[13px]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="speech-cluster" className="text-[13px] font-medium text-foreground/80">{t('speech.cluster')}</Label>
                      <Input
                        id="speech-cluster"
                        value={speechClusterDraft}
                        onChange={(event) => setSpeechClusterDraft(event.target.value)}
                        placeholder={t('speech.clusterPlaceholder')}
                        className="h-10 rounded-xl bg-background border-none shadow-sm font-mono text-[13px]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="speech-language" className="text-[13px] font-medium text-foreground/80">{t('speech.language')}</Label>
                      <Select
                        id="speech-language"
                        value={speechLanguageDraft}
                        onChange={(event) => setSpeechLanguageDraft(event.target.value as VolcengineSpeechLanguage)}
                        className="h-10 rounded-xl bg-background border-none shadow-sm text-[13px]"
                      >
                        <option value="zh-CN">{t('speech.languages.zhCN')}</option>
                        <option value="en-US">{t('speech.languages.enUS')}</option>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="speech-endpoint" className="text-[13px] font-medium text-foreground/80">{t('speech.endpoint')}</Label>
                      <Input
                        id="speech-endpoint"
                        value={speechEndpointDraft}
                        onChange={(event) => setSpeechEndpointDraft(event.target.value)}
                        placeholder="wss://openspeech.bytedance.com/api/v2/asr"
                        className="h-10 rounded-xl bg-background border-none shadow-sm font-mono text-[13px]"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="speech-token" className="text-[13px] font-medium text-foreground/80">{t('speech.token')}</Label>
                    <div className="relative">
                      <Input
                        id="speech-token"
                        type={showSpeechToken ? 'text' : 'password'}
                        value={speechTokenDraft}
                        onChange={(event) => setSpeechTokenDraft(event.target.value)}
                        placeholder={speechConfig?.hasToken ? (speechConfig.tokenMasked ?? t('speech.tokenConfigured')) : t('speech.tokenPlaceholder')}
                        className="h-10 rounded-xl bg-background border-none shadow-sm pr-10 font-mono text-[13px]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSpeechToken((value) => !value)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showSpeechToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className="text-[12px] text-muted-foreground">
                      {speechConfig?.hasToken
                        ? t('speech.tokenSaved', { token: speechConfig.tokenMasked ?? '***' })
                        : t('speech.tokenHelp')}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 mt-2">
                    <Button
                      type="button"
                      onClick={() => void handleSaveSpeechConfig()}
                      disabled={speechSaving}
                      className="rounded-full px-6 shadow-sm"
                    >
                      {speechSaving ? t('speech.saving') : t('speech.save')}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => { void loadSpeechConfig(); }}
                      disabled={speechLoading || speechSaving}
                      className="rounded-full px-6 border-none shadow-sm bg-background hover:bg-background/80"
                    >
                      {t('common:actions.refresh')}
                    </Button>
                    <p className="text-[12px] text-muted-foreground ml-2">
                      {t('speech.tip')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl bg-muted/40 p-6 border-none">
                <div className="flex flex-col gap-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <Label className="text-[14px] font-medium text-foreground/80">{t('voiceChat.title')}</Label>
                      <p className="text-[13px] text-muted-foreground mt-1">
                        {t('voiceChat.description')}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        'rounded-full border px-3 py-1 text-[12px]',
                        voiceChatConfig?.configured
                          ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                          : 'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300',
                      )}
                    >
                      {voiceChatLoading
                        ? t('voiceChat.loading')
                        : voiceChatConfig?.configured
                          ? t('voiceChat.configured')
                          : t('voiceChat.missing')}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="voice-chat-app-id" className="text-[13px] text-foreground/80">{t('voiceChat.appId')}</Label>
                      <Input
                        id="voice-chat-app-id"
                        value={voiceChatAppIdDraft}
                        onChange={(event) => setVoiceChatAppIdDraft(event.target.value)}
                        placeholder={t('voiceChat.appIdPlaceholder')}
                        className="h-10 rounded-xl bg-black/5 dark:bg-white/5 border-transparent font-mono text-[13px]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="voice-chat-access-key" className="text-[13px] text-foreground/80">{t('voiceChat.accessKey')}</Label>
                      <div className="relative">
                        <Input
                          id="voice-chat-access-key"
                          type={showVoiceChatAccessKey ? 'text' : 'password'}
                          value={voiceChatAccessKeyDraft}
                          onChange={(event) => setVoiceChatAccessKeyDraft(event.target.value)}
                          placeholder={voiceChatConfig?.hasAccessKey ? (voiceChatConfig.accessKeyMasked ?? t('voiceChat.accessKeyConfigured')) : t('voiceChat.accessKeyPlaceholder')}
                          className="h-10 rounded-xl bg-black/5 dark:bg-white/5 border-transparent pr-10 font-mono text-[13px]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowVoiceChatAccessKey((value) => !value)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showVoiceChatAccessKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="voice-chat-endpoint" className="text-[13px] text-foreground/80">{t('voiceChat.endpoint')}</Label>
                    <Input
                      id="voice-chat-endpoint"
                      value={voiceChatEndpointDraft}
                      onChange={(event) => setVoiceChatEndpointDraft(event.target.value)}
                      placeholder={t('voiceChat.endpointPlaceholder')}
                      className="h-10 rounded-xl bg-black/5 dark:bg-white/5 border-transparent font-mono text-[13px]"
                    />
                    <p className="text-[12px] text-muted-foreground">
                      {t('voiceChat.endpointHelp', { endpoint: DEFAULT_VOICE_CHAT_ENDPOINT })}
                    </p>
                  </div>

                  <p className="text-[12px] text-muted-foreground">
                    {voiceChatConfig?.hasAccessKey
                      ? voiceChatConfig.accessKeySource === 'speech-asr'
                        ? t('voiceChat.accessKeyReused', { token: voiceChatConfig.accessKeyMasked ?? '***' })
                        : t('voiceChat.accessKeySaved', { token: voiceChatConfig.accessKeyMasked ?? '***' })
                      : t('voiceChat.accessKeyHelp')}
                  </p>

                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      type="button"
                      onClick={() => void handleSaveVoiceChatRealtimeConfig()}
                      disabled={voiceChatSaving}
                      className="rounded-full px-5"
                    >
                      {voiceChatSaving ? t('voiceChat.saving') : t('voiceChat.save')}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => { void loadVoiceChatRealtimeConfig(); }}
                      disabled={voiceChatLoading || voiceChatSaving}
                      className="rounded-full px-5"
                    >
                      {t('common:actions.refresh')}
                    </Button>
                    <p className="text-[12px] text-muted-foreground">
                      {t('voiceChat.tip')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Separator className="bg-black/5 dark:bg-white/5" />

          {/* Gateway */}
          <div>
            <h2 className="text-sm font-semibold text-foreground mb-6 tracking-tight">
              {t('gateway.title')}
            </h2>
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <Label className="text-[14px] font-medium text-foreground">{t('gateway.status')}</Label>
                  <p className="text-[13px] text-muted-foreground mt-1">
                    {t('gateway.port')}: {gatewayStatus.port}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium border",
                    gatewayStatus.state === 'running' ? "bg-green-500/10 text-green-600 dark:text-green-500 border-green-500/20" :
                      gatewayStatus.state === 'error' ? "bg-red-500/10 text-red-600 dark:text-red-500 border-red-500/20" :
                        "bg-black/5 dark:bg-white/5 text-muted-foreground border-transparent"
                  )}>
                    <div className={cn("w-1.5 h-1.5 rounded-full",
                      gatewayStatus.state === 'running' ? "bg-green-500" :
                        gatewayStatus.state === 'error' ? "bg-red-500" : "bg-muted-foreground"
                    )} />
                    {gatewayStatus.state}
                  </div>
                  <Button variant="outline" size="sm" onClick={restartGateway} className="rounded-full h-8 px-4 border-black/10 dark:border-white/10 bg-transparent hover:bg-black/5 dark:hover:bg-white/5">
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                    {t('common:actions.restart')}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleShowLogs} className="rounded-full h-8 px-4 border-black/10 dark:border-white/10 bg-transparent hover:bg-black/5 dark:hover:bg-white/5">
                    <FileText className="h-3.5 w-3.5 mr-1.5" />
                    {t('gateway.logs')}
                  </Button>
                </div>
              </div>

              {showLogs && (
                <div className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-medium text-[14px]">{t('gateway.appLogs')}</p>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" className="h-7 text-[12px] rounded-full hover:bg-black/5 dark:hover:bg-white/10" onClick={handleOpenLogDir}>
                        <ExternalLink className="h-3 w-3 mr-1.5" />
                        {t('gateway.openFolder')}
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 text-[12px] rounded-full hover:bg-black/5 dark:hover:bg-white/10" onClick={() => setShowLogs(false)}>
                        {t('common:actions.close')}
                      </Button>
                    </div>
                  </div>
                  <pre className="text-[12px] text-muted-foreground bg-white dark:bg-card p-4 rounded-xl max-h-60 overflow-auto whitespace-pre-wrap font-mono border border-black/5 dark:border-white/5 shadow-inner">
                    {logContent || t('chat:noLogs')}
                  </pre>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-[14px] font-medium text-foreground">{t('gateway.autoStart')}</Label>
                  <p className="text-[13px] text-muted-foreground mt-1">
                    {t('gateway.autoStartDesc')}
                  </p>
                </div>
                <Switch
                  checked={gatewayAutoStart}
                  onCheckedChange={setGatewayAutoStart}
                />
              </div>

              {/* Remote Gateway */}
              <div className="space-y-3 rounded-3xl bg-muted/40 p-6 border-none">
                <div className="flex items-center gap-2 mb-1">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-[14px] font-medium text-foreground">{t('gateway.remoteTitle')}</Label>
                </div>
                <p className="text-[12px] text-muted-foreground">{t('gateway.remoteDesc')}</p>

                <div className="space-y-1.5">
                  <Label className="text-[13px] text-foreground/80">{t('gateway.remoteUrl')}</Label>
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
                    className="text-[13px] font-mono"
                  />
                  <p className="text-[11px] text-muted-foreground">{t('gateway.remoteUrlHelp')}</p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[13px] text-foreground/80">{t('gateway.remoteToken')}</Label>
                  <div className="relative">
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
                      className="text-[13px] font-mono pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRemoteGatewayToken((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showRemoteGatewayToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {remoteGatewayUrl && (
                  <p className="text-[12px] text-amber-600 dark:text-amber-400">
                    {t('gateway.remoteActive')}
                  </p>
                )}
              </div>

              {/* Cloud Workspace */}
              {cloudGateway?.cloudMode && (
                <div className="space-y-3 rounded-3xl bg-muted/40 p-6 border-none">
                  <div className="flex items-center gap-2 mb-1">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-[14px] font-medium text-foreground">{t('gateway.cloudTitle')}</Label>
                  </div>
                  <p className="text-[12px] text-muted-foreground">{t('gateway.cloudDesc')}</p>

                  <div className="flex items-center gap-3">
                    <span className="text-[13px] text-muted-foreground">{t('gateway.cloudGatewayState')}：</span>
                    <span className={cn(
                      'text-[13px] font-medium',
                      cloudGateway.gatewayState === 'running' && 'text-green-600 dark:text-green-400',
                      cloudGateway.gatewayState === 'starting' && 'text-yellow-600 dark:text-yellow-400',
                      cloudGateway.gatewayState === 'error' && 'text-red-600 dark:text-red-400',
                      cloudGateway.gatewayState === 'stopped' && 'text-muted-foreground',
                    )}>
                      {t(`gateway.cloudGatewayState${(cloudGateway.gatewayState ?? 'Stopped').charAt(0).toUpperCase()}${(cloudGateway.gatewayState ?? 'stopped').slice(1)}`)}
                    </span>
                  </div>

                  {cloudGateway.gatewayWsUrl && (
                    <p className="text-[11px] font-mono text-muted-foreground break-all">{cloudGateway.gatewayWsUrl}</p>
                  )}

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={cloudGatewayLoading || cloudGateway.gatewayState === 'running'}
                      onClick={() => void handleCloudGatewayAction('start')}
                      className="text-[12px] h-7 rounded-full"
                    >
                      {t('gateway.cloudGatewayStart')}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={cloudGatewayLoading || cloudGateway.gatewayState !== 'running'}
                      onClick={() => void handleCloudGatewayAction('stop')}
                      className="text-[12px] h-7 rounded-full"
                    >
                      {t('gateway.cloudGatewayStop')}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={cloudGatewayLoading}
                      onClick={() => void handleCloudGatewayAction('restart')}
                      className="text-[12px] h-7 rounded-full"
                    >
                      {t('gateway.cloudGatewayRestart')}
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-[14px] font-medium text-foreground">{t('advanced.devMode')}</Label>
                  <p className="text-[13px] text-muted-foreground mt-1">
                    {t('advanced.devModeDesc')}
                  </p>
                </div>
                <Switch
                  checked={devModeUnlocked}
                  onCheckedChange={setDevModeUnlocked}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-[14px] font-medium text-foreground">{t('advanced.telemetry')}</Label>
                  <p className="text-[13px] text-muted-foreground mt-1">
                    {t('advanced.telemetryDesc')}
                  </p>
                </div>
                <Switch
                  checked={telemetryEnabled}
                  onCheckedChange={setTelemetryEnabled}
                />
              </div>

            </div>
          </div>


          {/* Developer */}
          {devModeUnlocked && (
            <>
              <Separator className="bg-black/5 dark:bg-white/5" />
              <div>
                <h2 className="text-sm font-semibold text-foreground mb-6 tracking-tight">
                  {t('developer.title')}
                </h2>
                <div className="space-y-8">
                  {/* Gateway Proxy */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-[14px] font-medium text-foreground/80">Gateway Proxy</Label>
                        <p className="text-[13px] text-muted-foreground">
                          {t('gateway.proxyDesc')}
                        </p>
                      </div>
                      <Switch
                        checked={proxyEnabledDraft}
                        onCheckedChange={setProxyEnabledDraft}
                      />
                    </div>

                    {proxyEnabledDraft && (
                      <div className="space-y-4 pt-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="proxy-server" className="text-[13px] text-foreground/80">{t('gateway.proxyServer')}</Label>
                            <Input
                              id="proxy-server"
                              value={proxyServerDraft}
                              onChange={(event) => setProxyServerDraft(event.target.value)}
                              placeholder="http://127.0.0.1:7890"
                              className="h-10 rounded-xl bg-black/5 dark:bg-white/5 border-transparent font-mono text-[13px]"
                            />
                            <p className="text-[11px] text-muted-foreground">
                              {t('gateway.proxyServerHelp')}
                            </p>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="proxy-http-server" className="text-[13px] text-foreground/80">{t('gateway.proxyHttpServer')}</Label>
                            <Input
                              id="proxy-http-server"
                              value={proxyHttpServerDraft}
                              onChange={(event) => setProxyHttpServerDraft(event.target.value)}
                              placeholder={proxyServerDraft || 'http://127.0.0.1:7890'}
                              className="h-10 rounded-xl bg-black/5 dark:bg-white/5 border-transparent font-mono text-[13px]"
                            />
                            <p className="text-[11px] text-muted-foreground">
                              {t('gateway.proxyHttpServerHelp')}
                            </p>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="proxy-https-server" className="text-[13px] text-foreground/80">{t('gateway.proxyHttpsServer')}</Label>
                            <Input
                              id="proxy-https-server"
                              value={proxyHttpsServerDraft}
                              onChange={(event) => setProxyHttpsServerDraft(event.target.value)}
                              placeholder={proxyServerDraft || 'http://127.0.0.1:7890'}
                              className="h-10 rounded-xl bg-black/5 dark:bg-white/5 border-transparent font-mono text-[13px]"
                            />
                            <p className="text-[11px] text-muted-foreground">
                              {t('gateway.proxyHttpsServerHelp')}
                            </p>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="proxy-all-server" className="text-[13px] text-foreground/80">{t('gateway.proxyAllServer')}</Label>
                            <Input
                              id="proxy-all-server"
                              value={proxyAllServerDraft}
                              onChange={(event) => setProxyAllServerDraft(event.target.value)}
                              placeholder={proxyServerDraft || 'socks5://127.0.0.1:7891'}
                              className="h-10 rounded-xl bg-black/5 dark:bg-white/5 border-transparent font-mono text-[13px]"
                            />
                            <p className="text-[11px] text-muted-foreground">
                              {t('gateway.proxyAllServerHelp')}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="proxy-bypass" className="text-[13px] text-foreground/80">{t('gateway.proxyBypass')}</Label>
                          <Input
                            id="proxy-bypass"
                            value={proxyBypassRulesDraft}
                            onChange={(event) => setProxyBypassRulesDraft(event.target.value)}
                            placeholder="<local>;localhost;127.0.0.1;::1"
                            className="h-10 rounded-xl bg-black/5 dark:bg-white/5 border-transparent font-mono text-[13px]"
                          />
                          <p className="text-[11px] text-muted-foreground">
                            {t('gateway.proxyBypassHelp')}
                          </p>
                        </div>

                        <div className="flex items-center gap-4 pt-2">
                          <Button
                            variant="outline"
                            onClick={handleSaveProxySettings}
                            disabled={savingProxy}
                            className="rounded-xl h-10 px-5 bg-transparent border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5"
                          >
                            <RefreshCw className={`h-4 w-4 mr-2${savingProxy ? ' animate-spin' : ''}`} />
                            {savingProxy ? t('common:status.saving') : t('common:actions.save')}
                          </Button>
                          <p className="text-[12px] text-muted-foreground">
                            {t('gateway.proxyRestartNote')}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="space-y-4 pt-4">
                    <Label className="text-[14px] font-medium text-foreground/80">{t('developer.gatewayToken')}</Label>
                    <p className="text-[13px] text-muted-foreground">
                      {t('developer.gatewayTokenDesc')}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Input
                        readOnly
                        value={controlUiInfo?.token || ''}
                        placeholder={t('developer.tokenUnavailable')}
                        className="font-mono text-[13px] h-10 rounded-xl bg-black/5 dark:bg-white/5 border-transparent flex-1 min-w-[200px]"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={refreshControlUiInfo}
                        disabled={!devModeUnlocked}
                        className="rounded-xl h-10 px-4 bg-transparent border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        {t('common:actions.load')}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCopyGatewayToken}
                        disabled={!controlUiInfo?.token}
                        className="rounded-xl h-10 px-4 bg-transparent border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5"
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        {t('common:actions.copy')}
                      </Button>
                    </div>
                  </div>

                  {showCliTools && (
                    <div className="space-y-3">
                      <Label className="text-[14px] font-medium text-foreground">{t('developer.cli')}</Label>
                      <p className="text-[13px] text-muted-foreground">
                        {t('developer.cliDesc')}
                      </p>
                      {isWindows && (
                        <p className="text-[12px] text-muted-foreground">
                          {t('developer.cliPowershell')}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <Input
                          readOnly
                          value={openclawCliCommand}
                          placeholder={openclawCliError || t('developer.cmdUnavailable')}
                          className="font-mono text-[13px] h-10 rounded-xl bg-black/5 dark:bg-white/5 border-transparent flex-1 min-w-[200px]"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleCopyCliCommand}
                          disabled={!openclawCliCommand}
                          className="rounded-xl h-10 px-4 bg-transparent border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5"
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          {t('common:actions.copy')}
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <Label className="text-[14px] font-medium text-foreground">{t('developer.doctor')}</Label>
                        <p className="text-[13px] text-muted-foreground mt-1">
                          {t('developer.doctorDesc')}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => void handleRunOpenClawDoctor('diagnose')}
                          disabled={doctorRunningMode !== null}
                          className="rounded-xl h-10 px-4 bg-transparent border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5"
                        >
                          <RefreshCw className={`h-4 w-4 mr-2${doctorRunningMode === 'diagnose' ? ' animate-spin' : ''}`} />
                          {doctorRunningMode === 'diagnose' ? t('common:status.running') : t('developer.runDoctor')}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => void handleRunOpenClawDoctor('fix')}
                          disabled={doctorRunningMode !== null}
                          className="rounded-xl h-10 px-4 bg-transparent border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5"
                        >
                          <RefreshCw className={`h-4 w-4 mr-2${doctorRunningMode === 'fix' ? ' animate-spin' : ''}`} />
                          {doctorRunningMode === 'fix' ? t('common:status.running') : t('developer.runDoctorFix')}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleCopyDoctorOutput}
                          disabled={!doctorResult}
                          className="rounded-xl h-10 px-4 bg-transparent border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5"
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          {t('common:actions.copy')}
                        </Button>
                      </div>
                    </div>

                    {doctorResult && (
                      <div className="space-y-3 rounded-2xl border border-black/10 dark:border-white/10 p-5 bg-black/5 dark:bg-white/5">
                        <div className="flex flex-wrap gap-2 text-[12px]">
                          <Badge variant={doctorResult.success ? 'secondary' : 'destructive'} className="rounded-full px-3 py-1">
                            {doctorResult.mode === 'fix'
                              ? (doctorResult.success ? t('developer.doctorFixOk') : t('developer.doctorFixIssue'))
                              : (doctorResult.success ? t('developer.doctorOk') : t('developer.doctorIssue'))}
                          </Badge>
                          <Badge variant="outline" className="rounded-full px-3 py-1">
                            {t('developer.doctorExitCode')}: {doctorResult.exitCode ?? 'null'}
                          </Badge>
                          <Badge variant="outline" className="rounded-full px-3 py-1">
                            {t('developer.doctorDuration')}: {Math.round(doctorResult.durationMs)}ms
                          </Badge>
                        </div>
                        <div className="space-y-1 text-[12px] text-muted-foreground font-mono break-all">
                          <p>{t('developer.doctorCommand')}: {doctorResult.command}</p>
                          <p>{t('developer.doctorWorkingDir')}: {doctorResult.cwd || '-'}</p>
                          {doctorResult.error && <p>{t('developer.doctorError')}: {doctorResult.error}</p>}
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="space-y-2">
                            <p className="text-[12px] font-semibold text-foreground/80">{t('developer.doctorStdout')}</p>
                            <pre className="max-h-72 overflow-auto rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-card p-3 text-[11px] font-mono whitespace-pre-wrap break-words">
                              {doctorResult.stdout.trim() || t('developer.doctorOutputEmpty')}
                            </pre>
                          </div>
                          <div className="space-y-2">
                            <p className="text-[12px] font-semibold text-foreground/80">{t('developer.doctorStderr')}</p>
                            <pre className="max-h-72 overflow-auto rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-card p-3 text-[11px] font-mono whitespace-pre-wrap break-words">
                              {doctorResult.stderr.trim() || t('developer.doctorOutputEmpty')}
                            </pre>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <Label className="text-[14px] font-medium text-foreground">{t('developer.codeAgent')}</Label>
                        <p className="text-[13px] text-muted-foreground mt-1">
                          {t('developer.codeAgentDesc')}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => void handleCodeAgentHealthCheck()}
                          disabled={codeAgentBusyAction !== null}
                          className="rounded-xl h-10 px-4 bg-transparent border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5"
                        >
                          <RefreshCw className={`h-4 w-4 mr-2${codeAgentBusyAction === 'health' ? ' animate-spin' : ''}`} />
                          {t('developer.codeAgentCheckHealth')}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => void handleCodeAgentLifecycleAction('start')}
                          disabled={codeAgentBusyAction !== null || codeAgentStatus?.state === 'running'}
                          className="rounded-xl h-10 px-4 bg-transparent border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5"
                        >
                          {t('developer.codeAgentStart')}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => void handleCodeAgentLifecycleAction('stop')}
                          disabled={codeAgentBusyAction !== null || codeAgentStatus?.state !== 'running'}
                          className="rounded-xl h-10 px-4 bg-transparent border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5"
                        >
                          {t('developer.codeAgentStop')}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => void handleCodeAgentLifecycleAction('restart')}
                          disabled={codeAgentBusyAction !== null}
                          className="rounded-xl h-10 px-4 bg-transparent border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5"
                        >
                          {t('common:actions.restart')}
                        </Button>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-black/10 dark:border-white/10 p-5 bg-black/5 dark:bg-white/5 space-y-4">
                      <div className="flex flex-wrap gap-2 text-[12px]">
                        <Badge variant="outline" className="rounded-full px-3 py-1 bg-white dark:bg-card border-black/5 dark:border-white/5">
                          {t('developer.codeAgentExecutionMode')}: {codeAgentHealth?.executionMode || codeAgentStatus?.executionMode || codeAgentConfigDraft.executionMode}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={cn(
                            'rounded-full px-3 py-1',
                            codeAgentStatus?.state === 'running' && 'border-green-500/30 text-green-700 dark:text-green-400 bg-green-500/10',
                            codeAgentStatus?.state === 'error' && 'border-red-500/30 text-red-700 dark:text-red-400 bg-red-500/10',
                            codeAgentStatus?.state !== 'running' && codeAgentStatus?.state !== 'error' && 'bg-white dark:bg-card border-black/5 dark:border-white/5',
                          )}
                        >
                          {t('developer.codeAgentStatus')}: {codeAgentStatus?.state || '-'}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={cn(
                            'rounded-full px-3 py-1',
                            codeAgentHealth?.ok && 'border-green-500/30 text-green-700 dark:text-green-400 bg-green-500/10',
                            codeAgentHealth && !codeAgentHealth.ok && 'border-amber-500/30 text-amber-700 dark:text-amber-300 bg-amber-500/10',
                            !codeAgentHealth && 'bg-white dark:bg-card border-black/5 dark:border-white/5',
                          )}
                        >
                          {t('developer.codeAgentHealth')}: {codeAgentHealth ? (codeAgentHealth.ok ? 'ok' : 'error') : '-'}
                        </Badge>
                        <Badge variant="outline" className="rounded-full px-3 py-1 bg-white dark:bg-card border-black/5 dark:border-white/5">
                          {t('developer.codeAgentRuntime')}: {codeAgentStatus?.runtime || codeAgentHealth?.runtime || '-'}
                        </Badge>
                        <Badge variant="outline" className="rounded-full px-3 py-1 bg-white dark:bg-card border-black/5 dark:border-white/5">
                          {t('developer.codeAgentVendor')}: {(codeAgentStatus?.vendorPresent ?? codeAgentHealth?.vendorPresent) ? t('developer.codeAgentYes') : t('developer.codeAgentNo')}
                        </Badge>
                        {typeof codeAgentHealth?.protocolVersion === 'number' && (
                          <Badge variant="outline" className="rounded-full px-3 py-1 bg-white dark:bg-card border-black/5 dark:border-white/5">
                            {t('developer.codeAgentProtocol')}: v{codeAgentHealth.protocolVersion}
                          </Badge>
                        )}
                        {codeAgentHealth?.cliVersion && (
                          <Badge variant="outline" className="rounded-full px-3 py-1 bg-white dark:bg-card border-black/5 dark:border-white/5">
                            {t('developer.codeAgentCliVersion')}: {codeAgentHealth.cliVersion}
                          </Badge>
                        )}
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-1 text-[12px] text-muted-foreground font-mono break-all">
                          <p>{t('developer.codeAgentAdapter')}: {codeAgentStatus?.adapter || codeAgentHealth?.adapter || '-'}</p>
                          <p>{t('developer.codeAgentSidecarPath')}: {codeAgentStatus?.sidecarPath || codeAgentHealth?.sidecarPath || '-'}</p>
                          <p>{t('developer.codeAgentVendorPath')}: {codeAgentStatus?.vendorPath || codeAgentHealth?.vendorPath || '-'}</p>
                          <p>{t('developer.codeAgentSnapshotEntry')}: {codeAgentHealth?.snapshotEntryPath || '-'}</p>
                          <p>{t('developer.codeAgentCliPath')}: {codeAgentHealth?.cliPath || codeAgentStatus?.cliPath || codeAgentConfigDraft.cliPath || '-'}</p>
                          <p>{t('developer.codeAgentConfigSource')}: {codeAgentHealth?.configSource === 'default_provider'
                            ? `${t('developer.codeAgentConfigSourceDefaultProvider')}${codeAgentHealth.configSourceLabel ? ` (${codeAgentHealth.configSourceLabel})` : ''}`
                            : codeAgentHealth?.configSource === 'claude_settings'
                              ? t('developer.codeAgentConfigSourceClaudeSettings')
                              : t('developer.codeAgentConfigSourceSettings')}</p>
                        </div>
                        <div className="space-y-1 text-[12px] text-muted-foreground font-mono break-all">
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
                        <div className="space-y-2">
                          <p className="text-[12px] font-semibold text-foreground/80">{t('developer.codeAgentDiagnostics')}</p>
                          <pre className="max-h-40 overflow-auto rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-card p-3 text-[11px] font-mono whitespace-pre-wrap break-words">
                            {codeAgentHealth.diagnostics.join('\n')}
                          </pre>
                        </div>
                      )}

                      <div className="space-y-4 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-card p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-[13px] font-semibold text-foreground">{t('developer.codeAgentConfig')}</p>
                            <p className="text-[12px] text-muted-foreground">{t('developer.codeAgentConfigDesc')}</p>
                            <p className="text-[11px] text-muted-foreground mt-1">{t('developer.codeAgentConfigAutoMapHint')}</p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => void handleSaveCodeAgentConfig()}
                            disabled={savingCodeAgentConfig}
                            className="rounded-xl h-9 px-4 bg-transparent border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5"
                          >
                            <RefreshCw className={`h-4 w-4 mr-2${savingCodeAgentConfig ? ' animate-spin' : ''}`} />
                            {savingCodeAgentConfig ? t('common:status.saving') : t('common:actions.save')}
                          </Button>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="code-agent-execution-mode" className="text-[13px] text-foreground/80">
                              {t('developer.codeAgentExecutionMode')}
                            </Label>
                            <Select
                              id="code-agent-execution-mode"
                              value={codeAgentConfigDraft.executionMode}
                              onChange={(event) => setCodeAgentConfigDraft((prev) => ({
                                ...prev,
                                executionMode: event.target.value as CodeAgentExecutionMode,
                              }))}
                              className="h-10 rounded-xl border-black/10 bg-white text-[13px] dark:border-white/10 dark:bg-white/5"
                            >
                              <option value="cli">{t('developer.codeAgentExecutionModeCli')}</option>
                              <option value="snapshot">{t('developer.codeAgentExecutionModeSnapshot')}</option>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="code-agent-permission-mode" className="text-[13px] text-foreground/80">
                              {t('developer.codeAgentPermissionMode')}
                            </Label>
                            <Select
                              id="code-agent-permission-mode"
                              value={codeAgentConfigDraft.permissionMode}
                              onChange={(event) => setCodeAgentConfigDraft((prev) => ({
                                ...prev,
                                permissionMode: event.target.value as CodeAgentPermissionMode,
                              }))}
                              className="h-10 rounded-xl border-black/10 bg-white text-[13px] dark:border-white/10 dark:bg-white/5"
                            >
                              <option value="default">{t('developer.codeAgentPermissionDefault')}</option>
                              <option value="acceptEdits">{t('developer.codeAgentPermissionAcceptEdits')}</option>
                              <option value="auto">{t('developer.codeAgentPermissionAuto')}</option>
                              <option value="plan">{t('developer.codeAgentPermissionPlan')}</option>
                              <option value="dontAsk">{t('developer.codeAgentPermissionDontAsk')}</option>
                              <option value="bypassPermissions">{t('developer.codeAgentPermissionBypass')}</option>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="code-agent-cli-path" className="text-[13px] text-foreground/80">
                              {t('developer.codeAgentCliPath')}
                            </Label>
                            <Input
                              id="code-agent-cli-path"
                              value={codeAgentConfigDraft.cliPath}
                              onChange={(event) => setCodeAgentConfigDraft((prev) => ({ ...prev, cliPath: event.target.value }))}
                              placeholder="claude"
                              className="h-10 rounded-xl bg-white dark:bg-card border-black/10 dark:border-white/10 font-mono text-[13px]"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="code-agent-model" className="text-[13px] text-foreground/80">
                              {t('developer.codeAgentModel')}
                            </Label>
                            <Input
                              id="code-agent-model"
                              value={codeAgentConfigDraft.model}
                              onChange={(event) => setCodeAgentConfigDraft((prev) => ({ ...prev, model: event.target.value }))}
                              placeholder="sonnet"
                              className="h-10 rounded-xl bg-white dark:bg-card border-black/10 dark:border-white/10 text-[13px]"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="code-agent-fallback-model" className="text-[13px] text-foreground/80">
                              {t('developer.codeAgentFallbackModel')}
                            </Label>
                            <Input
                              id="code-agent-fallback-model"
                              value={codeAgentConfigDraft.fallbackModel}
                              onChange={(event) => setCodeAgentConfigDraft((prev) => ({ ...prev, fallbackModel: event.target.value }))}
                              placeholder="opus"
                              className="h-10 rounded-xl bg-white dark:bg-card border-black/10 dark:border-white/10 text-[13px]"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="code-agent-base-url" className="text-[13px] text-foreground/80">
                              {t('developer.codeAgentBaseUrl')}
                            </Label>
                            <Input
                              id="code-agent-base-url"
                              value={codeAgentConfigDraft.baseUrl}
                              onChange={(event) => setCodeAgentConfigDraft((prev) => ({ ...prev, baseUrl: event.target.value }))}
                              placeholder="https://api.anthropic.com"
                              className="h-10 rounded-xl bg-white dark:bg-card border-black/10 dark:border-white/10 text-[13px]"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="code-agent-api-key" className="text-[13px] text-foreground/80">
                            {t('developer.codeAgentApiKey')}
                          </Label>
                          <div className="relative">
                            <Input
                              id="code-agent-api-key"
                              type={showCodeAgentApiKey ? 'text' : 'password'}
                              value={codeAgentConfigDraft.apiKey}
                              onChange={(event) => setCodeAgentConfigDraft((prev) => ({ ...prev, apiKey: event.target.value }))}
                              placeholder={t('developer.codeAgentApiKeyPlaceholder')}
                              className="h-10 rounded-xl bg-white dark:bg-card border-black/10 dark:border-white/10 text-[13px] pr-10"
                            />
                            <button
                              type="button"
                              onClick={() => setShowCodeAgentApiKey((prev) => !prev)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                              {showCodeAgentApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                          <p className="text-[11px] text-muted-foreground">{t('developer.codeAgentApiKeyDesc')}</p>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="code-agent-allowed-tools" className="text-[13px] text-foreground/80">
                              {t('developer.codeAgentAllowedTools')}
                            </Label>
                            <Textarea
                              id="code-agent-allowed-tools"
                              value={codeAgentAllowedToolsDraft}
                              onChange={(event) => setCodeAgentAllowedToolsDraft(event.target.value)}
                              placeholder={t('developer.codeAgentAllowedToolsPlaceholder')}
                              className="min-h-[92px] rounded-xl bg-white dark:bg-card border-black/10 dark:border-white/10 text-[13px] font-mono"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="code-agent-system-prompt" className="text-[13px] text-foreground/80">
                              {t('developer.codeAgentAppendSystemPrompt')}
                            </Label>
                            <Textarea
                              id="code-agent-system-prompt"
                              value={codeAgentConfigDraft.appendSystemPrompt}
                              onChange={(event) => setCodeAgentConfigDraft((prev) => ({ ...prev, appendSystemPrompt: event.target.value }))}
                              placeholder={t('developer.codeAgentAppendSystemPromptPlaceholder')}
                              className="min-h-[92px] rounded-xl bg-white dark:bg-card border-black/10 dark:border-white/10 text-[13px]"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-[1.2fr_1.8fr]">
                        <div className="space-y-2">
                          <Label htmlFor="code-agent-workspace" className="text-[13px] text-foreground/80">
                            {t('developer.codeAgentWorkspace')}
                          </Label>
                          <Input
                            id="code-agent-workspace"
                            value={codeAgentWorkspaceRoot}
                            onChange={(event) => setCodeAgentWorkspaceRoot(event.target.value)}
                            placeholder={t('developer.codeAgentWorkspacePlaceholder')}
                            className="h-10 rounded-xl bg-white dark:bg-card border-black/10 dark:border-white/10 font-mono text-[13px]"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="code-agent-prompt" className="text-[13px] text-foreground/80">
                            {t('developer.codeAgentPrompt')}
                          </Label>
                          <Textarea
                            id="code-agent-prompt"
                            value={codeAgentPrompt}
                            onChange={(event) => setCodeAgentPrompt(event.target.value)}
                            placeholder={t('developer.codeAgentPromptPlaceholder')}
                            className="min-h-[92px] rounded-xl bg-white dark:bg-card border-black/10 dark:border-white/10 text-[13px]"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[12px] text-muted-foreground">
                          {t('developer.codeAgentLatest')}
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => void handleCodeAgentRun()}
                          disabled={codeAgentBusyAction !== null}
                          className="rounded-xl h-10 px-5 bg-transparent border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5"
                        >
                          <RefreshCw className={`h-4 w-4 mr-2${codeAgentBusyAction === 'run' ? ' animate-spin' : ''}`} />
                          {codeAgentBusyAction === 'run' ? t('common:status.running') : t('developer.codeAgentRun')}
                        </Button>
                      </div>

                      <div className="space-y-3 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-card p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap gap-2 text-[12px]">
                            <Badge variant="secondary" className="rounded-full px-3 py-1">
                              {t('developer.codeAgentLastRun')}
                            </Badge>
                            {codeAgentLastRun?.result?.status && (
                              <Badge variant="outline" className="rounded-full px-3 py-1">
                                {codeAgentLastRun.result.status}
                              </Badge>
                            )}
                            {codeAgentLastRun?.error && (
                              <Badge variant="destructive" className="rounded-full px-3 py-1">
                                {t('common:status.error')}
                              </Badge>
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowCodeAgentRunDetails((prev) => !prev)}
                            className="rounded-full h-8 px-4 hover:bg-black/5 dark:hover:bg-white/10"
                            disabled={!codeAgentLastRun}
                          >
                            {showCodeAgentRunDetails ? t('common:actions.hide') : t('common:actions.show')}
                          </Button>
                        </div>

                        {!codeAgentLastRun ? (
                          <p className="text-[12px] text-muted-foreground">{t('developer.codeAgentNoRun')}</p>
                        ) : (
                          <div className="space-y-2 text-[12px] text-muted-foreground font-mono break-all">
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
                          <div className="space-y-2">
                            <p className="text-[12px] font-semibold text-foreground/80">{t('developer.codeAgentSummary')}</p>
                            <p className="text-[12px] text-muted-foreground whitespace-pre-wrap break-words">
                              {codeAgentLastRun.result.summary}
                            </p>
                          </div>
                        )}

                        {showCodeAgentRunDetails && codeAgentLastRun?.result && (
                          <div className="space-y-3">
                            {codeAgentLastRun.result.diagnostics && codeAgentLastRun.result.diagnostics.length > 0 && (
                              <div className="space-y-2">
                                <p className="text-[12px] font-semibold text-foreground/80">{t('developer.codeAgentDiagnostics')}</p>
                                <pre className="max-h-40 overflow-auto rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 p-3 text-[11px] font-mono whitespace-pre-wrap break-words">
                                  {codeAgentLastRun.result.diagnostics.join('\n')}
                                </pre>
                              </div>
                            )}
                            <div className="space-y-2">
                              <p className="text-[12px] font-semibold text-foreground/80">{t('developer.codeAgentOutput')}</p>
                              <pre className="max-h-72 overflow-auto rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 p-3 text-[11px] font-mono whitespace-pre-wrap break-words">
                                {codeAgentLastRun.result.output || t('developer.doctorOutputEmpty')}
                              </pre>
                            </div>
                            {codeAgentLastRun.result.metadata && (
                              <div className="space-y-2">
                                <p className="text-[12px] font-semibold text-foreground/80">{t('developer.codeAgentMetadata')}</p>
                                <pre className="max-h-72 overflow-auto rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 p-3 text-[11px] font-mono whitespace-pre-wrap break-words">
                                  {JSON.stringify(codeAgentLastRun.result.metadata, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between rounded-2xl border border-black/10 dark:border-white/10 p-5 bg-transparent">
                      <div>
                        <Label className="text-[14px] font-medium text-foreground">{t('developer.wsDiagnostic')}</Label>
                        <p className="text-[13px] text-muted-foreground mt-1">
                          {t('developer.wsDiagnosticDesc')}
                        </p>
                      </div>
                      <Switch
                        checked={wsDiagnosticEnabled}
                        onCheckedChange={handleWsDiagnosticToggle}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-[14px] font-medium text-foreground">{t('developer.telemetryViewer')}</Label>
                        <p className="text-[13px] text-muted-foreground mt-1">
                          {t('developer.telemetryViewerDesc')}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowTelemetryViewer((prev) => !prev)}
                        className="rounded-full px-5 h-9 bg-transparent border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5"
                      >
                        {showTelemetryViewer
                          ? t('common:actions.hide')
                          : t('common:actions.show')}
                      </Button>
                    </div>

                    {showTelemetryViewer && (
                      <div className="space-y-4 rounded-2xl border border-black/10 dark:border-white/10 p-5 bg-black/5 dark:bg-white/5">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary" className="rounded-full px-3 py-1 bg-white dark:bg-card border border-black/5 dark:border-white/5">{t('developer.telemetryTotal')}: {telemetryStats.total}</Badge>
                          <Badge variant={telemetryStats.errorCount > 0 ? 'destructive' : 'secondary'} className={cn("rounded-full px-3 py-1", telemetryStats.errorCount === 0 && "bg-white dark:bg-card border border-black/5 dark:border-white/5")}>
                            {t('developer.telemetryErrors')}: {telemetryStats.errorCount}
                          </Badge>
                          <Badge variant={telemetryStats.slowCount > 0 ? 'secondary' : 'outline'} className={cn("rounded-full px-3 py-1", telemetryStats.slowCount === 0 && "bg-white dark:bg-card border border-black/5 dark:border-white/5")}>
                            {t('developer.telemetrySlow')}: {telemetryStats.slowCount}
                          </Badge>
                          <div className="ml-auto flex gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={handleCopyTelemetry} className="rounded-full h-8 px-4 bg-white dark:bg-card border-black/5 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/10">
                              <Copy className="h-3.5 w-3.5 mr-1.5" />
                              {t('common:actions.copy')}
                            </Button>
                            <Button type="button" variant="outline" size="sm" onClick={handleClearTelemetry} className="rounded-full h-8 px-4 bg-white dark:bg-card border-black/5 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/10">
                              {t('common:actions.clear')}
                            </Button>
                          </div>
                        </div>

                        <div className="max-h-80 overflow-auto rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-card shadow-inner">
                          {telemetryByEvent.length > 0 && (
                            <div className="border-b border-black/5 dark:border-white/5 bg-black/5 dark:bg-white/5 p-3">
                              <p className="mb-3 text-[12px] font-semibold text-muted-foreground">
                                {t('developer.telemetryAggregated')}
                              </p>
                              <div className="space-y-1.5 text-[12px]">
                                {telemetryByEvent.map((item) => (
                                  <div
                                    key={item.event}
                                    className="grid grid-cols-[minmax(0,1.6fr)_0.7fr_0.9fr_0.8fr_1fr] gap-2 rounded-lg border border-black/5 dark:border-white/5 bg-white dark:bg-card px-3 py-2"
                                  >
                                    <span className="truncate font-medium" title={item.event}>{item.event}</span>
                                    <span className="text-muted-foreground">n={item.count}</span>
                                    <span className="text-muted-foreground">
                                      avg={item.timedCount > 0 ? Math.round(item.totalDuration / item.timedCount) : 0}ms
                                    </span>
                                    <span className="text-muted-foreground">slow={item.slowCount}</span>
                                    <span className="text-muted-foreground">err={item.errorCount}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          <div className="space-y-2 p-3 font-mono text-[12px]">
                            {telemetryEntries.length === 0 ? (
                              <div className="text-muted-foreground text-center py-4">{t('developer.telemetryEmpty')}</div>
                            ) : (
                              telemetryEntries
                                .slice()
                                .reverse()
                                .map((entry) => (
                                  <div key={entry.id} className="rounded-lg border border-black/5 dark:border-white/5 bg-black/5 dark:bg-white/5 p-3">
                                    <div className="flex items-center justify-between gap-3 mb-2">
                                      <span className="font-semibold text-foreground">{entry.event}</span>
                                      <span className="text-muted-foreground text-[11px]">{entry.ts}</span>
                                    </div>
                                    <pre className="whitespace-pre-wrap text-[11px] text-muted-foreground overflow-x-auto">
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
              </div>
            </>
          )}

          <Separator className="bg-black/5 dark:bg-white/5" />

          {/* Updates */}
          <div>
            <h2 className="text-sm font-semibold text-foreground mb-6 tracking-tight">
              {t('updates.title')}
            </h2>
            <div className="space-y-6">
              <UpdateSettings />

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-[14px] font-medium text-foreground">{t('updates.autoCheck')}</Label>
                  <p className="text-[13px] text-muted-foreground mt-1">
                    {t('updates.autoCheckDesc')}
                  </p>
                </div>
                <Switch
                  checked={autoCheckUpdate}
                  onCheckedChange={setAutoCheckUpdate}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-[14px] font-medium text-foreground">{t('updates.autoDownload')}</Label>
                  <p className="text-[13px] text-muted-foreground mt-1">
                    {t('updates.autoDownloadDesc')}
                  </p>
                </div>
                <Switch
                  checked={autoDownloadUpdate}
                  onCheckedChange={(value) => {
                    setAutoDownloadUpdate(value);
                    updateSetAutoDownload(value);
                  }}
                />
              </div>
            </div>
          </div>

          <Separator className="bg-black/5 dark:bg-white/5" />

          {/* About */}
          <div>
            <h2 className="text-sm font-semibold text-foreground mb-6 tracking-tight">
              {t('about.title')}
            </h2>
            <div className="space-y-3 text-[14px] text-muted-foreground">
              <p>
                <strong className="text-foreground font-semibold">{t('about.appName')}</strong> - {t('about.tagline')}
              </p>
              <p>{t('about.basedOn')}</p>
              <p>{t('about.version', { version: currentVersion })}</p>
              <div className="flex gap-4 pt-3">
                <Button
                  variant="link"
                  className="h-auto p-0 text-[14px] text-blue-500 hover:text-blue-600 font-medium"
                  onClick={() => window.electron.openExternal('https://jizhi.gz4399.com')}
                >
                  {t('about.docs')}
                </Button>
                <Button
                  variant="link"
                  className="h-auto p-0 text-[14px] text-blue-500 hover:text-blue-600 font-medium"
                  onClick={() => window.electron.openExternal('https://jizhi.gz4399.com')}
                >
                  {t('about.github')}
                </Button>
                <Button
                  variant="link"
                  className="h-auto p-0 text-[14px] text-blue-500 hover:text-blue-600 font-medium"
                  onClick={() => window.electron.openExternal('https://icnnp7d0dymg.feishu.cn/wiki/UyfOwQ2cAiJIP6kqUW8cte5Bnlc')}
                >
                  {t('about.faq')}
                </Button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default Settings;
