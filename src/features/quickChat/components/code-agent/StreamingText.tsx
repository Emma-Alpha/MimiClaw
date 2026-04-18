import { createStyles } from "antd-style";
import { Markdown } from "@lobehub/ui";
import { useFileReferenceMarkdownProps } from "../file-reference-markdown";

interface Props {
	text: string;
	isStreaming: boolean;
	workspaceRoot?: string;
}

const useStyles = createStyles(({ css, token }) => ({
	wrap: css`
		position: relative;
		font-size: ${token.fontSize}px;
		line-height: 1.6;
		color: ${token.colorText};
	`,
	cursor: css`
		display: inline-block;
		width: 0.45em;
		height: 1em;
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

export function StreamingText({ text, isStreaming, workspaceRoot }: Props) {
	const { styles } = useStyles();
	const markdownProps = useFileReferenceMarkdownProps(workspaceRoot);
	if (!text && !isStreaming) return null;

	return (
		<div className={styles.wrap}>
			<Markdown variant="chat" headerMultiple={0} {...markdownProps}>{text || " "}</Markdown>
			{isStreaming && <span className={styles.cursor} aria-hidden="true" />}
		</div>
	);
}
