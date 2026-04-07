import { createStyles } from "antd-style";
import type { StreamingToolUse } from "@/stores/code-agent";

interface Props {
	tool: StreamingToolUse;
}

const TOOL_META: Record<string, { icon: string; label: string }> = {
	read: { icon: "📄", label: "Read" },
	fileread: { icon: "📄", label: "Read" },
	write: { icon: "📝", label: "Write" },
	filewrite: { icon: "📝", label: "Write" },
	edit: { icon: "✏️", label: "Edit" },
	fileedit: { icon: "✏️", label: "Edit" },
	strreplacebasededitattempt: { icon: "✏️", label: "Edit" },
	multiedit: { icon: "✏️", label: "MultiEdit" },
	bash: { icon: "💻", label: "Bash" },
	bashtool: { icon: "💻", label: "Bash" },
	grep: { icon: "🔍", label: "Grep" },
	glob: { icon: "📂", label: "Glob" },
	webfetch: { icon: "🌐", label: "Fetch" },
	agent: { icon: "⚙️", label: "Task" },
	task: { icon: "⚙️", label: "Task" },
	notebookedit: { icon: "📓", label: "Notebook" },
	ls: { icon: "📂", label: "Ls" },
	listfiles: { icon: "📂", label: "Ls" },
	todowrite: { icon: "✅", label: "Todo" },
	websearch: { icon: "🔎", label: "Search" },
};

function getToolMeta(toolName: string) {
	const key = toolName.toLowerCase();
	return TOOL_META[key] ?? { icon: "🔧", label: toolName };
}

const useStyles = createStyles(({ css, token }) => ({
	row: css`
		display: flex;
		align-items: baseline;
		gap: 4px;
		font-size: 11px;
		font-family: ${token.fontFamilyCode};
		line-height: 22px;
		color: ${token.colorTextSecondary};
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	`,
	icon: css`
		flex-shrink: 0;
		font-size: 11px;
	`,
	name: css`
		font-weight: 600;
		color: ${token.colorText};
		flex-shrink: 0;
	`,
	sep: css`
		color: ${token.colorTextQuaternary};
		flex-shrink: 0;
	`,
	summary: css`
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		flex: 1;
		min-width: 0;
	`,
	status: css`
		flex-shrink: 0;
		margin-left: 4px;
	`,
	statusOk: css`color: ${token.colorSuccess};`,
	statusError: css`color: ${token.colorError};`,
	statusPending: css`color: ${token.colorWarning};`,
	result: css`
		color: ${token.colorTextTertiary};
		margin-left: 6px;
		font-size: 10px;
		flex-shrink: 0;
	`,
}));

function StatusIcon({ status, elapsed }: { status: StreamingToolUse["status"]; elapsed?: number }) {
	const { styles } = useStyles();
	if (status === "completed") return <span className={`${styles.status} ${styles.statusOk}`}>✓</span>;
	if (status === "failed") return <span className={`${styles.status} ${styles.statusError}`}>✗</span>;
	if (status === "awaiting-permission") return <span className={`${styles.status} ${styles.statusPending}`}>🛡</span>;
	// Spinner for streaming-input / executing
	const label = elapsed != null && elapsed > 0 ? `${elapsed.toFixed(0)}s` : "";
	return (
		<span className={`${styles.status} ${styles.statusPending}`} title={label}>
			⟳
		</span>
	);
}

export function ToolUseLine({ tool }: Props) {
	const { styles } = useStyles();
	const { icon, label } = getToolMeta(tool.toolName);

	return (
		<div className={styles.row}>
			<span className={styles.icon}>{icon}</span>
			<span className={styles.name}>{label}</span>
			{tool.inputSummary && (
				<>
					<span className={styles.sep}>·</span>
					<span className={styles.summary}>{tool.inputSummary}</span>
				</>
			)}
			<StatusIcon status={tool.status} elapsed={tool.elapsedSeconds} />
			{tool.resultSummary && (
				<span className={styles.result}>{tool.resultSummary}</span>
			)}
		</div>
	);
}
