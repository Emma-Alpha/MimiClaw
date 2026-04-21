import { createStyles } from "antd-style";
import type { Descendant } from "slate";
import { ChatItem } from "@lobehub/ui/chat";
import { File as FileIcon, Folder } from "lucide-react";
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
	userPathTag: css`
		display: inline-flex;
		align-items: center;
		gap: 5px;
		max-width: 220px;
		padding: 3px 8px;
		border-radius: 14px;
		font-size: ${token.fontSizeSM}px;
		border: 1px solid ${token.colorBorderSecondary};
		background: ${token.colorBgContainer};
		color: ${token.colorText};
	`,
	userPathTagName: css`
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
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
								<span
									key={pathTag.absolutePath}
									title={pathTag.absolutePath}
									className={styles.userPathTag}
								>
									{pathTag.isDirectory ? (
										<Folder size={12} style={{ flexShrink: 0 }} />
									) : (
										<FileIcon size={12} style={{ flexShrink: 0 }} />
									)}
									<span className={styles.userPathTagName}>{pathTag.name}</span>
								</span>
							))}
						</div>
					) : null}
					{item.text ? <span>{item.text}</span> : null}
				</>
			)}
		</>
	);
}

/**
 * Renders a single CodeAgentTimelineItem. Used both by CodeTimeline (legacy)
 * and directly as individual VList rows in CodeChatTimeline for virtualisation.
 */
export function CodeAgentItem({
	item,
	workspaceRoot,
}: {
	item: CodeAgentTimelineItem;
	workspaceRoot?: string;
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

		case "task-start":
			return <TaskStart taskId={item.taskId} description={item.description} />;

		case "task-end":
			return <TaskEnd taskId={item.taskId} status={item.status} summary={item.summary} />;

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
				<CodeAgentItem key={item.id} item={item} workspaceRoot={workspaceRoot} />
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
