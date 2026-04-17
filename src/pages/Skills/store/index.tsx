import { useCallback, useEffect, useState, type KeyboardEvent } from 'react';
import { ArrowLeft, Package, Trash2, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { SearchInput } from '@/components/common/SearchInput';
import { useSkillsStore } from '@/stores/skills';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useSkillsStyles } from '../styles';
import { trackUiEvent } from '@/lib/telemetry';

export function SkillsStorePage() {
  const navigate = useNavigate();
  const { t } = useTranslation('skills');
  const { styles } = useSkillsStyles();
  const {
    skills,
    searchResults,
    searchSkills,
    installSkill,
    uninstallSkill,
    enableSkill,
    searching,
    searchError,
    installing,
    fetchSkills,
    ensureNodeRuntime,
  } = useSkillsStore();

  const [q, setQ] = useState('');

  useEffect(() => {
    trackUiEvent('skills.store_open', {});
    void ensureNodeRuntime();
  }, [ensureNodeRuntime]);

  useEffect(() => {
    const tq = q.trim();
    if (tq.length > 0 && tq.length < 2) {
      return;
    }
    const timer = setTimeout(() => {
      void searchSkills(tq, { trending: tq.length === 0 });
    }, 500);
    return () => clearTimeout(timer);
  }, [q, searchSkills]);

  const safeSkills = Array.isArray(skills) ? skills : [];
  const rows = searchResults;

  const sortedRows = [...rows].sort((a, b) => {
    const ia = safeSkills.some((s) => s.id === b.slug || s.slug === b.slug || s.name === b.name);
    const ib = safeSkills.some((s) => s.id === a.slug || s.slug === a.slug || s.name === a.name);
    if (ia && !ib) return 1;
    if (!ia && ib) return -1;
    return 0;
  });

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
      try {
        await uninstallSkill(slug);
        toast.success(t('toast.uninstalled'));
      } catch (err) {
        toast.error(String(err));
      }
    },
    [uninstallSkill, t],
  );

  return (
    <div className={styles.pageRoot}>
      <div className={styles.pageInner}>
        <div className={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Button type="text" size="small" onClick={() => navigate('/skills')}>
              <ArrowLeft style={{ width: 18, height: 18 }} />
            </Button>
            <div>
              <h1 className={styles.headerTitle}>{t('store.title', { defaultValue: 'Skill store' })}</h1>
              <p className={styles.headerSubtitle}>
                {t('store.subtitle', { defaultValue: 'Search and install skills via npx skills (skills.sh).' })}
              </p>
            </div>
          </div>
        </div>

        <div className={styles.sheetSearchRow} style={{ marginBottom: 16 }}>
          <SearchInput
            placeholder={t('store.search.placeholder', { defaultValue: 'Search skills…' })}
            value={q}
            onValueChange={setQ}
            onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
              if (e.key === 'Enter') {
                void searchSkills(q.trim(), { trending: q.trim().length === 0 });
              }
            }}
            clearable
            className={styles.marketplaceSearchWrapper}
            inputClassName={styles.marketplaceSearchInputEl}
          />
        </div>

        {searchError && (
          <div className={styles.errorBanner}>
            <AlertCircle style={{ width: 20, height: 20, flexShrink: 0 }} />
            <span>{searchError}</span>
          </div>
        )}

        {searching && (
          <div className={styles.marketplaceSearching}>
            <LoadingSpinner size="lg" />
            <p style={{ marginTop: 16, fontSize: 14 }}>{t('marketplace.searching')}</p>
          </div>
        )}

        {!searching && (
          <div className={styles.marketplaceList}>
            {sortedRows.map((skill) => {
              const isInstalled = safeSkills.some(
                (s) => s.id === skill.slug || s.slug === skill.slug || s.name === skill.name,
              );
              const loading = !!installing[skill.slug];
              return (
                <div key={skill.slug} className={styles.marketplaceRow}>
                  <div className={styles.skillInfo}>
                    <div className={styles.skillIcon}>📦</div>
                    <div className={styles.skillMeta}>
                      <div className={styles.skillNameRow}>
                        <h3 className={styles.skillName}>{skill.name}</h3>
                        {isInstalled && (
                          <span className="text-xs opacity-70">
                            {t('store.installed.badge', { defaultValue: 'Installed' })}
                          </span>
                        )}
                      </div>
                      <p className={styles.skillDescription}>{skill.description}</p>
                    </div>
                  </div>
                  <div className={styles.marketplaceControls}>
                    {skill.version && <span className={styles.marketplaceVersion}>v{skill.version}</span>}
                    {isInstalled ? (
                      <Button
                        type="primary"
                        danger
                        size="small"
                        onClick={() => handleUninstall(skill.slug)}
                        disabled={loading}
                        className={styles.uninstallBtn}
                      >
                        {loading ? <LoadingSpinner size="sm" /> : <Trash2 style={{ width: 14, height: 14 }} />}
                      </Button>
                    ) : (
                      <Button
                        type="primary"
                        size="small"
                        onClick={() => handleInstall(skill.slug)}
                        disabled={loading}
                        className={styles.installBtn}
                      >
                        {loading ? <LoadingSpinner size="sm" /> : t('marketplace.install', 'Install')}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!searching && sortedRows.length === 0 && !searchError && (
          <div className={styles.marketplaceEmptyState}>
            <Package style={{ width: 40, height: 40, marginBottom: 16, opacity: 0.5 }} />
            <p>{q.trim() ? t('marketplace.noResults') : t('store.trending.empty', { defaultValue: 'Nothing to show yet.' })}</p>
          </div>
        )}
      </div>
    </div>
  );
}
