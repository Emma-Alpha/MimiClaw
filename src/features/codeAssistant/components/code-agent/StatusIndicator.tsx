import { createStyles } from "antd-style";
import type { CSSProperties } from "react";

interface Props {
	text: string;
	showCursor?: boolean;
}

const useStyles = createStyles(({ css, token }) => ({
	wrap: css`
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 4px 0;
		font-size: calc(${token.fontSizeSM}px + 1px);
		line-height: 1.5;
		color: ${token.colorTextSecondary};
	`,
	star: css`
		flex-shrink: 0;
		font-size: calc(${token.fontSizeSM}px - 1px);
		animation: starPulse 2s ease-in-out infinite;

		@keyframes starPulse {
			0%, 100% { opacity: 0.4; transform: scale(0.85); }
			50% { opacity: 1; transform: scale(1); }
		}
	`,
	text: css`
		position: relative;
		display: inline-block;
		font-weight: 400;
		white-space: nowrap;
		padding-right: 9px;
	`,
	cursor: css`
		position: absolute;
		top: 50%;
		left: 0;
		display: inline-block;
		width: 0.55em;
		height: 1em;
		background: ${token.colorTextSecondary};
		border-radius: 1px;
		transform: translateY(-50%);
		animation:
			cursorTravel var(--status-cursor-duration, 560ms) steps(var(--status-cursor-steps, 10), end) 1 forwards,
			caretBlink 1s step-end infinite;

		@keyframes cursorTravel {
			from { left: 0; }
			to { left: calc(100% - 0.55em); }
		}

		@keyframes caretBlink {
			0%, 100% { opacity: 1; }
			50% { opacity: 0; }
		}
	`,
}));

export function StatusIndicator({ text, showCursor = true }: Props) {
	const { styles } = useStyles();
	const normalized = text.trim().replace(/^✶\s*/u, "");
	const label = normalized || "Thinking...";
	const sweepDurationMs = Math.min(820, Math.max(240, label.length * 34));
	const sweepSteps = Math.max(1, label.length);
	const cursorStyle = {
		"--status-cursor-duration": `${sweepDurationMs}ms`,
		"--status-cursor-steps": String(sweepSteps),
	} as CSSProperties;

	return (
		<div className={styles.wrap}>
			<span className={styles.star} aria-hidden="true">✶</span>
			<span className={styles.text}>
				{label}
				{showCursor ? (
					<span key={label} className={styles.cursor} style={cursorStyle} aria-hidden="true" />
				) : null}
			</span>
		</div>
	);
}
