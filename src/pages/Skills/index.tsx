/**
 * Skills Page — grouped list (bundled / local / remote) + skill store route
 */
import { useCallback, useEffect, useState } from 'react';
import { Button, Icon } from '@lobehub/ui';
import { AlertCircle, Store } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSkillsStore } from '@/stores/skills';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { invokeIpc } from '@/lib/api-client';
import { hostApiFetch } from '@/lib/host-api';
import { toast } from 'sonner';
import type { Skill } from '@/types/skill';
import { useTranslation } from 'react-i18next';
import { SettingHeader } from '@/pages/Settings/components/SettingHeader';
import { useSkillsStyles } from './styles';
import { SkillList } from './features/SkillList';
import { categorizeSkill } from './lib/source-taxonomy';
import type { NodeRuntimeUiState } from '@/stores/skills';
import { createSkillDetailModal } from '@/features/SkillStore/SkillDetail';

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
  const [skillsDirPath, setSkillsDirPath] = useState('~/.openclaw/skills');

  useEffect(() => {
    invokeIpc<string>('openclaw:getSkillsDir')
      .then((dir) => setSkillsDirPath(dir as string))
      .catch(console.error);
  }, []);

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
      } catch (err) {
        toast.error(String(err));
      }
    },
    [skills, uninstallSkill, t],
  );

  const openSkillDetail = useCallback(
    (skill: Skill) => {
      createSkillDetailModal({
        skill,
      });
    },
    [],
  );

  const handleOpenStore = useCallback(() => {
    navigate('/skills/store');
  }, [navigate]);

  if (loading) {
    return (
      <div className={styles.loadingWrapper}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className={styles.skillsPageRoot}>
      <div className={styles.skillsPageInner}>
        <SettingHeader
          title={t('title')}
          extra={
            <Button icon={<Icon icon={Store} />} size="large" onClick={handleOpenStore}>
              {t('store.open', { defaultValue: 'Skill store' })}
            </Button>
          }
        />

        <div className={styles.skillsPageContent}>
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
            onSelectSkill={openSkillDetail}
            onToggle={handleToggle}
            onUninstall={handleUninstall}
            onOpenFolder={handleOpenSkillFolder}
            outdated={outdated}
          />
        </div>
      </div>
    </div>
  );
}

Skills.displayName = 'SkillsSetting';

export default Skills;
