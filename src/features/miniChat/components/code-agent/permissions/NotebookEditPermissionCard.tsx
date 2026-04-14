import { createStyles } from "antd-style";
import { PermissionCardShell } from "./PermissionCardShell";
import type { PermissionDecision } from "./PermissionCardShell";

interface Props {
	rawInput: Record<string, unknown>;
	onDecision: (decision: PermissionDecision, feedback?: string) => void;
}

const useStyles = createStyles(({ css, token }) => ({
	row: css`
		font-size: 12px;
		font-family: ${token.fontFamilyCode};
		color: ${token.colorTextSecondary};
		background: ${token.colorFillSecondary};
		padding: 5px 8px;
		border-radius: 6px;
		border: 1px solid ${token.colorBorderSecondary};
		word-break: break-all;
	`,
	meta: css`
		font-size: 11px;
		color: ${token.colorTextTertiary};
		margin-top: 4px;
	`,
}));

export function NotebookEditPermissionCard({ rawInput, onDecision }: Props) {
	const { styles } = useStyles();
	const path = String(rawInput.notebook_path || rawInput.file_path || rawInput.path || "");
	const cellIdx = rawInput.cell_index != null ? String(rawInput.cell_index) : null;
	const source = String(rawInput.source || rawInput.new_source || "");

	return (
		<PermissionCardShell toolDisplayName="NotebookEdit" onDecision={onDecision}>
			<div className={styles.row}>📓 {path}{cellIdx != null ? ` · Cell ${cellIdx}` : ""}</div>
			{source && <div className={styles.meta}>{source.slice(0, 80)}</div>}
		</PermissionCardShell>
	);
}
