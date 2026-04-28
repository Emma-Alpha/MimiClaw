import type { ReactNode } from "react";
import { memo, useCallback, useEffect, useRef } from "react";
import { createStyles } from "antd-style";

// ── Types ────────────────────────────────────────────────────────

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

// ── Helpers ──────────────────────────────────────────────────────

/** Total selectable items across all groups */
export function getCommandMenuItemCount(groups: CommandMenuGroup[]): number {
	let count = 0;
	for (const g of groups) count += g.items.length;
	return count;
}


// ── Styles ───────────────────────────────────────────────────────

const useStyles = createStyles(({ css, token }) => ({
	panel: css`
		display: flex;
		flex-direction: column;
		max-height: 340px;
		overflow-x: hidden;
		overflow-y: auto;
		scrollbar-width: thin;
		border-radius: 12px;
		border: 1px solid ${token.colorBorderSecondary};
		background: ${token.colorBgElevated};
		box-shadow:
			0 4px 24px 0 rgba(0, 0, 0, 0.08),
			0 1px 4px 0 rgba(0, 0, 0, 0.04);
	`,
	section: css`
		padding: 6px 0;
	`,
	sectionTitle: css`
		padding: 4px 14px 6px;
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.3px;
		text-transform: uppercase;
		color: ${token.colorTextQuaternary};
		user-select: none;
	`,
	divider: css`
		height: 1px;
		margin: 0 8px;
		background: ${token.colorBorderSecondary};
	`,
	item: css`
		width: 100%;
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 7px 14px;
		border: none;
		background: transparent;
		text-align: left;
		cursor: pointer;
		transition: background 120ms ease;

		&:hover {
			background: ${token.colorFillTertiary};
		}
	`,
	itemActive: css`
		background: ${token.colorFillSecondary};

		&:hover {
			background: ${token.colorFillSecondary};
		}
	`,
	itemIcon: css`
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		width: 28px;
		height: 28px;
		border-radius: 6px;
		background: ${token.colorFillTertiary};
		color: ${token.colorTextSecondary};
		font-size: 14px;
		line-height: 1;

		img {
			width: 18px;
			height: 18px;
			object-fit: contain;
			border-radius: 4px;
		}
	`,
	itemContent: css`
		display: flex;
		flex-direction: column;
		gap: 1px;
		min-width: 0;
		flex: 1;
	`,
	itemLabel: css`
		font-size: 13px;
		line-height: 18px;
		font-weight: 500;
		color: ${token.colorText};
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	`,
	itemDescription: css`
		font-size: 12px;
		line-height: 16px;
		color: ${token.colorTextQuaternary};
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	`,
	itemTag: css`
		flex-shrink: 0;
		font-size: 11px;
		line-height: 16px;
		color: ${token.colorTextQuaternary};
		user-select: none;
	`,
	emptyText: css`
		padding: 8px 14px;
		font-size: 12px;
		color: ${token.colorTextQuaternary};
		user-select: none;
	`,
	emptyState: css`
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 14px;
	`,
}));

// ── Component ────────────────────────────────────────────────────

export const CommandMenu = memo<CommandMenuProps>(function CommandMenu({
	groups,
	activeIndex,
	onActiveIndexChange,
	onSelect,
	className,
	emptyState,
}) {
	const { styles, cx } = useStyles();
	const panelRef = useRef<HTMLDivElement>(null);
	const itemRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

	// Scroll active item into view
	useEffect(() => {
		const node = itemRefs.current.get(activeIndex);
		if (!node || !panelRef.current) return;

		const panel = panelRef.current;
		const itemTop = node.offsetTop;
		const itemBottom = itemTop + node.offsetHeight;
		const visibleTop = panel.scrollTop;
		const visibleBottom = visibleTop + panel.clientHeight;

		if (itemTop < visibleTop) {
			panel.scrollTop = itemTop;
		} else if (itemBottom > visibleBottom) {
			panel.scrollTop = itemBottom - panel.clientHeight;
		}
	}, [activeIndex]);

	const setItemRef = useCallback(
		(flatIndex: number) => (node: HTMLButtonElement | null) => {
			if (node) {
				itemRefs.current.set(flatIndex, node);
			} else {
				itemRefs.current.delete(flatIndex);
			}
		},
		[],
	);

	const totalItems = getCommandMenuItemCount(groups);
	const hasAnyItems = totalItems > 0;
	const hasAnyContent = hasAnyItems || groups.some((g) => g.emptyText);

	if (!hasAnyContent && !emptyState) return null;

	let flatIndex = 0;

	return (
		<div ref={panelRef} className={cx(styles.panel, className)}>
			{hasAnyContent ? (
				groups.map((group, gi) => {
					if (group.items.length === 0 && !group.emptyText) return null;

					const startIndex = flatIndex;

					const sectionNode = (
						<div key={group.title} className={styles.section}>
							<div className={styles.sectionTitle}>{group.title}</div>

							{group.items.length > 0
								? group.items.map((item) => {
										const idx = flatIndex++;
										const isActive = idx === activeIndex;
										return (
											<button
												key={item.id}
												ref={setItemRef(idx)}
												type="button"
												className={cx(
													styles.item,
													isActive && styles.itemActive,
												)}
												onMouseEnter={() => onActiveIndexChange(idx)}
												onMouseDown={(e) => {
													e.preventDefault();
													onSelect(item);
												}}
											>
												{item.icon != null && (
													<div className={styles.itemIcon}>{item.icon}</div>
												)}
												<div className={styles.itemContent}>
													<div className={styles.itemLabel}>{item.label}</div>
													{item.description && (
														<div className={styles.itemDescription}>
															{item.description}
														</div>
													)}
												</div>
												{item.tag && (
													<div className={styles.itemTag}>{item.tag}</div>
												)}
											</button>
										);
									})
								: group.emptyText && (
										<div className={styles.emptyText}>{group.emptyText}</div>
									)}
						</div>
					);

					// Only recalculate flatIndex for next group if this group was rendered
					void startIndex;

					return (
						<>
							{gi > 0 && <div key={`divider-${gi}`} className={styles.divider} />}
							{sectionNode}
						</>
					);
				})
			) : (
				<div className={styles.emptyState}>{emptyState}</div>
			)}
		</div>
	);
});
