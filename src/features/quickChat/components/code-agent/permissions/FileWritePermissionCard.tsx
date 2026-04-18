import { createStyles } from "antd-style";
import { PermissionCardShell } from "./PermissionCardShell";
import type { PermissionDecision } from "./PermissionCardShell";

interface Props {
	rawInput: Record<string, unknown>;
	onDecision: (decision: PermissionDecision, feedback?: string) => void;
}

const useStyles = createStyles(({ css, token }) => ({
	path: css`
		font-size: calc(${token.fontSizeSM}px - 1px);
		font-family: ${token.fontFamilyCode};
		color: ${token.colorTextSecondary};
		margin-bottom: 6px;
	`,
	preview: css`
		font-size: calc(${token.fontSizeSM}px - 1px);
		font-family: ${token.fontFamilyCode};
		background: ${token.colorFillSecondary};
		border: 1px solid ${token.colorBorderSecondary};
		border-radius: 6px;
		padding: 6px 8px;
		white-space: pre;
		overflow: auto;
		max-height: 100px;
		color: ${token.colorTextSecondary};
	`,
}));

export function FileWritePermissionCard({ rawInput, onDecision }: Props) {
	const { styles } = useStyles();
	const filePath = String(rawInput.file_path || rawInput.path || "");
	const content = String(rawInput.content || "");
	const preview = content.split("\n").slice(0, 10).join("\n");

	return (
		<PermissionCardShell toolDisplayName="FileWrite" onDecision={onDecision}>
			{filePath && <div className={styles.path}>📝 {filePath}</div>}
			{preview && <div className={styles.preview}>{preview}</div>}
		</PermissionCardShell>
	);
}
