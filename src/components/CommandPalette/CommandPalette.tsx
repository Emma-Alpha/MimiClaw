import { Command } from "cmdk";
import { createStyles } from "antd-style";
import { Search } from "lucide-react";
import { memo, useCallback, useState } from "react";

import type { CommandPaletteGroup } from "./types";

const useStyles = createStyles(({ css, token, isDarkMode }) => ({
	overlay: css`
		position: fixed;
		inset: 0;
		z-index: 1500;
		background: ${isDarkMode ? "rgba(0, 0, 0, 0.55)" : "rgba(15, 23, 42, 0.32)"};
		backdrop-filter: blur(6px);
		animation: command-palette-fade-in 120ms ease-out;

		@keyframes command-palette-fade-in {
			from {
				opacity: 0;
			}
			to {
				opacity: 1;
			}
		}
	`,
	dialog: css`
		position: fixed;
		top: 14vh;
		left: 50%;
		z-index: 1501;
		width: min(640px, calc(100vw - 32px));
		max-height: 60vh;
		transform: translateX(-50%);
		display: flex;
		flex-direction: column;
		overflow: hidden;
		border-radius: 14px;
		border: 1px solid ${token.colorBorderSecondary};
		background: ${token.colorBgElevated};
		box-shadow:
			0 24px 64px rgba(0, 0, 0, 0.28),
			0 4px 12px rgba(0, 0, 0, 0.12);
		animation: command-palette-slide-in 140ms ease-out;

		@keyframes command-palette-slide-in {
			from {
				opacity: 0;
				transform: translate(-50%, -8px);
			}
			to {
				opacity: 1;
				transform: translate(-50%, 0);
			}
		}
	`,
	inputRow: css`
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 12px 16px;
		border-bottom: 1px solid ${token.colorBorderSecondary};
	`,
	inputIcon: css`
		display: inline-flex;
		flex-shrink: 0;
		color: ${token.colorTextTertiary};
	`,
	input: css`
		flex: 1;
		min-width: 0;
		height: 24px;
		padding: 0;
		border: none;
		background: transparent;
		font-size: 15px;
		color: ${token.colorText};
		outline: none;

		&::placeholder {
			color: ${token.colorTextQuaternary};
		}
	`,
	list: css`
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		scrollbar-width: thin;
		padding: 6px 6px 8px;

		[cmdk-list-sizer] {
			display: flex;
			flex-direction: column;
		}
	`,
	group: css`
		& + & {
			margin-top: 4px;
		}

		[cmdk-group-heading] {
			padding: 8px 10px 4px;
			font-size: 11px;
			font-weight: 600;
			letter-spacing: 0.4px;
			color: ${token.colorTextQuaternary};
			text-transform: uppercase;
			user-select: none;
		}
	`,
	item: css`
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 8px 10px;
		border-radius: 8px;
		cursor: pointer;
		font-size: 13px;
		color: ${token.colorText};
		user-select: none;
		transition: background 80ms ease;

		&[data-selected="true"] {
			background: ${token.colorFillSecondary};
		}

		&[data-disabled="true"] {
			cursor: not-allowed;
			opacity: 0.5;
		}
	`,
	itemIcon: css`
		display: inline-flex;
		flex-shrink: 0;
		align-items: center;
		justify-content: center;
		width: 20px;
		height: 20px;
		color: ${token.colorTextSecondary};
	`,
	itemLabel: css`
		flex-shrink: 0;
		font-weight: 500;
	`,
	itemDescription: css`
		flex: 1;
		min-width: 0;
		font-size: 12px;
		color: ${token.colorTextTertiary};
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	`,
	shortcut: css`
		display: inline-flex;
		flex-shrink: 0;
		gap: 4px;
		margin-left: auto;
	`,
	kbd: css`
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 18px;
		height: 18px;
		padding: 0 5px;
		border-radius: 4px;
		border: 1px solid ${token.colorBorderSecondary};
		background: ${token.colorFillQuaternary};
		font-size: 11px;
		font-family: inherit;
		color: ${token.colorTextTertiary};
	`,
	empty: css`
		padding: 28px 16px;
		text-align: center;
		font-size: 13px;
		color: ${token.colorTextTertiary};
	`,
}));

export interface CommandPaletteProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	placeholder?: string;
	groups: CommandPaletteGroup[];
	emptyText?: string;
	dialogLabel?: string;
}

export const CommandPalette = memo<CommandPaletteProps>(function CommandPalette({
	open,
	onOpenChange,
	placeholder,
	groups,
	emptyText,
	dialogLabel,
}) {
	const { styles } = useStyles();
	const [search, setSearch] = useState("");

	const handleOpenChange = useCallback(
		(next: boolean) => {
			if (!next) setSearch("");
			onOpenChange(next);
		},
		[onOpenChange],
	);

	const visibleGroups = groups.filter((g) => g.items.length > 0);

	return (
		<Command.Dialog
			open={open}
			onOpenChange={handleOpenChange}
			label={dialogLabel ?? "Command palette"}
			loop
			overlayClassName={styles.overlay}
			contentClassName={styles.dialog}
		>
			<div className={styles.inputRow}>
				<span className={styles.inputIcon}>
					<Search size={16} />
				</span>
				<Command.Input
					value={search}
					onValueChange={setSearch}
					placeholder={placeholder}
					className={styles.input}
					autoFocus
				/>
			</div>

			<Command.List className={styles.list}>
				<Command.Empty className={styles.empty}>
					{emptyText ?? "No matches"}
				</Command.Empty>

				{visibleGroups.map((group) => (
					<Command.Group
						key={group.id}
						heading={group.heading}
						className={styles.group}
					>
						{group.items.map((item) => (
							<Command.Item
								key={item.id}
								value={`${group.id}::${item.id}`}
								keywords={item.keywords}
								onSelect={() => {
									item.onSelect();
									handleOpenChange(false);
								}}
								className={styles.item}
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
								{item.shortcut && item.shortcut.length > 0 && (
									<span className={styles.shortcut}>
										{item.shortcut.map((key, i) => (
											<kbd
												// biome-ignore lint/suspicious/noArrayIndexKey: shortcut keys are stable
												key={i}
												className={styles.kbd}
											>
												{key}
											</kbd>
										))}
									</span>
								)}
							</Command.Item>
						))}
					</Command.Group>
				))}
			</Command.List>
		</Command.Dialog>
	);
});
