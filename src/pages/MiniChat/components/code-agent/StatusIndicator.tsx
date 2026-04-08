import { createStyles } from "antd-style";

interface Props {
	text: string;
}

const useStyles = createStyles(({ css, token }) => ({
	wrap: css`
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 4px 0;
		font-size: 13px;
		line-height: 1.5;
		color: ${token.colorTextSecondary};
	`,
	star: css`
		flex-shrink: 0;
		font-size: 11px;
		animation: starPulse 2s ease-in-out infinite;

		@keyframes starPulse {
			0%, 100% { opacity: 0.4; transform: scale(0.85); }
			50% { opacity: 1; transform: scale(1); }
		}
	`,
	text: css`
		font-weight: 400;
	`,
	cursor: css`
		display: inline-block;
		width: 7px;
		height: 14px;
		background: ${token.colorTextSecondary};
		margin-left: 1px;
		vertical-align: text-bottom;
		border-radius: 1px;
		animation: caretBlink 1s step-end infinite;

		@keyframes caretBlink {
			0%, 100% { opacity: 1; }
			50% { opacity: 0; }
		}
	`,
}));

export function StatusIndicator({ text }: Props) {
	const { styles } = useStyles();
	const label = text.trim() || "Thinking...";

	return (
		<div className={styles.wrap}>
			<span className={styles.star} aria-hidden="true">✶</span>
			<span className={styles.text}>{label}</span>
			<span className={styles.cursor} aria-hidden="true" />
		</div>
	);
}
