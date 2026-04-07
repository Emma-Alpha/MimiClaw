import { createStyles } from "antd-style";

interface Props {
	preTokens: number;
	trigger: string;
}

const useStyles = createStyles(({ css, token }) => ({
	row: css`
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 11px;
		color: ${token.colorTextQuaternary};
		padding: 6px 0;
		&::before, &::after {
			content: '';
			flex: 1;
			border-top: 1px dashed ${token.colorBorderSecondary};
		}
	`,
}));

function formatTokens(n: number) {
	if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
	return String(n);
}

export function CompactBoundary({ preTokens }: Props) {
	const { styles } = useStyles();
	return (
		<div className={styles.row}>
			上下文已压缩 ({formatTokens(preTokens)} tokens)
		</div>
	);
}
