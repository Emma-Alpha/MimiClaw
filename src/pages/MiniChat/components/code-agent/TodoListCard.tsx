import { useState } from "react";
import { createStyles } from "antd-style";
import { CircleCheck, CircleDashed, Circle, ListChecks, Minimize2, Maximize2 } from "lucide-react";
import type { StreamingToolUse } from "@/stores/code-agent";

interface TodoItem {
	content: string;
	status: "pending" | "in_progress" | "completed";
	activeForm?: string;
}

interface Props {
	tool: StreamingToolUse;
	variant?: "inline" | "dock";
	fusedWithComposer?: boolean;
}

const useStyles = createStyles(({ css, token }) => ({
	card: css`
		display: flex;
		flex-direction: column;
		gap: 6px;
	`,
	cardDock: css`
		position: relative;
		overflow: hidden;
		padding: 10px 12px 12px;
		border-radius: 14px;
		border: 1px solid ${token.colorBorder};
		background:
			linear-gradient(
				180deg,
				${token.colorBgContainer} 0%,
				${token.colorFillSecondary} 100%
			);
		box-shadow:
			inset 0 1px 0 rgba(255, 255, 255, 0.84),
			inset 0 -1px 0 rgba(15, 23, 42, 0.08),
			0 2px 4px rgba(15, 23, 42, 0.06),
			0 12px 24px rgba(15, 23, 42, 0.14);
		backdrop-filter: blur(6px);

		&::before {
			content: "";
			position: absolute;
			left: 0;
			right: 0;
			top: 0;
			height: 38%;
			background: linear-gradient(
				180deg,
				rgba(255, 255, 255, 0.45) 0%,
				rgba(255, 255, 255, 0) 100%
			);
			pointer-events: none;
		}
	`,
	cardDockFused: css`
		border-bottom-left-radius: 8px;
		border-bottom-right-radius: 8px;
		border-bottom-color: transparent;
		padding-bottom: 16px;
		box-shadow:
			inset 0 1px 0 rgba(255, 255, 255, 0.84),
			inset 0 -1px 0 rgba(15, 23, 42, 0.08),
			0 2px 4px rgba(15, 23, 42, 0.06),
			0 6px 12px rgba(15, 23, 42, 0.09);

		&::after {
			content: "";
			position: absolute;
			left: 10px;
			right: 10px;
			bottom: 0;
			height: 18px;
			background: linear-gradient(
				180deg,
				rgba(255, 255, 255, 0) 0%,
				rgba(255, 255, 255, 0.62) 100%
			);
			pointer-events: none;
		}
	`,
	header: css`
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 2px 6px;
		border-bottom: 1px solid ${token.colorBorderSecondary};
	`,
	headerCollapsed: css`
		border-bottom-color: transparent;
		padding-bottom: 2px;
		transition: border-bottom-color 0.2s ease, padding 0.2s ease;
	`,
	headerLeft: css`
		display: flex;
		align-items: center;
		gap: 5px;
		font-size: 11.5px;
		font-family: ${token.fontFamilyCode};
		line-height: 20px;
		color: ${token.colorTextSecondary};
	`,
	headerAction: css`
		display: flex;
		align-items: center;
		justify-content: center;
		width: 20px;
		height: 20px;
		border-radius: 4px;
		color: ${token.colorTextTertiary};
		cursor: pointer;
		transition: background-color 0.2s ease, color 0.2s ease;

		&:hover {
			color: ${token.colorTextSecondary};
			background: ${token.colorFillTertiary};
		}
	`,
	headerIcon: css`
		flex-shrink: 0;
		color: ${token.colorTextSecondary};
		margin-top: -1px;
	`,
	headerCount: css`
		color: ${token.colorTextSecondary};
	`,
	statusOk: css`
		flex-shrink: 0;
		margin-left: 4px;
		color: ${token.colorSuccess};
		font-size: 11px;
	`,
	list: css`
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: 1px 2px 0;
	`,
	item: css`
		display: flex;
		align-items: baseline;
		gap: 6px;
		font-size: 12px;
		line-height: 1.52;
		padding: 1px 0;
	`,
	itemLead: css`
		display: inline-flex;
		align-items: center;
		gap: 4px;
		flex-shrink: 0;
	`,
	itemIcon: css`
		flex-shrink: 0;
		margin-top: -1px;
	`,
	itemOrder: css`
		display: inline-flex;
		align-items: center;
		min-width: 18px;
		font-variant-numeric: tabular-nums;
		color: ${token.colorTextSecondary};
	`,
	itemCompleted: css`
		color: ${token.colorSuccess};
	`,
	itemInProgress: css`
		color: ${token.colorPrimary};
	`,
	itemPending: css`
		color: ${token.colorTextQuaternary};
	`,
	itemText: css`
		color: ${token.colorText};
		word-break: break-word;
		text-shadow:
			0 1px 0 rgba(255, 255, 255, 0.82),
			0 -1px 0 rgba(15, 23, 42, 0.03);
	`,
	itemTextCompleted: css`
		color: ${token.colorTextTertiary};
		text-decoration: line-through;
		text-decoration-thickness: 1.5px;
	`,
	itemTextInProgress: css`
		font-weight: 550;
	`,
}));

function parseTodos(rawInput: Record<string, unknown>): TodoItem[] {
	const todos = rawInput?.todos;
	if (!Array.isArray(todos)) return [];
	return todos.filter(
		(t): t is TodoItem =>
			t != null &&
			typeof t === "object" &&
			typeof (t as TodoItem).content === "string" &&
			typeof (t as TodoItem).status === "string",
	);
}

function TodoItemIcon({ status }: { status: TodoItem["status"] }) {
	const { styles, cx } = useStyles();
	switch (status) {
		case "completed":
			return <CircleCheck size={14} className={cx(styles.itemIcon, styles.itemCompleted)} />;
		case "in_progress":
			return <Circle size={14} className={cx(styles.itemIcon, styles.itemInProgress)} />;
		case "pending":
			return <CircleDashed size={14} className={cx(styles.itemIcon, styles.itemPending)} />;
	}
}

export function TodoListCard({
	tool,
	variant = "inline",
	fusedWithComposer = false,
}: Props) {
	const { styles, cx } = useStyles();
	const [expanded, setExpanded] = useState(true);
	const todos = parseTodos(tool.rawInput);
	const isCompleted = tool.status === "completed";

	if (todos.length === 0) return null;

	const completedCount = todos.filter((t) => t.status === "completed").length;

	return (
		<div
			className={cx(
				styles.card,
				variant === "dock" && styles.cardDock,
				variant === "dock" && fusedWithComposer && styles.cardDockFused,
			)}
		>
			<div className={cx(styles.header, !expanded && styles.headerCollapsed)}>
				<div className={styles.headerLeft}>
					<ListChecks size={12} className={styles.headerIcon} />
					<span className={styles.headerCount}>
						共 {todos.length} 个任务，已经完成 {completedCount} 个
					</span>
					{isCompleted && <span className={styles.statusOk}>✓</span>}
				</div>
				<div
					className={styles.headerAction}
					onClick={() => setExpanded(!expanded)}
					title={expanded ? "收起" : "展开"}
				>
					{expanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
				</div>
			</div>
			{expanded && (
				<div className={styles.list}>
					{todos.map((todo, index) => (
						<div key={`${todo.content}-${index}`} className={styles.item}>
							<span className={styles.itemLead}>
								<TodoItemIcon status={todo.status} />
								<span className={styles.itemOrder}>{index + 1}.</span>
							</span>
							<span
								className={cx(
									styles.itemText,
									todo.status === "completed" && styles.itemTextCompleted,
									todo.status === "in_progress" && styles.itemTextInProgress,
								)}
							>
								{todo.content}
							</span>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
