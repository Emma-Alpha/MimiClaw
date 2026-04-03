import { useMemo, useState, type ReactNode, type RefObject } from "react";
import { ClaudeCode, OpenClaw } from "@lobehub/icons";
import { Markdown } from "@lobehub/ui";
import { ChatItem } from "@lobehub/ui/chat";
import { useMiniChatStyles } from "../styles";
import type { TimelineItem } from "../types";
import { extractText } from "../utils";
import { CodeAgentFeed, type ToolActivityItem } from "./CodeAgentFeed";
import { TypingIndicator } from "./TypingIndicator";

type MiniChatTimelineProps = {
	timelineItems: TimelineItem[];
	sending: boolean;
	streamingText: string;
	pendingFinal: boolean;
	codeSending: boolean;
	codeActivities: ToolActivityItem[];
	messagesEndRef: RefObject<HTMLDivElement | null>;
};

function shouldCollapseMessage(text: string): boolean {
	return text.length > 220 || text.split("\n").length > 8;
}

function CompactMessageBody({
	text,
	renderContent,
}: {
	text: string;
	renderContent: () => ReactNode;
}) {
	const { styles, cx } = useMiniChatStyles();
	const collapsible = useMemo(() => shouldCollapseMessage(text), [text]);
	const [expanded, setExpanded] = useState(false);

	return (
		<div className={styles.messageBodyFrame}>
			<div
				className={cx(
					styles.messageBodyContent,
					collapsible && !expanded && styles.messageBodyContentCollapsed,
				)}
			>
				{renderContent()}
			</div>
			{collapsible ? (
				<button
					type="button"
					className={cx(
						styles.messageToggle,
						expanded && styles.messageToggleExpanded,
					)}
					onClick={() => {
						setExpanded((current) => !current);
					}}
				>
					{expanded ? "收起全文" : "展开全文"}
				</button>
			) : null}
		</div>
	);
}

export function MiniChatTimeline({
	timelineItems,
	sending,
	streamingText,
	pendingFinal,
	codeSending,
	codeActivities,
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
								<div className={styles.userMessageText}>{message.text}</div>
							)}
						/>
					) : (
						<CompactMessageBody
							text={message.text}
							renderContent={() => (
								<CodeAgentFeed
									activities={message.activities ?? []}
									streamingText={message.text}
									isRunning={false}
									isError={message.isError}
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
								<CodeAgentFeed
									activities={codeActivities}
									streamingText=""
									isRunning={true}
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
