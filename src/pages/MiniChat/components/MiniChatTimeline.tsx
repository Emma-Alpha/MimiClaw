import type { ReactNode, RefObject } from "react";
import { ClaudeCode, OpenClaw } from "@lobehub/icons";
import { Markdown } from "@lobehub/ui";
import { ChatItem } from "@lobehub/ui/chat";
import { useMiniChatStyles } from "../styles";
import type { TimelineItem } from "../types";
import { extractText } from "../utils";
import { CodeTimeline } from "./code-agent/CodeTimeline";
import { TypingIndicator } from "./TypingIndicator";
import type { CodeAgentTimelineItem } from "@/stores/code-agent";

type MiniChatTimelineProps = {
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
	isThinking: boolean;
	isCodeStreaming: boolean;
	codeWorkspaceRoot?: string;
	messagesEndRef: RefObject<HTMLDivElement | null>;
};

function CompactMessageBody({
	renderContent,
}: {
	text: string;
	renderContent: () => ReactNode;
}) {
	const { styles } = useMiniChatStyles();
	return (
		<div className={styles.messageBodyFrame}>
			<div className={styles.messageBodyContent}>
				{renderContent()}
			</div>
		</div>
	);
}

export function MiniChatTimeline({
	timelineItems,
	sending,
	streamingText,
	pendingFinal,
	codeSending,
	codeAgentItems,
	streamingThinkingText,
	streamingAssistantText,
	isThinking,
	isCodeStreaming,
	codeWorkspaceRoot,
	messagesEndRef,
}: MiniChatTimelineProps) {
	const { styles } = useMiniChatStyles();
	const showChatPending = sending || !!streamingText || pendingFinal;

	const renderTimelineItem = (item: TimelineItem) => {
		if (item.kind === "chat") {
			const message = item.message;
			const isUser = message.role === "user";
			const text = extractText(message.content);

			return (
				<ChatItem
					key={item.key}
					avatar={
						isUser
							? {
									avatar: <span className={styles.userAvatar}>我</span>,
									backgroundColor: "transparent",
									title: "You",
								}
							: {
									avatar: (
										<span className={styles.assistantAvatar}>
											<OpenClaw.Color size={20} />
										</span>
									),
									backgroundColor: "transparent",
									title: "极智",
								}
					}
					className={styles.chatItem}
					message={text}
					placement={isUser ? "right" : "left"}
					renderMessage={() =>
						isUser ? (
							<CompactMessageBody
								text={text}
								renderContent={() => (
									<div className={styles.userMessageText}>{text}</div>
								)}
							/>
						) : (
							<CompactMessageBody
								text={text}
								renderContent={() => (
									<div className={styles.markdownBubble}>
										<Markdown>{text}</Markdown>
									</div>
								)}
							/>
						)
					}
					showTitle={false}
					showAvatar={false}
					time={message.timestamp}
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
		// For user messages show the target label badge; for assistant messages
		// the CodeAgentFeed component renders its own status — no aboveMessage needed.
		const aboveMessage =
			isUser && message.targetLabel ? (
				<div className={styles.badgeRow}>
					<ClaudeCode.Color size={12} />
					<span>{message.targetLabel}</span>
				</div>
			) : undefined;

		return (
			<ChatItem
				key={item.key}
				aboveMessage={aboveMessage}
				avatar={
					isUser
						? {
								avatar: <span className={styles.userAvatar}>我</span>,
								backgroundColor: "transparent",
								title: "You",
							}
						: {
								avatar: (
									<span className={styles.codeAvatar}>
										<ClaudeCode.Color size={22} />
									</span>
								),
								backgroundColor: "transparent",
								title: "CLI 编程",
							}
				}
				className={styles.chatItem}
				message={message.text}
				placement={isUser ? "right" : "left"}
				renderMessage={() =>
					isUser ? (
						<CompactMessageBody
							text={message.text}
							renderContent={() => (
								<div className={styles.userMessageText}>
									{message.imagePreviews && message.imagePreviews.length > 0 && (
										<div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: message.text ? 6 : 0 }}>
											{message.imagePreviews.map((img) => (
												img.preview ? (
													<img
														key={img.fileName}
														src={img.preview}
														alt={img.fileName}
														title={img.fileName}
														style={{ maxWidth: 120, maxHeight: 90, borderRadius: 6, objectFit: "cover", display: "block" }}
													/>
												) : (
													<div key={img.fileName} style={{ fontSize: 11, opacity: 0.6, padding: "2px 4px" }}>
														{img.fileName}
													</div>
												)
											))}
										</div>
									)}
									{message.text && <span>{message.text}</span>}
								</div>
							)}
						/>
				) : (
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
				)
				}
				showTitle={false}
				showAvatar={false}
				time={message.createdAt}
				variant="bubble"
			/>
		);
	};

	return (
		<div className={styles.scrollArea}>
			{timelineItems.length === 0 && !showChatPending && !codeSending ? (
				<div className={styles.emptyState}>
					<div className={styles.emptyIcon}>
						<OpenClaw.Color size={22} />
					</div>
					<div className={styles.emptyTitle}>有什么可以帮你的？</div>
					<div className={styles.emptyDesc}>
						普通问题直接发，想让代码助手处理就输入 `@code 你的需求`
					</div>
				</div>
			) : (
				<div className={styles.timeline}>
					{timelineItems.map(renderTimelineItem)}
					{sending && !streamingText ? <TypingIndicator /> : null}
					{streamingText ? (
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
							className={styles.chatItem}
							showAvatar={false}
							message={streamingText}
							placement="left"
							renderMessage={() => (
								<CompactMessageBody
									text={streamingText}
									renderContent={() => (
										<div className={styles.markdownBubble}>
											<Markdown>{streamingText}</Markdown>
											<span className={styles.streamCursor} />
										</div>
									)}
								/>
							)}
							showTitle={false}
							variant="bubble"
						/>
					) : null}
					{pendingFinal && !streamingText && !sending ? (
						<TypingIndicator />
					) : null}
			{codeSending ? (
				<ChatItem
					avatar={{
						avatar: (
							<span className={styles.codeAvatar}>
								<ClaudeCode.Color size={22} />
							</span>
						),
						backgroundColor: "transparent",
						title: "CLI 编程",
					}}
					className={styles.chatItem}
					message=""
					placement="left"
					showTitle={false}
					showAvatar={false}
					variant="bubble"
					renderMessage={() => (
						<CodeTimeline
							items={codeAgentItems}
							streamingThinkingText={streamingThinkingText}
							streamingAssistantText={streamingAssistantText}
							isThinking={isThinking}
							isStreaming={isCodeStreaming}
							workspaceRoot={codeWorkspaceRoot}
						/>
					)}
				/>
			) : null}
					<div ref={messagesEndRef} />
				</div>
			)}
		</div>
	);
}
