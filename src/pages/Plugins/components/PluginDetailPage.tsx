import { Flexbox, Text } from '@lobehub/ui';
import { createStyles, cssVar } from 'antd-style';
import { ChevronRight } from 'lucide-react';
import { memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import PluginAvatar from '@/components/Plugins/PluginAvatar';
import { usePluginsStore } from '@/stores/plugins';
import type { MarketplacePlugin, PluginSkillEntry } from '@/types/claude-plugin';

import SkillDetailModal from './SkillDetailModal';

const useStyles = createStyles(({ css, token }) => ({
  page: css`
    height: 100%;
    overflow-y: auto;
    scrollbar-gutter: stable;
  `,
  content: css`
    max-width: 720px;
    margin: 0 auto;
    padding: 0 24px 48px;
    display: flex;
    flex-direction: column;
    gap: 24px;
  `,
  breadcrumb: css`
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    padding: 16px 24px 0;
    max-width: 720px;
    margin: 0 auto;
    width: 100%;
  `,
  breadcrumbLink: css`
    color: ${cssVar.colorTextSecondary};
    cursor: pointer;
    border: none;
    background: none;
    padding: 0;
    font-size: 13px;

    &:hover {
      color: ${cssVar.colorText};
    }
  `,
  breadcrumbCurrent: css`
    color: ${cssVar.colorText};
    font-weight: 500;
  `,
  headerRow: css`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
  `,
  pluginInfo: css`
    display: flex;
    flex-direction: column;
    gap: 8px;
  `,
  pluginName: css`
    font-size: 24px;
    font-weight: 600;
    color: ${cssVar.colorText};
  `,
  pluginDesc: css`
    font-size: 14px;
    color: ${cssVar.colorTextSecondary};
    line-height: 1.5;
  `,
  addButton: css`
    flex-shrink: 0;
    padding: 8px 16px;
    border-radius: 8px;
    border: 1px solid ${token.colorBorder};
    background: transparent;
    color: ${cssVar.colorText};
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    white-space: nowrap;
    transition: border-color 0.15s;

    &:hover {
      border-color: ${token.colorPrimary};
    }
  `,
  addedButton: css`
    background: ${token.colorPrimary};
    color: ${token.colorWhite};
    border-color: ${token.colorPrimary};
  `,
  heroBanner: css`
    width: 100%;
    height: 180px;
    border-radius: 16px;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    background: linear-gradient(
      135deg,
      ${token.colorPrimaryBg} 0%,
      ${token.colorBgLayout} 50%,
      ${token.colorPrimaryBgHover} 100%
    );
  `,
  heroOverlay: css`
    position: absolute;
    inset: 0;
    background: color-mix(in srgb, ${cssVar.colorBgLayout} 50%, transparent);
  `,
  heroText: css`
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    color: ${cssVar.colorText};
    font-weight: 500;
    padding: 8px 16px;
    border-radius: 8px;
    background: color-mix(in srgb, ${cssVar.colorBgLayout} 60%, transparent);
  `,
  longDesc: css`
    font-size: 14px;
    color: ${cssVar.colorTextSecondary};
    line-height: 1.7;
  `,
  sectionTitle: css`
    font-size: 14px;
    font-weight: 600;
    color: ${cssVar.colorText};
  `,
  skillRow: css`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    border-radius: 10px;
    cursor: pointer;
    transition: background-color 0.12s;

    &:hover {
      background: color-mix(in oklab, ${cssVar.colorText} 5%, transparent);
    }
  `,
  skillIcon: css`
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: ${token.colorFillSecondary};
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    flex-shrink: 0;
  `,
  skillBadge: css`
    font-size: 11px;
    padding: 1px 8px;
    border-radius: 999px;
    background: ${token.colorFillTertiary};
    color: ${cssVar.colorTextSecondary};
    flex-shrink: 0;
  `,
}));

interface PluginDetailPageProps {
  plugin: MarketplacePlugin;
  onBack: () => void;
}

const PluginDetailPage = memo<PluginDetailPageProps>(({ plugin, onBack }) => {
  const { styles, cx } = useStyles();
  const { t } = useTranslation('plugins');
  const [selectedSkill, setSelectedSkill] = useState<PluginSkillEntry | null>(
    null,
  );

  const enabledPlugins = usePluginsStore((s) => s.enabledPlugins);
  const togglePlugin = usePluginsStore((s) => s.togglePlugin);

  const pluginKey = `${plugin.name}@${plugin.marketplace}`;
  const isAdded = pluginKey in enabledPlugins;

  const handleAdd = useCallback(async () => {
    if (isAdded) return;
    await togglePlugin(pluginKey, true);
    toast.success(t('toast.pluginEnabled', { key: plugin.name }));
  }, [isAdded, togglePlugin, pluginKey, t, plugin.name]);

  return (
    <div className={styles.page}>
      {/* Breadcrumb */}
      <div className={styles.breadcrumb}>
        <button
          type="button"
          className={styles.breadcrumbLink}
          onClick={onBack}
        >
          插件
        </button>
        <ChevronRight size={14} style={{ opacity: 0.4 }} />
        <span className={styles.breadcrumbCurrent}>{plugin.name}</span>
      </div>

      <div className={styles.content}>
        {/* Header */}
        <div className={styles.headerRow}>
          <Flexbox horizontal align="flex-start" gap={16}>
            <PluginAvatar
              avatar={plugin.icon || 'MCP_AVATAR'}
              size={56}
              style={{ borderRadius: 14 }}
            />
            <div className={styles.pluginInfo}>
              <span className={styles.pluginName}>{plugin.name}</span>
              <span className={styles.pluginDesc}>{plugin.description}</span>
            </div>
          </Flexbox>
          <button
            type="button"
            className={cx(
              styles.addButton,
              isAdded && styles.addedButton,
            )}
            onClick={handleAdd}
          >
            {isAdded ? '已添加' : `添加到 Codex`}
          </button>
        </div>

        {/* Hero banner */}
        {plugin.defaultPrompt && (
          <div className={styles.heroBanner}>
            <div className={styles.heroOverlay} />
            <span className={styles.heroText}>
              🎮 {plugin.name} &nbsp;{plugin.defaultPrompt}
            </span>
          </div>
        )}

        {/* Long description */}
        {plugin.longDescription && (
          <span className={styles.longDesc}>{plugin.longDescription}</span>
        )}

        {/* Included skills */}
        {plugin.skills && plugin.skills.length > 0 && (
          <Flexbox gap={12}>
            <span className={styles.sectionTitle}>包含内容</span>
            <Flexbox gap={2}>
              {plugin.skills.map((skill) => (
                <div
                  key={skill.name}
                  className={styles.skillRow}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedSkill(skill)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedSkill(skill);
                    }
                  }}
                >
                  <div className={styles.skillIcon}>🛠</div>
                  <Flexbox flex={1} gap={1}>
                    <Flexbox horizontal align="center" gap={6}>
                      <Text weight={500} style={{ fontSize: 13 }}>
                        {skill.name}
                      </Text>
                      {skill.badge && (
                        <span className={styles.skillBadge}>
                          {skill.badge}
                        </span>
                      )}
                    </Flexbox>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {skill.description}
                    </Text>
                  </Flexbox>
                </div>
              ))}
            </Flexbox>
          </Flexbox>
        )}
      </div>

      <SkillDetailModal
        open={!!selectedSkill}
        skill={selectedSkill}
        onClose={() => setSelectedSkill(null)}
      />
    </div>
  );
});

export default PluginDetailPage;
