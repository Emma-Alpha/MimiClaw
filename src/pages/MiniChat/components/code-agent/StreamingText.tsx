import { createStyles } from "antd-style";
import { Markdown } from "@lobehub/ui";

interface Props {
	text: string;
	isStreaming: boolean;
}

const useStyles = createStyles(({ css, token }) => ({
	wrap: css`
		position: relative;
		font-size: 13px;
		line-height: 1.6;
		color: ${token.colorText};
	`,
	cursor: css`
		display: inline-block;
		width: 7px;
		height: 13px;
		background: ${token.colorPrimary};
		margin-left: 1px;
		vertical-align: text-bottom;
		animation: caretBlink 1s step-end infinite;
		@keyframes caretBlink {
			0%, 100% { opacity: 1; }
			50% { opacity: 0; }
		}
	`,
}));

export function StreamingText({ text, isStreaming }: Props) {
	const { styles } = useStyles();
	if (!text && !isStreaming) return null;

	return (
		<div className={styles.wrap}>
			<Markdown>{text || " "}</Markdown>
			{isStreaming && <span className={styles.cursor} aria-hidden="true" />}
		</div>
	);
}
