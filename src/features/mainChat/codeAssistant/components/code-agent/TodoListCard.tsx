import { useState } from "react";
import { createStyles } from "antd-style";
import { CircleCheck, Circle, ListTodo, Minimize2, Maximize2 } from "lucide-react";
import type { StreamingToolUse } from "@/stores/chat";

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
		gap: 8px;
	`,
	cardDock: css`
		position: relative;
		padding: 12px 14px 12px;
		border-radius: 22px;
		border: 1px solid ${token.colorBorderSecondary};
		background: ${token.colorBgContainer};
		box-shadow:
			0 1px 2px rgba(15, 23, 42, 0.03),
			0 8px 24px rgba(15, 23, 42, 0.04);
	`,
	cardDockFused: css`
		border-bottom-left-radius: 14px;
		border-bottom-right-radius: 14px;
		border-bottom-color: ${token.colorBorderSecondary};
		padding-bottom: 12px;
	`,
	header: css`
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 0 4px;
	`,
	headerCollapsed: css`
		padding-bottom: 0;
		transition: padding 0.2s ease;
	`,
	headerLeft: css`
		display: flex;
		align-items: center;
		gap: 7px;
		font-size: ${token.fontSizeSM}px;
		line-height: 1.35;
		color: ${token.colorTextSecondary};
		font-weight: 500;
	`,
	headerIcon: css`
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		color: ${token.colorTextTertiary};
	`,
	headerAction: css`
		display: flex;
		align-items: center;
		justify-content: center;
		width: 20px;
		height: 20px;
		padding: 0;
		border: 0;
		border-radius: 999px;
		background: transparent;
		color: ${token.colorTextSecondary};
		cursor: pointer;
		transition: background-color 0.2s ease, color 0.2s ease;

		&:hover {
			color: ${token.colorText};
			background: ${token.colorFillQuaternary};
		}
	`,
	headerDot: css`
		display: none;
	`,
	headerCount: css`
		color: inherit;
	`,
	statusOk: css`
		flex-shrink: 0;
		margin-left: 4px;
		color: rgba(22, 163, 74, 0.9);
		font-size: calc(${token.fontSizeSM}px - 1px);
	`,
	list: css`
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding: 0;
	`,
	item: css`
		display: flex;
		align-items: flex-start;
		gap: 8px;
		font-size: ${token.fontSizeSM}px;
		line-height: 1.5;
		padding: 0;
	`,
	itemLead: css`
		display: inline-flex;
		align-items: baseline;
		gap: 5px;
		flex-shrink: 0;
	`,
	itemIcon: css`
		flex-shrink: 0;
		margin-top: 1px;
	`,
	itemOrder: css`
		display: inline-flex;
		align-items: center;
		min-width: 20px;
		font-variant-numeric: tabular-nums;
		color: ${token.colorText};
	`,
	itemCompleted: css`
		color: rgba(22, 163, 74, 0.9);
	`,
	itemInProgress: css`
		color: ${token.colorTextSecondary};
	`,
	itemPending: css`
		color: ${token.colorTextTertiary};
	`,
	itemText: css`
		color: ${token.colorText};
		word-break: break-word;
	`,
	itemTextCompleted: css`
		color: ${token.colorTextSecondary};
		text-decoration: line-through;
		text-decoration-thickness: 1px;
	`,
	itemTextInProgress: css`
		font-weight: 500;
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
			return <CircleCheck size={12} className={cx(styles.itemIcon, styles.itemCompleted)} />;
		case "in_progress":
			return <Circle size={12} className={cx(styles.itemIcon, styles.itemInProgress)} />;
		case "pending":
			return <Circle size={12} className={cx(styles.itemIcon, styles.itemPending)} />;
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
						<span className={styles.headerIcon}>
							<ListTodo size={13} />
						</span>
						<span className={styles.headerCount}>
							共 {todos.length} 个任务，已经完成 {completedCount} 个
						</span>
					{isCompleted && <span className={styles.statusOk}>✓</span>}
				</div>
				<button
					className={styles.headerAction}
					type="button"
					onClick={() => setExpanded(!expanded)}
					title={expanded ? "收起" : "展开"}
					aria-label={expanded ? "收起待办列表" : "展开待办列表"}
				>
					{expanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
				</button>
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
