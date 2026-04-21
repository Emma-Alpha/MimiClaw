import { createStyles } from "antd-style";
import { ThinkingPanel } from "@/features/mainChat/components/ThinkingPanel";

interface Props {
	text: string;
	isStreaming: boolean;
	isRedacted: boolean;
}

const useStyles = createStyles(({ css, token }) => ({
	container: css`
		margin-bottom: 6px;
	`,
	body: css`
		font-size: ${token.fontSizeSM}px;
		line-height: 1.55;
		color: ${token.colorTextTertiary};
		font-style: italic;
		white-space: pre-wrap;
		word-break: break-word;
		border-left: 2px solid ${token.colorBorderSecondary};
		padding: 2px 0 4px 8px;
	`,
	redacted: css`
		color: ${token.colorTextQuaternary};
		font-style: normal;
		font-size: calc(${token.fontSizeSM}px - 1px);
	`,
}));

export function ThinkingBlock({ text, isStreaming, isRedacted }: Props) {
	const { styles, cx } = useStyles();

	return (
		<ThinkingPanel
			className={styles.container}
			bodyClassName={cx(styles.body, isRedacted && styles.redacted)}
			content={text}
			isThinking={isStreaming}
			isRedacted={isRedacted}
			maxHeight={260}
			showStreamingCursor={isStreaming}
		/>
	);
}
