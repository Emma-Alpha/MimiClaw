import { createStyles } from "antd-style";
import { ChevronRight, Terminal } from "lucide-react";
import { useMemo, useState } from "react";
import type { StreamingToolUse } from "@/stores/chat";

interface Props {
	tool: StreamingToolUse;
}

const TOOL_LABELS: Record<string, string> = {
	read: "read",
	fileread: "read",
	write: "write",
	filewrite: "write",
	edit: "edit",
	fileedit: "edit",
	strreplacebasededitattempt: "edit",
	multiedit: "multiedit",
	bash: "bash",
	bashtool: "bash",
	grep: "grep",
	glob: "glob",
	webfetch: "fetch",
	agent: "task",
	task: "task",
	notebookedit: "notebook",
	ls: "ls",
	listfiles: "ls",
	todowrite: "todo",
	websearch: "search",
};

function getToolLabel(toolName: string) {
	const key = toolName.toLowerCase();
	return TOOL_LABELS[key] ?? key;
}

function normalizeSummary(text?: string) {
	if (!text) return "";
	return text.replace(/\s+/g, " ").trim();
}

function getDisplaySummary(tool: StreamingToolUse, fallbackLabel: string) {
	const input = normalizeSummary(tool.inputSummary);
	if (input) return input;
	const result = normalizeSummary(tool.resultSummary);
	if (result) return result;
	return fallbackLabel;
}

function detectBashLanguage(command: string): string | null {
	const c = command.toLowerCase();
	if (/\b(typecheck|typescript|tsc|ts-node|tsx|tsconfig)\b/.test(c)) return "TypeScript";
	if (/\b(pytest|python|pip|poetry|uv|ruff|mypy)\b/.test(c)) return "Python";
	if (/\b(cargo|rustc|rustfmt|clippy)\b/.test(c)) return "Rust";
	if (/\b(gradle|mvn|maven|javac|java)\b/.test(c)) return "Java";
	if (/\b(gofmt|golang)\b/.test(c) || /\bgo\s+(test|build|run)\b/.test(c)) return "Go";
	if (/\b(swift|xcodebuild|swiftlint)\b/.test(c)) return "Swift";
	if (/\b(dotnet|msbuild|nuget)\b/.test(c)) return "C#";
	if (/\b(node|npm|pnpm|yarn|bun|vite|vitest|jest|eslint|prettier|webpack)\b/.test(c)) return "JavaScript";
	return null;
}

function detectBashAction(command: string): string | null {
	const c = command.toLowerCase();
	if (/\b(typecheck|check)\b/.test(c)) return "check";
	if (/\b(lint|eslint|ruff|clippy)\b/.test(c)) return "lint";
	if (/\b(test|vitest|jest|playwright|pytest)\b/.test(c) || /\bgo\s+test\b/.test(c) || /\bcargo\s+test\b/.test(c)) return "test";
	if (/\b(build|compile)\b/.test(c) || /\bgo\s+build\b/.test(c) || /\bcargo\s+build\b/.test(c)) return "build";
	if (/\b(install)\b/.test(c) || /\b(pnpm|npm|yarn|bun)\s+(i|install|add)\b/.test(c)) return "install";
	if (/\b(format|prettier|gofmt|rustfmt)\b/.test(c)) return "format";
	if (/\b(dev|start|serve|run)\b/.test(c)) return "run";
	return null;
}

function buildBashCaption(commandSummary: string): string | null {
	const text = normalizeSummary(commandSummary);
	if (!text) return null;
	const language = detectBashLanguage(text) ?? "Shell";
	const action = detectBashAction(text) ?? "run";
	return `${language} ${action} bash`;
}

function buildRowText(tool: StreamingToolUse, label: string): string {
	const summary = getDisplaySummary(tool, label);
	if (label === "bash") {
		const bashCaption = buildBashCaption(tool.inputSummary);
		if (bashCaption) return bashCaption;
	}
	const showToolTag = summary.toLowerCase() !== label.toLowerCase();
	return showToolTag ? `${summary} ${label}` : summary;
}

function getStatusLabel(status: StreamingToolUse["status"]): string {
	switch (status) {
		case "streaming-input":
			return "Preparing";
		case "executing":
			return "Executing";
		case "awaiting-permission":
			return "Awaiting permission";
		case "completed":
			return "Completed";
		case "failed":
			return "Failed";
	}
}

function getPrimaryDetail(tool: StreamingToolUse): { label: string; value: string } | null {
	const command = typeof tool.rawInput?.command === "string" ? normalizeSummary(tool.rawInput.command) : "";
	if (command) return { label: "Command", value: command };
	const summary = normalizeSummary(tool.inputSummary);
	if (summary) return { label: "Input", value: summary };
	return null;
}

function stringifyRawInput(rawInput: Record<string, unknown>): string {
	const keys = Object.keys(rawInput || {});
	if (keys.length === 0) return "";
	try {
		return JSON.stringify(rawInput, null, 2);
	} catch {
		return "";
	}
}

const useStyles = createStyles(({ css, token }) => ({
	wrap: css`
		display: flex;
		flex-direction: column;
		gap: 6px;
	`,
	row: css`
		display: flex;
		align-items: center;
		gap: 8px;
		height: 32px;
		width: 100%;
		padding: 0 10px;
		box-sizing: border-box;
		border: 1px solid ${token.colorBorder};
		border-radius: 8px;
		background: ${token.colorFillTertiary};
		font-size: calc(${token.fontSizeSM}px + 1px);
		line-height: 1;
		color: ${token.colorTextSecondary};
		cursor: pointer;
		text-align: left;
		transition: background 0.18s ease, border-color 0.18s ease;

		&:hover {
			background: ${token.colorFillSecondary};
		}
	`,
	rowAwaiting: css`
		border-color: ${token.colorWarningBorder};
	`,
	rowFailed: css`
		border-color: ${token.colorErrorBorder};
	`,
	iconChip: css`
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 14px;
		height: 14px;
		flex-shrink: 0;
		border: 1px solid ${token.colorBorderSecondary};
		border-radius: 4px;
		background: ${token.colorBgContainer};
	`,
	icon: css`
		width: 9px;
		height: 9px;
		color: ${token.colorTextTertiary};
	`,
	iconBusy: css`
		animation: iconPulse 1.1s ease-in-out infinite;
		@keyframes iconPulse {
			0%, 100% { opacity: 0.6; }
			50% { opacity: 1; }
		}
	`,
	content: css`
		min-width: 0;
		flex: 1;
		overflow: hidden;
	`,
	summary: css`
		display: block;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		color: ${token.colorTextSecondary};
		font-size: calc(${token.fontSizeSM}px + 1px);
		letter-spacing: 0;
	`,
	chevron: css`
		width: 12px;
		height: 12px;
		flex-shrink: 0;
		color: ${token.colorTextQuaternary};
		transition: transform 0.18s ease;
	`,
	chevronExpanded: css`
		transform: rotate(90deg);
	`,
	detailsWrap: css`
		display: grid;
		grid-template-rows: 0fr;
		opacity: 0;
		transition:
			grid-template-rows 0.2s ease,
			opacity 0.16s ease;
	`,
	detailsWrapExpanded: css`
		grid-template-rows: 1fr;
		opacity: 1;
	`,
	detailsInner: css`
		overflow: hidden;
	`,
	detailsCard: css`
		border: 1px solid ${token.colorBorderSecondary};
		border-radius: 8px;
		background: ${token.colorFillQuaternary};
		padding: 8px 10px;
		display: flex;
		flex-direction: column;
		gap: 8px;
	`,
	detailRow: css`
		display: flex;
		align-items: flex-start;
		gap: 8px;
		font-size: ${token.fontSizeSM}px;
		line-height: 1.45;
		min-width: 0;
	`,
	detailLabel: css`
		flex-shrink: 0;
		min-width: 58px;
		color: ${token.colorTextQuaternary};
	`,
	detailValue: css`
		color: ${token.colorTextSecondary};
		white-space: pre-wrap;
		word-break: break-word;
	`,
	code: css`
		display: block;
		font-family: ${token.fontFamilyCode};
		font-size: ${token.fontSizeSM}px;
		line-height: 1.45;
		color: ${token.colorTextTertiary};
		background: ${token.colorBgContainer};
		border: 1px solid ${token.colorBorderSecondary};
		border-radius: 6px;
		padding: 8px;
		max-height: 180px;
		overflow: auto;
		margin: 0;
	`,
}));

export function ToolUseLine({ tool }: Props) {
	const { styles, cx } = useStyles();
	const [expanded, setExpanded] = useState(false);
	const label = getToolLabel(tool.toolName);
	const rowText = buildRowText(tool, label);
	const isBusy = tool.status === "streaming-input" || tool.status === "executing";
	const rowClassName = cx(
		styles.row,
		tool.status === "awaiting-permission" && styles.rowAwaiting,
		tool.status === "failed" && styles.rowFailed,
	);
	const tooltipText = normalizeSummary(tool.inputSummary) || rowText;
	const statusText = getStatusLabel(tool.status);
	const primaryDetail = getPrimaryDetail(tool);
	const rawInputText = useMemo(() => stringifyRawInput(tool.rawInput), [tool.rawInput]);
	const elapsedText = tool.elapsedSeconds && tool.elapsedSeconds > 0
		? `${tool.elapsedSeconds.toFixed(1)}s`
		: "";
	const hasResult = Boolean(normalizeSummary(tool.resultSummary));
	const hasRawInputBlock = rawInputText.length > 0;

	return (
		<div className={styles.wrap}>
			<button
				type="button"
				className={rowClassName}
				title={tooltipText}
				onClick={() => setExpanded((prev) => !prev)}
				aria-expanded={expanded}
			>
				<span className={styles.iconChip} aria-hidden="true">
					<Terminal className={cx(styles.icon, isBusy && styles.iconBusy)} strokeWidth={1.9} />
				</span>
				<span className={styles.content}>
					<span className={styles.summary}>{rowText}</span>
				</span>
				<ChevronRight className={cx(styles.chevron, expanded && styles.chevronExpanded)} />
			</button>
			<div className={cx(styles.detailsWrap, expanded && styles.detailsWrapExpanded)}>
				<div className={styles.detailsInner}>
					<div className={styles.detailsCard}>
						<div className={styles.detailRow}>
							<span className={styles.detailLabel}>Status</span>
							<span className={styles.detailValue}>
								{statusText}
								{elapsedText ? ` (${elapsedText})` : ""}
							</span>
						</div>
						{primaryDetail && (
							<div className={styles.detailRow}>
								<span className={styles.detailLabel}>{primaryDetail.label}</span>
								<span className={styles.detailValue}>{primaryDetail.value}</span>
							</div>
						)}
						{hasResult && (
							<div className={styles.detailRow}>
								<span className={styles.detailLabel}>Result</span>
								<span className={styles.detailValue}>{normalizeSummary(tool.resultSummary)}</span>
							</div>
						)}
						{hasRawInputBlock && (
							<pre className={styles.code}>{rawInputText}</pre>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
