/**
 * Skills Page — grouped list (bundled / local / remote) + skill store route
 */
import { useCallback, useEffect, useState } from 'react';
import { Button, Icon } from '@lobehub/ui';
import { AlertCircle, Store } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSkillsStore } from '@/stores/skills';
import { useGatewayStore } from '@/stores/gateway';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { invokeIpc } from '@/lib/api-client';
import { hostApiFetch } from '@/lib/host-api';
import { toast } from 'sonner';
import type { Skill } from '@/types/skill';
import { useTranslation } from 'react-i18next';
import { SettingHeader } from '@/pages/Settings/components/SettingHeader';
import { useSkillsStyles } from './styles';
import { SkillList } from './features/SkillList';
import { SkillDetailSheet } from './features/SkillDetailSheet';
import { categorizeSkill } from './lib/source-taxonomy';
import { resolvePermissions } from './lib/skill-permissions';
import type { NodeRuntimeUiState } from '@/stores/skills';

export function Skills() {
  const {
    skills,
    loading,
    error,
    fetchSkills,
    enableSkill,
    disableSkill,
    uninstallSkill,
    checkOutdated,
    outdated,
    setNodeRuntime,
  } = useSkillsStore();
  const { t } = useTranslation('skills');
  const { styles } = useSkillsStyles();
  const navigate = useNavigate();
  const gatewayStatus = useGatewayStore((state) => state.status);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [showGatewayWarning, setShowGatewayWarning] = useState(false);
  const [skillsDirPath, setSkillsDirPath] = useState('~/.openclaw/skills');

  const isGatewayRunning = gatewayStatus.state === 'running';

  useEffect(() => {
    invokeIpc<string>('openclaw:getSkillsDir')
      .then((dir) => setSkillsDirPath(dir as string))
      .catch(console.error);
  }, []);

  useEffect(() => {
    const timer = setTimeout(
      () => setShowGatewayWarning(!isGatewayRunning),
      isGatewayRunning ? 0 : 1500,
    );
    return () => clearTimeout(timer);
  }, [isGatewayRunning]);

  useEffect(() => {
    void fetchSkills();
  }, [fetchSkills]);

  useEffect(() => {
    void checkOutdated(false);
  }, [checkOutdated]);

  useEffect(() => {
    const unsub = window.electron.ipcRenderer.on(
      'skills:runtime-progress',
      (payload: unknown) => {
        setNodeRuntime(payload as NodeRuntimeUiState);
      },
    );
    return () => {
      unsub?.();
    };
  }, [setNodeRuntime]);

  const handleToggle = useCallback(
    async (skillId: string, enable: boolean) => {
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
    },
    [enableSkill, disableSkill, t],
  );

  const handleOpenSkillFolder = useCallback(
    async (skill: Skill) => {
      try {
        const result = await hostApiFetch<{ success: boolean; error?: string }>('/api/skills/open-path', {
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
    },
    [t],
  );

  const handleUninstall = useCallback(
    async (slug: string) => {
      const skill = skills.find((s) => s.slug === slug || s.id === slug);
      const cat = skill ? categorizeSkill(skill) : 'local';
      const base = skill?.baseDir || '';
      if (cat === 'local') {
        const ok = window.confirm(
          t('uninstall.confirmLocalBody', { baseDir: base, defaultValue: `Remove local skill files under:\n${base}` }),
        );
        if (!ok) return;
      }
      try {
        await uninstallSkill(slug);
        toast.success(t('toast.uninstalled'));
        setSelectedSkill(null);
      } catch (err) {
        toast.error(String(err));
      }
    },
    [skills, uninstallSkill, t],
  );

  if (loading) {
    return (
      <div className={styles.loadingWrapper}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const defaultPerms = {
    canToggle: false,
    canUninstall: false,
    canConfigure: false,
    canUpdate: false,
    canOpenFolder: false,
  };

  return (
    <div className={styles.skillsPageRoot}>
      <div className={styles.skillsPageInner}>
        <SettingHeader
          title={t('title')}
          extra={
            <Button icon={<Icon icon={Store} />} size="large" onClick={() => navigate('/skills/store')}>
              {t('store.open', { defaultValue: 'Skill store' })}
            </Button>
          }
        />

        {showGatewayWarning && (
          <div className={styles.gatewayWarning}>
            <AlertCircle className={styles.gatewayWarningIcon} style={{ width: 20, height: 20 }} />
            <span className={styles.gatewayWarningText}>{t('gatewayWarning')}</span>
          </div>
        )}

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

        <SkillList
          skills={skills}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSelectSkill={setSelectedSkill}
          onToggle={handleToggle}
          onRefresh={fetchSkills}
          loading={loading}
          isGatewayRunning={isGatewayRunning}
          outdated={outdated}
        />
      </div>

      <SkillDetailSheet
        skill={selectedSkill}
        isOpen={!!selectedSkill}
        onClose={() => setSelectedSkill(null)}
        onToggle={(enabled) => {
          if (!selectedSkill) return;
          void handleToggle(selectedSkill.id, enabled);
          setSelectedSkill({ ...selectedSkill, enabled });
        }}
        onUninstall={handleUninstall}
        onOpenFolder={handleOpenSkillFolder}
        permissions={
          selectedSkill ? resolvePermissions(selectedSkill, categorizeSkill(selectedSkill)) : defaultPerms
        }
      />
    </div>
  );
}

export default Skills;
