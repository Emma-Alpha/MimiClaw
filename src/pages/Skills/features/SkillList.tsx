import { ClaudeCode, OpenClaw } from '@lobehub/icons';
import { Package, Lock, FolderOpen, Ellipsis, Eye, Power, Trash2, Cloud, Wrench } from 'lucide-react';
import { Dropdown, type MenuProps } from 'antd';
import type { Skill } from '@/types/skill';
import { useTranslation } from 'react-i18next';
import { useSkillsStyles } from '../styles';
import { categorizeSkill, type SkillCategory } from '../lib/source-taxonomy';
import { resolvePermissions } from '../lib/skill-permissions';
import { UpdateBadge } from './UpdateBadge';

interface SkillListProps {
  skills: Skill[];
  onSelectSkill: (s: Skill) => void;
  onToggle: (id: string, enabled: boolean) => void;
  onUninstall?: (slug: string) => void;
  onOpenFolder?: (skill: Skill) => void;
  outdated: Record<string, { current: string; latest: string }>;
}

const IMAGE_ICON_RE = /^(https?:\/\/|data:image\/|\/)/i;

function renderMainIcon(skill: Skill, category: SkillCategory, dim: boolean) {
  const opacity = dim ? 0.45 : 1;
  const iconStyle = { opacity };
  const name = `${skill.name || ''} ${skill.slug || ''}`.toLowerCase();

  if (skill.icon && IMAGE_ICON_RE.test(skill.icon)) {
    return (
      <img
        alt={skill.name}
        src={skill.icon}
        style={{ width: 24, height: 24, objectFit: 'contain', ...iconStyle }}
      />
    );
  }

  if (name.includes('claude')) {
    return <ClaudeCode.Color size={24} style={iconStyle} />;
  }

  if (name.includes('openclaw')) {
    return <OpenClaw.Color size={24} style={iconStyle} />;
  }

  if (category === 'bundled') {
    return <Package size={22} style={iconStyle} />;
  }

  if (category === 'remote') {
    return <Cloud size={22} style={iconStyle} />;
  }

  return <Wrench size={22} style={iconStyle} />;
}

function sortSkills(list: Skill[]): Skill[] {
  return [...list].sort((a, b) => {
    const aEnabled = categorizeSkill(a) === 'local' ? true : a.enabled;
    const bEnabled = categorizeSkill(b) === 'local' ? true : b.enabled;
    if (aEnabled && !bEnabled) return -1;
    if (!aEnabled && bEnabled) return 1;
    if (a.isCore && !b.isCore) return -1;
    if (!a.isCore && b.isCore) return 1;
    return a.name.localeCompare(b.name);
  });
}

export function SkillList({
  skills,
  onSelectSkill,
  onToggle,
  onUninstall,
  onOpenFolder,
  outdated,
}: SkillListProps) {
  const { t } = useTranslation('skills');
  const { styles } = useSkillsStyles();

  const safe = Array.isArray(skills) ? skills : [];
  const rows = sortSkills(safe);

  function renderRow(skill: Skill) {
    const cat = categorizeSkill(skill);
    const isLocal = cat === 'local';
    const perms = resolvePermissions(skill, cat);
    const hasUpdate = !!(outdated[skill.id] || (skill.slug && outdated[skill.slug]));
    const dim = !isLocal && !skill.enabled;
    const statusText = isLocal
      ? t('list.status.installed', { defaultValue: 'Installed' })
      : skill.enabled
        ? t('list.status.enabled', { defaultValue: 'Enabled' })
        : t('list.status.disabled', { defaultValue: 'Disabled' });

    const sourceLabel =
      cat === 'bundled'
        ? t('category.bundled.badge', { defaultValue: 'Bundled' })
        : cat === 'remote'
          ? t('category.remote.badge', { defaultValue: 'Remote' })
          : t('category.local.badge', { defaultValue: 'Local' });
    const hideDescription =
      (skill.description || '').trim().toLowerCase() === 'recently installed, initializing...';

    const menuItems: MenuProps['items'] = [
      {
        key: 'detail',
        icon: <Eye style={{ width: 14, height: 14 }} />,
        label: t('list.menu.details', { defaultValue: 'View details' }),
      },
      ...(perms.canToggle
        ? [
            {
              key: 'toggle',
              icon: <Power style={{ width: 14, height: 14 }} />,
              label: skill.enabled
                ? t('list.menu.disable', { defaultValue: 'Disable' })
                : t('list.menu.enable', { defaultValue: 'Enable' }),
            },
          ]
        : []),
      ...(perms.canOpenFolder && onOpenFolder
        ? [
            {
              key: 'open-folder',
              icon: <FolderOpen style={{ width: 14, height: 14 }} />,
              label: t('detail.openActualFolder', { defaultValue: 'Open actual folder' }),
            },
          ]
        : []),
      ...(!skill.isCore && perms.canUninstall && onUninstall
        ? [
            {
              key: 'uninstall',
              icon: <Trash2 style={{ width: 14, height: 14 }} />,
              danger: true,
              label: t('detail.uninstall', { defaultValue: 'Uninstall' }),
            },
          ]
        : []),
    ];

    const handleMenuClick: MenuProps['onClick'] = ({ key, domEvent }) => {
      domEvent.stopPropagation();

      if (key === 'detail') {
        onSelectSkill(skill);
        return;
      }
      if (key === 'toggle') {
        onToggle(skill.id, !skill.enabled);
        return;
      }
      if (key === 'open-folder' && onOpenFolder) {
        onOpenFolder(skill);
        return;
      }
      if (key === 'uninstall' && onUninstall) {
        onUninstall(skill.slug || skill.id);
      }
    };

    return (
      // biome-ignore lint/a11y/useSemanticElements: row has nested interactive children (menu trigger) that cannot live inside <button>
      <div
        key={skill.id}
        className={styles.skillRow}
        role="button"
        tabIndex={0}
        onClick={() => onSelectSkill(skill)}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelectSkill(skill)}
      >
        {/* 48 × 48 icon block */}
        <div className={styles.skillIcon}>{renderMainIcon(skill, cat, dim)}</div>

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
              <Package style={{ width: 11, height: 11, color: 'rgba(59,130,246,0.65)', flexShrink: 0 }} />
            )}
            {hasUpdate && <UpdateBadge />}
            <span className={styles.skillSourceTag}>
              <span className={styles.skillSourceDot} />
              {sourceLabel}
            </span>
          </div>
          {skill.description && !hideDescription && (
            <p className={styles.skillDescription} style={{ opacity: dim ? 0.45 : 1 }}>
              {skill.description}
            </p>
          )}
        </div>

        {/* Controls — stop click from propagating to the row */}
        <div className={styles.skillControls}>
          <span
            className={`${styles.skillStateText} ${
              isLocal || skill.enabled ? styles.skillStateInstalled : styles.skillStateDisabled
            }`}
          >
            {statusText}
          </span>
          {menuItems.length > 0 && (
            <Dropdown menu={{ items: menuItems, onClick: handleMenuClick }} trigger={['click']} placement="bottomRight">
              <button
                type="button"
                className={styles.skillActionMenuBtn}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
                aria-label={t('list.menu.more', { defaultValue: 'More actions' })}
              >
                <Ellipsis style={{ width: 16, height: 16 }} />
              </button>
            </Dropdown>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.lobeListContainer}>
      {rows.length === 0 ? (
        <div className={styles.emptyState} style={{ padding: '20px 0' }}>
          <p style={{ fontSize: 13, opacity: 0.55 }}>{t('noSkillsAvailable')}</p>
        </div>
      ) : (
        <div className={styles.skillList}>
          {rows.map((skill) => renderRow(skill))}
        </div>
      )}
    </div>
  );
}
