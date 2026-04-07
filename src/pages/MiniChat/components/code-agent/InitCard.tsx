import { createStyles } from "antd-style";

interface Props {
	model: string;
	permissionMode: string;
	toolCount: number;
	mcpCount: number;
}

const useStyles = createStyles(({ css, token }) => ({
	card: css`
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 11px;
		color: ${token.colorTextTertiary};
		padding: 4px 8px;
		border-radius: 6px;
		background: ${token.colorFillTertiary};
		border: 1px solid ${token.colorBorderSecondary};
		font-family: ${token.fontFamilyCode};
		flex-wrap: wrap;
	`,
	badge: css`
		padding: 1px 5px;
		border-radius: 4px;
		background: ${token.colorFillSecondary};
		color: ${token.colorTextSecondary};
		font-size: 10px;
	`,
	model: css`
		color: ${token.colorText};
		font-weight: 600;
	`,
}));

function shortModel(model: string) {
	// claude-sonnet-4-20250514 → sonnet-4
	return model.replace(/^claude-/i, "").replace(/-\d{8}$/, "");
}

export function InitCard({ model, permissionMode, toolCount, mcpCount }: Props) {
	const { styles } = useStyles();

	return (
		<div className={styles.card}>
			<span>🤖</span>
			<span className={styles.model}>{shortModel(model)}</span>
			<span className={styles.badge}>{permissionMode}</span>
			<span className={styles.badge}>{toolCount} tools</span>
			{mcpCount > 0 && (
				<span className={styles.badge}>{mcpCount} MCP</span>
			)}
		</div>
	);
}
