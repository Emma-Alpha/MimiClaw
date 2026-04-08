import { createStyles } from "antd-style";
import { useEffect, useRef, useState } from "react";

interface Props {
	text: string;
	isStreaming: boolean;
	isRedacted: boolean;
}

const useStyles = createStyles(({ css, token }) => ({
	container: css`
		margin-bottom: 6px;
	`,
	header: css`
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 2px 0;
		border: 0;
		background: transparent;
		color: ${token.colorTextTertiary};
		font-size: 12px;
		line-height: 1.55;
		cursor: pointer;
		transition: opacity 0.18s ease;
		user-select: none;

		&:hover {
			opacity: 0.86;
		}
	`,
	headerStatic: css`
		cursor: default;
	`,
	dot: css`
		flex-shrink: 0;
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: ${token.colorTextTertiary};
	`,
	dotLive: css`
		animation: dotPulse 1.2s ease-in-out infinite;

		@keyframes dotPulse {
			0%, 100% { opacity: 0.35; transform: scale(0.9); }
			50% { opacity: 1; transform: scale(1); }
		}
	`,
	label: css`
		font-weight: 400;
	`,
	chevron: css`
		display: inline-block;
		font-size: 10px;
		line-height: 1;
		margin-left: 2px;
		transform: rotate(0deg);
		transition: transform 0.18s ease;
	`,
	chevronExpanded: css`
		transform: rotate(90deg);
	`,
	bodyWrap: css`
		display: grid;
		grid-template-rows: 0fr;
		opacity: 0;
		transition:
			grid-template-rows 0.22s ease,
			opacity 0.18s ease,
			margin-top 0.22s ease;
		margin-top: 0;
	`,
	bodyWrapExpanded: css`
		grid-template-rows: 1fr;
		opacity: 1;
		margin-top: 2px;
	`,
	bodyInner: css`
		overflow: hidden;
	`,
	body: css`
		font-size: 12px;
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
	const { styles, cx } = useStyles();
	const [isExpanded, setIsExpanded] = useState(isStreaming);
	const hasUserToggledRef = useRef(false);
	const previousStreamingRef = useRef(isStreaming);

	useEffect(() => {
		if (isStreaming && !previousStreamingRef.current) {
			setIsExpanded(true);
			hasUserToggledRef.current = false;
		}

		if (!isStreaming && previousStreamingRef.current && !hasUserToggledRef.current) {
			setIsExpanded(false);
		}

		previousStreamingRef.current = isStreaming;
	}, [isStreaming]);

	if (isRedacted) {
		return (
			<div className={styles.container}>
				<div className={cx(styles.header, styles.headerStatic)}>
					<span className={styles.dot} aria-hidden="true" />
					<span className={styles.label}>Thinking</span>
					<span className={styles.redacted}>部分推理过程已隐藏</span>
				</div>
			</div>
		);
	}

	if (!text && !isStreaming) return null;

	const handleToggle = () => {
		hasUserToggledRef.current = true;
		setIsExpanded((open) => !open);
	};

	return (
		<div className={styles.container}>
			<button
				type="button"
				className={styles.header}
				onClick={handleToggle}
				aria-expanded={isExpanded}
			>
				<span className={cx(styles.dot, isStreaming && styles.dotLive)} aria-hidden="true" />
				<span className={styles.label}>Thinking</span>
				<span className={cx(styles.chevron, isExpanded && styles.chevronExpanded)} aria-hidden="true">
					▸
				</span>
			</button>
			<div className={cx(styles.bodyWrap, isExpanded && styles.bodyWrapExpanded)}>
				<div className={styles.bodyInner}>
					<div className={styles.body}>
						{text}
						{isStreaming && <span className={styles.cursor} aria-hidden="true" />}
					</div>
				</div>
			</div>
		</div>
	);
}
