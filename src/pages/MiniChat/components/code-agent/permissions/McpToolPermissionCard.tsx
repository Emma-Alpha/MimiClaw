import { createStyles } from "antd-style";
import { PermissionCardShell } from "./PermissionCardShell";

interface Props {
	toolName: string;
	rawInput: Record<string, unknown>;
	title?: string;
	description?: string;
	onAllow: () => void;
	onDeny: () => void;
}

const useStyles = createStyles(({ css, token }) => ({
	meta: css`
		font-size: 11px;
		color: ${token.colorTextTertiary};
		margin-bottom: 4px;
	`,
	input: css`
		font-size: 11px;
		font-family: ${token.fontFamilyCode};
		background: ${token.colorFillSecondary};
		border: 1px solid ${token.colorBorderSecondary};
		border-radius: 6px;
		padding: 6px 8px;
		white-space: pre-wrap;
		word-break: break-all;
		color: ${token.colorTextSecondary};
		max-height: 100px;
		overflow-y: auto;
	`,
}));

export function McpToolPermissionCard({ toolName, rawInput, title, description, onAllow, onDeny }: Props) {
	const { styles } = useStyles();
	const parts = toolName.split("__");
	const serverName = parts.length > 1 ? parts[0] : "";
	const shortToolName = parts.length > 1 ? parts.slice(1).join("__") : toolName;

	return (
		<PermissionCardShell toolDisplayName={`MCP: ${shortToolName}`} onAllow={onAllow} onDeny={onDeny}>
			{serverName && <div className={styles.meta}>🔌 Server: {serverName}</div>}
			{(title || description) && (
				<div className={styles.meta}>{title || description}</div>
			)}
			<div className={styles.input}>{JSON.stringify(rawInput, null, 2).slice(0, 300)}</div>
		</PermissionCardShell>
	);
}
