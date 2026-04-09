import { createStyles } from "antd-style";

interface Props {
	isError: boolean;
	numTurns: number;
	totalCostUsd: number;
	durationMs: number;
}

const useStyles = createStyles(({ css, token }) => ({
	row: css`
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 11px;
		font-family: ${token.fontFamilyCode};
		color: ${token.colorTextTertiary};
		padding: 3px 0;
	`,
	ok: css`color: ${token.colorSuccess};`,
	err: css`color: ${token.colorError};`,
}));

export function ResultSummary({ isError, numTurns, totalCostUsd, durationMs }: Props) {
	const { styles } = useStyles();
	const sec = (durationMs / 1000).toFixed(1);
	const cost = totalCostUsd > 0 ? ` · $${totalCostUsd.toFixed(4)}` : "";

	return (
		<div className={styles.row}>
			{isError
				? <span className={styles.err}>✗ 本轮失败</span>
				: <span className={styles.ok}>✓ 本轮完成</span>
			}
			<span>{numTurns} 轮 · {sec}s{cost}</span>
		</div>
	);
}
