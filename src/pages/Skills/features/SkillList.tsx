import type { ReactNode } from 'react';
import { Puzzle, Lock, RefreshCw, FolderOpen } from 'lucide-react';
import { Divider, Tag } from 'antd';
import { Switch } from '@/components/ui/switch';
import { SearchInput } from '@/components/common/SearchInput';
import type { Skill } from '@/types/skill';
import { useTranslation } from 'react-i18next';
import { useSkillsStyles } from '../styles';
import { invokeIpc } from '@/lib/api-client';
import { categorizeSkill, type SkillCategory } from '../lib/source-taxonomy';
import { resolvePermissions } from '../lib/skill-permissions';
import { UpdateBadge } from './UpdateBadge';

interface SkillListProps {
  skills: Skill[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSelectSkill: (s: Skill) => void;
  onToggle: (id: string, enabled: boolean) => void;
  onRefresh: () => void;
  loading: boolean;
  isGatewayRunning: boolean;
  outdated: Record<string, { current: string; latest: string }>;
}

function filterSkills(skills: Skill[], q: string): Skill[] {
  const t = q.toLowerCase().trim();
  if (!t) return skills;
  return skills.filter(
    (skill) =>
      skill.name.toLowerCase().includes(t) ||
      skill.description.toLowerCase().includes(t) ||
      skill.id.toLowerCase().includes(t) ||
      (skill.slug || '').toLowerCase().includes(t) ||
      (skill.author || '').toLowerCase().includes(t),
  );
}

function sortSkills(list: Skill[]): Skill[] {
  return [...list].sort((a, b) => {
    if (a.enabled && !b.enabled) return -1;
    if (!a.enabled && b.enabled) return 1;
    if (a.isCore && !b.isCore) return -1;
    if (!a.isCore && b.isCore) return 1;
    return a.name.localeCompare(b.name);
  });
}

const CATEGORY_TAG_COLOR: Record<SkillCategory, string> = {
  bundled: 'blue',
  local: 'default',
  remote: 'purple',
};

export function SkillList({
  skills,
  searchQuery,
  onSearchChange,
  onSelectSkill,
  onToggle,
  onRefresh,
  loading,
  isGatewayRunning: _isGatewayRunning,
  outdated,
}: SkillListProps) {
  const { t } = useTranslation('skills');
  const { styles } = useSkillsStyles();

  const safe = Array.isArray(skills) ? skills : [];
  const filtered = sortSkills(filterSkills(safe, searchQuery));

  const byCat = (cat: SkillCategory) => filtered.filter((s) => categorizeSkill(s) === cat);
  const bundled = byCat('bundled');
  const local = byCat('local');
  const remote = byCat('remote');

  function renderRow(skill: Skill) {
    const cat = categorizeSkill(skill);
    const perms = resolvePermissions(skill, cat);
    const hasUpdate = !!(outdated[skill.id] || (skill.slug && outdated[skill.slug]));
    const dim = !skill.enabled;

    return (
      // biome-ignore lint/a11y/useSemanticElements: row has nested interactive children (Switch) that cannot live inside <button>
      <div
        key={skill.id}
        className={styles.skillRow}
        role="button"
        tabIndex={0}
        onClick={() => onSelectSkill(skill)}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelectSkill(skill)}
      >
        {/* 48 × 48 icon block */}
        <div className={styles.skillIcon} style={{ opacity: dim ? 0.45 : 1 }}>
          {skill.icon || '🧩'}
        </div>

        {/* Name + description */}
        <div className={styles.skillMeta}>
          <div className={styles.skillNameRow}>
            <span className={styles.skillName} style={{ opacity: dim ? 0.5 : 1 }}>
              {skill.name}
            </span>
            {skill.isCore && (
              <Lock style={{ width: 11, height: 11, color: 'var(--ant-color-text-tertiary)', flexShrink: 0 }} />
            )}
            {!skill.isCore && skill.isBundled && (
              <Puzzle style={{ width: 11, height: 11, color: 'rgba(59,130,246,0.65)', flexShrink: 0 }} />
            )}
            {hasUpdate && <UpdateBadge />}
          </div>
          {skill.description && (
            <p className={styles.skillDescription} style={{ opacity: dim ? 0.45 : 1 }}>
              {skill.description}
            </p>
          )}
        </div>

        {/* Controls — stop click from propagating to the row */}
        <div className={styles.skillControls}>
          <Tag color={CATEGORY_TAG_COLOR[cat]} style={{ marginRight: 0, fontSize: 11 }}>
            {cat === 'bundled'
              ? t('category.bundled.badge', { defaultValue: 'Bundled' })
              : cat === 'remote'
                ? t('category.remote.badge', { defaultValue: 'Remote' })
                : t('category.local.badge', { defaultValue: 'Local' })}
          </Tag>
          {/* biome-ignore lint/a11y/noStaticElementInteractions: stops row activation from propagating */}
          <span
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <Switch
              checked={skill.enabled}
              onChange={(checked) => perms.canToggle && onToggle(skill.id, checked)}
              disabled={skill.isCore || !perms.canToggle}
            />
          </span>
        </div>
      </div>
    );
  }

  function section(
    title: string,
    count: number,
    extra: ReactNode,
    rows: Skill[],
    emptyHint: string,
  ) {
    return (
      <section style={{ marginBottom: 8 }}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>
            {title}
            <span className={styles.sectionCount}>{count}</span>
          </span>
          {extra && <div className={styles.sectionActions}>{extra}</div>}
        </div>
        {rows.length === 0 ? (
          <div className={styles.emptyState} style={{ padding: '20px 0' }}>
            <p style={{ fontSize: 13, opacity: 0.55 }}>{emptyHint}</p>
          </div>
        ) : (
          <div className={styles.skillList}>{rows.map(renderRow)}</div>
        )}
      </section>
    );
  }

  async function openAgentsSkills() {
    const h = await invokeIpc<string>('app:getPath', 'home');
    await invokeIpc('shell:openPath', `${h}/.agents/skills`);
  }

  async function openManaged() {
    const dir = await invokeIpc<string>('openclaw:getSkillsDir');
    await invokeIpc('shell:openPath', dir);
  }

  return (
    <>
      {/* Toolbar */}
      <div className={styles.subNav}>
        <SearchInput
          placeholder={t('search')}
          value={searchQuery}
          onValueChange={onSearchChange}
          clearable
          className={styles.searchWrapper}
          inputClassName={styles.searchInputEl}
        />
        <div className={styles.actionButtons}>
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className={styles.iconBtn}
            title={t('refresh')}
          >
            <RefreshCw style={{ width: 15, height: 15 }} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Bundled (only shown when non-empty) */}
      {bundled.length > 0 && (
        <>
          {section(
            t('category.bundled.title', { defaultValue: 'Client bundled' }),
            bundled.length,
            null,
            bundled,
            t('category.bundled.empty', { defaultValue: 'No bundled skills.' }),
          )}
          <Divider style={{ margin: 0 }} />
        </>
      )}

      {/* Local */}
      {section(
        t('category.local.title', { defaultValue: 'Local' }),
        local.length,
        <button type="button" onClick={openAgentsSkills} className={styles.folderButton}>
          <FolderOpen style={{ width: 13, height: 13, marginRight: 5 }} />
          {t('category.local.openFolder', { defaultValue: 'Open ~/.agents/skills' })}
        </button>,
        local,
        t('category.local.empty', { defaultValue: 'No local skills in this workspace.' }),
      )}

      <Divider style={{ margin: 0 }} />

      {/* Remote / managed */}
      {section(
        t('category.remote.title', { defaultValue: 'Remote / managed' }),
        remote.length,
        <button type="button" onClick={openManaged} className={styles.folderButton}>
          <FolderOpen style={{ width: 13, height: 13, marginRight: 5 }} />
          {t('category.remote.openFolder', { defaultValue: 'Open skills dir' })}
        </button>,
        remote,
        t('category.remote.empty', {
          defaultValue: 'No remote-managed skills yet. Use the skill store to add some.',
        }),
      )}
    </>
  );
}
