import { createStyles } from "antd-style";
import { PermissionCardShell } from "./PermissionCardShell";

interface Props {
	rawInput: Record<string, unknown>;
	onAllow: () => void;
	onDeny: () => void;
}

const useStyles = createStyles(({ css, token }) => ({
	url: css`
		font-size: 12px;
		font-family: ${token.fontFamilyCode};
		color: ${token.colorPrimary};
		word-break: break-all;
		background: ${token.colorFillSecondary};
		padding: 5px 8px;
		border-radius: 6px;
		border: 1px solid ${token.colorBorderSecondary};
	`,
}));

export function WebFetchPermissionCard({ rawInput, onAllow, onDeny }: Props) {
	const { styles } = useStyles();
	const url = String(rawInput.url || "");

	return (
		<PermissionCardShell toolDisplayName="WebFetch" onAllow={onAllow} onDeny={onDeny}>
			<div className={styles.url}>🌐 {url}</div>
		</PermissionCardShell>
	);
}
