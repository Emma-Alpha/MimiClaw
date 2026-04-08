import { createStyles } from "antd-style";
import { CircleCheck, CircleDashed, Circle, ListChecks } from "lucide-react";
import type { StreamingToolUse } from "@/stores/code-agent";

interface TodoItem {
	content: string;
	status: "pending" | "in_progress" | "completed";
	activeForm?: string;
}

interface Props {
	tool: StreamingToolUse;
}

const useStyles = createStyles(({ css, token }) => ({
	card: css`
		display: flex;
		flex-direction: column;
		gap: 0;
	`,
	header: css`
		display: flex;
		align-items: center;
		gap: 4px;
		font-size: 11px;
		font-family: ${token.fontFamilyCode};
		line-height: 22px;
		color: ${token.colorTextSecondary};
	`,
	headerIcon: css`
		flex-shrink: 0;
		color: ${token.colorTextTertiary};
	`,
	headerLabel: css`
		font-weight: 600;
		color: ${token.colorText};
	`,
	headerSep: css`
		color: ${token.colorTextQuaternary};
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
		gap: 1px;
		padding: 2px 0 2px 2px;
	`,
	item: css`
		display: flex;
		align-items: flex-start;
		gap: 6px;
		font-size: 12px;
		line-height: 1.6;
		padding: 1px 0;
	`,
	itemIcon: css`
		flex-shrink: 0;
		margin-top: 3px;
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
	`,
	itemTextCompleted: css`
		color: ${token.colorTextTertiary};
		text-decoration: line-through;
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
			return <CircleCheck size={14} className={cx(styles.itemIcon, styles.itemCompleted)} />;
		case "in_progress":
			return <Circle size={14} className={cx(styles.itemIcon, styles.itemInProgress)} />;
		case "pending":
			return <CircleDashed size={14} className={cx(styles.itemIcon, styles.itemPending)} />;
	}
}

export function TodoListCard({ tool }: Props) {
	const { styles, cx } = useStyles();
	const todos = parseTodos(tool.rawInput);
	const isCompleted = tool.status === "completed";

	if (todos.length === 0) return null;

	const completedCount = todos.filter((t) => t.status === "completed").length;

	return (
		<div className={styles.card}>
			<div className={styles.header}>
				<ListChecks size={12} className={styles.headerIcon} />
				<span className={styles.headerLabel}>Todo</span>
				<span className={styles.headerSep}>·</span>
				<span className={styles.headerCount}>
					{completedCount}/{todos.length} completed
				</span>
				{isCompleted && <span className={styles.statusOk}>✓</span>}
			</div>
			<div className={styles.list}>
				{todos.map((todo) => (
					<div key={todo.content} className={styles.item}>
						<TodoItemIcon status={todo.status} />
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
		</div>
	);
}
