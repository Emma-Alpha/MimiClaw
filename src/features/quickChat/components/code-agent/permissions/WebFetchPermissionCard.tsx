import { createStyles } from "antd-style";
import { PermissionCardShell } from "./PermissionCardShell";
import type { PermissionDecision } from "./PermissionCardShell";

interface Props {
	rawInput: Record<string, unknown>;
	onDecision: (decision: PermissionDecision, feedback?: string) => void;
}

const useStyles = createStyles(({ css, token }) => ({
	url: css`
		font-size: ${token.fontSizeSM}px;
		font-family: ${token.fontFamilyCode};
		color: ${token.colorPrimary};
		word-break: break-all;
		background: ${token.colorFillSecondary};
		padding: 5px 8px;
		border-radius: 6px;
		border: 1px solid ${token.colorBorderSecondary};
	`,
}));

export function WebFetchPermissionCard({ rawInput, onDecision }: Props) {
	const { styles } = useStyles();
	const url = String(rawInput.url || "");

	return (
		<PermissionCardShell toolDisplayName="WebFetch" onDecision={onDecision}>
			<div className={styles.url}>🌐 {url}</div>
		</PermissionCardShell>
	);
}
