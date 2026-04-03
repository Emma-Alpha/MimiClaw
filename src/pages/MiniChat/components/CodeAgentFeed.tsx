import { useEffect, useState } from "react";
import { Markdown } from "@lobehub/ui";
import { createStyles } from "antd-style";
import type { ToolActivityItem } from "../types";

export type { ToolActivityItem };

type CodeAgentFeedProps = {
	activities: ToolActivityItem[];
	streamingText: string;
	isRunning: boolean;
	isError?: boolean;
};

// Braille spinner — same cadence as ClaudeCode terminal
const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

function useSpinner(active: boolean): string {
	const [frame, setFrame] = useState(0);
	useEffect(() => {
		if (!active) return;
		const id = setInterval(
			() => setFrame((f) => (f + 1) % SPINNER_FRAMES.length),
			80,
		);
		return () => clearInterval(id);
	}, [active]);
	return SPINNER_FRAMES[frame];
}

// Tool → display label (no emojis — clean terminal aesthetic)
function getToolLabel(name: string): string {
	const n = name.toLowerCase();
	if (n === "read") return "Read";
	if (n === "write") return "Write";
	if (n === "edit" || n === "multiedit" || n === "strreplacebasededitattempt")
		return "Edit";
	if (n === "bash" || n === "shell") return "Bash";
	if (n === "grep") return "Grep";
	if (n === "glob") return "Glob";
	if (n === "ls" || n === "listfiles") return "LS";
	if (n === "todowrite") return "TodoWrite";
	if (n === "websearch") return "WebSearch";
	if (n === "webfetch") return "WebFetch";
	if (n === "task" || n === "agenttool") return "Task";
	if (n === "notebookedit") return "NotebookEdit";
	return name;
}

const useFeedStyles = createStyles(({ token, css }) => ({
	root: css`
		display: flex;
		flex-direction: column;
		gap: 0;
		width: 100%;
	`,

	// Individual tool-use row
	row: css`
		display: flex;
		align-items: baseline;
		gap: 8px;
		padding: 1px 0;
		animation: rowIn 0.2s ease forwards;
		line-height: 1.5;

		@keyframes rowIn {
			from { opacity: 0; transform: translateX(-4px); }
			to   { opacity: 1; transform: translateX(0); }
		}
	`,

	// The ● / spinner glyph
	dot: css`
		flex-shrink: 0;
		width: 14px;
		font-size: 11px;
		line-height: 1;
		color: #22c55e;
		margin-top: 2px;
	`,
	dotSpinner: css`
		color: #818cf8;
		font-family: monospace;
	`,
	dotError: css`
		color: #ef4444;
	`,

	// Tool name: bold, monospace
	toolName: css`
		flex-shrink: 0;
		font-size: 12px;
		font-weight: 600;
		font-family: ${token.fontFamilyCode};
		color: ${token.colorText};
		min-width: 72px;
	`,
	toolNameActive: css`
		color: #818cf8;
	`,

	// Arg / path
	toolArg: css`
		font-size: 11.5px;
		font-family: ${token.fontFamilyCode};
		color: ${token.colorTextTertiary};
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		min-width: 0;
		flex: 1;
	`,

	// "Thinking…" placeholder when no tools yet
	thinking: css`
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 2px 0;
		color: ${token.colorTextTertiary};
		font-size: 12px;
	`,
	thinkingSpinner: css`
		font-family: monospace;
		font-size: 13px;
		color: #818cf8;
		width: 14px;
		flex-shrink: 0;
	`,

	// Separator between activities and text response
	divider: css`
		height: 1px;
		background: ${token.colorBorderSecondary};
		margin: 8px 0 6px;
		opacity: 0.6;
	`,

	// Final text response
	text: css`
		font-size: 13px;
		line-height: 1.6;
		color: ${token.colorText};
		overflow-wrap: anywhere;

		& p { margin: 0 0 4px !important; line-height: 1.6 !important; }
		& p:last-child { margin-bottom: 0 !important; }
		& ul, & ol { padding-left: 16px !important; margin: 4px 0 !important; }
		& li { margin: 0 !important; line-height: 1.6 !important; }
		& pre { margin: 6px 0 !important; overflow: auto; border-radius: 6px !important; }
		& code {
			border-radius: 3px;
			background: ${token.colorFillAlter};
			border: 1px solid ${token.colorBorderSecondary};
			padding: 0.1em 0.3em;
			font-size: 12px;
		}
		& pre code { background: transparent !important; border: none !important; padding: 0 !important; }
	`,

	// Blinking block cursor during streaming
	cursor: css`
		display: inline-block;
		margin-left: 1px;
		height: 13px;
		width: 6px;
		background: ${token.colorTextSecondary};
		opacity: 0.5;
		vertical-align: text-bottom;
		animation: blink 1s step-end infinite;

		@keyframes blink { 50% { opacity: 0; } }
	`,
}));

export function CodeAgentFeed({
	activities,
	streamingText,
	isRunning,
	isError,
}: CodeAgentFeedProps) {
	const { styles, cx } = useFeedStyles();
	const spinner = useSpinner(isRunning);

	const hasActivities = activities.length > 0;
	const hasText = streamingText.length > 0;

	if (!hasActivities && !isRunning && !hasText) return null;

	return (
		<div className={styles.root}>
			{/* Tool-use rows */}
			{hasActivities
				? activities.map((act, idx) => {
						const isLast = idx === activities.length - 1;
						const isActive = isLast && isRunning;
						const label = getToolLabel(act.toolName);
						return (
							<div key={act.id} className={styles.row}>
								<span
									className={cx(
										styles.dot,
										isActive && styles.dotSpinner,
										!isActive && isError && idx === activities.length - 1 && styles.dotError,
									)}
								>
									{isActive ? spinner : "●"}
								</span>
								<span
									className={cx(
										styles.toolName,
										isActive && styles.toolNameActive,
									)}
								>
									{label}
								</span>
								{act.inputSummary ? (
									<span className={styles.toolArg}>{act.inputSummary}</span>
								) : null}
							</div>
						);
					})
				: isRunning && !hasText
					? (
						<div className={styles.thinking}>
							<span className={styles.thinkingSpinner}>{spinner}</span>
							<span>思考中…</span>
						</div>
					)
					: null}

			{/* Text response */}
			{hasText ? (
				<>
					{hasActivities ? <div className={styles.divider} /> : null}
					<div className={styles.text}>
						<Markdown>{streamingText}</Markdown>
						{isRunning ? <span className={styles.cursor} /> : null}
					</div>
				</>
			) : null}
		</div>
	);
}
