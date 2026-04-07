import { createStyles } from "antd-style";
import { PermissionCardShell } from "./PermissionCardShell";

interface Props {
	rawInput: Record<string, unknown>;
	onAllow: () => void;
	onDeny: () => void;
}

const useStyles = createStyles(({ css, token }) => ({
	meta: css`
		font-size: 11px;
		color: ${token.colorTextTertiary};
		margin-bottom: 4px;
	`,
	cmd: css`
		font-size: 12px;
		font-family: ${token.fontFamilyCode};
		background: ${token.colorFillSecondary};
		border: 1px solid ${token.colorBorderSecondary};
		border-radius: 6px;
		padding: 6px 8px;
		white-space: pre-wrap;
		word-break: break-all;
		color: ${token.colorText};
		max-height: 120px;
		overflow-y: auto;
	`,
}));

export function BashPermissionCard({ rawInput, onAllow, onDeny }: Props) {
	const { styles } = useStyles();
	const command = String(rawInput.command || rawInput.cmd || "");
	const cwd = String(rawInput.cwd || rawInput.working_directory || "");

	return (
		<PermissionCardShell toolDisplayName="Bash" onAllow={onAllow} onDeny={onDeny}>
			{cwd && <div className={styles.meta}>📂 {cwd}</div>}
			<div className={styles.cmd}>$ {command}</div>
		</PermissionCardShell>
	);
}
