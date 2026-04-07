import { createStyles } from "antd-style";

interface Props {
	text: string;
	isStreaming: boolean;
	isRedacted: boolean;
}

const useStyles = createStyles(({ css, token }) => ({
	block: css`
		font-size: 12px;
		line-height: 1.55;
		color: ${token.colorTextTertiary};
		font-style: italic;
		white-space: pre-wrap;
		word-break: break-word;
		padding: 2px 0 4px 0;
		border-left: 2px solid ${token.colorBorderSecondary};
		padding-left: 8px;
		margin-bottom: 6px;
	`,
	redacted: css`
		color: ${token.colorTextQuaternary};
		font-style: normal;
		font-size: 11px;
	`,
	cursor: css`
		display: inline-block;
		width: 6px;
		height: 11px;
		background: ${token.colorTextTertiary};
		margin-left: 1px;
		vertical-align: text-bottom;
		animation: caretBlink 1s step-end infinite;
		@keyframes caretBlink {
			0%, 100% { opacity: 1; }
			50% { opacity: 0; }
		}
	`,
}));

export function ThinkingBlock({ text, isStreaming, isRedacted }: Props) {
	const { styles } = useStyles();

	if (isRedacted) {
		return (
			<div className={styles.block}>
				<span className={styles.redacted}>🔒 部分推理过程已隐藏</span>
			</div>
		);
	}

	if (!text && !isStreaming) return null;

	return (
		<div className={styles.block}>
			{text}
			{isStreaming && <span className={styles.cursor} aria-hidden="true" />}
		</div>
	);
}
