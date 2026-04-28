import { memo, useCallback, useEffect, useRef } from "react";
import { createStyles } from "antd-style";

export type { CommandMenuItem, CommandMenuGroup, CommandMenuProps } from "./types";
import type { CommandMenuProps } from "./types";
import { getCommandMenuItemCount } from "./types";

// ── Styles ───────────────────────────────────────────────────────

const useStyles = createStyles(({ css, token }) => ({
	panel: css`
		display: flex;
		flex-direction: column;
		width: 100%;
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
		padding: 4px 0;
	`,
	sectionTitle: css`
		padding: 4px 14px 4px;
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.3px;
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
		flex-direction: row;
		align-items: center;
		gap: 0;
		padding: 6px 14px;
		border: none;
		background: transparent;
		text-align: left;
		cursor: pointer;
		transition: background 120ms ease;
		line-height: 20px;

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
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		width: 20px;
		height: 20px;
		margin-right: 6px;
		color: ${token.colorTextQuaternary};
		font-size: 14px;
		line-height: 1;

		img {
			width: 16px;
			height: 16px;
			object-fit: contain;
			border-radius: 3px;
		}
	`,
	itemLabel: css`
		font-size: 13px;
		font-weight: 600;
		color: ${token.colorText};
		white-space: nowrap;
		flex-shrink: 0;
	`,
	itemDescription: css`
		font-size: 13px;
		color: ${token.colorTextQuaternary};
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		margin-left: 6px;
		min-width: 0;
		flex: 1;
	`,
	itemTag: css`
		flex-shrink: 0;
		margin-left: 12px;
		font-size: 12px;
		color: ${token.colorTextQuaternary};
		user-select: none;
		white-space: nowrap;
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
													<span className={styles.itemIcon}>{item.icon}</span>
												)}
												<span className={styles.itemLabel}>{item.label}</span>
												{item.description && (
													<span className={styles.itemDescription}>
														{item.description}
													</span>
												)}
												{item.tag && (
													<span className={styles.itemTag}>{item.tag}</span>
												)}
											</button>
										);
									})
								: group.emptyText && (
										<div className={styles.emptyText}>{group.emptyText}</div>
									)}
						</div>
					);

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
