import type { ReactNode } from "react";

export interface CommandMenuItem {
	id: string;
	icon?: ReactNode;
	label: string;
	description?: string;
	/** Right-side tag, e.g. "个人" / "系统" */
	tag?: string;
	/** Arbitrary payload forwarded on selection */
	data?: unknown;
}

export interface CommandMenuGroup {
	title: string;
	items: CommandMenuItem[];
	/** Shown inside the group when it has no items (e.g. "输入内容搜索文件") */
	emptyText?: string;
}

export interface CommandMenuProps {
	groups: CommandMenuGroup[];
	/** Flat index across all groups (used for keyboard navigation) */
	activeIndex: number;
	onActiveIndexChange: (index: number) => void;
	onSelect: (item: CommandMenuItem) => void;
	className?: string;
	/** Shown when every group is empty and no emptyText is set */
	emptyState?: ReactNode;
}

/** Total selectable items across all groups */
export function getCommandMenuItemCount(groups: CommandMenuGroup[]): number {
	let count = 0;
	for (const g of groups) count += g.items.length;
	return count;
}
