import { flip, offset, shift, useFloating } from '@floating-ui/react';
import type { ISlashMenuOption, ISlashOption } from '@lobehub/editor';
import { Icon, type IconProps } from '@lobehub/ui';
import { Puzzle } from 'lucide-react';
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { CommandMenu, type CommandMenuGroup, type CommandMenuItem } from '@/components/CommandMenu';

const LOBE_THEME_APP_ID = 'lobe-ui-theme-app';
const IMAGE_ICON_RE = /^(https?:\/\/|data:image\/|\/)/i;

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

  if (meta?.group === 'skills') {
    if (iconStr && IMAGE_ICON_RE.test(iconStr)) {
      return <img alt="" src={iconStr} />;
    }
    if (iconStr) {
      return <span>{iconStr}</span>;
    }
    return <Icon icon={Puzzle} size={{ size: 16 }} />;
  }

  if (item.icon) {
    return <Icon icon={item.icon as IconProps['icon']} size={{ size: 16 }} />;
  }

  return null;
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

    if (skills.length > 0) {
      groups.push({
        title: t('input.slash.groupSkills', { defaultValue: 'Skills' }),
        items: skills.map((item) => {
          flatItems.push(item);
          return {
            id: String(item.key),
            icon: renderItemIcon(item),
            label: `/${String(item.label)}`,
            description: item.desc ? String(item.desc) : undefined,
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
            label: `/${String(item.label)}`,
            description: item.desc ? String(item.desc) : undefined,
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

  // ── Floating UI positioning ──────────────────────────────────
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

  const shouldShow = open && (flatItems.length > 0 || loading);
  if (!shouldShow) return null;

  const portalContainer = document.getElementById(LOBE_THEME_APP_ID) || document.body;

  const node = (
    <div
      ref={floatingRefCallback}
      style={{ ...floatingStyles, zIndex: 9999, width: 'max-content' }}
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
