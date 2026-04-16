/**
 * Skills Page
 * Browse and manage AI skills
 */
import { useEffect, useState, useCallback } from 'react';
import {
  Puzzle,
  Lock,
  Package,
  AlertCircle,
  Plus,
  Key,
  Trash2,
  RefreshCw,
  FolderOpen,
  FileCode,
  Globe,
  Copy,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useSkillsStore } from '@/stores/skills';
import { useGatewayStore } from '@/stores/gateway';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { SearchInput } from '@/components/common/SearchInput';
import { invokeIpc } from '@/lib/api-client';
import { hostApiFetch } from '@/lib/host-api';
import { trackUiEvent } from '@/lib/telemetry';
import { toast } from 'sonner';
import type { Skill } from '@/types/skill';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useSkillsStyles } from './styles';



// Skill detail dialog component
interface SkillDetailDialogProps {
  skill: Skill | null;
  isOpen: boolean;
  onClose: () => void;
  onToggle: (enabled: boolean) => void;
  onUninstall?: (slug: string) => void;
  onOpenFolder?: (skill: Skill) => Promise<void> | void;
}

function resolveSkillSourceLabel(skill: Skill, t: TFunction<'skills'>): string {
  const source = (skill.source || '').trim().toLowerCase();
  if (!source) {
    if (skill.isBundled) return t('source.badge.bundled', { defaultValue: 'Bundled' });
    return t('source.badge.unknown', { defaultValue: 'Unknown source' });
  }
  if (source === 'openclaw-bundled') return t('source.badge.bundled', { defaultValue: 'Bundled' });
  if (source === 'openclaw-managed') return t('source.badge.managed', { defaultValue: 'Managed' });
  if (source === 'openclaw-workspace') return t('source.badge.workspace', { defaultValue: 'Workspace' });
  if (source === 'openclaw-extra') return t('source.badge.extra', { defaultValue: 'Extra dirs' });
  if (source === 'agents-skills-personal') return t('source.badge.agentsPersonal', { defaultValue: 'Personal .agents' });
  if (source === 'agents-skills-project') return t('source.badge.agentsProject', { defaultValue: 'Project .agents' });
  return source;
}

function SkillDetailDialog({ skill, isOpen, onClose, onToggle, onUninstall, onOpenFolder }: SkillDetailDialogProps) {
  const { t } = useTranslation('skills');
  const { styles } = useSkillsStyles();
  const { fetchSkills } = useSkillsStore();
  const [envVars, setEnvVars] = useState<Array<{ key: string; value: string }>>([]);
  const [apiKey, setApiKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Initialize config from skill
  useEffect(() => {
    if (!skill) return;

    // API Key
    if (skill.config?.apiKey) {
      setApiKey(String(skill.config.apiKey));
    } else {
      setApiKey('');
    }

    // Env Vars
    if (skill.config?.env) {
      const vars = Object.entries(skill.config.env).map(([key, value]) => ({
        key,
        value: String(value),
      }));
      setEnvVars(vars);
    } else {
      setEnvVars([]);
    }
  }, [skill]);

  const handleOpenClawhub = async () => {
    if (!skill?.slug) return;
    await invokeIpc('shell:openExternal', `https://clawhub.ai/s/${skill.slug}`);
  };

  const handleOpenEditor = async () => {
    if (!skill?.id) return;
    try {
      const result = await hostApiFetch<{ success: boolean; error?: string }>('/api/clawhub/open-readme', {
        method: 'POST',
        body: JSON.stringify({ skillKey: skill.id, slug: skill.slug, baseDir: skill.baseDir }),
      });
      if (result.success) {
        toast.success(t('toast.openedEditor'));
      } else {
        toast.error(result.error || t('toast.failedEditor'));
      }
    } catch (err) {
      toast.error(t('toast.failedEditor') + ': ' + String(err));
    }
  };

  const handleCopyPath = async () => {
    if (!skill?.baseDir) return;
    try {
      await navigator.clipboard.writeText(skill.baseDir);
      toast.success(t('toast.copiedPath'));
    } catch (err) {
      toast.error(t('toast.failedCopyPath') + ': ' + String(err));
    }
  };

  const handleAddEnv = () => {
    setEnvVars([...envVars, { key: '', value: '' }]);
  };

  const handleUpdateEnv = (index: number, field: 'key' | 'value', value: string) => {
    const newVars = [...envVars];
    newVars[index] = { ...newVars[index], [field]: value };
    setEnvVars(newVars);
  };

  const handleRemoveEnv = (index: number) => {
    const newVars = [...envVars];
    newVars.splice(index, 1);
    setEnvVars(newVars);
  };

  const handleSaveConfig = async () => {
    if (isSaving || !skill) return;
    setIsSaving(true);
    try {
      // Build env object, filtering out empty keys
      const envObj = envVars.reduce((acc, curr) => {
        const key = curr.key.trim();
        const value = curr.value.trim();
        if (key) {
          acc[key] = value;
        }
        return acc;
      }, {} as Record<string, string>);

      // Use direct file access instead of Gateway RPC for reliability
      const result = await invokeIpc<{ success: boolean; error?: string }>(
        'skill:updateConfig',
        {
          skillKey: skill.id,
          apiKey: apiKey || '', // Empty string will delete the key
          env: envObj // Empty object will clear all env vars
        }
      ) as { success: boolean; error?: string };

      if (!result.success) {
        throw new Error(result.error || 'Unknown error');
      }

      // Refresh skills from gateway to get updated config
      await fetchSkills();

      toast.success(t('detail.configSaved'));
    } catch (err) {
      toast.error(t('toast.failedSave') + ': ' + String(err));
    } finally {
      setIsSaving(false);
    }
  };

  if (!skill) return null;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        className={styles.sheetSkillDetail}
        side="right"
      >
        {/* Scrollable Content */}
        <div className={styles.detailScrollArea}>
          <div className={styles.detailIconWrapper}>
            <div className={styles.detailIconCircle}>
              <span style={{ fontSize: 14 }}>{skill.icon || '🔧'}</span>
              {skill.isCore && (
                <div className={styles.detailCoreLock}>
                  <Lock style={{ width: 12, height: 12, color: 'var(--ant-color-text-secondary)' }} />
                </div>
              )}
            </div>
            <h2 className={styles.detailName}>{skill.name}</h2>
            <div className={styles.detailBadgeRow}>
              <Badge variant="secondary" className={styles.detailBadgePill}>
                v{skill.version}
              </Badge>
              <Badge variant="secondary" className={styles.detailBadgePill}>
                {skill.isCore ? t('detail.coreSystem') : skill.isBundled ? t('detail.bundled') : t('detail.userInstalled')}
              </Badge>
            </div>

            {skill.description && (
              <p className={styles.detailDescription}>{skill.description}</p>
            )}
          </div>

          <div className={styles.detailSection}>
            <div className={styles.detailSectionGroup}>
              <h3 className={styles.detailSectionTitle}>{t('detail.source')}</h3>
              <div className={styles.detailBadgesWrap}>
                <Badge variant="secondary" className={styles.detailBadgePill}>
                  {resolveSkillSourceLabel(skill, t)}
                </Badge>
              </div>
              <div className={styles.detailPathRow}>
                <Input
                  value={skill.baseDir || t('detail.pathUnavailable')}
                  readOnly
                  className={styles.pathInput}
                />
                <Button
                  style={{ height: 38, width: 38, borderColor: 'rgba(0,0,0,0.1)', padding: 0 }}
                  disabled={!skill.baseDir}
                  onClick={handleCopyPath}
                  title={t('detail.copyPath')}
                >
                  <Copy style={{ width: 14, height: 14 }} />
                </Button>
                <Button
                  style={{ height: 38, width: 38, borderColor: 'rgba(0,0,0,0.1)', padding: 0 }}
                  disabled={!skill.baseDir}
                  onClick={() => onOpenFolder?.(skill)}
                  title={t('detail.openActualFolder')}
                >
                  <FolderOpen style={{ width: 14, height: 14 }} />
                </Button>
              </div>
            </div>

            {/* API Key Section */}
            {!skill.isCore && (
              <div className={styles.detailSectionGroup}>
                <h3 className={styles.detailSectionTitleRow}>
                  <Key style={{ width: 14, height: 14, color: '#3b82f6' }} />
                  {t('detail.apiKey')}
                </h3>
                <Input
                  placeholder={t('detail.apiKeyPlaceholder', 'Enter API Key (optional)')}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  type="password"
                  className={styles.apiKeyInput}
                />
                <p className={styles.detailApiKeyDesc}>
                  {t('detail.apiKeyDesc', 'The primary API key for this skill. Leave blank if not required or configured elsewhere.')}
                </p>
              </div>
            )}

            {/* Environment Variables Section */}
            {!skill.isCore && (
              <div className={styles.detailSectionGroup} style={{ gap: 12 }}>
                <div className={styles.detailEnvHeader}>
                  <div className={styles.detailEnvHeaderLeft}>
                    <h3 className={styles.detailSectionTitle}>
                      {t('detail.envVars')}
                      {envVars.length > 0 && (
                        <Badge variant="secondary" className={styles.envCountBadge}>
                          {envVars.length}
                        </Badge>
                      )}
                    </h3>
                  </div>
                  <Button
                    type="text"
                    size="small"
                    className={styles.addEnvBtn}
                    onClick={handleAddEnv}
                  >
                    <Plus style={{ width: 12, height: 12, strokeWidth: 3 }} />
                    {t('detail.addVariable', 'Add Variable')}
                  </Button>
                </div>

                <div className={styles.detailEnvVarList}>
                  {envVars.length === 0 && (
                    <div className={styles.detailEnvEmpty}>
                      {t('detail.noEnvVars', 'No environment variables configured.')}
                    </div>
                  )}

                  {envVars.map((env, index) => (
                    <div className={styles.detailEnvRow} key={index}>
                      <Input
                        value={env.key}
                        onChange={(e) => handleUpdateEnv(index, 'key', e.target.value)}
                        className={styles.envInput}
                        placeholder={t('detail.keyPlaceholder', 'Key')}
                      />
                      <Input
                        value={env.value}
                        onChange={(e) => handleUpdateEnv(index, 'value', e.target.value)}
                        className={styles.envInput}
                        placeholder={t('detail.valuePlaceholder', 'Value')}
                      />
                      <Button
                        type="text"
                        className={styles.envRemoveBtn}
                        style={{ padding: 0, width: 32, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                        onClick={() => handleRemoveEnv(index)}
                      >
                        <Trash2 style={{ width: 16, height: 16 }} />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* External Links */}
            {skill.slug && !skill.isBundled && !skill.isCore && (
              <div className={styles.detailExternalLinks}>
                <Button size="small" className={styles.externalLinkBtn} onClick={handleOpenClawhub}>
                  <Globe style={{ width: 12, height: 12 }} />
                  ClawHub
                </Button>
                <Button size="small" className={styles.externalLinkBtn} onClick={handleOpenEditor}>
                  <FileCode style={{ width: 12, height: 12 }} />
                  {t('detail.openManual')}
                </Button>
              </div>
            )}
          </div>

          {/* Centered Footer Buttons */}
          <div className={styles.detailFooter}>
            {!skill.isCore && (
              <Button
                onClick={handleSaveConfig}
                style={{ flex: 1, height: 42, fontSize: 13, borderRadius: 9999, fontWeight: 600, boxShadow: '0 1px 2px rgba(0,0,0,0.05)', border: '1px solid transparent', background: '#0a84ff', color: 'white' }}
                disabled={isSaving}
              >
                {isSaving ? t('detail.saving') : t('detail.saveConfig')}
              </Button>
            )}

            {!skill.isCore && (
              <Button
                style={{ flex: 1, height: 42, fontSize: 13, borderRadius: 9999, fontWeight: 600 }}
                className={styles.toggleBtn}
                onClick={() => {
                  if (!skill.isBundled && onUninstall && skill.slug) {
                    onUninstall(skill.slug);
                    onClose();
                  } else {
                    onToggle(!skill.enabled);
                  }
                }}
              >
                {!skill.isBundled && onUninstall
                  ? t('detail.uninstall')
                  : (skill.enabled ? t('detail.disable') : t('detail.enable'))}
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function Skills() {
  const {
    skills,
    loading,
    error,
    fetchSkills,
    enableSkill,
    disableSkill,
    searchResults,
    searchSkills,
    installSkill,
    uninstallSkill,
    searching,
    searchError,
    installing
  } = useSkillsStore();
  const { t } = useTranslation('skills');
  const { styles, cx } = useSkillsStyles();
  const gatewayStatus = useGatewayStore((state) => state.status);
  const [searchQuery, setSearchQuery] = useState('');
  const [installQuery, setInstallQuery] = useState('');
  const [installSheetOpen, setInstallSheetOpen] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [selectedSource, setSelectedSource] = useState<'all' | 'built-in' | 'marketplace'>('all');

  const isGatewayRunning = gatewayStatus.state === 'running';
  const [showGatewayWarning, setShowGatewayWarning] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (!isGatewayRunning) {
      timer = setTimeout(() => {
        setShowGatewayWarning(true);
      }, 1500);
    } else {
      timer = setTimeout(() => {
        setShowGatewayWarning(false);
      }, 0);
    }
    return () => clearTimeout(timer);
  }, [isGatewayRunning]);

  useEffect(() => {
    if (isGatewayRunning) {
      fetchSkills();
    }
  }, [fetchSkills, isGatewayRunning]);

  const safeSkills = Array.isArray(skills) ? skills : [];
  const filteredSkills = safeSkills.filter((skill) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      q.length === 0 ||
      skill.name.toLowerCase().includes(q) ||
      skill.description.toLowerCase().includes(q) ||
      skill.id.toLowerCase().includes(q) ||
      (skill.slug || '').toLowerCase().includes(q) ||
      (skill.author || '').toLowerCase().includes(q);

    let matchesSource = true;
    if (selectedSource === 'built-in') {
      matchesSource = !!skill.isBundled;
    } else if (selectedSource === 'marketplace') {
      matchesSource = !skill.isBundled;
    }

    return matchesSearch && matchesSource;
  }).sort((a, b) => {
    if (a.enabled && !b.enabled) return -1;
    if (!a.enabled && b.enabled) return 1;
    if (a.isCore && !b.isCore) return -1;
    if (!a.isCore && b.isCore) return 1;
    return a.name.localeCompare(b.name);
  });

  const sourceStats = {
    all: safeSkills.length,
    builtIn: safeSkills.filter(s => s.isBundled).length,
    marketplace: safeSkills.filter(s => !s.isBundled).length,
  };

  const bulkToggleVisible = useCallback(async (enable: boolean) => {
    const candidates = filteredSkills.filter((skill) => !skill.isCore && skill.enabled !== enable);
    if (candidates.length === 0) {
      toast.info(enable ? t('toast.noBatchEnableTargets') : t('toast.noBatchDisableTargets'));
      return;
    }

    let succeeded = 0;
    for (const skill of candidates) {
      try {
        if (enable) {
          await enableSkill(skill.id);
        } else {
          await disableSkill(skill.id);
        }
        succeeded += 1;
      } catch {
        // Continue to next skill and report final summary.
      }
    }

    trackUiEvent('skills.batch_toggle', { enable, total: candidates.length, succeeded });
    if (succeeded === candidates.length) {
      toast.success(enable ? t('toast.batchEnabled', { count: succeeded }) : t('toast.batchDisabled', { count: succeeded }));
      return;
    }
    toast.warning(t('toast.batchPartial', { success: succeeded, total: candidates.length }));
  }, [disableSkill, enableSkill, filteredSkills, t]);

  const handleToggle = useCallback(async (skillId: string, enable: boolean) => {
    try {
      if (enable) {
        await enableSkill(skillId);
        toast.success(t('toast.enabled'));
      } else {
        await disableSkill(skillId);
        toast.success(t('toast.disabled'));
      }
    } catch (err) {
      toast.error(String(err));
    }
  }, [enableSkill, disableSkill, t]);

  const hasInstalledSkills = safeSkills.some(s => !s.isBundled);

  const handleOpenSkillsFolder = useCallback(async () => {
    try {
      const skillsDir = await invokeIpc<string>('openclaw:getSkillsDir');
      if (!skillsDir) {
        throw new Error('Skills directory not available');
      }
      const result = await invokeIpc<string>('shell:openPath', skillsDir);
      if (result) {
        if (result.toLowerCase().includes('no such file') || result.toLowerCase().includes('not found') || result.toLowerCase().includes('failed to open')) {
          toast.error(t('toast.failedFolderNotFound'));
        } else {
          throw new Error(result);
        }
      }
    } catch (err) {
      toast.error(t('toast.failedOpenFolder') + ': ' + String(err));
    }
  }, [t]);

  const handleOpenSkillFolder = useCallback(async (skill: Skill) => {
    try {
      const result = await hostApiFetch<{ success: boolean; error?: string }>('/api/clawhub/open-path', {
        method: 'POST',
        body: JSON.stringify({
          skillKey: skill.id,
          slug: skill.slug,
          baseDir: skill.baseDir,
        }),
      });
      if (!result.success) {
        throw new Error(result.error || 'Failed to open folder');
      }
    } catch (err) {
      toast.error(t('toast.failedOpenActualFolder') + ': ' + String(err));
    }
  }, [t]);

  const [skillsDirPath, setSkillsDirPath] = useState('~/.openclaw/skills');

  useEffect(() => {
    invokeIpc<string>('openclaw:getSkillsDir')
      .then((dir) => setSkillsDirPath(dir as string))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!installSheetOpen) {
      return;
    }

    const query = installQuery.trim();
    if (query.length === 0) {
      searchSkills('');
      return;
    }

    const timer = setTimeout(() => {
      searchSkills(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [installQuery, installSheetOpen, searchSkills]);

  const handleInstall = useCallback(async (slug: string) => {
    try {
      await installSkill(slug);
      await enableSkill(slug);
      toast.success(t('toast.installed'));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (['installTimeoutError', 'installRateLimitError'].includes(errorMessage)) {
        toast.error(t(`toast.${errorMessage}`, { path: skillsDirPath }), { duration: 10000 });
      } else {
        toast.error(t('toast.failedInstall') + ': ' + errorMessage);
      }
    }
  }, [installSkill, enableSkill, t, skillsDirPath]);

  const handleUninstall = useCallback(async (slug: string) => {
    try {
      await uninstallSkill(slug);
      toast.success(t('toast.uninstalled'));
    } catch (err) {
      toast.error(t('toast.failedUninstall') + ': ' + String(err));
    }
  }, [uninstallSkill, t]);

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

        {/* Header */}
        <div className={styles.header}>
          <div>
            <h1 className={styles.headerTitle} style={{ fontFamily: 'Georgia, Cambria, "Times New Roman", Times, serif' }}>
              {t('title')}
            </h1>
            <p className={styles.headerSubtitle}>{t('subtitle')}</p>
          </div>

          <div className={styles.headerActions}>
            {hasInstalledSkills && (
              <button
                onClick={handleOpenSkillsFolder}
                className={styles.folderButton}
              >
                <FolderOpen style={{ width: 16, height: 16, marginRight: 8 }} />
                {t('openFolder')}
              </button>
            )}
          </div>
        </div>

        {/* Gateway Warning */}
        {showGatewayWarning && (
          <div className={styles.gatewayWarning}>
            <AlertCircle className={styles.gatewayWarningIcon} style={{ width: 20, height: 20 }} />
            <span className={styles.gatewayWarningText}>{t('gatewayWarning')}</span>
          </div>
        )}

        {/* Sub Navigation and Actions */}
        <div className={styles.subNav}>
          <div className={styles.filterGroup}>
            <SearchInput
              placeholder={t('search')}
              value={searchQuery}
              onValueChange={setSearchQuery}
              clearable
              className={styles.searchWrapper}
              inputClassName={styles.searchInputEl}
            />

            <div className={styles.filterButtons}>
              <button
                onClick={() => setSelectedSource('all')}
                className={cx(styles.filterBtn, selectedSource === 'all' && styles.filterBtnActive)}
              >
                {t('filter.all', { count: sourceStats.all })}
              </button>
              <button
                onClick={() => setSelectedSource('built-in')}
                className={cx(styles.filterBtn, selectedSource === 'built-in' && styles.filterBtnActive)}
              >
                {t('filter.builtIn', { count: sourceStats.builtIn })}
              </button>
              <button
                onClick={() => setSelectedSource('marketplace')}
                className={cx(styles.filterBtn, selectedSource === 'marketplace' && styles.filterBtnActive)}
              >
                {t('filter.marketplace', { count: sourceStats.marketplace })}
              </button>
            </div>
          </div>

          <div className={styles.actionButtons}>
            <Button
              size="small"
              onClick={() => bulkToggleVisible(true)}
              className={styles.actionBarBtn}
            >
              {t('actions.enableVisible')}
            </Button>
            <Button
              size="small"
              onClick={() => bulkToggleVisible(false)}
              className={styles.actionBarBtn}
            >
              {t('actions.disableVisible')}
            </Button>
            <Button
              size="small"
              onClick={() => {
                setInstallQuery('');
                setInstallSheetOpen(true);
              }}
              className={styles.actionBarBtn}
            >
              {t('actions.installSkill')}
            </Button>
            <Button
              type="text"
              onClick={fetchSkills}
              disabled={!isGatewayRunning}
              className={styles.actionBarRefreshBtn}
              style={{ padding: 0, width: 32, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
              title={t('refresh')}
            >
              <RefreshCw style={{ width: 16, height: 16 }} className={loading ? 'animate-spin' : ''} />
            </Button>
          </div>
        </div>

        {/* Content Area */}
        <div className={styles.contentArea}>
          {error && (
            <div className={styles.errorBanner}>
              <AlertCircle style={{ width: 20, height: 20, flexShrink: 0 }} />
              <span>
                {['fetchTimeoutError', 'fetchRateLimitError', 'timeoutError', 'rateLimitError'].includes(error)
                  ? t(`toast.${error}`, { path: skillsDirPath })
                  : error}
              </span>
            </div>
          )}

          <div className={styles.skillList}>
            {filteredSkills.length === 0 ? (
              <div className={styles.emptyState}>
                <Puzzle style={{ width: 40, height: 40, marginBottom: 16, opacity: 0.5 }} />
                <p>{searchQuery ? t('noSkillsSearch') : t('noSkillsAvailable')}</p>
              </div>
            ) : (
              filteredSkills.map((skill) => (
                <div
                  key={skill.id}
                  className={styles.skillRow}
                  onClick={() => setSelectedSkill(skill)}
                >
                  <div className={styles.skillInfo}>
                    <div className={styles.skillIcon}>
                      {skill.icon || '🧩'}
                    </div>
                    <div className={styles.skillMeta}>
                      <div className={styles.skillNameRow}>
                        <h3 className={styles.skillName}>{skill.name}</h3>
                        {skill.isCore ? (
                          <Lock style={{ width: 12, height: 12, color: 'var(--ant-color-text-secondary)' }} />
                        ) : skill.isBundled ? (
                          <Puzzle style={{ width: 12, height: 12, color: 'rgba(59,130,246,0.7)' }} />
                        ) : null}
                        {skill.slug && skill.slug !== skill.name ? (
                          <span className={styles.skillSlug}>{skill.slug}</span>
                        ) : null}
                      </div>
                      <p className={styles.skillDescription}>{skill.description}</p>
                      <div className={styles.skillTagRow}>
                        <Badge variant="secondary" className={styles.skillSourceBadge}>
                          {resolveSkillSourceLabel(skill, t)}
                        </Badge>
                        <span className={styles.skillBaseDirMono}>
                          {skill.baseDir || t('detail.pathUnavailable')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className={styles.skillControls} onClick={e => e.stopPropagation()}>
                    {skill.version && (
                      <span className={styles.skillVersion}>v{skill.version}</span>
                    )}
                    <Switch
                      checked={skill.enabled}
                      onChange={(checked) => handleToggle(skill.id, checked)}
                      disabled={skill.isCore}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <Sheet open={installSheetOpen} onOpenChange={setInstallSheetOpen}>
        <SheetContent
          className={styles.sheetInstallPanel}
          side="right"
        >
          <div className={styles.sheetHeader}>
            <h2 className={styles.sheetTitle}>{t('marketplace.installDialogTitle')}</h2>
            <p className={styles.sheetSubtitle}>{t('marketplace.installDialogSubtitle')}</p>
            <div className={styles.sheetSearchRow}>
              <SearchInput
                placeholder={t('searchMarketplace')}
                value={installQuery}
                onValueChange={setInstallQuery}
                clearable
                className={styles.marketplaceSearchWrapper}
                inputClassName={styles.marketplaceSearchInputEl}
              />
              <Button
                disabled
                className={styles.marketplaceSourceBtn}
              >
                {t('marketplace.sourceLabel')}: {t('marketplace.sourceClawHub')}
              </Button>
            </div>
          </div>

          <div className={styles.sheetContent}>
            {searchError && (
              <div className={styles.errorBanner}>
                <AlertCircle style={{ width: 20, height: 20, flexShrink: 0 }} />
                <span>
                  {['searchTimeoutError', 'searchRateLimitError', 'timeoutError', 'rateLimitError'].includes(searchError.replace('Error: ', ''))
                    ? t(`toast.${searchError.replace('Error: ', '')}`, { path: skillsDirPath })
                    : t('marketplace.searchError')}
                </span>
              </div>
            )}

            {searching && (
              <div className={styles.marketplaceSearching}>
                <LoadingSpinner size="lg" />
                <p style={{ marginTop: 16, fontSize: 14 }}>{t('marketplace.searching')}</p>
              </div>
            )}

            {!searching && searchResults.length > 0 && (
              <div className={styles.marketplaceList}>
                {searchResults.map((skill) => {
                  const isInstalled = safeSkills.some(s => s.id === skill.slug || s.name === skill.name);
                  const isInstallLoading = !!installing[skill.slug];

                  return (
                    <div
                      key={skill.slug}
                      className={styles.marketplaceRow}
                      onClick={() => invokeIpc('shell:openExternal', `https://clawhub.ai/s/${skill.slug}`)}
                    >
                      <div className={styles.skillInfo}>
                        <div className={styles.skillIcon}>📦</div>
                        <div className={styles.skillMeta}>
                          <div className={styles.skillNameRow}>
                            <h3 className={styles.skillName}>{skill.name}</h3>
                            {skill.author && (
                              <span style={{ fontSize: 12, color: 'var(--ant-color-text-secondary)' }}>• {skill.author}</span>
                            )}
                          </div>
                          <p className={styles.skillDescription}>{skill.description}</p>
                        </div>
                      </div>
                      <div className={styles.marketplaceControls} onClick={e => e.stopPropagation()}>
                        {skill.version && (
                          <span className={styles.marketplaceVersion}>v{skill.version}</span>
                        )}
                        {isInstalled ? (
                          <Button
                            type="primary"
                            danger
                            size="small"
                            onClick={() => handleUninstall(skill.slug)}
                            disabled={isInstallLoading}
                            className={styles.uninstallBtn}
                          >
                            {isInstallLoading ? <LoadingSpinner size="sm" /> : <Trash2 style={{ width: 14, height: 14 }} />}
                          </Button>
                        ) : (
                          <Button
                            type="primary"
                            size="small"
                            onClick={() => handleInstall(skill.slug)}
                            disabled={isInstallLoading}
                            className={styles.installBtn}
                          >
                            {isInstallLoading ? <LoadingSpinner size="sm" /> : t('marketplace.install', 'Install')}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {!searching && searchResults.length === 0 && !searchError && (
              <div className={styles.marketplaceEmptyState}>
                <Package style={{ width: 40, height: 40, marginBottom: 16, opacity: 0.5 }} />
                <p>{installQuery.trim() ? t('marketplace.noResults') : t('marketplace.emptyPrompt')}</p>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Skill Detail Dialog */}
      <SkillDetailDialog
        skill={selectedSkill}
        isOpen={!!selectedSkill}
        onClose={() => setSelectedSkill(null)}
        onToggle={(enabled) => {
          if (!selectedSkill) return;
          handleToggle(selectedSkill.id, enabled);
          setSelectedSkill({ ...selectedSkill, enabled });
        }}
        onUninstall={handleUninstall}
        onOpenFolder={handleOpenSkillFolder}
      />
    </div>
  );
}

export default Skills;
