import { Center, Icon, Text } from '@lobehub/ui';
import { ServerCrash } from 'lucide-react';
import { memo, useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useSkillsStore } from '@/stores/skills';
import type { Skill } from '@/types/skill';
import MarketSkillItem from './MarketSkillItem';
import { useSkillStoreListStyles } from '../style';

interface MarketSkillListProps {
  keywords: string;
}

const MarketSkillList = memo<MarketSkillListProps>(({ keywords }) => {
  const { t } = useTranslation('skills');
  const { styles } = useSkillStoreListStyles();
  const {
    skills,
    searchResults,
    searchSkills,
    installSkill,
    uninstallSkill,
    enableSkill,
    installing,
    searching,
    searchError,
    fetchSkills,
    ensureNodeRuntime,
  } = useSkillsStore();

  useEffect(() => {
    void ensureNodeRuntime();
  }, [ensureNodeRuntime]);

  useEffect(() => {
    const query = keywords.trim();
    if (query.length > 0 && query.length < 2) return;
    void searchSkills(query, { trending: query.length === 0 });
  }, [keywords, searchSkills]);

  const installedMap = useMemo(() => {
    const map = new Map<string, Skill>();
    for (const skill of skills) {
      const keys = [skill.id, skill.slug, skill.name].filter(Boolean) as string[];
      for (const key of keys) {
        map.set(key, skill);
      }
    }
    return map;
  }, [skills]);

  const sortedRows = useMemo(() => {
    return [...searchResults].sort((a, b) => {
      const aInstalled = !!installedMap.get(a.slug) || !!installedMap.get(a.name);
      const bInstalled = !!installedMap.get(b.slug) || !!installedMap.get(b.name);
      if (aInstalled && !bInstalled) return 1;
      if (!aInstalled && bInstalled) return -1;
      return 0;
    });
  }, [installedMap, searchResults]);

  const handleInstall = useCallback(
    async (slug: string) => {
      try {
        await installSkill(slug);
        await enableSkill(slug);
        toast.success(t('toast.installed'));
        await fetchSkills();
      } catch (err) {
        toast.error(String(err));
      }
    },
    [installSkill, enableSkill, fetchSkills, t],
  );

  const handleUninstall = useCallback(
    async (slug: string) => {
      const ok = window.confirm(
        t('detail.uninstall', { defaultValue: 'Uninstall' }),
      );
      if (!ok) return;
      try {
        await uninstallSkill(slug);
        toast.success(t('toast.uninstalled'));
      } catch (err) {
        toast.error(String(err));
      }
    },
    [uninstallSkill, t],
  );

  if (searching && sortedRows.length === 0) {
    return (
      <Center gap={12} style={{ height: '100%' }}>
        <LoadingSpinner size="lg" />
        <Text type={'secondary'}>{t('marketplace.searching')}</Text>
      </Center>
    );
  }

  if (searchError) {
    return (
      <div className={styles.errorWrap}>
        <Icon icon={ServerCrash} size={60} />
        <span>{t(`toast.${searchError}`, { defaultValue: searchError })}</span>
      </div>
    );
  }

  if (sortedRows.length === 0) {
    return (
      <div className={styles.emptyWrap}>
        <p>
          {keywords.trim()
            ? t('marketplace.noResults')
            : t('marketplace.emptyPrompt')}
        </p>
      </div>
    );
  }

  return (
    <div className={styles.listContainer}>
      {searching && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px 8px' }}>
          <LoadingSpinner size="sm" />
          <Text type={'secondary'} style={{ fontSize: 12 }}>
            {t('marketplace.searching')}
          </Text>
        </div>
      )}
      <div className={styles.grid}>
        {sortedRows.map((item) => {
          const installedSkill =
            installedMap.get(item.slug) || installedMap.get(item.name);
          return (
            <MarketSkillItem
              key={item.slug}
              installedSkill={installedSkill}
              loading={!!installing[item.slug]}
              skill={item}
              onInstall={handleInstall}
              onUninstall={handleUninstall}
            />
          );
        })}
      </div>
    </div>
  );
});

MarketSkillList.displayName = 'MarketSkillList';

export default MarketSkillList;
