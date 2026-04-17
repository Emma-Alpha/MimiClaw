import { useEffect, useState } from 'react';
import { Lock, Plus, Key, Trash2, FolderOpen, FileCode, Globe, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useSkillsStore } from '@/stores/skills';
import { invokeIpc } from '@/lib/api-client';
import { hostApiFetch } from '@/lib/host-api';
import { toast } from 'sonner';
import type { Skill } from '@/types/skill';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useSkillsStyles } from '@/pages/Skills/styles';
import type { SkillPermissions } from '@/pages/Skills/lib/skill-permissions';

export interface SkillDetailContentProps {
  skill: Skill;
  onClose?: () => void;
  onToggle: (enabled: boolean) => void;
  onUninstall?: (slug: string) => void;
  onOpenFolder?: (skill: Skill) => Promise<void> | void;
  permissions: SkillPermissions;
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

export function SkillDetailContent({
  skill,
  onClose,
  onToggle,
  onUninstall,
  onOpenFolder,
  permissions,
}: SkillDetailContentProps) {
  const { t } = useTranslation('skills');
  const { styles } = useSkillsStyles();
  const { fetchSkills } = useSkillsStore();
  const [envVars, setEnvVars] = useState<Array<{ key: string; value: string }>>([]);
  const [apiKey, setApiKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (skill.config?.apiKey) {
      setApiKey(String(skill.config.apiKey));
    } else {
      setApiKey('');
    }
    if (skill.config?.env) {
      setEnvVars(
        Object.entries(skill.config.env).map(([key, value]) => ({
          key,
          value: String(value),
        })),
      );
    } else {
      setEnvVars([]);
    }
  }, [skill]);

  const handleOpenCatalog = async () => {
    await invokeIpc('shell:openExternal', 'https://skills.sh');
  };

  const handleOpenEditor = async () => {
    if (!skill.id) return;
    try {
      const result = await hostApiFetch<{ success: boolean; error?: string }>('/api/skills/open-readme', {
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
    if (!skill.baseDir) return;
    try {
      await navigator.clipboard.writeText(skill.baseDir);
      toast.success(t('toast.copiedPath'));
    } catch (err) {
      toast.error(t('toast.failedCopyPath') + ': ' + String(err));
    }
  };

  const handleAddEnv = () => setEnvVars([...envVars, { key: '', value: '' }]);
  const handleUpdateEnv = (index: number, field: 'key' | 'value', value: string) => {
    const nextVars = [...envVars];
    nextVars[index] = { ...nextVars[index], [field]: value };
    setEnvVars(nextVars);
  };
  const handleRemoveEnv = (index: number) => {
    const nextVars = [...envVars];
    nextVars.splice(index, 1);
    setEnvVars(nextVars);
  };

  const handleSaveConfig = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const envObj = envVars.reduce(
        (acc, curr) => {
          const key = curr.key.trim();
          const value = curr.value.trim();
          if (key) acc[key] = value;
          return acc;
        },
        {} as Record<string, string>,
      );
      const result = (await invokeIpc<{ success: boolean; error?: string }>('skill:updateConfig', {
        skillKey: skill.id,
        apiKey: apiKey || '',
        env: envObj,
      })) as { success: boolean; error?: string };
      if (!result.success) {
        throw new Error(result.error || 'Unknown error');
      }
      await fetchSkills();
      toast.success(t('detail.configSaved'));
    } catch (err) {
      toast.error(t('toast.failedSave') + ': ' + String(err));
    } finally {
      setIsSaving(false);
    }
  };

  const showConfig = permissions.canConfigure && !skill.isCore;
  const showExternal = skill.slug && !skill.isBundled && !skill.isCore;

  return (
    <div className={styles.skillDetailModalBody}>
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
          {skill.description && <p className={styles.detailDescription}>{skill.description}</p>}
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
              <Input value={skill.baseDir || t('detail.pathUnavailable')} readOnly className={styles.pathInput} />
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

          {showConfig && (
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
                {t(
                  'detail.apiKeyDesc',
                  'The primary API key for this skill. Leave blank if not required or configured elsewhere.',
                )}
              </p>
            </div>
          )}

          {showConfig && (
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
                <Button type="text" size="small" className={styles.addEnvBtn} onClick={handleAddEnv}>
                  <Plus style={{ width: 12, height: 12, strokeWidth: 3 }} />
                  {t('detail.addVariable', 'Add Variable')}
                </Button>
              </div>
              <div className={styles.detailEnvVarList}>
                {envVars.length === 0 && (
                  <div className={styles.detailEnvEmpty}>{t('detail.noEnvVars', 'No environment variables configured.')}</div>
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
                      style={{
                        padding: 0,
                        width: 32,
                        height: 32,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      onClick={() => handleRemoveEnv(index)}
                    >
                      <Trash2 style={{ width: 16, height: 16 }} />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {showExternal && (
            <div className={styles.detailExternalLinks}>
              <Button size="small" className={styles.externalLinkBtn} onClick={handleOpenCatalog}>
                <Globe style={{ width: 12, height: 12 }} />
                skills.sh
              </Button>
              <Button size="small" className={styles.externalLinkBtn} onClick={handleOpenEditor}>
                <FileCode style={{ width: 12, height: 12 }} />
                {t('detail.openManual')}
              </Button>
            </div>
          )}
        </div>

        <div className={styles.detailFooter}>
          {showConfig && (
            <Button
              onClick={handleSaveConfig}
              style={{
                flex: 1,
                height: 42,
                fontSize: 13,
                borderRadius: 9999,
                fontWeight: 600,
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                border: '1px solid transparent',
                background: '#0a84ff',
                color: 'white',
              }}
              disabled={isSaving}
            >
              {isSaving ? t('detail.saving') : t('detail.saveConfig')}
            </Button>
          )}

          {!skill.isCore && permissions.canUninstall && onUninstall && skill.slug && (
            <Button
              style={{ flex: 1, height: 42, fontSize: 13, borderRadius: 9999, fontWeight: 600 }}
              className={styles.toggleBtn}
              onClick={() => {
                onUninstall(skill.slug!);
                onClose?.();
              }}
            >
              {t('detail.uninstall')}
            </Button>
          )}

          {!skill.isCore && permissions.canToggle && !(permissions.canUninstall && onUninstall) && (
            <Button
              style={{ flex: 1, height: 42, fontSize: 13, borderRadius: 9999, fontWeight: 600 }}
              className={styles.toggleBtn}
              onClick={() => onToggle(!skill.enabled)}
            >
              {skill.enabled ? t('detail.disable') : t('detail.enable')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default SkillDetailContent;
