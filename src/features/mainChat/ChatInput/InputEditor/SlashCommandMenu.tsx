import { flip, offset, shift, size, useFloating } from '@floating-ui/react';
import type { ISlashMenuOption, ISlashOption } from '@lobehub/editor';
import { Icon, type IconProps } from '@lobehub/ui';
import { createStyles } from 'antd-style';
import { Circle } from 'lucide-react';
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { CommandMenu, type CommandMenuGroup, type CommandMenuItem } from '@/components/CommandMenu';

const LOBE_THEME_APP_ID = 'lobe-ui-theme-app';
const IMAGE_ICON_RE = /^(https?:\/\/|data:image\/|\/)/i;

// ── Skill capsule label for dropdown ──────────────────────────────────────

const useSkillCapsuleStyles = createStyles(({ css, token }) => ({
  capsule: css`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 1px 8px;
    border-radius: 6px;
    border: 1px solid ${token.colorSuccessBorder};
    background: ${token.colorSuccessBg};
    color: ${token.colorSuccess};
    font-size: 12px;
    font-weight: 500;
    line-height: 1.5;
  `,
  icon: css`
    font-size: 11px;
    line-height: 1;

    img {
      width: 14px;
      height: 14px;
      object-fit: contain;
      border-radius: 2px;
    }
  `,
}));

const SkillCapsuleLabel = memo<{ iconStr?: string; label: string }>(({ iconStr, label }) => {
  const { styles } = useSkillCapsuleStyles();

  const effectiveIcon = iconStr || '🛠';
  let iconNode: ReactNode;
  if (IMAGE_ICON_RE.test(effectiveIcon)) {
    iconNode = <span className={styles.icon}><img alt="" src={effectiveIcon} /></span>;
  } else {
    iconNode = <span className={styles.icon}>{effectiveIcon}</span>;
  }

  return (
    <span className={styles.capsule}>
      {iconNode}
      {label}
    </span>
  );
});
SkillCapsuleLabel.displayName = 'SkillCapsuleLabel';

export interface SlashCommandMenuProps {
  activeKey: string | null;
  loading?: boolean;
  onSelect?: (option: ISlashMenuOption) => void;
  open?: boolean;
  options: ISlashOption[];
  setActiveKey: (key: string | null) => void;
}

function renderItemIcon(item: ISlashMenuOption): ReactNode {
  const meta = item.metadata as Record<string, unknown> | undefined;
  const iconStr = meta?.icon as string | undefined;

  // Image URL or emoji icon from metadata
  if (iconStr && IMAGE_ICON_RE.test(iconStr)) {
    return <img alt="" src={iconStr} />;
  }
  if (iconStr) {
    return <span>{iconStr}</span>;
  }

  // Lucide icon from the option (builtin commands)
  if (item.icon) {
    return <Icon icon={item.icon as IconProps['icon']} size={{ size: 14 }} />;
  }

  // Default: small filled circle dot
  return <Circle size={6} fill="currentColor" />;
}

function getItemTag(item: ISlashMenuOption): string | undefined {
  const meta = item.metadata as Record<string, unknown> | undefined;
  const scope = meta?.scope as string | undefined;
  if (scope === 'project') return '个人';
  if (scope === 'global') return '系统';
  return undefined;
}

/**
 * Convert @lobehub/editor options into CommandMenuGroup[] + build a flat
 * item list for mapping activeIndex ↔ activeKey.
 */
function useSlashGroups(options: ISlashOption[], t: (key: string, opts?: Record<string, unknown>) => string) {
  return useMemo(() => {
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

    // Build flat list for index ↔ key mapping
    const flatItems: ISlashMenuOption[] = [];
    const groups: CommandMenuGroup[] = [];

    const formatLabel = (raw: unknown) => {
      const str = String(raw ?? '');
      return str.startsWith('/') ? str : `/${str}`;
    };

    if (skills.length > 0) {
      groups.push({
        title: t('input.slash.groupSkills', { defaultValue: 'Skills' }),
        items: skills.map((item) => {
          flatItems.push(item);
          const meta = item.metadata as Record<string, unknown> | undefined;
          const iconStr = meta?.icon as string | undefined;
          return {
            id: String(item.key),
            label: <SkillCapsuleLabel iconStr={iconStr} label={formatLabel(item.label)} />,
            description: item.desc ? String(item.desc) : undefined,
            tag: getItemTag(item),
          } satisfies CommandMenuItem;
        }),
      });
    }

    if (commands.length > 0) {
      groups.push({
        title: t('input.slash.groupCommands', { defaultValue: 'Commands' }),
        items: commands.map((item) => {
          flatItems.push(item);
          return {
            id: String(item.key),
            icon: renderItemIcon(item),
            label: formatLabel(item.label),
            description: item.desc ? String(item.desc) : undefined,
            tag: getItemTag(item),
          } satisfies CommandMenuItem;
        }),
      });
    }

    return { groups, flatItems };
  }, [options, t]);
}

export const SlashCommandMenu = memo<SlashCommandMenuProps>(({
  activeKey,
  loading,
  onSelect,
  open,
  options,
  setActiveKey,
}) => {
  const { t } = useTranslation('chatInput');
  const { groups, flatItems } = useSlashGroups(options, t);
  const floatingNodeRef = useRef<HTMLElement | null>(null);

  // Map activeKey ↔ flat index
  const activeIndex = useMemo(() => {
    if (activeKey == null) return 0;
    const idx = flatItems.findIndex((item) => String(item.key) === activeKey);
    return idx >= 0 ? idx : 0;
  }, [activeKey, flatItems]);

  const handleActiveIndexChange = useCallback(
    (index: number) => {
      const item = flatItems[index];
      setActiveKey(item ? String(item.key) : null);
    },
    [flatItems, setActiveKey],
  );

  const handleSelect = useCallback(
    (menuItem: CommandMenuItem) => {
      const item = flatItems.find((f) => String(f.key) === menuItem.id);
      if (item) onSelect?.(item);
    },
    [flatItems, onSelect],
  );

  // ── Floating UI positioning (anchored to editor container) ──
  const middleware = useMemo(() => [
    offset(4),
    flip(),
    shift({ padding: 8 }),
    size({
      apply({ rects, elements, availableHeight }) {
        Object.assign(elements.floating.style, {
          width: `${rects.reference.width}px`,
          maxHeight: `${Math.min(200, Math.max(120, availableHeight - 8))}px`,
        });
      },
    }),
  ], []);

  const { refs, floatingStyles, update } = useFloating({
    middleware,
    open,
    placement: 'top-start',
    strategy: 'fixed',
  });

  useEffect(() => {
    refs.setFloating(floatingNodeRef.current);
  });

  const floatingRefCallback = useCallback((node: HTMLElement | null) => {
    floatingNodeRef.current = node;
    refs.setFloating(node);
  }, [refs]);

  useLayoutEffect(() => {
    if (!open) return;
    // From the cursor, walk up to find the nearest [data-menu-anchor] ancestor
    const sel = window.getSelection();
    const node = sel?.anchorNode;
    const fromCursor = node
      ? (node instanceof HTMLElement ? node : node.parentElement)?.closest<HTMLElement>('[data-menu-anchor]')
      : null;
    const anchor = fromCursor ?? document.querySelector<HTMLElement>('[data-menu-anchor]');
    if (anchor) {
      refs.setPositionReference(anchor);
    }
  }, [open, refs]);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => update());
    return () => cancelAnimationFrame(frame);
  }, [open, update, flatItems.length]);

  useEffect(() => {
    if (!open) return;
    const onScroll = () => update();
    window.addEventListener('scroll', onScroll, { capture: true, passive: true });
    return () => window.removeEventListener('scroll', onScroll, { capture: true });
  }, [open, update]);

  const shouldShow = open && (flatItems.length > 0 || loading);
  if (!shouldShow) return null;

  const portalContainer = document.getElementById(LOBE_THEME_APP_ID) || document.body;

  const node = (
    <div
      ref={floatingRefCallback}
      style={{ ...floatingStyles, zIndex: 9999 }}
    >
      {loading ? (
        <div style={{ padding: '7px 14px', fontSize: 13 }}>Loading...</div>
      ) : (
        <CommandMenu
          groups={groups}
          activeIndex={activeIndex}
          onActiveIndexChange={handleActiveIndexChange}
          onSelect={handleSelect}
        />
      )}
    </div>
  );

  return createPortal(node, portalContainer);
});

SlashCommandMenu.displayName = 'SlashCommandMenu';
