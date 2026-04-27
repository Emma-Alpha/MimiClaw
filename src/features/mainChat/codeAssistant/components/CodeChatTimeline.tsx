import { memo, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { VList, type VListHandle } from "virtua";
import { OpenClaw, ClaudeCode } from "@lobehub/icons";
import { ChatItem } from "@lobehub/ui/chat";
import { useCodeChatStyles } from "../styles";
import type { TimelineItem } from "../types";
import { extractText } from "../utils";
import { CodeAgentItem, CodeTimeline } from "./code-agent/CodeTimeline";
import { ThinkingBlock } from "./code-agent/ThinkingBlock";
import { StreamingText } from "./code-agent/StreamingText";
import { StatusIndicator } from "./code-agent/StatusIndicator";
import { TypingIndicator } from "./TypingIndicator";
import { useFileReferenceMarkdownProps } from "./file-reference-markdown";
import { BackBottomButton } from "@/components/common/BackBottomButton";
import { MessageMarkdown } from "@/components/MessageMarkdown";
import { UserMessage } from "@/features/mainChat/components/messages/UserMessage";
import type { CodeAgentTimelineItem, SpinnerMode } from "@/stores/chat";
import { useSettingsStore } from "@/stores/settings";

type CodeChatTimelineProps = {
	embedded?: boolean;
	timelineItems: TimelineItem[];
	sending: boolean;
	streamingText: string;
	pendingFinal: boolean;
	/** Legacy codeSending for backward compat; new UI driven by codeAgentItems */
	codeSending: boolean;
	/** New: structured SDK timeline items from useCodeAgentStore */
	codeAgentItems: CodeAgentTimelineItem[];
	streamingThinkingText: string;
	streamingAssistantText: string;
	vendorStatusText: string;
	isThinking: boolean;
	isCodeStreaming: boolean;
	codeWorkspaceRoot?: string;
	spinnerMode?: SpinnerMode;
	bottomReservedHeight?: number;
};

type TimelineRenderRow = {
	key: string;
	node: ReactNode;
};

function CompactMessageBody({
	renderContent,
}: {
	text: string;
	renderContent: () => ReactNode;
}) {
	const { styles } = useCodeChatStyles();
	return (
		<div className={styles.messageBodyFrame}>
			<div className={styles.messageBodyContent}>
				{renderContent()}
			</div>
		</div>
	);
}

function CodeChatTimelineImpl({
	embedded = false,
	timelineItems,
	sending,
	streamingText,
	pendingFinal,
	codeSending,
	codeAgentItems,
	streamingThinkingText,
	streamingAssistantText,
	vendorStatusText = "",
	isThinking,
	isCodeStreaming,
	codeWorkspaceRoot,
	spinnerMode,
	bottomReservedHeight = 0,
}: CodeChatTimelineProps) {
	const { styles, cx } = useCodeChatStyles();
	const markdownProps = useFileReferenceMarkdownProps(codeWorkspaceRoot);
	const enableAutoScrollOnStreaming = useSettingsStore((state) => state.enableAutoScrollOnStreaming);
	const vListRef = useRef<VListHandle | null>(null);
	const [atBottom, setAtBottom] = useState(true);

	const scrollToBottom = useCallback((smooth = true) => {
		vListRef.current?.scrollToIndex(Number.MAX_SAFE_INTEGER, { align: "end", smooth });
	}, []);

	const handleScroll = useCallback((offset: number) => {
		const ref = vListRef.current;
		if (!ref) return;
		setAtBottom(ref.scrollSize - offset - ref.viewportSize <= 40);
	}, []);

	const showChatPending = sending || !!streamingText || pendingFinal;
	const effectiveVendorStatusText =
		vendorStatusText
		|| (codeSending ? "✶ Baking…" : "");
	const hasActiveCodeStream =
		isCodeStreaming
		|| isThinking
		|| Boolean(streamingThinkingText)
		|| Boolean(streamingAssistantText)
		|| Boolean(effectiveVendorStatusText)
		|| spinnerMode != null;

	const renderTimelineItem = (item: TimelineItem) => {
		if (item.kind === "chat") {
			const message = item.message;
			const isUser = message.role === "user";
			const text = extractText(message.content);

			if (isUser) {
				return <UserMessage key={item.key} text={text} />;
			}

			return (
				<ChatItem
					key={item.key}
					avatar={{
						avatar: (
							<span className={styles.assistantAvatar}>
								<OpenClaw.Color size={20} />
							</span>
						),
						backgroundColor: "transparent",
						title: "极智",
					}}
					avatarProps={{ size: 28 }}
					className={styles.chatItem}
					message={text}
					placement="left"
					renderMessage={() => (
						<CompactMessageBody
							text={text}
							renderContent={() => (
								<div className={styles.markdownBubble}>
									<MessageMarkdown markdownProps={markdownProps}>{text}</MessageMarkdown>
								</div>
							)}
						/>
					)}
					showTitle
					showAvatar
					time={message.timestamp ?? undefined}
					variant="bubble"
				/>
			);
		}

		const message = item.message;
		if (message.role === "system") {
			return (
				<div key={item.key} className={styles.systemNotice}>
					{message.text}
				</div>
			);
		}

		const isUser = message.role === "user";

		if (isUser) {
			return (
				<UserMessage
					key={item.key}
					text={message.text}
					imagePreviews={message.imagePreviews}
					pathTags={message.pathTags}
					richContent={message.richContent}
				/>
			);
		}

		return (
			<ChatItem
				key={item.key}
				avatar={{
					avatar: (
						<span className={styles.codeAvatar}>
							<ClaudeCode.Color size={22} />
						</span>
					),
					backgroundColor: "transparent",
					title: "CLI 编程",
				}}
				avatarProps={{ size: 28 }}
				className={styles.chatItem}
				message={message.text}
				placement="left"
				renderMessage={() => (
					<CompactMessageBody
						text={message.text}
						renderContent={() => (
							<CodeTimeline
								items={[
									{
										kind: "assistant-text",
										id: message.id,
										text: message.text,
										isStreaming: false,
									},
								]}
							/>
						)}
					/>
				)}
				showTitle
				showAvatar
				time={message.createdAt ?? undefined}
				variant="bubble"
			/>
		);
	};

	const timelineRows: TimelineRenderRow[] = timelineItems.map((item) => ({
		key: item.key,
		node: renderTimelineItem(item),
	}));

	const timelineBottomReserve = Math.max(0, Math.round(bottomReservedHeight));

	if (sending && !streamingText) {
		timelineRows.push({
			key: "chat:typing",
			node: <TypingIndicator />,
		});
	}

	if (streamingText) {
		timelineRows.push({
			key: "chat:streaming",
			node: (
				<ChatItem
					avatar={{
						avatar: (
							<span className={styles.assistantAvatar}>
								<OpenClaw.Color size={20} />
							</span>
						),
						backgroundColor: "transparent",
						title: "极智",
					}}
					avatarProps={{ size: 28 }}
					className={styles.chatItem}
					showAvatar
					showTitle
					message={streamingText}
					placement="left"
					renderMessage={() => (
						<CompactMessageBody
							text={streamingText}
							renderContent={() => (
								<div className={styles.markdownBubble}>
									<MessageMarkdown markdownProps={markdownProps}>{streamingText}</MessageMarkdown>
									<span className={styles.streamCursor} />
								</div>
							)}
						/>
					)}
					variant="bubble"
				/>
			),
		});
	}

	if (pendingFinal && !streamingText && !sending) {
		timelineRows.push({
			key: "chat:pending-final",
			node: <TypingIndicator />,
		});
	}

	// Flatten code agent items as individual VList rows for virtualisation
	for (const item of codeAgentItems) {
		if (item.kind === "init") continue;
		if (item.kind === "tool-use" && item.tool.toolName.toLowerCase() === "todowrite") continue;
		timelineRows.push({
			key: `code:${item.id}`,
			node: <CodeAgentItem item={item} workspaceRoot={codeWorkspaceRoot} />,
		});
	}

	// Live streaming state as separate VList rows
	if (isThinking || streamingThinkingText) {
		timelineRows.push({
			key: "code:live-thinking",
			node: (
				<ThinkingBlock
					text={streamingThinkingText}
					isStreaming={isThinking}
					isRedacted={false}
				/>
			),
		});
	}

	if (isCodeStreaming || streamingAssistantText) {
		timelineRows.push({
			key: "code:live-streaming",
			node: (
				<StreamingText
					text={streamingAssistantText}
					isStreaming={isCodeStreaming}
					workspaceRoot={codeWorkspaceRoot}
				/>
			),
		});
	}

	if (codeSending || hasActiveCodeStream) {
		const isBusy =
			!!spinnerMode || isThinking || isCodeStreaming
			|| effectiveVendorStatusText.trim().length > 0;
		const hasLiveCursor =
			isThinking || isCodeStreaming
			|| Boolean(streamingThinkingText) || Boolean(streamingAssistantText);
		if (isBusy) {
			timelineRows.push({
				key: "code:status",
				node: (
					<StatusIndicator
						text={effectiveVendorStatusText}
						showCursor={!hasLiveCursor}
					/>
				),
			});
		}
	}

	if (timelineBottomReserve > 0) {
		timelineRows.push({
			key: "timeline:bottom-reserve",
			node: <div aria-hidden="true" style={{ height: timelineBottomReserve }} />,
		});
	}

	const hasContent = timelineItems.length > 0 || showChatPending || codeSending || codeAgentItems.length > 0 || hasActiveCodeStream;

	useEffect(() => {
		if (!enableAutoScrollOnStreaming) return;
		if (timelineRows.length === 0) return;

		const raf = requestAnimationFrame(() => {
			vListRef.current?.scrollToIndex(timelineRows.length - 1, { align: 'end' });
		});

		return () => cancelAnimationFrame(raf);
	}, [
		timelineRows.length,
		sending,
		streamingText,
		pendingFinal,
		codeSending,
		codeAgentItems,
		streamingThinkingText,
		streamingAssistantText,
		effectiveVendorStatusText,
		enableAutoScrollOnStreaming,
		isThinking,
		isCodeStreaming,
		spinnerMode,
		timelineBottomReserve,
	]);

	return (
		<div
			className={cx(
				styles.scrollArea,
				embedded && styles.scrollAreaEmbedded,
			)}
			style={{ position: "relative" }}
		>
			{!hasContent ? (
				<div className={styles.scrollAreaInner}>
					<div className={styles.emptyState}>
						<div className={styles.emptyIcon}>
							<OpenClaw.Color size={22} />
						</div>
						<div className={styles.emptyTitle}>有什么可以帮你的？</div>
						<div className={styles.emptyDesc}>
							普通问题直接发，想让代码助手处理就点顶部的 Claude 图标切换模式
						</div>
					</div>
				</div>
			) : (
				<VList<TimelineRenderRow>
					ref={vListRef}
					data={timelineRows}
					style={{
						position: 'absolute',
						top: 0,
						left: 0,
						right: 0,
						bottom: 0,
						height: 'auto',
						paddingBottom: 18,
					}}
					onScroll={handleScroll}
				>
					{(row) => (
						<div className={styles.timelineVirtualItem} data-chat-row-key={row.key}>
							{row.node}
						</div>
					)}
				</VList>
			)}

			{hasContent && (
				<div className={styles.backBottomAnchor}>
					<BackBottomButton
						visible={!atBottom}
						className={styles.backBottomButton}
						onScrollToBottom={() => scrollToBottom(true)}
					/>
				</div>
			)}
		</div>
	);
}

CodeChatTimelineImpl.displayName = "CodeChatTimeline";

export const CodeChatTimeline = memo(CodeChatTimelineImpl);
