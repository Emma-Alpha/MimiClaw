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
import { useCodeAgentStyles } from './styles';

export function CodeAgent() {
  const { t } = useTranslation(['settings', 'common']);
  const { styles, cx } = useCodeAgentStyles();
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

  // Determine health badge class
  const healthBadgeClass = (() => {
    if (codeAgentStatus?.state === 'running' && codeAgentHealth?.ok) return styles.badgeHealthOk;
    if (codeAgentStatus?.state === 'running' && codeAgentHealth && !codeAgentHealth.ok) return styles.badgeHealthWarn;
    if (codeAgentStatus?.state === 'error') return styles.badgeHealthError;
    return undefined;
  })();

  return (
    <div className={styles.pageRoot}>
      <div className={styles.contentWrap}>
        <div className={styles.pageHeaderBlock}>
          <div className={styles.titleRow}>
            <h1 className={styles.pageTitle}>
              {t('settings:developer.codeAgent')}
            </h1>
            <Badge variant="outline" style={{ borderRadius: 9999, paddingLeft: 12, paddingRight: 12, paddingTop: 4, paddingBottom: 4 }}>
              Claude CLI
            </Badge>
          </div>
          <p className={styles.pageDesc}>
            {t('settings:developer.codeAgentDesc')}
          </p>
        </div>

        <div className={styles.mainGrid}>
          <div className={styles.leftCol}>
            <section className={styles.sectionCard}>
              <div className={styles.statusHeader}>
                <div className={styles.statusTitleBlock}>
                  <p className={styles.sectionTitle}>{t('settings:developer.codeAgentStatus')}</p>
                  <p className={styles.sectionSubtitle}>
                    {t('settings:developer.codeAgentLatest')}
                  </p>
                </div>
                <div className={styles.statusButtonGroup}>
                  <Button
                    onClick={() => void handleCodeAgentHealthCheck()}
                    disabled={codeAgentBusyAction !== null}
                    style={{ borderRadius: 12 }}
                  >
                    <RefreshCw style={{ marginRight: 8, height: 16, width: 16 }} className={codeAgentBusyAction === 'health' ? 'animate-spin' : ''} />
                    {t('settings:developer.codeAgentCheckHealth')}
                  </Button>
                  <Button
                    onClick={() => void handleCodeAgentLifecycleAction('start')}
                    disabled={codeAgentBusyAction !== null || codeAgentStatus?.state === 'running'}
                    style={{ borderRadius: 12 }}
                  >
                    {t('settings:developer.codeAgentStart')}
                  </Button>
                  <Button
                    onClick={() => void handleCodeAgentLifecycleAction('stop')}
                    disabled={codeAgentBusyAction !== null || codeAgentStatus?.state !== 'running'}
                    style={{ borderRadius: 12 }}
                  >
                    {t('settings:developer.codeAgentStop')}
                  </Button>
                  <Button
                    onClick={() => void handleCodeAgentLifecycleAction('restart')}
                    disabled={codeAgentBusyAction !== null}
                    style={{ borderRadius: 12 }}
                  >
                    {t('common:actions.restart')}
                  </Button>
                </div>
              </div>

              <div className={styles.badgeRow}>
                <Badge variant="secondary" style={{ borderRadius: 9999, paddingLeft: 12, paddingRight: 12, paddingTop: 4, paddingBottom: 4 }}>
                  {t('settings:developer.codeAgentStatus')}: {codeAgentStatus?.state || '-'}
                </Badge>
                <Badge
                  variant="outline"
                  className={cx(healthBadgeClass)}
                  style={{ borderRadius: 9999, paddingLeft: 12, paddingRight: 12, paddingTop: 4, paddingBottom: 4 }}
                >
                  {t('settings:developer.codeAgentHealth')}: {(() => {
                    const state = codeAgentStatus?.state;
                    if (!state || state === 'stopped') return t('settings:developer.codeAgentHealthStopped', { defaultValue: '未启动' });
                    if (state === 'starting') return t('settings:developer.codeAgentHealthStarting', { defaultValue: '启动中' });
                    if (state === 'error') return t('settings:developer.codeAgentHealthError', { defaultValue: 'error' });
                    if (codeAgentHealth?.ok) return t('settings:developer.codeAgentHealthOk', { defaultValue: 'ok' });
                    if (codeAgentHealth) return t('settings:developer.codeAgentHealthError', { defaultValue: 'error' });
                    return '-';
                  })()}
                </Badge>
                <Badge variant="outline" style={{ borderRadius: 9999, paddingLeft: 12, paddingRight: 12, paddingTop: 4, paddingBottom: 4 }}>
                  {t('settings:developer.codeAgentConfigSource')}: {codeAgentHealth?.configSource === 'default_provider'
                    ? `${t('settings:developer.codeAgentConfigSourceDefaultProvider')}${codeAgentHealth.configSourceLabel ? ` (${codeAgentHealth.configSourceLabel})` : ''}`
                    : codeAgentHealth?.configSource === 'claude_settings'
                      ? t('settings:developer.codeAgentConfigSourceClaudeSettings')
                      : t('settings:developer.codeAgentConfigSourceSettings')}
                </Badge>
              </div>

              <div className={styles.infoGrid2}>
                <div className={styles.infoCol}>
                  <p>{t('settings:developer.codeAgentCliPath')}: {codeAgentHealth?.cliPath || codeAgentStatus?.cliPath || codeAgentConfigDraft.cliPath || '-'}</p>
                  <p>{t('settings:developer.codeAgentCliVersion')}: {codeAgentHealth?.cliVersion || '-'}</p>
                  <p>{t('settings:developer.codeAgentRunnable')}: {codeAgentHealth?.runnable === undefined ? '-' : (codeAgentHealth.runnable ? t('settings:developer.codeAgentRunnableYes') : t('settings:developer.codeAgentRunnableNo'))}</p>
                </div>
                <div className={styles.infoCol}>
                  <p>{t('settings:developer.codeAgentModel')}: {codeAgentHealth?.configuredModel || codeAgentConfigDraft.model || '-'}</p>
                  <p>{t('settings:developer.codeAgentBaseUrl')}: {codeAgentHealth?.configuredBaseUrl || codeAgentConfigDraft.baseUrl || '-'}</p>
                  <p>{t('settings:developer.codeAgentPermissionMode')}: {codeAgentHealth?.configuredPermissionMode || codeAgentConfigDraft.permissionMode}{codeAgentConfigDraft.permissionMode === 'default' ? ' (Claude Code default)' : ''}</p>
                </div>
              </div>

              {codeAgentHealth?.diagnostics && codeAgentHealth.diagnostics.length > 0 && (
                <pre className={styles.diagnosticsPre}>
                  {codeAgentHealth.diagnostics.join('\n')}
                </pre>
              )}
            </section>

            <section className={styles.sectionCard}>
              <div className={styles.configHeader}>
                <div className={styles.configTitleBlock}>
                  <p className={styles.sectionTitle}>{t('settings:developer.codeAgentConfig')}</p>
                  <p className={styles.sectionSubtitle}>{t('settings:developer.codeAgentConfigAutoMapHint')}</p>
                </div>
                <Button
                  onClick={() => void handleSaveCodeAgentConfig()}
                  disabled={savingCodeAgentConfig}
                  style={{ borderRadius: 12 }}
                >
                  <RefreshCw style={{ marginRight: 8, height: 16, width: 16 }} className={savingCodeAgentConfig ? 'animate-spin' : ''} />
                  {savingCodeAgentConfig ? t('common:status.saving') : t('common:actions.save')}
                </Button>
              </div>

              <div className={styles.configGrid2}>
                <div className={styles.formField}>
                  <Label htmlFor="code-agent-execution-mode">{t('settings:developer.codeAgentExecutionMode')}</Label>
                  <Select
                    id="code-agent-execution-mode"
                    value={codeAgentConfigDraft.executionMode}
                    onChange={(val) => setCodeAgentConfigDraft((prev) => ({
                      ...prev,
                      executionMode: val as CodeAgentExecutionMode,
                    }))}
                    style={{ borderRadius: 12 }}
                    options={[
                      { value: 'cli', label: t('settings:developer.codeAgentExecutionModeCli') },
                      { value: 'snapshot', label: t('settings:developer.codeAgentExecutionModeSnapshot') },
                    ]}
                  />
                </div>

                <div className={styles.formField}>
                  <Label htmlFor="code-agent-permission-mode">{t('settings:developer.codeAgentPermissionMode')}</Label>
                  <Select
                    id="code-agent-permission-mode"
                    value={codeAgentConfigDraft.permissionMode}
                    onChange={(val) => setCodeAgentConfigDraft((prev) => ({
                      ...prev,
                      permissionMode: val as CodeAgentPermissionMode,
                    }))}
                    style={{ borderRadius: 12 }}
                    options={[
                      { value: 'default', label: t('settings:developer.codeAgentPermissionDefault') },
                      { value: 'acceptEdits', label: t('settings:developer.codeAgentPermissionAcceptEdits') },
                      { value: 'auto', label: t('settings:developer.codeAgentPermissionAuto') },
                      { value: 'plan', label: t('settings:developer.codeAgentPermissionPlan') },
                      { value: 'dontAsk', label: t('settings:developer.codeAgentPermissionDontAsk') },
                      { value: 'bypassPermissions', label: t('settings:developer.codeAgentPermissionBypass') },
                    ]}
                  />
                </div>

                <div className={styles.formField}>
                  <Label htmlFor="code-agent-cli-path">{t('settings:developer.codeAgentCliPath')}</Label>
                  <Input
                    id="code-agent-cli-path"
                    value={codeAgentConfigDraft.cliPath}
                    onChange={(event) => setCodeAgentConfigDraft((prev) => ({ ...prev, cliPath: event.target.value }))}
                    placeholder="claude"
                    style={{ height: 40, borderRadius: 12, fontFamily: 'monospace', fontSize: 13 }}
                  />
                </div>

                <div className={styles.formField}>
                  <Label htmlFor="code-agent-model">{t('settings:developer.codeAgentModel')}</Label>
                  <Input
                    id="code-agent-model"
                    value={codeAgentConfigDraft.model}
                    onChange={(event) => setCodeAgentConfigDraft((prev) => ({ ...prev, model: event.target.value }))}
                    placeholder="sonnet"
                    style={{ height: 40, borderRadius: 12, fontSize: 13 }}
                  />
                </div>

                <div className={styles.formField}>
                  <Label htmlFor="code-agent-fallback-model">{t('settings:developer.codeAgentFallbackModel')}</Label>
                  <Input
                    id="code-agent-fallback-model"
                    value={codeAgentConfigDraft.fallbackModel}
                    onChange={(event) => setCodeAgentConfigDraft((prev) => ({ ...prev, fallbackModel: event.target.value }))}
                    placeholder="opus"
                    style={{ height: 40, borderRadius: 12, fontSize: 13 }}
                  />
                </div>

                <div className={styles.formField}>
                  <Label htmlFor="code-agent-base-url">{t('settings:developer.codeAgentBaseUrl')}</Label>
                  <Input
                    id="code-agent-base-url"
                    value={codeAgentConfigDraft.baseUrl}
                    onChange={(event) => setCodeAgentConfigDraft((prev) => ({ ...prev, baseUrl: event.target.value }))}
                    placeholder="https://api.anthropic.com"
                    style={{ height: 40, borderRadius: 12, fontSize: 13 }}
                  />
                </div>
              </div>

              <div className={styles.formField}>
                <Label htmlFor="code-agent-api-key">{t('settings:developer.codeAgentApiKey')}</Label>
                <div className={styles.apiKeyWrap}>
                  <Input
                    id="code-agent-api-key"
                    type={showCodeAgentApiKey ? 'text' : 'password'}
                    value={codeAgentConfigDraft.apiKey}
                    onChange={(event) => setCodeAgentConfigDraft((prev) => ({ ...prev, apiKey: event.target.value }))}
                    placeholder={t('settings:developer.codeAgentApiKeyPlaceholder')}
                    style={{ height: 40, borderRadius: 12, paddingRight: 40, fontSize: 13 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCodeAgentApiKey((prev) => !prev)}
                    className={styles.apiKeyToggle}
                  >
                    {showCodeAgentApiKey ? <EyeOff style={{ height: 16, width: 16 }} /> : <Eye style={{ height: 16, width: 16 }} />}
                  </button>
                </div>
                <p className={styles.apiKeyDesc}>{t('settings:developer.codeAgentApiKeyDesc')}</p>
              </div>

              <div className={styles.configGrid2}>
                <div className={styles.formField}>
                  <Label htmlFor="code-agent-allowed-tools">{t('settings:developer.codeAgentAllowedTools')}</Label>
                  <Textarea
                    id="code-agent-allowed-tools"
                    value={codeAgentAllowedToolsDraft}
                    onChange={(event) => setCodeAgentAllowedToolsDraft(event.target.value)}
                    placeholder={t('settings:developer.codeAgentAllowedToolsPlaceholder')}
                    style={{ minHeight: 92, borderRadius: 12, fontFamily: 'monospace', fontSize: 13 }}
                  />
                </div>

                <div className={styles.formField}>
                  <Label htmlFor="code-agent-system-prompt">{t('settings:developer.codeAgentAppendSystemPrompt')}</Label>
                  <Textarea
                    id="code-agent-system-prompt"
                    value={codeAgentConfigDraft.appendSystemPrompt}
                    onChange={(event) => setCodeAgentConfigDraft((prev) => ({ ...prev, appendSystemPrompt: event.target.value }))}
                    placeholder={t('settings:developer.codeAgentAppendSystemPromptPlaceholder')}
                    style={{ minHeight: 92, borderRadius: 12, fontSize: 13 }}
                  />
                </div>
              </div>
            </section>
          </div>

          <div className={styles.rightCol}>
            <section className={styles.sectionCard}>
              <div className={styles.statusTitleBlock}>
                <p className={styles.sectionTitle}>{t('settings:developer.codeAgentRun')}</p>
                <p className={styles.sectionSubtitle}>
                  {t('settings:developer.codeAgentLatest')}
                </p>
              </div>

              <div className={styles.formField}>
                <Label htmlFor="code-agent-workspace">{t('settings:developer.codeAgentWorkspace')}</Label>
                <Input
                  id="code-agent-workspace"
                  value={codeAgentWorkspaceRoot}
                  onChange={(event) => setCodeAgentWorkspaceRoot(event.target.value)}
                  placeholder={t('settings:developer.codeAgentWorkspacePlaceholder')}
                  style={{ height: 40, borderRadius: 12, fontFamily: 'monospace', fontSize: 13 }}
                />
              </div>

              <div className={styles.formField}>
                <Label htmlFor="code-agent-prompt">{t('settings:developer.codeAgentPrompt')}</Label>
                <Textarea
                  id="code-agent-prompt"
                  value={codeAgentPrompt}
                  onChange={(event) => setCodeAgentPrompt(event.target.value)}
                  placeholder={t('settings:developer.codeAgentPromptPlaceholder')}
                  style={{ minHeight: 160, borderRadius: 12, fontSize: 13 }}
                />
              </div>

              <div className={styles.runButtonsFlex}>
                <Button
                  onClick={() => setCodeAgentPrompt('请先快速理解当前工作区的结构、技术栈和关键入口文件，然后给我一个简短概览。')}
                  style={{ borderRadius: 12 }}
                >
                  解释当前项目
                </Button>
                <Button
                  onClick={() => setCodeAgentPrompt('请检查当前工作区里最可能导致最近问题的代码位置，并给出排查结论。')}
                >
                  分析最近问题
                </Button>
              </div>

              <Button
                type="primary"
                onClick={() => void handleCodeAgentRun()}
                disabled={codeAgentBusyAction !== null}
                className={styles.runMainButton}
              >
                <RefreshCw style={{ marginRight: 8, height: 16, width: 16 }} className={codeAgentBusyAction === 'run' ? 'animate-spin' : ''} />
                {codeAgentBusyAction === 'run' ? t('common:status.running') : t('settings:developer.codeAgentRun')}
              </Button>
            </section>

            <section className={styles.sectionCard}>
              <div className={styles.lastRunHeader}>
                <div className={styles.lastRunTitleGroup}>
                  <p className={styles.sectionTitle}>{t('settings:developer.codeAgentLastRun')}</p>
                  {codeAgentLastRun?.result?.status && (
                    <Badge variant="outline" style={{ borderRadius: 9999, paddingLeft: 12, paddingRight: 12, paddingTop: 4, paddingBottom: 4 }}>
                      {codeAgentLastRun.result.status}
                    </Badge>
                  )}
                </div>
                <Button
                  size="small"
                  onClick={() => setShowCodeAgentRunDetails((prev) => !prev)}
                  style={{ borderRadius: 9999 }}
                  disabled={!codeAgentLastRun}
                >
                  {showCodeAgentRunDetails ? t('common:actions.hide') : t('common:actions.show')}
                </Button>
              </div>

              {!codeAgentLastRun ? (
                <p className={styles.lastRunNoData}>{t('settings:developer.codeAgentNoRun')}</p>
              ) : (
                <>
                  <div className={styles.lastRunMetaList}>
                    <p>{t('settings:developer.codeAgentRunId')}: {codeAgentLastRun.result?.runId || '-'}</p>
                    <p>{t('settings:developer.codeAgentWorkspace')}: {codeAgentLastRun.request.workspaceRoot || '-'}</p>
                    <p>{t('settings:developer.codeAgentStartedAt')}: {new Date(codeAgentLastRun.startedAt).toLocaleString()}</p>
                    <p>{t('settings:developer.codeAgentCompletedAt')}: {codeAgentLastRun.completedAt ? new Date(codeAgentLastRun.completedAt).toLocaleString() : '-'}</p>
                    {codeAgentLastRun.request.prompt && <p>{t('settings:developer.codeAgentPrompt')}: {codeAgentLastRun.request.prompt}</p>}
                  </div>

                  {codeAgentLastRun.result?.summary && (
                    <div className={styles.summaryBlock}>
                      <p className={styles.summaryLabel}>{t('settings:developer.codeAgentSummary')}</p>
                      <p className={styles.summaryText}>
                        {codeAgentLastRun.result.summary}
                      </p>
                    </div>
                  )}

                  {showCodeAgentRunDetails && codeAgentLastRun.result && (
                    <div className={styles.runDetails}>
                      {codeAgentLastRun.result.output && (
                        <div className={styles.outputBlock}>
                          <p className={styles.outputLabel}>{t('settings:developer.codeAgentOutput')}</p>
                          <pre className={styles.outputPre}>
                            {codeAgentLastRun.result.output}
                          </pre>
                        </div>
                      )}
                      {codeAgentLastRun.result.metadata && (
                        <div className={styles.outputBlock}>
                          <p className={styles.outputLabel}>{t('settings:developer.codeAgentMetadata')}</p>
                          <pre className={styles.outputPre}>
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
