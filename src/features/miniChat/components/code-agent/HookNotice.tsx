import { createStyles } from "antd-style";

interface Props {
	hookName: string;
	hookEvent: string;
	outcome: "started" | "progress" | "success" | "error";
	stdout?: string;
	exitCode?: number | null;
}

const useStyles = createStyles(({ css, token }) => ({
	row: css`
		display: flex;
		align-items: baseline;
		gap: 4px;
		font-size: 11px;
		font-family: ${token.fontFamilyCode};
		color: ${token.colorTextSecondary};
		padding: 2px 0;
	`,
	ok: css`color: ${token.colorSuccess};`,
	err: css`color: ${token.colorError};`,
	sub: css`
		font-size: 10px;
		color: ${token.colorTextTertiary};
		margin-left: 4px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 200px;
	`,
}));

export function HookNotice({ hookName, hookEvent, outcome, stdout, exitCode }: Props) {
	const { styles } = useStyles();

	let statusEl: React.ReactNode = " 执行中…";
	if (outcome === "success") {
		statusEl = <span className={styles.ok}> ✓{exitCode != null ? ` (exit ${exitCode})` : ""}</span>;
	} else if (outcome === "error") {
		statusEl = <span className={styles.err}> ✗{exitCode != null ? ` exit ${exitCode}` : ""}</span>;
	}

	return (
		<div className={styles.row}>
			<span>🪝</span>
			<span>Hook: {hookName}</span>
			<span style={{ opacity: 0.6 }}>({hookEvent})</span>
			{statusEl}
			{stdout && <span className={styles.sub}>{stdout.slice(0, 80)}</span>}
		</div>
	);
}
