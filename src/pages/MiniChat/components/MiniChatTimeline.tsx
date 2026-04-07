import type { ReactNode, RefObject } from "react";
import { ClaudeCode, OpenClaw } from "@lobehub/icons";
import { Markdown } from "@lobehub/ui";
import { ChatItem } from "@lobehub/ui/chat";
import { File as FileIcon, Folder } from "lucide-react";
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

function normalizeUnixTimestamp(timestamp: number | null | undefined): number | null {
	if (typeof timestamp !== "number" || !Number.isFinite(timestamp)) return null;
	return timestamp < 1e12 ? timestamp * 1000 : timestamp;
}

function formatMetaTimestamp(
	timestamp: number | null | undefined,
): { dateTime: string; label: string } | null {
	const normalized = normalizeUnixTimestamp(timestamp);
	if (!normalized) return null;

	const date = new Date(normalized);
	if (Number.isNaN(date.getTime())) return null;

	const now = new Date();
	const isSameDay =
		date.getFullYear() === now.getFullYear() &&
		date.getMonth() === now.getMonth() &&
		date.getDate() === now.getDate();

	const labelFormatter = new Intl.DateTimeFormat("zh-CN", {
		month: isSameDay ? undefined : "2-digit",
		day: isSameDay ? undefined : "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	});

	return {
		dateTime: date.toISOString(),
		label: labelFormatter.format(date),
	};
}

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
	const renderMetaRow = ({
		icon,
		label,
		timestamp,
		streaming = false,
	}: {
		icon: ReactNode;
		label: string;
		timestamp?: number | null;
		streaming?: boolean;
	}) => {
		const metaTime = streaming ? null : formatMetaTimestamp(timestamp);

		return (
			<div className={styles.messageMetaRow}>
				<span className={styles.messageMetaAvatar} title={label}>
					{icon}
				</span>
				<span className={styles.messageMetaLabel}>{label}</span>
				{metaTime ? (
					<>
						<span className={styles.messageMetaDot}>·</span>
						<time className={styles.messageMetaTime} dateTime={metaTime.dateTime}>
							{metaTime.label}
						</time>
					</>
				) : null}
				{streaming ? (
					<span className={styles.messageMetaStreaming}>处理中</span>
				) : null}
			</div>
		);
	};
	const chatAssistantStreamingMeta = renderMetaRow({
		icon: <OpenClaw.Color size={14} />,
		label: "极智",
		streaming: true,
	});
	const codeAssistantStreamingMeta = renderMetaRow({
		icon: <ClaudeCode.Color size={14} />,
		label: "CLI 编程",
		streaming: true,
	});

	const renderTimelineItem = (item: TimelineItem) => {
		if (item.kind === "chat") {
			const message = item.message;
			const isUser = message.role === "user";
			const text = extractText(message.content);
			const aboveMessage = isUser
				? undefined
				: renderMetaRow({
						icon: <OpenClaw.Color size={14} />,
						label: "极智",
						timestamp: message.timestamp,
					});

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
		const aboveMessage = isUser
			? undefined
			: renderMetaRow({
					icon: <ClaudeCode.Color size={14} />,
					label: "CLI 编程",
					timestamp: message.createdAt,
				});

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
										{message.pathTags && message.pathTags.length > 0 && (
											<div
												style={{
													display: "flex",
													flexWrap: "wrap",
													gap: 6,
													marginBottom:
														message.text || message.imagePreviews?.length ? 6 : 0,
												}}
											>
												{message.pathTags.map((pathTag) => (
													<span
														key={pathTag.absolutePath}
													title={pathTag.absolutePath}
													style={{
														display: "inline-flex",
														alignItems: "center",
														gap: 5,
														maxWidth: 220,
														padding: "3px 8px",
														borderRadius: 14,
														fontSize: 12,
														border: "1px solid rgba(15, 23, 42, 0.12)",
														background: "rgba(255, 255, 255, 0.55)",
														color: "rgba(15, 23, 42, 0.86)",
													}}
												>
													{pathTag.isDirectory ? (
														<Folder size={12} style={{ flexShrink: 0 }} />
													) : (
														<FileIcon size={12} style={{ flexShrink: 0 }} />
													)}
													<span
														style={{
															overflow: "hidden",
															textOverflow: "ellipsis",
															whiteSpace: "nowrap",
														}}
													>
														{pathTag.name}
													</span>
												</span>
												))}
											</div>
										)}
										{message.imagePreviews && message.imagePreviews.length > 0 && (
											<div
												style={{
													display: "flex",
													flexWrap: "wrap",
													gap: 6,
													marginBottom: message.text ? 6 : 0,
												}}
											>
												{message.imagePreviews.map((img) => (
													img.preview ? (
														<img
															key={img.fileName}
															src={img.preview}
															alt={img.fileName}
															title={img.fileName}
															style={{
																maxWidth: 120,
																maxHeight: 90,
																borderRadius: 6,
																objectFit: "cover",
																display: "block",
															}}
														/>
													) : (
														<div
															key={img.fileName}
															style={{
																fontSize: 11,
																opacity: 0.6,
																padding: "2px 4px",
															}}
														>
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
							普通问题直接发，想让代码助手处理就点顶部的 Claude 图标切换模式
						</div>
					</div>
				) : (
					<div className={styles.timeline}>
					{timelineItems.map(renderTimelineItem)}
					{sending && !streamingText ? <TypingIndicator /> : null}
					{streamingText ? (
						<ChatItem
							aboveMessage={chatAssistantStreamingMeta}
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
								aboveMessage={codeAssistantStreamingMeta}
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
