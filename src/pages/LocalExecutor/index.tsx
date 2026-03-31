import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, FileCode2, FolderOpen, Play, RefreshCw, ShieldAlert, TerminalSquare } from 'lucide-react';
import { hostApiFetch } from '@/lib/host-api';
import { invokeIpc } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { toast } from 'sonner';
import type {
  LocalSkillDefinition,
  LocalSkillField,
  LocalSkillRunRecord,
  LocalSkillRunRequest,
  LocalExecutorMeta,
} from '../../../shared/local-executor';

type OpenDialogResult = {
  canceled: boolean;
  filePaths: string[];
};

type MessageDialogResult = {
  response: number;
};

function getRiskLabel(riskLevel: LocalSkillDefinition['riskLevel']): string {
  if (riskLevel === 'high') return '高风险';
  if (riskLevel === 'medium') return '中风险';
  return '低风险';
}

function getRiskBadgeClass(riskLevel: LocalSkillDefinition['riskLevel']): string {
  if (riskLevel === 'high') return 'bg-red-100 text-red-900 dark:bg-red-500/20 dark:text-red-100';
  if (riskLevel === 'medium') return 'bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-100';
  return 'bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-100';
}

function shouldPromptBeforeRun(skill: LocalSkillDefinition, values: Record<string, string | boolean>): boolean {
  if (skill.approvalMode === 'never') return false;
  if (skill.approvalMode === 'always') return true;
  return !values.dryRun;
}

function buildDefaultValues(skill: LocalSkillDefinition | null): Record<string, string | boolean> {
  if (!skill) return {};
  return skill.fields.reduce<Record<string, string | boolean>>((acc, field) => {
    const value = field.defaultValue;
    if (typeof value === 'boolean') {
      acc[field.key] = value;
    } else if (typeof value === 'number') {
      acc[field.key] = String(value);
    } else {
      acc[field.key] = value ?? '';
    }
    return acc;
  }, {});
}

function JsonPreview({ value }: { value: unknown }) {
  return (
    <pre className="max-h-[420px] overflow-auto rounded-xl bg-[#171717] p-4 text-xs leading-6 text-white/90">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

export function LocalExecutor() {
  const [skills, setSkills] = useState<LocalSkillDefinition[]>([]);
  const [runs, setRuns] = useState<LocalSkillRunRecord[]>([]);
  const [meta, setMeta] = useState<LocalExecutorMeta | null>(null);
  const [selectedSkillId, setSelectedSkillId] = useState<string>('');
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [selectedRun, setSelectedRun] = useState<LocalSkillRunRecord | null>(null);

  const selectedSkill = useMemo(
    () => skills.find((skill) => skill.id === selectedSkillId) || null,
    [selectedSkillId, skills],
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [skillsRes, runsRes, metaRes] = await Promise.all([
        hostApiFetch<{ success: boolean; skills: LocalSkillDefinition[] }>('/api/local-executor/skills'),
        hostApiFetch<{ success: boolean; runs: LocalSkillRunRecord[] }>('/api/local-executor/runs'),
        hostApiFetch<{ success: boolean; meta: LocalExecutorMeta }>('/api/local-executor/meta'),
      ]);
      setSkills(skillsRes.skills || []);
      setRuns(runsRes.runs || []);
      setMeta(metaRes.meta || null);

      const nextSkill = (skillsRes.skills || [])[0] || null;
      const stillExists = nextSkill && (skillsRes.skills || []).some((skill) => skill.id === selectedSkillId);
      const resolvedSkill = stillExists
        ? (skillsRes.skills || []).find((skill) => skill.id === selectedSkillId) || nextSkill
        : nextSkill;

      if (resolvedSkill) {
        setSelectedSkillId(resolvedSkill.id);
        setValues((current) => Object.keys(current).length > 0 && selectedSkillId === resolvedSkill.id
          ? current
          : buildDefaultValues(resolvedSkill));
      }

      if (!selectedRun && runsRes.runs?.[0]) {
        setSelectedRun(runsRes.runs[0]);
      }
    } catch (error) {
      toast.error(`加载本地执行能力失败: ${String(error)}`);
    } finally {
      setLoading(false);
    }
  }, [selectedRun, selectedSkillId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (selectedSkill) {
      setValues(buildDefaultValues(selectedSkill));
    }
  }, [selectedSkill]);

  const updateValue = useCallback((fieldKey: string, nextValue: string | boolean) => {
    setValues((current) => ({ ...current, [fieldKey]: nextValue }));
  }, []);

  const browseDirectory = useCallback(async (field: LocalSkillField) => {
    try {
      const result = await invokeIpc<OpenDialogResult>('dialog:open', {
        properties: ['openDirectory'],
        defaultPath: typeof values[field.key] === 'string' && values[field.key] ? String(values[field.key]) : undefined,
      });
      if (!result.canceled && result.filePaths[0]) {
        updateValue(field.key, result.filePaths[0]);
      }
    } catch (error) {
      toast.error(`选择目录失败: ${String(error)}`);
    }
  }, [updateValue, values]);

  const runSkill = useCallback(async () => {
    if (!selectedSkill) return;

    const request: LocalSkillRunRequest = {
      input: values,
      confirmDangerousAction: !selectedSkill.requiresApproval,
    };

    if (shouldPromptBeforeRun(selectedSkill, values)) {
      const confirmResult = await invokeIpc<MessageDialogResult>('dialog:message', {
        type: 'warning',
        buttons: ['继续执行', '取消'],
        defaultId: 0,
        cancelId: 1,
        title: '确认执行本地操作',
        message: `${selectedSkill.title} 可能会修改本地文件或执行命令。`,
        detail: '请确认这是你期望的操作，并且输入参数是可信的。',
      });
      if (confirmResult.response !== 0) {
        return;
      }
      request.confirmDangerousAction = true;
    }

    setRunning(true);
    try {
      const response = await hostApiFetch<{ success: boolean; run: LocalSkillRunRecord; error?: string }>(
        `/api/local-executor/skills/${encodeURIComponent(selectedSkill.id)}/run`,
        {
          method: 'POST',
          body: JSON.stringify(request),
        },
      );

      if (!response.success) {
        throw new Error(response.error || 'Run failed');
      }

      setRuns((current) => [response.run, ...current].slice(0, 20));
      setSelectedRun(response.run);
      if (response.run.status === 'success') {
        toast.success(response.run.summary);
      } else {
        toast.error(response.run.error || response.run.summary);
      }
    } catch (error) {
      toast.error(`执行失败: ${String(error)}`);
    } finally {
      setRunning(false);
    }
  }, [selectedSkill, values]);

  const openPath = useCallback(async (targetPath: string, revealInFolder = false) => {
    try {
      if (revealInFolder) {
        await invokeIpc('shell:showItemInFolder', targetPath);
      } else {
        const result = await invokeIpc<string>('shell:openPath', targetPath);
        if (result) {
          throw new Error(result);
        }
      }
    } catch (error) {
      toast.error(`打开路径失败: ${String(error)}`);
    }
  }, []);

  if (loading) {
    return (
      <div className="flex h-full min-h-[420px] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-[1500px] flex-col gap-6 px-6 py-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">本地执行中心</h1>
          <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
            这里不是 OpenClaw 云端 skill 市场，而是客户端自己的本地执行层。先挑一个 skill，再把目录、命令或参数交给它执行。
          </p>
        </div>
        <Button variant="outline" onClick={() => void loadData()} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          刷新
        </Button>
      </div>

      {meta ? (
        <Card className="border-black/10 bg-[#fbfaf7] dark:bg-card">
          <CardContent className="grid gap-4 p-5 md:grid-cols-3">
            <div className="space-y-2">
              <div className="text-sm font-medium text-foreground">用户本地 Skills 目录</div>
              <div className="text-xs leading-5 text-muted-foreground">{meta.userSkillsDir}</div>
              <Button variant="outline" size="sm" onClick={() => void openPath(meta.userSkillsDir)}>
                <FolderOpen className="mr-2 h-4 w-4" />
                打开目录
              </Button>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-foreground">内置 Skills 目录</div>
              <div className="text-xs leading-5 text-muted-foreground">{meta.bundledSkillsDir}</div>
              <Button variant="outline" size="sm" onClick={() => void openPath(meta.bundledSkillsDir)}>
                <FolderOpen className="mr-2 h-4 w-4" />
                查看内置包
              </Button>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-foreground">审计日志文件</div>
              <div className="text-xs leading-5 text-muted-foreground">{meta.auditLogPath}</div>
              <Button variant="outline" size="sm" onClick={() => void openPath(meta.auditLogPath, true)}>
                <FileCode2 className="mr-2 h-4 w-4" />
                在文件夹中显示
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid min-h-0 flex-1 gap-6 xl:grid-cols-[360px_minmax(0,1fr)_420px]">
        <Card className="overflow-hidden border-black/10 bg-[#f7f5ef] dark:bg-card">
          <CardHeader>
            <CardTitle className="text-xl">内置本地 Skills</CardTitle>
            <CardDescription>先做 4 个可落地的本地能力示范，后续可以继续挂企业私有 skill。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 overflow-auto">
            {skills.map((skill) => {
              const isActive = skill.id === selectedSkillId;
              return (
                <button
                  key={skill.id}
                  type="button"
                  onClick={() => {
                    setSelectedSkillId(skill.id);
                    setSelectedRun(null);
                  }}
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    isActive
                      ? 'border-foreground/20 bg-white shadow-sm dark:bg-accent'
                      : 'border-black/10 bg-white/70 hover:bg-white dark:bg-muted/40 dark:hover:bg-muted'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{skill.emoji}</span>
                        <div>
                          <div className="font-medium text-foreground">{skill.title}</div>
                          <div className="text-xs text-muted-foreground">{skill.category}</div>
                        </div>
                      </div>
                      <p className="text-sm leading-6 text-muted-foreground">{skill.summary}</p>
                    </div>
                    {skill.requiresApproval ? (
                      <ShieldAlert className="mt-1 h-4 w-4 shrink-0 text-amber-600" />
                    ) : null}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant="secondary" className={getRiskBadgeClass(skill.riskLevel)}>
                      {getRiskLabel(skill.riskLevel)}
                    </Badge>
                    <Badge variant="secondary" className="font-mono text-[11px]">
                      {skill.source === 'bundled' ? 'Bundled' : 'User'}
                    </Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {skill.capabilities.map((capability) => (
                      <Badge key={capability} variant="secondary" className="font-mono text-[11px]">
                        {capability}
                      </Badge>
                    ))}
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-black/10">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <span className="text-3xl">{selectedSkill?.emoji || '🛠️'}</span>
                  {selectedSkill?.title || '选择一个 Skill'}
                </CardTitle>
                <CardDescription className="max-w-3xl text-sm leading-6">
                  {selectedSkill?.description || '从左侧选择一个本地 skill。'}
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedSkill ? (
                  <Badge variant="secondary" className={getRiskBadgeClass(selectedSkill.riskLevel)}>
                    {getRiskLabel(selectedSkill.riskLevel)}
                  </Badge>
                ) : null}
                {selectedSkill?.requiresApproval ? (
                  <Badge variant="secondary" className="gap-1 bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-100">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {selectedSkill.approvalMode === 'mutating_only' ? '变更前确认' : '执行前确认'}
                  </Badge>
                ) : null}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {selectedSkill ? (
              <>
                <div className="grid gap-3 rounded-2xl border border-black/10 bg-muted/20 p-4 text-sm md:grid-cols-2">
                  <div>
                    <div className="text-xs text-muted-foreground">来源</div>
                    <div className="font-medium text-foreground">{selectedSkill.source === 'bundled' ? '内置 Skill 包' : '用户 Skill 包'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Skill 路径</div>
                    <button
                      type="button"
                      className="truncate text-left font-medium text-foreground hover:underline"
                      onClick={() => void openPath(selectedSkill.baseDir)}
                    >
                      {selectedSkill.baseDir}
                    </button>
                  </div>
                </div>

                <div className="grid gap-5">
                  {selectedSkill.fields.map((field) => (
                    <div key={field.key} className="space-y-2">
                      <Label htmlFor={field.key}>{field.label}</Label>
                      {field.description ? (
                        <p className="text-xs leading-5 text-muted-foreground">{field.description}</p>
                      ) : null}
                      {field.type === 'textarea' ? (
                        <Textarea
                          id={field.key}
                          value={String(values[field.key] ?? '')}
                          placeholder={field.placeholder}
                          onChange={(event) => updateValue(field.key, event.target.value)}
                        />
                      ) : field.type === 'boolean' ? (
                        <div className="flex items-center justify-between rounded-xl border border-black/10 px-4 py-3">
                          <span className="text-sm text-foreground">{field.label}</span>
                          <Switch
                            checked={Boolean(values[field.key])}
                            onCheckedChange={(checked) => updateValue(field.key, checked)}
                          />
                        </div>
                      ) : field.type === 'directory' ? (
                        <div className="flex gap-2">
                          <Input
                            id={field.key}
                            value={String(values[field.key] ?? '')}
                            placeholder={field.placeholder}
                            onChange={(event) => updateValue(field.key, event.target.value)}
                          />
                          <Button type="button" variant="outline" size="icon" onClick={() => void browseDirectory(field)}>
                            <FolderOpen className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <Input
                          id={field.key}
                          type={field.type === 'number' ? 'number' : 'text'}
                          value={String(values[field.key] ?? '')}
                          placeholder={field.placeholder}
                          onChange={(event) => updateValue(field.key, event.target.value)}
                        />
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Button onClick={() => void runSkill()} disabled={running} className="gap-2">
                    {running ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                    {running ? '执行中...' : '运行 Skill'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setValues(buildDefaultValues(selectedSkill))}
                    disabled={running}
                  >
                    重置参数
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => void openPath(selectedSkill.baseDir)}
                  >
                    <FolderOpen className="mr-2 h-4 w-4" />
                    打开 Skill 目录
                  </Button>
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-black/10 p-8 text-sm text-muted-foreground">
                左侧还没有可用 skill。
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex min-h-0 flex-col gap-6">
          <Card className="min-h-0 flex-1 overflow-hidden border-black/10">
            <CardHeader>
              <CardTitle className="text-xl">最近执行记录</CardTitle>
              <CardDescription>保留最近 20 次运行结果，方便查看本地执行是否真能形成产品闭环。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 overflow-auto">
              {runs.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-black/10 p-6 text-sm text-muted-foreground">
                  还没有执行记录，先跑一个 skill 看看。
                </div>
              ) : (
                runs.map((run) => (
                  <button
                    key={run.runId}
                    type="button"
                    onClick={() => setSelectedRun(run)}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      selectedRun?.runId === run.runId
                        ? 'border-foreground/20 bg-muted/60'
                        : 'border-black/10 bg-background hover:bg-muted/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium text-foreground">{run.skillTitle}</div>
                      <Badge variant={run.status === 'success' ? 'secondary' : 'destructive'}>
                        {run.status === 'success' ? '成功' : '失败'}
                      </Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge variant="secondary" className={getRiskBadgeClass(run.riskLevel)}>
                        {getRiskLabel(run.riskLevel)}
                      </Badge>
                      <Badge variant="secondary" className="font-mono text-[11px]">
                        {run.source === 'bundled' ? 'Bundled' : 'User'}
                      </Badge>
                      <Badge variant="secondary" className="font-mono text-[11px]">
                        {run.approved ? 'Approved' : 'No approval'}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{run.summary}</p>
                    <div className="mt-2 text-xs text-muted-foreground">
                      {new Date(run.finishedAt).toLocaleString()}
                    </div>
                  </button>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-black/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <TerminalSquare className="h-5 w-5" />
                输出详情
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedRun ? (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-foreground">{selectedRun.skillTitle}</div>
                    <div className="text-xs text-muted-foreground">{selectedRun.summary}</div>
                  </div>
                  {selectedRun.error ? (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
                      {selectedRun.error}
                    </div>
                  ) : null}
                  <JsonPreview value={selectedRun.output ?? selectedRun.input} />
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-black/10 p-6 text-sm text-muted-foreground">
                  选择一条运行记录查看输出。
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
