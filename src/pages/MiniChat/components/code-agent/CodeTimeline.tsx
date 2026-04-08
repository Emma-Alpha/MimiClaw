import { createStyles } from "antd-style";
import type { CodeAgentTimelineItem, SpinnerMode } from "@/stores/code-agent";
import { StreamingText } from "./StreamingText";
import { ThinkingBlock } from "./ThinkingBlock";
import { ToolUseLine } from "./ToolUseLine";
import { DiffView } from "./DiffView";
import { SystemNotice } from "./SystemNotice";
import { CompactBoundary } from "./CompactBoundary";
import { RateLimitNotice } from "./RateLimitNotice";
import { HookNotice } from "./HookNotice";
import { ApiRetryNotice } from "./ApiRetryNotice";
import { TaskStart, TaskEnd } from "./TaskBoundary";
import { ResultSummary } from "./ResultSummary";
import { StatusIndicator } from "./StatusIndicator";
import { TodoListCard } from "./TodoListCard";

interface Props {
	items: CodeAgentTimelineItem[];
	/** Live streaming state rendered at the bottom during an active turn */
	streamingThinkingText?: string;
	streamingAssistantText?: string;
	isThinking?: boolean;
	isStreaming?: boolean;
	vendorStatusText?: string;
	workspaceRoot?: string;
	spinnerMode?: SpinnerMode;
}

const useStyles = createStyles(({ css, token }) => ({
	root: css`
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: 4px 0;
	`,
	taskIndent: css`
		border-left: 2px solid ${token.colorPrimary};
		padding-left: 10px;
		margin-left: 2px;
	`,
	userBubbleContainer: css`
		display: flex;
		justify-content: flex-end;
		margin: 8px 0;
	`,
	userBubble: css`
		font-size: 13px;
		color: ${token.colorText};
		background: ${token.colorFillTertiary};
		padding: 8px 12px;
		border-radius: 12px 12px 0 12px;
		max-width: 85%;
		word-break: break-word;
	`,
}));

export function CodeTimeline({
	items,
	streamingThinkingText = "",
	streamingAssistantText = "",
	isThinking = false,
	isStreaming = false,
	vendorStatusText = "",
	workspaceRoot,
	spinnerMode,
}: Props) {
	const { styles } = useStyles();

	const renderItem = (item: CodeAgentTimelineItem, inTask = false) => {
		const wrap = (el: React.ReactNode) =>
			inTask ? <div className={styles.taskIndent}>{el}</div> : el;

		switch (item.kind) {
			case "init":
				// Session init info is shown in the dynamic island header, not inline
				return null;

			case "thinking":
				return wrap(
					<ThinkingBlock
						key={item.id}
						text={item.data.text}
						isStreaming={item.data.isStreaming}
						isRedacted={item.data.isRedacted}
					/>,
				);

			case "assistant-text":
				return wrap(
					<StreamingText key={item.id} text={item.text} isStreaming={item.isStreaming} />,
				);

			case "tool-use":
				if (item.tool.toolName.toLowerCase() === "todowrite") {
					return wrap(<TodoListCard key={item.id} tool={item.tool} />);
				}
				return wrap(<ToolUseLine key={item.id} tool={item.tool} />);

			case "diff":
				return wrap(
					<DiffView key={item.id} files={item.files} workspaceRoot={workspaceRoot} />,
				);

			case "user":
				return (
					<div key={item.id} className={styles.userBubbleContainer}>
						<div className={styles.userBubble}>
							{item.text}
						</div>
					</div>
				);

			case "system-notice":
				return (
					<SystemNotice
						key={item.id}
						text={item.text}
						variant={item.variant}
					/>
				);

			case "compact-boundary":
				return (
					<CompactBoundary
						key={item.id}
						preTokens={item.preTokens}
						trigger={item.trigger}
					/>
				);

			case "rate-limit":
				return (
					<RateLimitNotice
						key={item.id}
						resetsAt={item.resetsAt}
						utilization={item.utilization}
						status={item.status}
					/>
				);

			case "api-retry":
				return (
					<ApiRetryNotice
						key={item.id}
						attempt={item.attempt}
						maxRetries={item.maxRetries}
						delayMs={item.delayMs}
						error={item.error}
					/>
				);

			case "hook":
				return (
					<HookNotice
						key={item.id}
						hookName={item.hookName}
						hookEvent={item.hookEvent}
						outcome={item.outcome}
						stdout={item.stdout}
						exitCode={item.exitCode}
					/>
				);

			case "task-start":
				return (
					<TaskStart
						key={item.id}
						taskId={item.taskId}
						description={item.description}
					/>
				);

			case "task-end":
				return (
					<TaskEnd
						key={item.id}
						taskId={item.taskId}
						status={item.status}
						summary={item.summary}
					/>
				);

			case "result":
				return (
					<ResultSummary
						key={item.id}
						isError={item.isError}
						numTurns={item.numTurns}
						totalCostUsd={item.totalCostUsd}
						durationMs={item.durationMs}
					/>
				);

			default:
				return null;
		}
	};

	const isBusy = !!spinnerMode;

	return (
		<div className={styles.root}>
			{items.map((item) => renderItem(item))}

			{/* Live thinking stream */}
			{(isThinking || streamingThinkingText) && (
				<ThinkingBlock
					key="live-thinking"
					text={streamingThinkingText}
					isStreaming={isThinking}
					isRedacted={false}
				/>
			)}

			{/* Live assistant text stream */}
			{(isStreaming || streamingAssistantText) && (
				<StreamingText text={streamingAssistantText} isStreaming={isStreaming} />
			)}

			{/* ✶ Status indicator – visible for all busy spinner modes */}
			{isBusy && <StatusIndicator text={vendorStatusText} />}
		</div>
	);
}
