import { createStyles } from "antd-style";

interface Props {
	attempt: number;
	maxRetries: number;
	delayMs: number;
	error: string;
}

const useStyles = createStyles(({ css, token }) => ({
	row: css`
		display: flex;
		align-items: center;
		gap: 4px;
		font-size: calc(${token.fontSizeSM}px - 1px);
		font-family: ${token.fontFamilyCode};
		color: ${token.colorWarning};
		padding: 2px 0;
	`,
}));

export function ApiRetryNotice({ attempt, maxRetries, delayMs, error }: Props) {
	const { styles } = useStyles();
	const delay = (delayMs / 1000).toFixed(1);

	return (
		<div className={styles.row}>
			🔄 API 重试 · 第 {attempt}/{maxRetries} 次 · 等待 {delay}s · {error}
		</div>
	);
}
