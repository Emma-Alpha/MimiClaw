import { flip, offset, shift, size, useFloating } from '@floating-ui/react';
import type { ISlashMenuOption, ISlashOption } from '@lobehub/editor';
import { Icon, type IconProps } from '@lobehub/ui';
import { File, Folder } from 'lucide-react';
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { CommandMenu, type CommandMenuGroup, type CommandMenuItem } from '@/components/CommandMenu';

const LOBE_THEME_APP_ID = 'lobe-ui-theme-app';

export interface MentionCommandMenuProps {
  activeKey: string | null;
  loading?: boolean;
  onSelect?: (option: ISlashMenuOption) => void;
  open?: boolean;
  options: ISlashOption[];
  setActiveKey: (key: string | null) => void;
}

function renderMentionIcon(item: ISlashMenuOption): ReactNode {
  // Use item.icon if present (custom icon from MentionItem)
  if (item.icon) {
    // If it's a React element already, use it directly
    if (typeof item.icon === 'object') {
      return item.icon as ReactNode;
    }
    return <Icon icon={item.icon as IconProps['icon']} size={{ size: 16 }} />;
  }

  // Infer from kind metadata
  const meta = item.metadata as Record<string, unknown> | undefined;
  const kind = meta?.kind as string | undefined;
  if (kind === 'folder') return <Folder size={16} />;
  return <File size={16} />;
}

function getMentionTag(item: ISlashMenuOption): string | undefined {
  // Use extra field (rendered as ReactNode by MentionItem, but we just want text)
  const extra = item.extra;
  if (typeof extra === 'string') return extra;

  // If extra is a ReactNode, we can't extract text easily, skip
  return undefined;
}

function useMentionGroups(options: ISlashOption[]) {
  return useMemo(() => {
    const flatItems: ISlashMenuOption[] = [];

    // Group by kind: plugins first, then files
    const pluginItems: ISlashMenuOption[] = [];
    const fileItems: ISlashMenuOption[] = [];

    for (const opt of options) {
      if ('type' in opt && opt.type === 'divider') continue;
      const item = opt as ISlashMenuOption;
      // Skip sentinel
      if (item.key === '__mention_sentinel__') continue;

      const meta = item.metadata as Record<string, unknown> | undefined;
      const kind = meta?.kind as string | undefined;

      if (kind === 'agent' || kind === 'plugin') {
        pluginItems.push(item);
      } else {
        fileItems.push(item);
      }
    }

    const groups: CommandMenuGroup[] = [];

    if (pluginItems.length > 0) {
      groups.push({
        title: '插件',
        items: pluginItems.map((item) => {
          flatItems.push(item);
          return {
            id: String(item.key),
            icon: renderMentionIcon(item),
            label: String(item.label ?? ''),
            description: item.desc ? String(item.desc) : undefined,
            tag: getMentionTag(item),
          } satisfies CommandMenuItem;
        }),
      });
    }

    // File items - always show the group (with emptyText when no results)
    groups.push({
      title: '文件',
      items: fileItems.map((item) => {
        flatItems.push(item);
        return {
          id: String(item.key),
          icon: renderMentionIcon(item),
          label: String(item.label ?? ''),
          description: item.desc ? String(item.desc) : undefined,
          tag: getMentionTag(item),
        } satisfies CommandMenuItem;
      }),
      emptyText: '输入内容搜索文件',
    });

    return { groups, flatItems };
  }, [options]);
}

export const MentionCommandMenu = memo<MentionCommandMenuProps>(({
  activeKey,
  loading,
  onSelect,
  open,
  options,
  setActiveKey,
}) => {
  const { groups, flatItems } = useMentionGroups(options);
  const floatingNodeRef = useRef<HTMLElement | null>(null);

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
          maxHeight: `${Math.max(120, availableHeight - 8)}px`,
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

  const shouldShow = open && (flatItems.length > 0 || groups.some((g) => g.emptyText) || loading);
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

MentionCommandMenu.displayName = 'MentionCommandMenu';
