import { createStyles, useTheme } from "antd-style";
import type { Descendant } from "slate";
import { ChatItem } from "@lobehub/ui/chat";
import { Clock, Coins, Zap, Timer } from "lucide-react";
import { ModelIcon } from "@lobehub/icons";
import MentionChip, { renderTextWithMentions, renderTextWithSlashCommand } from "@/components/MentionChip";
import type { MentionTag } from "@/components/MentionChip";
import type { CodeAgentTimelineItem, SpinnerMode, ActiveTask } from "@/stores/chat";
import { StreamingText } from "./StreamingText";
import { ThinkingBlock } from "./ThinkingBlock";
import { ToolUseLine } from "./ToolUseLine";
import { DiffView } from "./DiffView";
import { SystemNotice } from "./SystemNotice";
import { CompactBoundary } from "./CompactBoundary";
import { RateLimitNotice } from "./RateLimitNotice";
import { HookNotice } from "./HookNotice";
import { ApiRetryNotice } from "./ApiRetryNotice";
import { SubagentTimelineCard } from "./SubagentCard";
import { ResultSummary } from "./ResultSummary";
import { StatusIndicator } from "./StatusIndicator";
import { ReadOnlySlateMessage } from "@/components/common/ReadOnlySlateMessage";
import { useCodeChatStyles } from "../../styles";

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
	activeTasks?: Map<string, ActiveTask>;
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
userImageList: css`
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin-bottom: 6px;
	`,
	userImage: css`
		max-width: 120px;
		max-height: 90px;
		border-radius: 6px;
		object-fit: cover;
		display: block;
	`,
	userImageFallback: css`
		font-size: calc(${token.fontSizeSM}px - 1px);
		opacity: 0.65;
		padding: 2px 4px;
	`,
	userPathTagList: css`
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin-bottom: 6px;
	`,
}));

type UserTimelineItem = Extract<CodeAgentTimelineItem, { kind: "user" }>;

function hasInlineElements(content: Descendant[]): boolean {
	for (const node of content) {
		if (typeof node === "object" && node !== null) {
			const t = (node as { type?: string }).type;
			if (t === "path" || t === "skill") return true;
			if ("children" in node && Array.isArray((node as { children: unknown[] }).children)) {
				if (hasInlineElements((node as { children: Descendant[] }).children)) return true;
			}
		}
	}
	return false;
}

function UserMessageContent({
	item,
	styles,
}: {
	item: UserTimelineItem;
	styles: ReturnType<typeof useStyles>["styles"];
}) {
	const richContent = item.richContent;
	const showRichContent =
		Array.isArray(richContent)
		&& richContent.length > 0
		&& hasInlineElements(richContent);

	return (
		<>
			{item.imagePreviews && item.imagePreviews.length > 0 ? (
				<div className={styles.userImageList}>
					{item.imagePreviews.map((image) => (
						image.preview ? (
							<img
								key={image.fileName}
								src={image.preview}
								alt={image.fileName}
								title={image.fileName}
								className={styles.userImage}
							/>
						) : (
							<div key={image.fileName} className={styles.userImageFallback}>
								{image.fileName}
							</div>
						)
					))}
				</div>
			) : null}
			{showRichContent ? (
				<ReadOnlySlateMessage content={richContent} />
			) : (
				<>
					{item.pathTags && item.pathTags.length > 0 ? (
						<div className={styles.userPathTagList}>
							{item.pathTags.map((pathTag) => (
								<MentionChip
									key={pathTag.absolutePath}
									kind={pathTag.isDirectory ? 'folder' : 'file'}
									label={pathTag.name}
									title={pathTag.absolutePath}
								/>
							))}
						</div>
					) : null}
					{item.text ? (
						<span>{
							item.text.startsWith('/')
								? renderTextWithSlashCommand(item.text, item.mentionTags as MentionTag[] | undefined)
								: renderTextWithMentions(item.text, item.mentionTags as MentionTag[] | undefined)
						}</span>
					) : null}
				</>
			)}
		</>
	);
}

function formatTokenCount(n: number): string {
	if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
	if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
	return String(n);
}

function formatDuration(ms: number): string {
	if (ms < 1000) return `${Math.round(ms)}ms`;
	return `${(ms / 1000).toFixed(1)}s`;
}

function AssistantUsageLine({
	usage,
	model,
	costUsd,
	durationMs,
	tps,
	ttftMs,
}: {
	usage?: { inputTokens: number; outputTokens: number; totalTokens: number };
	model?: string;
	costUsd?: number;
	durationMs?: number;
	tps?: number;
	ttftMs?: number;
}) {
	const theme = useTheme();
	const parts: React.ReactNode[] = [];

	if (model) {
		parts.push(
			<span key="model" style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
				<ModelIcon model={model} type="mono" size={12} />
				{model}
			</span>,
		);
	}

	if (usage && usage.totalTokens > 0) {
		parts.push(
			<span key="tokens" style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
				<Coins size={12} />
				{formatTokenCount(usage.totalTokens)} tokens
			</span>,
		);
	}

	if (typeof durationMs === "number" && durationMs > 0) {
		parts.push(
			<span key="duration" style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
				<Clock size={12} />
				{formatDuration(durationMs)}
			</span>,
		);
	}

	if (typeof tps === "number" && tps > 0) {
		parts.push(
			<span key="tps" style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
				<Zap size={12} />
				{tps.toFixed(1)} TPS
			</span>,
		);
	}

	if (typeof ttftMs === "number" && ttftMs > 0) {
		parts.push(
			<span key="ttft" style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
				<Timer size={12} />
				TTFT {formatDuration(ttftMs)}
			</span>,
		);
	}

	if (typeof costUsd === "number" && costUsd > 0) {
		parts.push(
			<span key="cost">
				${costUsd < 0.01 ? costUsd.toFixed(4) : costUsd.toFixed(2)}
			</span>,
		);
	}

	if (parts.length === 0) return null;

	return (
		<div
			style={{
				display: "flex",
				alignItems: "center",
				gap: 12,
				fontSize: 11,
				color: theme.colorTextQuaternary,
				padding: "2px 0 4px",
			}}
		>
			{parts}
		</div>
	);
}

/**
 * Renders a single CodeAgentTimelineItem. Used both by CodeTimeline (legacy)
 * and directly as individual VList rows in CodeChatTimeline for virtualisation.
 */
export function CodeAgentItem({
	item,
	workspaceRoot,
	activeTasks,
}: {
	item: CodeAgentTimelineItem;
	workspaceRoot?: string;
	activeTasks?: Map<string, ActiveTask>;
}) {
	const { styles } = useStyles();
	const { styles: codeChatStyles } = useCodeChatStyles();

	switch (item.kind) {
		case "init":
			return null;

		case "thinking":
			return (
				<ThinkingBlock
					text={item.data.text}
					isStreaming={item.data.isStreaming}
					isRedacted={item.data.isRedacted}
				/>
			);

		case "assistant-text":
			return (
				<StreamingText
					text={item.text}
					isStreaming={item.isStreaming}
					workspaceRoot={workspaceRoot}
				/>
			);

		case "assistant-usage":
			return (
				<AssistantUsageLine
					usage={item.usage}
					model={item.model}
					costUsd={item.costUsd}
					durationMs={item.durationMs}
					tps={item.tps}
					ttftMs={item.ttftMs}
				/>
			);

		case "tool-use":
			if (item.tool.toolName.toLowerCase() === "todowrite") return null;
			return <ToolUseLine tool={item.tool} />;

		case "diff":
			return <DiffView files={item.files} workspaceRoot={workspaceRoot} />;

		case "user":
			return (
				<ChatItem
					avatar={{
						avatar: <span className={codeChatStyles.userAvatar}>我</span>,
						backgroundColor: "transparent",
						title: "You",
					}}
					className={codeChatStyles.chatItemUser}
					message={item.text || ""}
					placement="right"
					renderMessage={() => (
						<div className={codeChatStyles.userMessageText}>
							<UserMessageContent item={item} styles={styles} />
						</div>
					)}
					showTitle={false}
					showAvatar={false}
					variant="bubble"
				/>
			);

		case "system-notice":
			return <SystemNotice text={item.text} variant={item.variant} />;

		case "compact-boundary":
			return <CompactBoundary preTokens={item.preTokens} trigger={item.trigger} />;

		case "rate-limit":
			return (
				<RateLimitNotice
					resetsAt={item.resetsAt}
					utilization={item.utilization}
					status={item.status}
				/>
			);

		case "api-retry":
			return (
				<ApiRetryNotice
					attempt={item.attempt}
					maxRetries={item.maxRetries}
					delayMs={item.delayMs}
					error={item.error}
				/>
			);

		case "hook":
			return (
				<HookNotice
					hookName={item.hookName}
					hookEvent={item.hookEvent}
					outcome={item.outcome}
					stdout={item.stdout}
					exitCode={item.exitCode}
				/>
			);

		case "task-start": {
			const activeTask = activeTasks?.get(item.taskId);
			const nested = activeTasks
				? Array.from(activeTasks.values()).filter((t) => t.parentTaskId === item.taskId)
				: undefined;
			return (
				<SubagentTimelineCard
					taskId={item.taskId}
					description={item.description}
					parentTaskId={item.parentTaskId}
					activeTask={activeTask}
					nestedTasks={nested && nested.length > 0 ? nested : undefined}
				/>
			);
		}

		case "task-end": {
			const nested = activeTasks
				? Array.from(activeTasks.values()).filter((t) => t.parentTaskId === item.taskId)
				: undefined;
			return (
				<SubagentTimelineCard
					taskId={item.taskId}
					description={""}
					endStatus={item.status}
					endSummary={item.summary}
					endDurationMs={item.durationMs}
					nestedTasks={nested && nested.length > 0 ? nested : undefined}
				/>
			);
		}

		case "result":
			return (
				<ResultSummary
					isError={item.isError}
					numTurns={item.numTurns}
					totalCostUsd={item.totalCostUsd}
					durationMs={item.durationMs}
				/>
			);

		default:
			return null;
	}
}

export function CodeTimeline({
	items,
	streamingThinkingText = "",
	streamingAssistantText = "",
	isThinking = false,
	isStreaming = false,
	vendorStatusText = "",
	workspaceRoot,
	spinnerMode,
	activeTasks,
}: Props) {
	const { styles } = useStyles();
	const hasVendorStatusText = vendorStatusText.trim().length > 0;
	const hasLiveCursor =
		isThinking
		|| isStreaming
		|| Boolean(streamingThinkingText)
		|| Boolean(streamingAssistantText);

	const isBusy =
		!!spinnerMode
		|| isThinking
		|| isStreaming
		|| hasVendorStatusText;

	return (
		<div className={styles.root}>
			{items.map((item) => (
				<CodeAgentItem key={item.id} item={item} workspaceRoot={workspaceRoot} activeTasks={activeTasks} />
			))}

			{(isThinking || streamingThinkingText) && (
				<ThinkingBlock
					key="live-thinking"
					text={streamingThinkingText}
					isStreaming={isThinking}
					isRedacted={false}
				/>
			)}

			{(isStreaming || streamingAssistantText) && (
				<StreamingText
					text={streamingAssistantText}
					isStreaming={isStreaming}
					workspaceRoot={workspaceRoot}
				/>
			)}

			{isBusy && (
				<StatusIndicator
					text={vendorStatusText}
					showCursor={!hasLiveCursor}
				/>
			)}
		</div>
	);
}
