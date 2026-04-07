import { createStyles } from "antd-style";

interface TaskStartProps {
	taskId: string;
	description: string;
}

interface TaskEndProps {
	taskId: string;
	status: "completed" | "failed" | "stopped";
	summary: string;
}

const useStyles = createStyles(({ css, token }) => ({
	start: css`
		display: flex;
		align-items: center;
		gap: 5px;
		font-size: 11px;
		font-family: ${token.fontFamilyCode};
		color: ${token.colorTextSecondary};
		padding: 3px 0;
		border-left: 2px solid ${token.colorPrimary};
		padding-left: 8px;
	`,
	end: css`
		display: flex;
		align-items: center;
		gap: 5px;
		font-size: 11px;
		font-family: ${token.fontFamilyCode};
		color: ${token.colorTextTertiary};
		padding: 2px 0 4px 0;
		border-left: 2px solid ${token.colorPrimary};
		padding-left: 8px;
	`,
	ok: css`color: ${token.colorSuccess};`,
	err: css`color: ${token.colorError};`,
	desc: css`
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		max-width: 220px;
	`,
}));

export function TaskStart({ description }: TaskStartProps) {
	const { styles } = useStyles();
	return (
		<div className={styles.start}>
			<span>⚙️</span>
			<span>子任务:</span>
			<span className={styles.desc}>"{description}"</span>
			<span>⟳</span>
		</div>
	);
}

export function TaskEnd({ status, summary }: TaskEndProps) {
	const { styles } = useStyles();
	const icon =
		status === "completed" ? <span className={styles.ok}>✓</span> :
		status === "failed" ? <span className={styles.err}>✗</span> :
		<span>◼</span>;

	return (
		<div className={styles.end}>
			<span>⚙️</span>
			<span>子任务完成</span>
			{icon}
			{summary && <span className={styles.desc}>{summary.slice(0, 60)}</span>}
		</div>
	);
}
