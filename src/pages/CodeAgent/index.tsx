import { useCallback, useEffect, useState } from 'react';
import { Eye, EyeOff, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  fetchCodeAgentHealth,
  fetchCodeAgentStatus,
  fetchLatestCodeAgentRun,
  inferCodeAgentWorkspaceRoot,
  readStoredCodeAgentWorkspaceRoot,
  restartCodeAgent,
  runCodeAgentTask,
  startCodeAgent,
  stopCodeAgent,
  writeStoredCodeAgentWorkspaceRoot,
} from '@/lib/code-agent';
import { subscribeHostEvent } from '@/lib/host-events';
import { hostApiFetch } from '@/lib/host-api';
import { toUserMessage } from '@/lib/api-client';
import { useSettingsStore } from '@/stores/settings';
import type {
  CodeAgentExecutionMode,
  CodeAgentHealth,
  CodeAgentPermissionMode,
  CodeAgentRunRecord,
  CodeAgentRuntimeConfig,
  CodeAgentStatus,
} from '../../../shared/code-agent';

export function CodeAgent() {
  const { t } = useTranslation(['settings', 'common']);
  const initSettings = useSettingsStore((state) => state.init);
  const codeAgent = useSettingsStore((state) => state.codeAgent);

  const [codeAgentStatus, setCodeAgentStatus] = useState<CodeAgentStatus | null>(null);
  const [codeAgentHealth, setCodeAgentHealth] = useState<CodeAgentHealth | null>(null);
  const [codeAgentLastRun, setCodeAgentLastRun] = useState<CodeAgentRunRecord | null>(null);
  const [codeAgentWorkspaceRoot, setCodeAgentWorkspaceRoot] = useState(() => readStoredCodeAgentWorkspaceRoot());
  const [codeAgentPrompt, setCodeAgentPrompt] = useState('');
  const [codeAgentBusyAction, setCodeAgentBusyAction] = useState<'health' | 'start' | 'stop' | 'restart' | 'run' | null>(null);
  const [showCodeAgentRunDetails, setShowCodeAgentRunDetails] = useState(true);
  const [codeAgentConfigDraft, setCodeAgentConfigDraft] = useState<CodeAgentRuntimeConfig>(codeAgent);
  const [codeAgentAllowedToolsDraft, setCodeAgentAllowedToolsDraft] = useState(codeAgent.allowedTools.join('\n'));
  const [savingCodeAgentConfig, setSavingCodeAgentConfig] = useState(false);
  const [showCodeAgentApiKey, setShowCodeAgentApiKey] = useState(false);

  useEffect(() => {
    void initSettings();
  }, [initSettings]);

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

  useEffect(() => {
    void refreshCodeAgentData();

    const unsubscribeStatus = subscribeHostEvent<CodeAgentStatus>('code-agent:status', (payload) => {
      setCodeAgentStatus(payload);
    });
    const unsubscribeRunCompleted = subscribeHostEvent<CodeAgentRunRecord>('code-agent:run-completed', (payload) => {
      setCodeAgentLastRun(payload);
      setShowCodeAgentRunDetails(true);
      void refreshCodeAgentData();
    });
    const unsubscribeRunFailed = subscribeHostEvent<CodeAgentRunRecord>('code-agent:run-failed', (payload) => {
      setCodeAgentLastRun(payload);
      setShowCodeAgentRunDetails(true);
      void refreshCodeAgentData();
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
  }, [refreshCodeAgentData]);

  useEffect(() => {
    setCodeAgentConfigDraft(codeAgent);
    setCodeAgentAllowedToolsDraft(codeAgent.allowedTools.join('\n'));
  }, [codeAgent]);

  useEffect(() => {
    writeStoredCodeAgentWorkspaceRoot(codeAgentWorkspaceRoot.trim());
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

  const handleCodeAgentHealthCheck = async () => {
    setCodeAgentBusyAction('health');
    try {
      const [status, health] = await Promise.all([
        fetchCodeAgentStatus(),
        fetchCodeAgentHealth(),
      ]);
      setCodeAgentStatus(status);
      setCodeAgentHealth(health);
      toast.success(t('settings:developer.codeAgentHealthChecked'));
    } catch (error) {
      toast.error(`${t('settings:developer.codeAgentHealthCheckFailed')}: ${toUserMessage(error)}`);
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
        toast.error(`${t('settings:developer.codeAgentStartFailed')}: ${message}`);
      } else if (action === 'stop') {
        toast.error(`${t('settings:developer.codeAgentStopFailed')}: ${message}`);
      } else {
        toast.error(`${t('settings:developer.codeAgentRestartFailed')}: ${message}`);
      }
    } finally {
      setCodeAgentBusyAction(null);
    }
  };

  const handleCodeAgentRun = async () => {
    const workspaceRoot = codeAgentWorkspaceRoot.trim();
    const prompt = codeAgentPrompt.trim();

    if (!workspaceRoot) {
      toast.error(t('settings:developer.codeAgentWorkspaceRequired'));
      return;
    }
    if (!prompt) {
      toast.error(t('settings:developer.codeAgentPromptRequired'));
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
      toast.success(t('settings:developer.codeAgentRunSucceeded'));
    } catch (error) {
      const message = toUserMessage(error);
      toast.error(`${t('settings:developer.codeAgentRunFailed')}: ${message}`);
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
      toast.success(t('settings:developer.codeAgentConfigSaved'));
      await refreshCodeAgentData();
    } catch (error) {
      toast.error(`${t('settings:developer.codeAgentConfigSaveFailed')}: ${toUserMessage(error)}`);
    } finally {
      setSavingCodeAgentConfig(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-auto bg-background">
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {t('settings:developer.codeAgent')}
            </h1>
            <Badge variant="outline" className="rounded-full px-3 py-1">
              Claude CLI
            </Badge>
          </div>
          <p className="max-w-3xl text-sm text-muted-foreground">
            {t('settings:developer.codeAgentDesc')}
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <section className="space-y-4 rounded-2xl border border-black/10 bg-card p-5 dark:border-white/10">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">{t('settings:developer.codeAgentStatus')}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('settings:developer.codeAgentLatest')}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void handleCodeAgentHealthCheck()}
                    disabled={codeAgentBusyAction !== null}
                    className="rounded-xl"
                  >
                    <RefreshCw className={`mr-2 h-4 w-4${codeAgentBusyAction === 'health' ? ' animate-spin' : ''}`} />
                    {t('settings:developer.codeAgentCheckHealth')}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void handleCodeAgentLifecycleAction('start')}
                    disabled={codeAgentBusyAction !== null || codeAgentStatus?.state === 'running'}
                    className="rounded-xl"
                  >
                    {t('settings:developer.codeAgentStart')}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void handleCodeAgentLifecycleAction('stop')}
                    disabled={codeAgentBusyAction !== null || codeAgentStatus?.state !== 'running'}
                    className="rounded-xl"
                  >
                    {t('settings:developer.codeAgentStop')}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void handleCodeAgentLifecycleAction('restart')}
                    disabled={codeAgentBusyAction !== null}
                    className="rounded-xl"
                  >
                    {t('common:actions.restart')}
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="secondary" className="rounded-full px-3 py-1">
                  {t('settings:developer.codeAgentStatus')}: {codeAgentStatus?.state || '-'}
                </Badge>
                <Badge variant="outline" className="rounded-full px-3 py-1">
                  {t('settings:developer.codeAgentHealth')}: {codeAgentHealth ? (codeAgentHealth.ok ? 'ok' : 'error') : '-'}
                </Badge>
                <Badge variant="outline" className="rounded-full px-3 py-1">
                  {t('settings:developer.codeAgentConfigSource')}: {codeAgentHealth?.configSource === 'default_provider'
                    ? `${t('settings:developer.codeAgentConfigSourceDefaultProvider')}${codeAgentHealth.configSourceLabel ? ` (${codeAgentHealth.configSourceLabel})` : ''}`
                    : codeAgentHealth?.configSource === 'claude_settings'
                      ? t('settings:developer.codeAgentConfigSourceClaudeSettings')
                      : t('settings:developer.codeAgentConfigSourceSettings')}
                </Badge>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>{t('settings:developer.codeAgentCliPath')}: {codeAgentHealth?.cliPath || codeAgentStatus?.cliPath || codeAgentConfigDraft.cliPath || '-'}</p>
                  <p>{t('settings:developer.codeAgentCliVersion')}: {codeAgentHealth?.cliVersion || '-'}</p>
                  <p>{t('settings:developer.codeAgentRunnable')}: {codeAgentHealth?.runnable === undefined ? '-' : (codeAgentHealth.runnable ? t('settings:developer.codeAgentRunnableYes') : t('settings:developer.codeAgentRunnableNo'))}</p>
                </div>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>{t('settings:developer.codeAgentModel')}: {codeAgentHealth?.configuredModel || codeAgentConfigDraft.model || '-'}</p>
                  <p>{t('settings:developer.codeAgentBaseUrl')}: {codeAgentHealth?.configuredBaseUrl || codeAgentConfigDraft.baseUrl || '-'}</p>
                  <p>{t('settings:developer.codeAgentPermissionMode')}: {codeAgentHealth?.configuredPermissionMode || codeAgentConfigDraft.permissionMode}{codeAgentConfigDraft.permissionMode === 'default' ? ' (Claude Code default)' : ''}</p>
                </div>
              </div>

              {codeAgentHealth?.diagnostics && codeAgentHealth.diagnostics.length > 0 && (
                <pre className="max-h-40 overflow-auto rounded-xl border border-black/10 bg-black/5 p-3 text-[11px] text-muted-foreground dark:border-white/10 dark:bg-white/5">
                  {codeAgentHealth.diagnostics.join('\n')}
                </pre>
              )}
            </section>

            <section className="space-y-4 rounded-2xl border border-black/10 bg-card p-5 dark:border-white/10">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{t('settings:developer.codeAgentConfig')}</p>
                  <p className="text-xs text-muted-foreground">{t('settings:developer.codeAgentConfigAutoMapHint')}</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void handleSaveCodeAgentConfig()}
                  disabled={savingCodeAgentConfig}
                  className="rounded-xl"
                >
                  <RefreshCw className={`mr-2 h-4 w-4${savingCodeAgentConfig ? ' animate-spin' : ''}`} />
                  {savingCodeAgentConfig ? t('common:status.saving') : t('common:actions.save')}
                </Button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="code-agent-execution-mode">{t('settings:developer.codeAgentExecutionMode')}</Label>
                  <Select
                    id="code-agent-execution-mode"
                    value={codeAgentConfigDraft.executionMode}
                    onChange={(event) => setCodeAgentConfigDraft((prev) => ({
                      ...prev,
                      executionMode: event.target.value as CodeAgentExecutionMode,
                    }))}
                    className="h-10 rounded-xl"
                  >
                    <option value="cli">{t('settings:developer.codeAgentExecutionModeCli')}</option>
                    <option value="snapshot">{t('settings:developer.codeAgentExecutionModeSnapshot')}</option>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="code-agent-permission-mode">{t('settings:developer.codeAgentPermissionMode')}</Label>
                  <Select
                    id="code-agent-permission-mode"
                    value={codeAgentConfigDraft.permissionMode}
                    onChange={(event) => setCodeAgentConfigDraft((prev) => ({
                      ...prev,
                      permissionMode: event.target.value as CodeAgentPermissionMode,
                    }))}
                    className="h-10 rounded-xl"
                  >
                    <option value="default">{t('settings:developer.codeAgentPermissionDefault')}</option>
                    <option value="acceptEdits">{t('settings:developer.codeAgentPermissionAcceptEdits')}</option>
                    <option value="auto">{t('settings:developer.codeAgentPermissionAuto')}</option>
                    <option value="plan">{t('settings:developer.codeAgentPermissionPlan')}</option>
                    <option value="dontAsk">{t('settings:developer.codeAgentPermissionDontAsk')}</option>
                    <option value="bypassPermissions">{t('settings:developer.codeAgentPermissionBypass')}</option>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="code-agent-cli-path">{t('settings:developer.codeAgentCliPath')}</Label>
                  <Input
                    id="code-agent-cli-path"
                    value={codeAgentConfigDraft.cliPath}
                    onChange={(event) => setCodeAgentConfigDraft((prev) => ({ ...prev, cliPath: event.target.value }))}
                    placeholder="claude"
                    className="h-10 rounded-xl font-mono text-[13px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="code-agent-model">{t('settings:developer.codeAgentModel')}</Label>
                  <Input
                    id="code-agent-model"
                    value={codeAgentConfigDraft.model}
                    onChange={(event) => setCodeAgentConfigDraft((prev) => ({ ...prev, model: event.target.value }))}
                    placeholder="sonnet"
                    className="h-10 rounded-xl text-[13px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="code-agent-fallback-model">{t('settings:developer.codeAgentFallbackModel')}</Label>
                  <Input
                    id="code-agent-fallback-model"
                    value={codeAgentConfigDraft.fallbackModel}
                    onChange={(event) => setCodeAgentConfigDraft((prev) => ({ ...prev, fallbackModel: event.target.value }))}
                    placeholder="opus"
                    className="h-10 rounded-xl text-[13px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="code-agent-base-url">{t('settings:developer.codeAgentBaseUrl')}</Label>
                  <Input
                    id="code-agent-base-url"
                    value={codeAgentConfigDraft.baseUrl}
                    onChange={(event) => setCodeAgentConfigDraft((prev) => ({ ...prev, baseUrl: event.target.value }))}
                    placeholder="https://api.anthropic.com"
                    className="h-10 rounded-xl text-[13px]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="code-agent-api-key">{t('settings:developer.codeAgentApiKey')}</Label>
                <div className="relative">
                  <Input
                    id="code-agent-api-key"
                    type={showCodeAgentApiKey ? 'text' : 'password'}
                    value={codeAgentConfigDraft.apiKey}
                    onChange={(event) => setCodeAgentConfigDraft((prev) => ({ ...prev, apiKey: event.target.value }))}
                    placeholder={t('settings:developer.codeAgentApiKeyPlaceholder')}
                    className="h-10 rounded-xl pr-10 text-[13px]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCodeAgentApiKey((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showCodeAgentApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">{t('settings:developer.codeAgentApiKeyDesc')}</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="code-agent-allowed-tools">{t('settings:developer.codeAgentAllowedTools')}</Label>
                  <Textarea
                    id="code-agent-allowed-tools"
                    value={codeAgentAllowedToolsDraft}
                    onChange={(event) => setCodeAgentAllowedToolsDraft(event.target.value)}
                    placeholder={t('settings:developer.codeAgentAllowedToolsPlaceholder')}
                    className="min-h-[92px] rounded-xl font-mono text-[13px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="code-agent-system-prompt">{t('settings:developer.codeAgentAppendSystemPrompt')}</Label>
                  <Textarea
                    id="code-agent-system-prompt"
                    value={codeAgentConfigDraft.appendSystemPrompt}
                    onChange={(event) => setCodeAgentConfigDraft((prev) => ({ ...prev, appendSystemPrompt: event.target.value }))}
                    placeholder={t('settings:developer.codeAgentAppendSystemPromptPlaceholder')}
                    className="min-h-[92px] rounded-xl text-[13px]"
                  />
                </div>
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="space-y-4 rounded-2xl border border-black/10 bg-card p-5 dark:border-white/10">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">{t('settings:developer.codeAgentRun')}</p>
                <p className="text-xs text-muted-foreground">
                  {t('settings:developer.codeAgentLatest')}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="code-agent-workspace">{t('settings:developer.codeAgentWorkspace')}</Label>
                <Input
                  id="code-agent-workspace"
                  value={codeAgentWorkspaceRoot}
                  onChange={(event) => setCodeAgentWorkspaceRoot(event.target.value)}
                  placeholder={t('settings:developer.codeAgentWorkspacePlaceholder')}
                  className="h-10 rounded-xl font-mono text-[13px]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="code-agent-prompt">{t('settings:developer.codeAgentPrompt')}</Label>
                <Textarea
                  id="code-agent-prompt"
                  value={codeAgentPrompt}
                  onChange={(event) => setCodeAgentPrompt(event.target.value)}
                  placeholder={t('settings:developer.codeAgentPromptPlaceholder')}
                  className="min-h-[160px] rounded-xl text-[13px]"
                />
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <Button
                  type="button"
                  onClick={() => setCodeAgentPrompt('请先快速理解当前工作区的结构、技术栈和关键入口文件，然后给我一个简短概览。')}
                  variant="outline"
                  className="rounded-xl"
                >
                  解释当前项目
                </Button>
                <Button
                  type="button"
                  onClick={() => setCodeAgentPrompt('请检查当前工作区里最可能导致最近问题的代码位置，并给出排查结论。')}
                  variant="outline"
                  className="rounded-xl"
                >
                  分析最近问题
                </Button>
              </div>

              <Button
                type="button"
                onClick={() => void handleCodeAgentRun()}
                disabled={codeAgentBusyAction !== null}
                className="h-11 w-full rounded-xl"
              >
                <RefreshCw className={`mr-2 h-4 w-4${codeAgentBusyAction === 'run' ? ' animate-spin' : ''}`} />
                {codeAgentBusyAction === 'run' ? t('common:status.running') : t('settings:developer.codeAgentRun')}
              </Button>
            </section>

            <section className="space-y-4 rounded-2xl border border-black/10 bg-card p-5 dark:border-white/10">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">{t('settings:developer.codeAgentLastRun')}</p>
                  {codeAgentLastRun?.result?.status && (
                    <Badge variant="outline" className="rounded-full px-3 py-1">
                      {codeAgentLastRun.result.status}
                    </Badge>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCodeAgentRunDetails((prev) => !prev)}
                  className="rounded-full"
                  disabled={!codeAgentLastRun}
                >
                  {showCodeAgentRunDetails ? t('common:actions.hide') : t('common:actions.show')}
                </Button>
              </div>

              {!codeAgentLastRun ? (
                <p className="text-xs text-muted-foreground">{t('settings:developer.codeAgentNoRun')}</p>
              ) : (
                <>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p>{t('settings:developer.codeAgentRunId')}: {codeAgentLastRun.result?.runId || '-'}</p>
                    <p>{t('settings:developer.codeAgentWorkspace')}: {codeAgentLastRun.request.workspaceRoot || '-'}</p>
                    <p>{t('settings:developer.codeAgentStartedAt')}: {new Date(codeAgentLastRun.startedAt).toLocaleString()}</p>
                    <p>{t('settings:developer.codeAgentCompletedAt')}: {codeAgentLastRun.completedAt ? new Date(codeAgentLastRun.completedAt).toLocaleString() : '-'}</p>
                    {codeAgentLastRun.request.prompt && <p>{t('settings:developer.codeAgentPrompt')}: {codeAgentLastRun.request.prompt}</p>}
                  </div>

                  {codeAgentLastRun.result?.summary && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-foreground/80">{t('settings:developer.codeAgentSummary')}</p>
                      <p className="text-sm whitespace-pre-wrap break-words text-muted-foreground">
                        {codeAgentLastRun.result.summary}
                      </p>
                    </div>
                  )}

                  {showCodeAgentRunDetails && codeAgentLastRun.result && (
                    <div className="space-y-3">
                      {codeAgentLastRun.result.output && (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-foreground/80">{t('settings:developer.codeAgentOutput')}</p>
                          <pre className="max-h-72 overflow-auto rounded-xl border border-black/10 bg-black/5 p-3 text-[11px] whitespace-pre-wrap break-words dark:border-white/10 dark:bg-white/5">
                            {codeAgentLastRun.result.output}
                          </pre>
                        </div>
                      )}
                      {codeAgentLastRun.result.metadata && (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-foreground/80">{t('settings:developer.codeAgentMetadata')}</p>
                          <pre className="max-h-72 overflow-auto rounded-xl border border-black/10 bg-black/5 p-3 text-[11px] whitespace-pre-wrap break-words dark:border-white/10 dark:bg-white/5">
                            {JSON.stringify(codeAgentLastRun.result.metadata, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
