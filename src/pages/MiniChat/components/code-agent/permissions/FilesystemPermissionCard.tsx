import { createStyles } from "antd-style";
import { PermissionCardShell } from "./PermissionCardShell";

interface Props {
	toolName: string;
	rawInput: Record<string, unknown>;
	onAllow: () => void;
	onDeny: () => void;
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
}));

export function FilesystemPermissionCard({ toolName, rawInput, onAllow, onDeny }: Props) {
	const { styles } = useStyles();
	const path = String(rawInput.path || rawInput.target_directory || rawInput.file_path || "");
	const pattern = String(rawInput.pattern || rawInput.glob_pattern || "");
	const display = pattern ? `"${pattern}"${path ? ` in ${path}` : ""}` : path;
	const icon = toolName.toLowerCase() === "grep" ? "🔍" : toolName.toLowerCase() === "glob" ? "📂" : "📄";

	return (
		<PermissionCardShell toolDisplayName={toolName} onAllow={onAllow} onDeny={onDeny}>
			<div className={styles.row}>{icon} {display}</div>
		</PermissionCardShell>
	);
}
