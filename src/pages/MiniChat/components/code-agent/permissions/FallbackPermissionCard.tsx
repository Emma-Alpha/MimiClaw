import { createStyles } from "antd-style";
import { PermissionCardShell } from "./PermissionCardShell";

interface Props {
	toolName: string;
	rawInput: Record<string, unknown>;
	title?: string;
	onAllow: () => void;
	onDeny: () => void;
}

const useStyles = createStyles(({ css, token }) => ({
	pre: css`
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

export function FallbackPermissionCard({ toolName, rawInput, onAllow, onDeny }: Props) {
	const { styles } = useStyles();
	const json = JSON.stringify(rawInput, null, 2);

	return (
		<PermissionCardShell toolDisplayName={toolName} onAllow={onAllow} onDeny={onDeny}>
			<div className={styles.pre}>{json.slice(0, 400)}</div>
		</PermissionCardShell>
	);
}
