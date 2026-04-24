import { flip, offset, shift, useFloating } from '@floating-ui/react';
import type { ISlashMenuOption, ISlashOption } from '@lobehub/editor';
import { Icon, type IconProps } from '@lobehub/ui';
import { createStyles } from 'antd-style';
import { Puzzle } from 'lucide-react';
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

const LOBE_THEME_APP_ID = 'lobe-ui-theme-app';
const DEFAULT_VISIBLE_COUNT = 3;

const useStyles = createStyles(({ css, token }) => ({
  container: css`
    z-index: 9999;
    width: max-content;
  `,
  divider: css`
    height: 1px;
    margin: 4px 8px;
    background: ${token.colorBorderSecondary};
  `,
  groupHeader: css`
    padding: 8px 12px 4px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.02em;
    text-transform: uppercase;
    color: ${token.colorTextQuaternary};
    user-select: none;
  `,
  item: css`
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 10px;
    padding: 7px 12px;
    margin: 1px 4px;
    border-radius: ${token.borderRadiusSM}px;
    cursor: pointer;
    transition: background 120ms ${token.motionEaseOut};

    &:hover,
    &[data-active='true'] {
      background: ${token.colorFillSecondary};
    }

    &:active {
      background: ${token.colorFillTertiary};
    }
  `,
  itemContent: css`
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;
    flex: 1;
  `,
  itemDesc: css`
    font-size: 12px;
    line-height: 16px;
    color: ${token.colorTextQuaternary};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  itemIcon: css`
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 32px;
    height: 32px;
    border-radius: ${token.borderRadiusSM}px;
    background: ${token.colorFillTertiary};
    font-size: 18px;
    line-height: 1;
    color: ${token.colorTextSecondary};

    img {
      width: 20px;
      height: 20px;
      object-fit: contain;
      border-radius: 4px;
    }
  `,
  itemLabel: css`
    font-size: 13px;
    line-height: 18px;
    color: ${token.colorText};
    font-weight: 500;
  `,
  popup: css`
    scrollbar-width: thin;
    overflow-y: auto;
    min-width: 300px;
    max-width: 420px;
    max-height: min(50vh, 420px);
    padding: 4px 0;
    border-radius: ${token.borderRadiusLG}px;
    background: ${token.colorBgElevated};
    outline: none;
    box-shadow:
      0 4px 24px 0 rgba(0, 0, 0, 0.08),
      0 1px 4px 0 rgba(0, 0, 0, 0.04),
      0 0 0 1px ${token.colorBorderSecondary};
  `,
  showMore: css`
    padding: 5px 12px;
    margin: 0 4px;
    font-size: 12px;
    color: ${token.colorTextTertiary};
    cursor: pointer;
    user-select: none;
    border-radius: ${token.borderRadiusSM}px;
    transition: all 120ms ${token.motionEaseOut};

    &:hover {
      color: ${token.colorText};
      background: ${token.colorFillQuaternary};
    }
  `,
}));

export interface SlashCommandMenuProps {
  activeKey: string | null;
  loading?: boolean;
  onSelect?: (option: ISlashMenuOption) => void;
  open?: boolean;
  options: ISlashOption[];
  setActiveKey: (key: string | null) => void;
}

interface GroupedItems {
  commands: ISlashMenuOption[];
  skills: ISlashMenuOption[];
}

const IMAGE_ICON_RE = /^(https?:\/\/|data:image\/|\/)/i;

function renderItemIcon(item: ISlashMenuOption): ReactNode {
  const meta = item.metadata as Record<string, unknown> | undefined;
  const iconStr = meta?.icon as string | undefined;

  // Skill items: use icon from metadata (emoji or image URL)
  if (meta?.group === 'skills') {
    if (iconStr && IMAGE_ICON_RE.test(iconStr)) {
      return <img alt="" src={iconStr} />;
    }
    if (iconStr) {
      return <span>{iconStr}</span>;
    }
    return <Icon icon={Puzzle} size={{ fontSize: 16 }} />;
  }

  // Command items: use the icon field (lucide component)
  if (item.icon) {
    return <Icon icon={item.icon as IconProps['icon']} size={{ fontSize: 16 }} />;
  }

  return null;
}

function groupOptions(options: ISlashOption[]): GroupedItems {
  const skills: ISlashMenuOption[] = [];
  const commands: ISlashMenuOption[] = [];

  for (const opt of options) {
    if ('type' in opt && opt.type === 'divider') continue;
    const item = opt as ISlashMenuOption;
    if (item.metadata?.group === 'skills') {
      skills.push(item);
    } else {
      commands.push(item);
    }
  }

  return { commands, skills };
}

export const SlashCommandMenu = memo<SlashCommandMenuProps>(({
  activeKey,
  loading,
  onSelect,
  open,
  options,
  setActiveKey,
}) => {
  const { styles } = useStyles();
  const { t } = useTranslation('chatInput');
  const [skillsExpanded, setSkillsExpanded] = useState(false);
  const [commandsExpanded, setCommandsExpanded] = useState(false);
  const activeItemRef = useRef<HTMLDivElement | null>(null);
  const floatingNodeRef = useRef<HTMLElement | null>(null);

  // Get cursor position for anchoring
  const getRectRef = useRef<() => DOMRect>(() => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      return sel.getRangeAt(0).getBoundingClientRect();
    }
    return new DOMRect(0, 0, 0, 0);
  });

  const middleware = useMemo(() => [offset(8), flip(), shift({ padding: 8 })], []);

  const { refs, floatingStyles, update } = useFloating({
    middleware,
    open,
    placement: 'top-start',
    strategy: 'fixed',
  });

  // Sync the floating ref via effect to avoid accessing refs during render
  useEffect(() => {
    refs.setFloating(floatingNodeRef.current);
  });

  const floatingRefCallback = useCallback((node: HTMLElement | null) => {
    floatingNodeRef.current = node;
    refs.setFloating(node);
  }, [refs]);

  useLayoutEffect(() => {
    if (!open) return;
    refs.setPositionReference({
      getBoundingClientRect: () => getRectRef.current(),
    });
  }, [open, refs]);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => update());
    return () => cancelAnimationFrame(frame);
  }, [open, update]);

  useEffect(() => {
    if (!open) return;
    const onScroll = () => update();
    window.addEventListener('scroll', onScroll, { capture: true, passive: true });
    return () => window.removeEventListener('scroll', onScroll, { capture: true });
  }, [open, update]);

  // Scroll active item into view
  useEffect(() => {
    activeItemRef.current?.scrollIntoView({ block: 'nearest' });
  }, [activeKey]);

  const handleItemClick = useCallback((item: ISlashMenuOption) => {
    onSelect?.(item);
  }, [onSelect]);

  const { skills, commands } = useMemo(() => groupOptions(options), [options]);

  const visibleSkills = skillsExpanded ? skills : skills.slice(0, DEFAULT_VISIBLE_COUNT);
  const hiddenSkillsCount = skills.length - DEFAULT_VISIBLE_COUNT;
  const visibleCommands = commandsExpanded ? commands : commands.slice(0, DEFAULT_VISIBLE_COUNT);
  const hiddenCommandsCount = commands.length - DEFAULT_VISIBLE_COUNT;

  const shouldShow = open && (skills.length > 0 || commands.length > 0 || loading);

  if (!shouldShow) return null;

  const portalContainer = document.getElementById(LOBE_THEME_APP_ID) || document.body;

  const renderItem = (item: ISlashMenuOption) => {
    const isActive = activeKey === item.key;
    const iconNode = renderItemIcon(item);
    return (
      <div
        className={styles.item}
        data-active={isActive}
        key={String(item.key)}
        onClick={() => handleItemClick(item)}
        onMouseEnter={() => setActiveKey(String(item.key))}
        ref={isActive ? activeItemRef : undefined}
      >
        {iconNode && <div className={styles.itemIcon}>{iconNode}</div>}
        <div className={styles.itemContent}>
          <div className={styles.itemLabel}>/{String(item.label)}</div>
          {item.desc ? <div className={styles.itemDesc}>{String(item.desc)}</div> : null}
        </div>
      </div>
    );
  };

  const node = (
    <div
      className={styles.container}
      ref={floatingRefCallback}
      style={floatingStyles}
    >
      <div className={styles.popup}>
        {loading ? (
          <div className={styles.item}>
            <div className={styles.itemLabel}>Loading...</div>
          </div>
        ) : (
          <>
            {skills.length > 0 && (
              <>
                <div className={styles.groupHeader}>
                  {t('input.slash.groupSkills', { defaultValue: 'Skills' })}
                </div>
                {visibleSkills.map(renderItem)}
                {hiddenSkillsCount > 0 && (
                  <div
                    className={styles.showMore}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSkillsExpanded((prev) => !prev);
                    }}
                  >
                    {skillsExpanded
                      ? t('input.slash.showLess', { defaultValue: 'Show less' })
                      : t('input.slash.showMore', { count: hiddenSkillsCount, defaultValue: `Show ${hiddenSkillsCount} more` })}
                  </div>
                )}
              </>
            )}
            {skills.length > 0 && commands.length > 0 && (
              <div className={styles.divider} />
            )}
            {commands.length > 0 && (
              <>
                <div className={styles.groupHeader}>
                  {t('input.slash.groupCommands', { defaultValue: 'Commands' })}
                </div>
                {visibleCommands.map(renderItem)}
                {hiddenCommandsCount > 0 && (
                  <div
                    className={styles.showMore}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCommandsExpanded((prev) => !prev);
                    }}
                  >
                    {commandsExpanded
                      ? t('input.slash.showLess', { defaultValue: 'Show less' })
                      : t('input.slash.showMore', { count: hiddenCommandsCount, defaultValue: `Show ${hiddenCommandsCount} more` })}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );

  return createPortal(node, portalContainer);
});

SlashCommandMenu.displayName = 'SlashCommandMenu';
