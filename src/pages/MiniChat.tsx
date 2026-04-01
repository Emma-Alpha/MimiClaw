import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { ActionIcon, Markdown } from "@lobehub/ui";
import { ClaudeCode, OpenClaw } from "@lobehub/icons";
import { ChatItem } from "@lobehub/ui/chat";
import { createStyles } from "antd-style";
import { Expand, FolderOpen, X, Send, Paperclip, Camera, FileText, Film, Music, FileArchive, File as FileIcon, Loader2 } from "lucide-react";
import {
	fetchCodeAgentStatus,
	fetchLatestCodeAgentRun,
	inferCodeAgentWorkspaceRoot,
	readStoredCodeAgentWorkspaceRoot,
	runCodeAgentTask,
	writeStoredCodeAgentWorkspaceRoot,
} from "@/lib/code-agent";
import { subscribeHostEvent } from "@/lib/host-events";
import { invokeIpc, toUserMessage } from "@/lib/api-client";
import { hostApiFetch } from "@/lib/host-api";
import i18n from "@/i18n";
import { useSettingsStore } from "@/stores/settings";
import { useGatewayStore } from "@/stores/gateway";
import {
	useChatStore,
	type ContentBlock,
	type RawMessage,
} from "@/stores/chat";
import type { CodeAgentRunStatus, CodeAgentStatus } from "../../shared/code-agent";
import type { PetMiniChatSeed, PetMiniChatSeedAttachment } from "../../shared/pet";

type MiniChatTarget = "chat" | "code";

type MiniCodeMessage = {
	id: string;
	role: "user" | "assistant" | "system";
	text: string;
	createdAt: number;
	status?: CodeAgentRunStatus;
	summary?: string;
	isError?: boolean;
	targetLabel?: string;
};

type SubmissionIntent = {
	target: MiniChatTarget;
	prompt: string;
};

type TimelineItem =
	| {
			kind: "chat";
			key: string;
			sortAt: number;
			message: RawMessage;
	  }
	| {
			kind: "code";
			key: string;
			sortAt: number;
			message: MiniCodeMessage;
	  };

type MentionOption = {
	id: "code";
	label: string;
	insertText: string;
	description: string;
	keywords: string[];
};

type MentionDraft = {
	start: number;
	end: number;
	query: string;
};

function normalizeMiniChatSeed(
	value: string | PetMiniChatSeed | null | undefined,
): PetMiniChatSeed | null {
	if (!value) return null;
	if (typeof value === "string") {
		return {
			text: value,
			autoSend: true,
		};
	}

	return {
		text: value.text || "",
		attachments: value.attachments ?? [],
		autoSend: value.autoSend ?? true,
	};
}

const CODE_MODE_PREFIXES = ["@code", "@cli", "@cli编程", "@CLI编程"];
const CHAT_MODE_PREFIXES = ["@chat"];
const CODE_TARGET_LABEL = "@CLI 编程";
const MENTION_OPTIONS: MentionOption[] = [
	{
		id: "code",
		label: "CLI 编程",
		insertText: "@CLI编程 ",
		description: "把这一条消息直接发给代码助手",
		keywords: ["code", "cli", "coding", "cli编程"],
	},
];

const useStyles = createStyles(({ token, css }) => {
	const subtleShadow = "0 12px 32px rgba(15, 23, 42, 0.08)";
	return {
		root: css`
			display: flex;
			height: 100vh;
			width: 100vw;
			flex-direction: column;
			overflow: hidden;
			background:
				radial-gradient(circle at top, rgba(59, 130, 246, 0.08), transparent 36%),
				${token.colorBgLayout};
			color: ${token.colorText};
		`,
		header: css`
			display: flex;
			height: 48px;
			flex-shrink: 0;
			align-items: center;
			gap: 12px;
			border-bottom: 1px solid ${token.colorBorderSecondary};
			background: ${token.colorBgContainer};
			padding: 0 14px;
			backdrop-filter: blur(12px);
		`,
		brand: css`
			display: flex;
			align-items: center;
			gap: 10px;
			min-width: 0;
		`,
		brandLogo: css`
			display: flex;
			height: 22px;
			width: 22px;
			align-items: center;
			justify-content: center;
			border-radius: 999px;
			background: ${token.colorPrimaryBg};
			box-shadow: inset 0 0 0 1px ${token.colorPrimaryBorder};

			svg {
				height: 14px;
				width: 14px;
			}
		`,
		brandText: css`
			display: flex;
			align-items: center;
			gap: 8px;
			min-width: 0;
		`,
		brandTitle: css`
			font-size: 13px;
			font-weight: 700;
			color: ${token.colorText};
		`,
		status: css`
			display: inline-flex;
			align-items: center;
			gap: 6px;
			min-width: 0;
			font-size: 12px;
			color: ${token.colorTextSecondary};
		`,
		statusDot: css`
			height: 6px;
			width: 6px;
			flex-shrink: 0;
			border-radius: 999px;
		`,
		statusDotReady: css`
			background: #22c55e;
		`,
		statusDotPending: css`
			background: #f59e0b;
			animation: pulse 1.5s infinite;

			@keyframes pulse {
				0%, 100% { opacity: 0.55; }
				50% { opacity: 1; }
			}
		`,
		statusDotError: css`
			background: #ef4444;
		`,
		headerActions: css`
			display: flex;
			align-items: center;
			gap: 4px;
			margin-left: auto;
		`,
		actionIcon: css`
			color: ${token.colorTextSecondary} !important;
			transition: transform 0.2s ease;

			&:hover {
				transform: translateY(-1px);
			}
		`,
		scrollArea: css`
			flex: 1;
			overflow-y: auto;
			padding: 18px 14px;
		`,
		timeline: css`
			display: flex;
			flex-direction: column;
			gap: 14px;
		`,
		chatItem: css`
			width: 100%;

			:global(.lobe-chat-item) {
				width: 100%;
			}
		`,
		markdownBubble: css`
			font-size: 13px;
			line-height: 1.72;
			color: ${token.colorText};

			p {
				margin: 0;
			}

			p + p {
				margin-top: 8px;
			}

			code {
				border-radius: 6px;
				background: ${token.colorFillTertiary};
				padding: 0.12em 0.4em;
				font-size: 12px;
			}

			pre {
				margin: 8px 0 0;
				overflow: auto;
				border-radius: 10px;
				background: ${token.colorFillQuaternary};
				padding: 10px 12px;
			}
		`,
		userMessageText: css`
			white-space: pre-wrap;
			word-break: break-word;
			font-size: 13px;
			line-height: 1.72;
			color: ${token.colorText};
		`,
		streamCursor: css`
			display: inline-block;
			margin-left: 2px;
			height: 16px;
			width: 8px;
			background: ${token.colorTextSecondary};
			opacity: 0.45;
			animation: blink 1s step-end infinite;

			@keyframes blink {
				50% { opacity: 0; }
			}
		`,
		badgeRow: css`
			display: inline-flex;
			align-items: center;
			gap: 6px;
			border-radius: 999px;
			background: ${token.colorPrimaryBg};
			padding: 4px 10px;
			font-size: 11px;
			font-weight: 600;
			color: ${token.colorPrimary};
			box-shadow: inset 0 0 0 1px ${token.colorPrimaryBorder};
		`,
		codeMetaRow: css`
			display: flex;
			flex-wrap: wrap;
			align-items: center;
			gap: 6px;
		`,
		statusBadge: css`
			border-radius: 999px;
			padding: 3px 8px;
			font-size: 11px;
			font-weight: 600;
			line-height: 1;
		`,
		statusBadgeSuccess: css`
			background: rgba(34, 197, 94, 0.12);
			color: #15803d;
		`,
		statusBadgeError: css`
			background: rgba(239, 68, 68, 0.12);
			color: #b91c1c;
		`,
		codeSummary: css`
			font-size: 11px;
			color: ${token.colorTextTertiary};
		`,
		systemNotice: css`
			border-radius: 14px;
			border: 1px dashed ${token.colorBorder};
			background: ${token.colorFillQuaternary};
			padding: 12px 14px;
			font-size: 12px;
			line-height: 1.6;
			color: ${token.colorTextSecondary};
		`,
		emptyState: css`
			display: flex;
			min-height: 100%;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			gap: 14px;
			padding: 12px;
			text-align: center;
		`,
		emptyIcon: css`
			display: flex;
			height: 52px;
			width: 52px;
			align-items: center;
			justify-content: center;
			border-radius: 18px;
			background: ${token.colorBgContainer};
			box-shadow: ${subtleShadow};

			svg {
				height: 22px;
				width: 22px;
			}
		`,
		emptyTitle: css`
			font-size: 15px;
			font-weight: 700;
			color: ${token.colorText};
		`,
		emptyDesc: css`
			max-width: 260px;
			font-size: 13px;
			line-height: 1.7;
			color: ${token.colorTextSecondary};
		`,
		workspaceWrap: css`
			display: flex;
			flex-direction: column;
			gap: 8px;
			padding: 12px 14px 0;
		`,
		workspaceBadge: css`
			display: inline-flex;
			width: fit-content;
			align-items: center;
			gap: 6px;
			border-radius: 999px;
			background: rgba(245, 158, 11, 0.12);
			padding: 4px 10px;
			font-size: 11px;
			font-weight: 600;
			color: #b45309;
		`,
		workspaceCard: css`
			display: flex;
			align-items: center;
			gap: 10px;
			border-radius: 18px;
			border: 1px solid ${token.colorBorderSecondary};
			background: ${token.colorBgContainer};
			padding: 10px 12px;
			box-shadow: ${subtleShadow};
		`,
		workspaceMeta: css`
			min-width: 0;
			flex: 1;
		`,
		workspaceLabel: css`
			font-size: 10px;
			letter-spacing: 0.14em;
			text-transform: uppercase;
			color: ${token.colorTextTertiary};
		`,
		workspacePath: css`
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
			font-size: 12px;
			color: ${token.colorText};
		`,
		workspaceButton: css`
			flex-shrink: 0;
		`,
		inputDock: css`
			flex-shrink: 0;
			background: ${token.colorBgLayout};
			padding: 0 14px 14px;
		`,
		inputTopRow: css`
			display: flex;
			align-items: center;
			justify-content: space-between;
			gap: 8px;
			margin-bottom: 8px;
			padding-top: 6px;
		`,
		commandChip: css`
			display: inline-flex;
			align-items: center;
			gap: 4px;
			border-radius: 6px;
			background: ${token.colorFillTertiary};
			padding: 2px 8px;
			font-size: 11.5px;
			font-weight: 500;
			color: ${token.colorTextSecondary};
			transition: background 0.2s ease;

			&:hover {
				background: ${token.colorFillQuaternary};
			}
		`,
		commandChipClose: css`
			color: ${token.colorTextTertiary} !important;
			margin-left: 2px;
			width: 14px !important;
			height: 14px !important;
			
			svg {
				width: 10px;
				height: 10px;
			}
		`,
		inputShell: css`
			position: relative;
			display: flex;
			flex-direction: column;
			border-radius: 16px;
			background: ${token.colorBgContainer};
			border: 1px solid ${token.colorBorderSecondary};
			box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
			padding: 10px 12px;
			transition: all 0.2s ease;
			/* 防止内部元素（如带绝对定位关闭按钮的附件）被裁剪 */
			overflow: visible;

			&:focus-within {
				border-color: ${token.colorPrimaryBorder};
				box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
			}
		`,
		textarea: css`
			width: 100%;
			min-height: 24px;
			max-height: 112px;
			resize: none;
			border: none;
			background: transparent;
			padding: 0;
			font-size: 14px;
			line-height: 1.6;
			color: ${token.colorText};
			outline: none;

			&::placeholder {
				color: ${token.colorTextQuaternary};
			}

			&:disabled {
				cursor: not-allowed;
				opacity: 0.6;
			}
		`,
		inputBottomRow: css`
			display: flex;
			align-items: center;
			justify-content: space-between;
			margin-top: 4px;
		`,
		sendButton: css`
			display: flex;
			align-items: center;
			justify-content: center;
			height: 32px;
			width: 32px;
			border-radius: 10px;
			border: none;
			background: ${token.colorPrimary};
			color: #fff;
			cursor: pointer;
			transition: all 0.2s ease;
			flex-shrink: 0;

			&:hover:not(:disabled) {
				background: ${token.colorPrimaryHover};
				transform: translateY(-1px);
				box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
			}

			&:active:not(:disabled) {
				transform: translateY(0);
			}

			&:disabled {
				background: ${token.colorFillSecondary};
				color: ${token.colorTextQuaternary};
				cursor: not-allowed;
			}
		`,
		sendButtonLoading: css`
			animation: sendPulse 1.5s infinite;
			@keyframes sendPulse {
				0% { opacity: 1; }
				50% { opacity: 0.5; }
				100% { opacity: 1; }
			}
		`,
		inputActions: css`
			display: flex;
			align-items: center;
			gap: 2px;
			margin-right: 4px;
			color: ${token.colorTextTertiary};
			
			.ant-btn {
				width: 28px !important;
				height: 28px !important;
				svg {
					width: 14px;
					height: 14px;
				}
			}
		`,
		mentionPicker: css`
			position: absolute;
			left: 0;
			right: 0;
			bottom: calc(100% + 8px);
			z-index: 20;
			display: flex;
			flex-direction: column;
			gap: 2px;
			border-radius: 12px;
			border: 1px solid ${token.colorBorderSecondary};
			background: ${token.colorBgElevated};
			padding: 6px;
			box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.02);
		`,
		mentionOption: css`
			display: flex;
			width: 100%;
			align-items: center;
			gap: 8px;
			border: none;
			border-radius: 8px;
			background: transparent;
			padding: 6px 8px;
			text-align: left;
			transition: background 0.15s ease;
			cursor: pointer;

			&:hover {
				background: ${token.colorFillTertiary};
			}
		`,
		mentionOptionActive: css`
			background: ${token.colorFillTertiary};
		`,
		mentionOptionMeta: css`
			display: flex;
			align-items: center;
			gap: 8px;
		`,
		mentionOptionIcon: css`
			display: flex;
			height: 24px;
			width: 24px;
			flex-shrink: 0;
			align-items: center;
			justify-content: center;
			border-radius: 6px;
			background: ${token.colorFillQuaternary};

			svg {
				width: 14px;
				height: 14px;
			}
		`,
		mentionOptionTitle: css`
			font-size: 13px;
			font-weight: 500;
			color: ${token.colorText};
		`,
		userAvatar: css`
			display: flex;
			height: 100%;
			width: 100%;
			align-items: center;
			justify-content: center;
			font-size: 11px;
			font-weight: 700;
			color: #2563eb;
		`,
		assistantAvatar: css`
			display: flex;
			height: 100%;
			width: 100%;
			align-items: center;
			justify-content: center;

			svg {
				height: 16px;
				width: 16px;
			}
		`,
		codeAvatar: css`
			display: flex;
			height: 100%;
			width: 100%;
			align-items: center;
			justify-content: center;
			color: #b45309;
		`,
	};
});

function extractText(content: unknown): string {
	if (typeof content === "string") return content.trim();
	if (Array.isArray(content)) {
		const parts: string[] = [];
		for (const block of content as ContentBlock[]) {
			if (!block || typeof block !== "object") continue;
			if (block.type === "text" && typeof block.text === "string") {
				const t = block.text.trim();
				if (t) parts.push(t);
			} else if (block.type === "image") {
				parts.push("[图片]");
			} else if (
				(block.type === "tool_use" || block.type === "toolCall") &&
				block.name
			) {
				parts.push(`[工具: ${block.name}]`);
			}
		}
		return parts.join("\n");
	}
	return "";
}

function isVisibleMessage(msg: RawMessage): boolean {
	if (msg.role === "system" || msg.role === "toolresult") return false;
	return extractText(msg.content).length > 0;
}

function parseSubmissionIntent(rawText: string): SubmissionIntent {
	const trimmed = rawText.trim();
	if (!trimmed) return { target: "chat", prompt: "" };

	const tokens = trimmed.split(/\s+/);
	for (const token of tokens) {
		const lowerToken = token.toLowerCase();
		if (CODE_MODE_PREFIXES.includes(lowerToken)) {
			const escapedToken = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
			return {
				target: "code",
				prompt: trimmed
					.replace(new RegExp(`(^|\\s)${escapedToken}(?=\\s|$)`, "i"), " ")
					.trim(),
			};
		}
		if (CHAT_MODE_PREFIXES.includes(lowerToken)) {
			const escapedToken = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
			return {
				target: "chat",
				prompt: trimmed
					.replace(new RegExp(`(^|\\s)${escapedToken}(?=\\s|$)`, "i"), " ")
					.trim(),
			};
		}
	}

	return {
		target: "chat",
		prompt: trimmed,
	};
}

function normalizeTimestampMs(value: number | undefined): number | null {
	if (typeof value !== "number" || !Number.isFinite(value)) return null;
	return value < 1e12 ? value * 1000 : value;
}

function getMentionDraft(text: string, caretIndex: number): MentionDraft | null {
	const safeCaret = Math.max(0, Math.min(caretIndex, text.length));
	const beforeCaret = text.slice(0, safeCaret);
	const tokenMatch = beforeCaret.match(/(^|\s)@([a-z0-9-\u4e00-\u9fa5]*)$/i);
	if (!tokenMatch) return null;
	const fullToken = tokenMatch[0];
	const atIndex = safeCaret - fullToken.length + fullToken.lastIndexOf("@");
	const query = tokenMatch[2] ?? "";
	if (!/^[a-z0-9-\u4e00-\u9fa5]*$/i.test(query)) return null;
	return {
		start: atIndex,
		end: safeCaret,
		query,
	};
}

function removeTrailingMention(
	text: string,
	caretIndex: number,
): { text: string; caret: number } | null {
	const safeCaret = Math.max(0, Math.min(caretIndex, text.length));
	const beforeCaret = text.slice(0, safeCaret);
	const match = beforeCaret.match(/(^|\s)(@(?:code|cli|CLI编程|cli编程))\s$/i);
	if (!match) return null;
	const mentionToken = match[2] ?? "";
	const mentionStart = safeCaret - mentionToken.length - 1;
	const nextText = `${text
		.slice(0, Math.max(0, mentionStart))
		.replace(/\s+$/, "")}${text.slice(safeCaret)}`;
	const nextCaret = Math.max(0, mentionStart);
	return {
		text: nextText,
		caret: nextCaret,
	};
}

function formatWorkspaceLabel(path: string): string {
	if (!path) return "未选择工作目录";
	const normalized = path.replace(/\\/g, "/");
	const parts = normalized.split("/").filter(Boolean);
	if (normalized.startsWith("/") && parts.length <= 3) return normalized;
	if (/^[A-Za-z]:\//.test(normalized) && parts.length <= 3) return normalized;
	return parts.length > 3 ? `.../${parts.slice(-3).join("/")}` : normalized;
}

function getCodeAgentStateLabel(state?: CodeAgentStatus["state"]): string {
	if (state === "running") return "CLI 就绪";
	if (state === "starting") return "CLI 启动中";
	if (state === "error") return "CLI 异常";
	return "CLI 待唤起";
}

function getCodeStatusLabel(status?: CodeAgentRunStatus): string | null {
	if (!status) return null;
	if (status === "completed") return "已完成";
	if (status === "analysis_only") return "仅分析";
	if (status === "cancelled") return "已取消";
	if (status === "not_implemented") return "未执行";
	if (status === "failed") return "执行失败";
	return status;
}

function TypingIndicator({ codeMode = false }: { codeMode?: boolean }) {
	const { styles } = useStyles();
	return (
		<ChatItem
			avatar={
				codeMode
					? {
							avatar: (
								<span className={styles.codeAvatar}>
									<ClaudeCode.Color size={16} />
								</span>
							),
							backgroundColor: "transparent",
							title: "CLI 编程",
						}
					: {
							avatar: (
								<span className={styles.assistantAvatar}>
									<OpenClaw.Color size={16} />
								</span>
							),
							backgroundColor: "rgba(59,130,246,0.1)",
							title: "极智",
						}
			}
			className={styles.chatItem}
			message=""
			placement="left"
			renderMessage={() => (
				<div style={{ display: 'flex', alignItems: 'center', gap: '4px', height: '22px' }}>
					<span
						style={{
							height: '6px',
							width: '6px',
							borderRadius: '50%',
							backgroundColor: 'var(--color-text-tertiary, #999)',
							opacity: 0.6,
							animation: 'bounce 1.4s infinite ease-in-out both',
							animationDelay: '-0.32s'
						}}
					/>
					<span
						style={{
							height: '6px',
							width: '6px',
							borderRadius: '50%',
							backgroundColor: 'var(--color-text-tertiary, #999)',
							opacity: 0.6,
							animation: 'bounce 1.4s infinite ease-in-out both',
							animationDelay: '-0.16s'
						}}
					/>
					<span
						style={{
							height: '6px',
							width: '6px',
							borderRadius: '50%',
							backgroundColor: 'var(--color-text-tertiary, #999)',
							opacity: 0.6,
							animation: 'bounce 1.4s infinite ease-in-out both'
						}}
					/>
					<style>{`
						@keyframes bounce {
							0%, 80%, 100% { transform: scale(0); }
							40% { transform: scale(1); }
						}
					`}</style>
				</div>
			)}
			showTitle={false}
			variant="bubble"
		/>
	);
}

export function MiniChat() {
	const { styles, cx } = useStyles();
	const initSettings = useSettingsStore((s) => s.init);
	const language = useSettingsStore((s) => s.language);
	const initGateway = useGatewayStore((s) => s.init);
	const gatewayStatus = useGatewayStore((s) => s.status);
	const messages = useChatStore((s) => s.messages);
	const sending = useChatStore((s) => s.sending);
	const streamingText = useChatStore((s) => s.streamingText);
	const streamingTools = useChatStore((s) => s.streamingTools);
	const pendingFinal = useChatStore((s) => s.pendingFinal);
	const newSession = useChatStore((s) => s.newSession);
	const sendMessage = useChatStore((s) => s.sendMessage);

	const [input, setInput] = useState("");
	const [attachments, setAttachments] = useState<FileAttachment[]>([]);
	const [previewImage, setPreviewImage] = useState<{ src: string; fileName: string } | null>(null);
	const [selectedMode, setSelectedMode] = useState<"chat" | "code" | null>(null);
	const [isComposing, setIsComposing] = useState(false);
	const [isInputFocused, setIsInputFocused] = useState(false);
	const [caretIndex, setCaretIndex] = useState(0);
	const [activeMentionIndex, setActiveMentionIndex] = useState(0);
	const [codeMessages, setCodeMessages] = useState<MiniCodeMessage[]>([]);
	const [codeSending, setCodeSending] = useState(false);
	const [codeAgentStatus, setCodeAgentStatus] = useState<CodeAgentStatus | null>(
		null,
	);
	const [codeWorkspaceRoot, setCodeWorkspaceRoot] = useState(() =>
		readStoredCodeAgentWorkspaceRoot(),
	);

	const messagesEndRef = useRef<HTMLDivElement>(null);
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const pendingAutoSend = useRef<PetMiniChatSeed | null>(null);
	const chatSeenAtRef = useRef(new Map<string, number>());
	const chatSeenCounterRef = useRef(0);
	const pushedToolIdsRef = useRef<Set<string>>(new Set());

	const gatewayState = gatewayStatus.state;
	const isConnecting =
		gatewayState === "starting" || gatewayState === "reconnecting";
	const isError = gatewayState === "error";
	const isReady = gatewayState === "running";

	useEffect(() => {
		void initSettings();
	}, [initSettings]);

	useEffect(() => {
		if (language && language !== i18n.language) {
			i18n.changeLanguage(language);
		}
	}, [language]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: intentionally once
	useEffect(() => {
		newSession();
	}, []);

	useEffect(() => {
		void initGateway();
	}, [initGateway]);

	useEffect(() => {
		const syncCodeAgentContext = async () => {
			const [statusResult, latestRunResult] = await Promise.allSettled([
				fetchCodeAgentStatus(),
				fetchLatestCodeAgentRun(),
			]);

			if (statusResult.status === "fulfilled") {
				setCodeAgentStatus(statusResult.value);
			}

			if (!codeWorkspaceRoot.trim()) {
				const inferredWorkspaceRoot = inferCodeAgentWorkspaceRoot(
					latestRunResult.status === "fulfilled"
						? latestRunResult.value?.request.workspaceRoot ??
								(statusResult.status === "fulfilled"
									? statusResult.value.vendorPath
									: "")
						: statusResult.status === "fulfilled"
							? statusResult.value.vendorPath
							: "",
				);
				if (inferredWorkspaceRoot) {
					setCodeWorkspaceRoot(inferredWorkspaceRoot);
				}
			}
		};

		void syncCodeAgentContext();

		const unsubscribeStatus = subscribeHostEvent<CodeAgentStatus>(
			"code-agent:status",
			(payload) => {
				setCodeAgentStatus(payload);
			},
		);

		return () => {
			unsubscribeStatus();
		};
	}, [codeWorkspaceRoot]);

	useEffect(() => {
		writeStoredCodeAgentWorkspaceRoot(codeWorkspaceRoot.trim());
	}, [codeWorkspaceRoot]);

	useEffect(() => {
		void invokeIpc<string | PetMiniChatSeed | null>("pet:consumeInitialMessage").then((payload) => {
			const seed = normalizeMiniChatSeed(payload);
			if (seed) {
				if (seed.attachments?.length) {
					setAttachments(seed.attachments as FileAttachment[]);
				}
				pendingAutoSend.current = seed;
			}
		});
	 
	}, []);

	const clearComposer = useCallback(() => {
		setInput("");
		setSelectedMode(null);
		setAttachments([]);
		if (textareaRef.current) {
			textareaRef.current.style.height = "auto";
		}
	}, []);

	const runMiniCodeTask = useCallback(
		async (prompt: string) => {
			const workspaceRoot = codeWorkspaceRoot.trim();
			if (!workspaceRoot || codeSending) return false;

			setCodeMessages((prev) => [
				...prev,
				{
					id: crypto.randomUUID(),
					role: "user",
					text: prompt,
					createdAt: Date.now(),
					targetLabel: CODE_TARGET_LABEL,
				},
			]);
			setCodeSending(true);
			
			// 推送任务开始提示到宠物终端
			await invokeIpc("pet:pushTerminalLine", `› 开始执行: ${prompt.substring(0, 30)}${prompt.length > 30 ? '...' : ''}`);

			try {
				const result = await runCodeAgentTask({
					workspaceRoot,
					prompt,
					metadata: {
						source: "pet-mini-chat",
						ui: "floating-pet",
					},
				});
				
				// 将输出推送到宠物终端
				const outputText = result.output?.trim() || result.summary || "任务已完成";
				const lines = outputText.split('\n').slice(0, 5); // 只显示前5行
				for (const line of lines) {
					if (line.trim()) {
						await invokeIpc("pet:pushTerminalLine", `› ${line.trim()}`);
					}
				}
				
				setCodeMessages((prev) => [
					...prev,
					{
						id: crypto.randomUUID(),
						role: "assistant",
						text:
							result.output?.trim()
							|| result.summary
							|| "任务已完成，但没有返回可展示的文本输出。",
						createdAt: Date.now(),
						summary: result.summary,
						status: result.status,
					},
				]);
				return true;
			} catch (error) {
				setCodeMessages((prev) => [
					...prev,
					{
						id: crypto.randomUUID(),
						role: "assistant",
						text: toUserMessage(error),
						createdAt: Date.now(),
						status: "failed",
						isError: true,
					},
				]);
				return false;
			} finally {
				setCodeSending(false);
				void fetchCodeAgentStatus()
					.then((status) => {
						setCodeAgentStatus(status);
					})
					.catch(() => {});
			}
		},
		[codeSending, codeWorkspaceRoot],
	);

	const submitPrompt = useCallback(
		async (
			rawText: string,
			attachmentOverride?: PetMiniChatSeedAttachment[],
			forcedTarget?: MiniChatTarget,
		) => {
			const target = forcedTarget || selectedMode || parseSubmissionIntent(rawText).target;
			const prompt = rawText.trim();
			const effectiveAttachments = (attachmentOverride as FileAttachment[] | undefined) ?? attachments;
			
			if (!prompt && effectiveAttachments.length === 0) return false;

			const readyAttachments = effectiveAttachments.filter(
				(a) => a.status === "ready",
			);

			if (target === "chat") {
				if (!isReady || sending) return false;
				clearComposer();
				await sendMessage(prompt, readyAttachments);
				return true;
			}

			if (!codeWorkspaceRoot.trim()) return false;

			clearComposer();
			// 注意：这里代码助手暂时不支持直接在 runCodeAgentTask 里带 attachments
			// 如需支持可以在以后扩展 CodeAgentRunRequest
			return await runMiniCodeTask(prompt);
		},
		[
			selectedMode,
			clearComposer,
			codeWorkspaceRoot,
			isReady,
			runMiniCodeTask,
			sendMessage,
			sending,
			attachments,
		],
	);

	useEffect(() => {
		const unsubscribe = window.electron.ipcRenderer.on(
			"mini-chat:initial-message",
			(payload) => {
				const seed = normalizeMiniChatSeed(payload as string | PetMiniChatSeed);
				if (!seed) return;
				if (seed.attachments?.length) {
					setAttachments(seed.attachments as FileAttachment[]);
				}
				const intent = parseSubmissionIntent(seed.text);
				const canSendNow =
					intent.target === "code"
						? !codeSending && !sending
						: isReady && !sending && !codeSending;
				if (canSendNow && seed.autoSend !== false) {
					void submitPrompt(seed.text, seed.attachments, intent.target);
				} else {
					pendingAutoSend.current = seed;
				}
			},
		);
		return () => {
			unsubscribe?.();
		};
	}, [codeSending, isReady, sending, submitPrompt]);

	useEffect(() => {
		const queuedSeed = pendingAutoSend.current;
		if (!queuedSeed) return;
		if (sending || codeSending) return;

		const intent = parseSubmissionIntent(queuedSeed.text);
		if (intent.target === "chat" && !isReady) return;
		if (queuedSeed.autoSend === false) return;

		pendingAutoSend.current = null;
		void submitPrompt(queuedSeed.text, queuedSeed.attachments, intent.target);
	}, [codeSending, isReady, sending, submitPrompt]);

	useEffect(() => {
		const activity =
			!sending && !codeSending
				? "idle"
				: codeSending
					? "working"
					: pendingFinal || streamingText || streamingTools.length > 0
						? "working"
						: "listening";
		void invokeIpc("pet:setUiActivity", { activity }).catch(() => {});
	}, [codeSending, pendingFinal, sending, streamingText, streamingTools]);

	useEffect(() => {
		if (streamingTools.length === 0) {
			pushedToolIdsRef.current = new Set();
			return;
		}
		for (const tool of streamingTools) {
			const key = tool.id ?? tool.toolCallId ?? tool.name;
			if (!pushedToolIdsRef.current.has(key)) {
				pushedToolIdsRef.current.add(key);
				void invokeIpc("pet:pushTerminalLine", `› ${tool.name}`).catch(() => {});
			}
		}
	}, [streamingTools]);

	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages, streamingText, sending, codeMessages, codeSending]);

	const handleClose = useCallback(() => {
		void invokeIpc("pet:closeMiniChat");
	}, []);

	const handleOpenFull = useCallback(() => {
		void invokeIpc("pet:openMainWindow");
		void invokeIpc("pet:closeMiniChat");
	}, []);

	const handlePickWorkspace = useCallback(async () => {
		const result = (await invokeIpc("dialog:open", {
			properties: ["openDirectory"],
		})) as { canceled: boolean; filePaths?: string[] };
		if (result.canceled || !result.filePaths?.[0]) return;
		setCodeWorkspaceRoot(result.filePaths[0]);
	}, []);

	const mentionDraft = useMemo(
		() => getMentionDraft(input, caretIndex),
		[input, caretIndex],
	);
	const mentionOptions = useMemo(() => {
		if (!mentionDraft) return [];
		const normalizedQuery = mentionDraft.query.toLowerCase();
		return MENTION_OPTIONS.filter((option) =>
			normalizedQuery.length === 0
				|| option.keywords.some((keyword) => keyword.startsWith(normalizedQuery)),
		);
	}, [mentionDraft]);
	const showMentionPicker =
		isInputFocused && mentionDraft !== null && mentionOptions.length > 0;

	useEffect(() => {
		setActiveMentionIndex(0);
	}, [input, showMentionPicker]);

		const applyMention = useCallback(
			(_option: MentionOption) => {
			if (!mentionDraft) return;
			
			// 移除输入框中的 @ 文本
			const nextInput =
				input.slice(0, mentionDraft.start) +
				input.slice(mentionDraft.end);
			const nextCaret = mentionDraft.start;
			
			// 设置模式状态
			setSelectedMode("code");
			setInput(nextInput);
			setCaretIndex(nextCaret);
			
			requestAnimationFrame(() => {
				const textarea = textareaRef.current;
				if (!textarea) return;
				textarea.focus();
				textarea.setSelectionRange(nextCaret, nextCaret);
				textarea.style.height = "auto";
				textarea.style.height = `${Math.min(textarea.scrollHeight, 112)}px`;
			});
		},
		[input, mentionDraft],
	);

	const removeCodeMentionFromInput = useCallback(() => {
		setSelectedMode(null);
		const nextInput = input
			.replace(/(^|\s)@(code|cli|CLI编程|cli编程)(?=\s|$)/i, " ")
			.replace(/\s+/g, " ")
			.trimStart();
		setInput(nextInput);
		setCaretIndex(nextInput.length);
		requestAnimationFrame(() => {
			const textarea = textareaRef.current;
			if (!textarea) return;
			textarea.focus();
			textarea.setSelectionRange(nextInput.length, nextInput.length);
			textarea.style.height = "auto";
			textarea.style.height = `${Math.min(textarea.scrollHeight, 112)}px`;
		});
	}, [input]);

	const handleSend = useCallback(async () => {
		const text = input.trim();
		if (!text || sending || codeSending) return;
		await submitPrompt(text);
	}, [codeSending, input, sending, submitPrompt]);

		const stageBufferFiles = useCallback(async (files: globalThis.File[]) => {
		for (const file of files) {
			const tempId = crypto.randomUUID();
			setAttachments((prev) => [
				...prev,
				{
					id: tempId,
					fileName: file.name,
					mimeType: file.type || "application/octet-stream",
					fileSize: file.size,
					stagedPath: "",
					preview: null,
					status: "staging",
				},
			]);
			try {
				const base64 = await readFileAsBase64(file);
				const staged = await hostApiFetch<{
					id: string;
					fileName: string;
					mimeType: string;
					fileSize: number;
					stagedPath: string;
					preview: string | null;
				}>("/api/files/stage-buffer", {
					method: "POST",
					body: JSON.stringify({
						base64,
						fileName: file.name,
						mimeType: file.type || "application/octet-stream",
					}),
				});
				setAttachments((prev) =>
					prev.map((a) =>
						a.id === tempId ? { ...staged, status: "ready" as const } : a,
					),
				);
			} catch (err) {
				setAttachments((prev) =>
					prev.map((a) =>
						a.id === tempId
							? { ...a, status: "error" as const, error: String(err) }
							: a,
					),
				);
			}
		}
		}, []);
		void stageBufferFiles;

	const handleUploadFile = useCallback(async () => {
		try {
			const result = (await invokeIpc("dialog:open", {
				properties: ["openFile", "multiSelections"],
			})) as { canceled: boolean; filePaths?: string[] };
			if (result.canceled || !result.filePaths?.length) return;

			const tempIds: string[] = [];
			for (const fp of result.filePaths) {
				const tempId = crypto.randomUUID();
				tempIds.push(tempId);
				const fileName = fp.split(/[\\/]/).pop() || "file";
				setAttachments((prev) => [
					...prev,
					{
						id: tempId,
						fileName,
						mimeType: "",
						fileSize: 0,
						stagedPath: "",
						preview: null,
						status: "staging",
					},
				]);
			}

			const staged = await hostApiFetch<
				Array<{
					id: string;
					fileName: string;
					mimeType: string;
					fileSize: number;
					stagedPath: string;
					preview: string | null;
				}>
			>("/api/files/stage-paths", {
				method: "POST",
				body: JSON.stringify({ filePaths: result.filePaths }),
			});

			setAttachments((prev) => {
				let updated = [...prev];
				for (let i = 0; i < tempIds.length; i++) {
					const data = staged[i];
					updated = updated.map((a) =>
						a.id === tempIds[i]
							? data
								? { ...data, status: "ready" as const }
								: { ...a, status: "error" as const, error: "Staging failed" }
							: a,
					);
				}
				return updated;
			});
		} catch (err) {
			setAttachments((prev) =>
				prev.map((a) =>
					a.status === "staging"
						? { ...a, status: "error" as const, error: String(err) }
						: a,
				),
			);
		}
	}, []);

	const handleScreenshot = useCallback(async () => {
		let tempId: string | null = null;
		try {
			await invokeIpc("pet:pushTerminalLine", "› 启动截图工具...");
			const screenshot = await window.electron.captureScreenshot();
			
			const nextTempId = crypto.randomUUID();
			tempId = nextTempId;
			setAttachments((prev) => [
				...prev,
				{
					id: nextTempId,
					fileName: screenshot.fileName,
					mimeType: screenshot.mimeType,
					fileSize: screenshot.fileSize,
					stagedPath: "",
					preview: screenshot.preview,
					status: "staging",
				},
			]);
			
			await invokeIpc("pet:pushTerminalLine", "› 正在上传截图...");
			
			const staged = await hostApiFetch<{
				id: string;
				fileName: string;
				mimeType: string;
				fileSize: number;
				stagedPath: string;
				preview: string | null;
			}>("/api/files/stage-buffer", {
				method: "POST",
				body: JSON.stringify({
					base64: screenshot.base64,
					fileName: screenshot.fileName,
					mimeType: screenshot.mimeType,
				}),
			});
			
			setAttachments((prev) =>
				prev.map((attachment) =>
					attachment.id === nextTempId
						? { ...staged, status: "ready" as const }
						: attachment,
				),
			);
			
			await invokeIpc("pet:pushTerminalLine", `› 截图上传成功: ${staged.fileName}`);
			
		} catch (err) {
			if (typeof err === "string" && err.includes("timed out or was cancelled")) {
				await invokeIpc("pet:pushTerminalLine", "› 截图已取消");
				if (tempId) {
					const idToRemove = tempId;
					setAttachments((prev) => prev.filter((a) => a.id !== idToRemove));
				}
			} else {
				console.error('Screenshot failed:', err);
				await invokeIpc("pet:pushTerminalLine", `› 截图失败`);
				if (tempId) {
					const idToRemove = tempId;
					setAttachments((prev) =>
						prev.map((a) =>
							a.id === idToRemove
								? { ...a, status: "error" as const, error: String(err) }
								: a,
						),
					);
				}
			}
		}
	}, []);

	const handleKeyDown = useCallback(
		(e: KeyboardEvent<HTMLTextAreaElement>) => {
			if (showMentionPicker && e.key === "ArrowDown") {
				e.preventDefault();
				setActiveMentionIndex((prev) => (prev + 1) % mentionOptions.length);
				return;
			}
			if (showMentionPicker && e.key === "ArrowUp") {
				e.preventDefault();
				setActiveMentionIndex((prev) =>
					(prev - 1 + mentionOptions.length) % mentionOptions.length,
				);
				return;
			}
			if (showMentionPicker && (e.key === "Enter" || e.key === "Tab")) {
				e.preventDefault();
				applyMention(mentionOptions[activeMentionIndex] ?? mentionOptions[0]);
				return;
			}
			if (
				e.key === "Backspace"
				&& e.currentTarget.selectionStart === e.currentTarget.selectionEnd
			) {
				const removal = removeTrailingMention(
					input,
					e.currentTarget.selectionStart ?? input.length,
				);
				if (removal) {
					e.preventDefault();
					setInput(removal.text);
					setCaretIndex(removal.caret);
					requestAnimationFrame(() => {
						const textarea = textareaRef.current;
						if (!textarea) return;
						textarea.focus();
						textarea.setSelectionRange(removal.caret, removal.caret);
						textarea.style.height = "auto";
						textarea.style.height = `${Math.min(textarea.scrollHeight, 112)}px`;
					});
				}
				return;
			}
			if (e.key === "Enter" && !e.shiftKey && !isComposing) {
				e.preventDefault();
				void handleSend();
			}
		},
		[
			activeMentionIndex,
			applyMention,
			handleSend,
			input,
			isComposing,
			mentionOptions,
			showMentionPicker,
		],
	);

	const visibleMessages = useMemo(
		() => messages.filter(isVisibleMessage).slice(-10),
		[messages],
	);
	const draftIntent = useMemo(() => parseSubmissionIntent(input), [input]);
	const draftTarget = selectedMode || draftIntent.target;
	const showChatPending = sending || !!streamingText || pendingFinal;
	const disableComposer =
		draftTarget === "chat"
			? isConnecting || isError || sending || codeSending
			: sending || codeSending;
	const composerPlaceholder =
		draftTarget === "code"
			? codeWorkspaceRoot.trim()
				? "描述你想让 CLI 完成的任务，例如：写脚本、改文件、整理目录…"
				: "先选择工作目录，再描述你要完成的编程小任务"
			: isConnecting
				? "连接中…"
				: isError
					? "连接断开"
					: "输入消息… 输入 @ 呼唤智能助手";

	const commandHint = draftTarget === "code" ? "CLI 模式" : null;
	const sendDisabled =
		!input.trim()
		|| disableComposer
		|| showMentionPicker
		|| (draftTarget === "code" && !codeWorkspaceRoot.trim());

	const timelineItems = useMemo<TimelineItem[]>(() => {
		const chatItems = visibleMessages.map((message, index) => {
			const key = message.id
				? `chat:${message.role}:${message.id}`
				: `chat:${message.role}:${index}:${extractText(message.content).slice(0, 40)}`;
			if (!chatSeenAtRef.current.has(key)) {
				const normalizedTimestamp = normalizeTimestampMs(message.timestamp);
				const fallbackTimestamp = Date.now() + chatSeenCounterRef.current;
				chatSeenCounterRef.current += 1;
				chatSeenAtRef.current.set(key, normalizedTimestamp ?? fallbackTimestamp);
			}
			return {
				kind: "chat" as const,
				key,
				sortAt: chatSeenAtRef.current.get(key) ?? Date.now(),
				message,
			};
		});

		const localCodeItems = codeMessages.map((message) => ({
			kind: "code" as const,
			key: `code:${message.id}`,
			sortAt: message.createdAt,
			message,
		}));

		return [...chatItems, ...localCodeItems].sort((a, b) => a.sortAt - b.sortAt);
	}, [codeMessages, visibleMessages]);

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
									backgroundColor: "rgba(59,130,246,0.12)",
									title: "You",
								}
							: {
									avatar: (
										<span className={styles.assistantAvatar}>
											<OpenClaw.Color size={16} />
										</span>
									),
									backgroundColor: "rgba(59,130,246,0.1)",
									title: "极智",
								}
					}
					className={styles.chatItem}
					message={text}
					placement={isUser ? "right" : "left"}
					renderMessage={() =>
						isUser ? (
							<div className={styles.userMessageText}>{text}</div>
						) : (
							<div className={styles.markdownBubble}>
								<Markdown>{text}</Markdown>
							</div>
						)
					}
					showTitle={false}
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
		const statusLabel = getCodeStatusLabel(message.status);
		const aboveMessage = isUser ? (
			message.targetLabel ? (
				<div className={styles.badgeRow}>
					<ClaudeCode.Color size={12} />
					<span>{message.targetLabel}</span>
				</div>
			) : undefined
		) : statusLabel || message.summary ? (
			<div className={styles.codeMetaRow}>
				{statusLabel ? (
					<span
						className={cx(
							styles.statusBadge,
							message.isError ? styles.statusBadgeError : styles.statusBadgeSuccess,
						)}
					>
						{statusLabel}
					</span>
				) : null}
				{message.summary ? (
					<span className={styles.codeSummary}>{message.summary}</span>
				) : null}
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
								backgroundColor: "rgba(245,158,11,0.12)",
								title: "You",
							}
						: {
								avatar: (
									<span className={styles.codeAvatar}>
										<ClaudeCode.Color size={20} />
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
						<div className={styles.userMessageText}>{message.text}</div>
					) : (
						<div className={styles.markdownBubble}>
							<Markdown>{message.text}</Markdown>
						</div>
					)
				}
				showTitle={false}
				time={message.createdAt}
				variant="bubble"
			/>
		);
	};

	const streamingMessageNode = streamingText ? (
		<ChatItem
			avatar={{
				avatar: (
					<span className={styles.assistantAvatar}>
						<OpenClaw.Color size={16} />
					</span>
				),
				backgroundColor: "rgba(59,130,246,0.1)",
				title: "极智",
			}}
			className={styles.chatItem}
			message={streamingText}
			placement="left"
			renderMessage={() => (
				<div className={styles.markdownBubble}>
					<Markdown>{streamingText}</Markdown>
					<span className={styles.streamCursor} />
				</div>
			)}
			showTitle={false}
			variant="bubble"
		/>
	) : null;

	return (
		<div className={styles.root}>
			<div className={cx("drag-region", styles.header)}>
				<div className={styles.brand}>
					<div className={styles.brandLogo}>
						<OpenClaw.Color size={14} />
					</div>
					<div className={styles.brandText}>
						<span className={styles.brandTitle}>极智</span>
						<div className={styles.status}>
							<span
								className={cx(
									styles.statusDot,
									codeSending || draftTarget === "code"
										? codeAgentStatus?.state === "running"
											? styles.statusDotReady
											: codeAgentStatus?.state === "error"
												? styles.statusDotError
												: styles.statusDotPending
										: isReady
											? styles.statusDotReady
											: isError
												? styles.statusDotError
												: styles.statusDotPending,
								)}
							/>
							<span>
								{codeSending || draftTarget === "code"
									? getCodeAgentStateLabel(codeAgentStatus?.state)
									: isConnecting
										? "连接中…"
										: isError
											? "连接断开"
											: "快捷聊天"}
							</span>
						</div>
					</div>
				</div>

				<div className={styles.headerActions}>
					<ActionIcon
						className={cx("no-drag", styles.actionIcon)}
						icon={Expand}
						onClick={handleOpenFull}
						title="打开完整界面"
					/>
					<ActionIcon
						className={cx("no-drag", styles.actionIcon)}
						icon={X}
						onClick={handleClose}
						title="关闭"
					/>
				</div>
			</div>

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
						{streamingMessageNode}
						{pendingFinal && !streamingText && !sending ? (
							<TypingIndicator />
						) : null}
						{codeSending ? <TypingIndicator codeMode /> : null}
						<div ref={messagesEndRef} />
					</div>
				)}
			</div>

			<div className={styles.inputDock}>
				<div className={styles.inputShell}>
					{draftTarget === "code" ? (
						<div className={styles.inputTopRow}>
							{commandHint ? (
								<div className={styles.commandChip}>
									<ClaudeCode.Color size={12} />
									<span>{commandHint}</span>
									<ActionIcon
										className={styles.commandChipClose}
										icon={X}
										onClick={removeCodeMentionFromInput}
										title="移除 @CLI编程"
									/>
								</div>
							) : <div />}
							{draftTarget === "code" ? (
								<button
									type="button"
									onClick={() => void handlePickWorkspace()}
									style={{
										display: 'flex',
										alignItems: 'center',
										gap: '4px',
										background: 'transparent',
										border: 'none',
										color: 'var(--color-text-tertiary, #888)',
										fontSize: '11px',
										cursor: 'pointer',
										padding: '2px 4px',
										borderRadius: '4px',
									}}
									title="点击选择/更换工作目录"
								>
									<FolderOpen className="h-3 w-3" />
									<span style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
										{codeWorkspaceRoot.trim() ? formatWorkspaceLabel(codeWorkspaceRoot) : "选择工作目录"}
									</span>
								</button>
							) : null}
						</div>
					) : null}

					{showMentionPicker ? (
						<div className={styles.mentionPicker}>
							{mentionOptions.map((option, index) => (
								<button
									key={option.id}
									type="button"
									onMouseEnter={() => {
										setActiveMentionIndex(index);
									}}
									onMouseDown={(e) => {
										e.preventDefault();
										applyMention(option);
									}}
									className={cx(
										styles.mentionOption,
										index === activeMentionIndex && styles.mentionOptionActive,
									)}
								>
									<div className={styles.mentionOptionMeta}>
										<div className={styles.mentionOptionIcon}>
											<ClaudeCode.Color size={16} />
										</div>
										<div className={styles.mentionOptionTitle}>
											{option.label}
										</div>
									</div>
								</button>
							))}
						</div>
					) : null}

					{attachments.length > 0 && (
						<div
							style={{
								display: "flex",
								gap: "8px",
								marginBottom: "6px",
								flexWrap: "wrap",
							}}
						>
							{attachments.map((att) => (
								<AttachmentPreview
									key={att.id}
									attachment={att}
									onRemove={() => {
										setAttachments((prev) => prev.filter((a) => a.id !== att.id));
									}}
									onPreview={(src, fileName) => setPreviewImage({ src, fileName })}
								/>
							))}
						</div>
					)}

					<textarea
						ref={textareaRef}
						value={input}
						onChange={(e) => {
							setInput(e.target.value);
							setCaretIndex(
								e.currentTarget.selectionStart ?? e.currentTarget.value.length,
							);
							const textarea = e.currentTarget;
							textarea.style.height = "auto";
							textarea.style.height = `${Math.min(textarea.scrollHeight, 112)}px`;
						}}
						onKeyDown={handleKeyDown}
						onCompositionStart={() => setIsComposing(true)}
						onCompositionEnd={() => setIsComposing(false)}
						onFocus={(e) => {
							setIsInputFocused(true);
							setCaretIndex(
								e.currentTarget.selectionStart ?? e.currentTarget.value.length,
							);
						}}
						onBlur={() => {
							setIsInputFocused(false);
						}}
						onClick={(e) => {
							setCaretIndex(
								e.currentTarget.selectionStart ?? e.currentTarget.value.length,
							);
						}}
						onSelect={(e) => {
							setCaretIndex(
								e.currentTarget.selectionStart ?? e.currentTarget.value.length,
							);
						}}
						placeholder={composerPlaceholder}
						disabled={disableComposer}
						rows={1}
						className={styles.textarea}
					/>

					<div className={styles.inputBottomRow}>
						<div className={styles.inputActions}>
							<ActionIcon
								icon={Paperclip}
								onClick={handleUploadFile}
								title="上传文件"
								size="small"
								style={{ color: 'var(--color-text-tertiary, #888)' }}
							/>
							<ActionIcon
								icon={Camera}
								onClick={handleScreenshot}
								title="截图"
								size="small"
								style={{ color: 'var(--color-text-tertiary, #888)' }}
							/>
						</div>
						<button
							type="button"
							className={cx(
								styles.sendButton,
								(sending || codeSending) && styles.sendButtonLoading
							)}
							onClick={() => void handleSend()}
							disabled={sendDisabled}
							title="发送"
						>
							<Send className="h-[15px] w-[15px]" />
						</button>
					</div>
				</div>
			</div>

			{previewImage && (
				<ImageLightbox
					src={previewImage.src}
					fileName={previewImage.fileName}
					onClose={() => setPreviewImage(null)}
				/>
			)}
		</div>
	);
}

// ── Attachment Types & Helpers ───────────────────────────────────────────

export interface FileAttachment {
	id: string;
	fileName: string;
	mimeType: string;
	fileSize: number;
	stagedPath: string;
	preview: string | null;
	status: "staging" | "ready" | "error";
	error?: string;
}

function formatFileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	if (bytes < 1024 * 1024 * 1024)
		return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
	return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function FileIconComp({
	mimeType,
	style,
}: {
	mimeType: string;
	style?: React.CSSProperties;
}) {
	if (mimeType.startsWith("video/")) return <Film style={style} />;
	if (mimeType.startsWith("audio/")) return <Music style={style} />;
	if (
		mimeType.startsWith("text/") ||
		mimeType === "application/json" ||
		mimeType === "application/xml"
	)
		return <FileText style={style} />;
	if (
		mimeType.includes("zip") ||
		mimeType.includes("compressed") ||
		mimeType.includes("archive") ||
		mimeType.includes("tar") ||
		mimeType.includes("rar") ||
		mimeType.includes("7z")
	)
		return <FileArchive style={style} />;
	if (mimeType === "application/pdf") return <FileText style={style} />;
	return <FileIcon style={style} />;
}

function readFileAsBase64(file: globalThis.File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => {
			const dataUrl = reader.result as string;
			if (!dataUrl?.includes(",")) {
				reject(new Error(`Invalid data URL for ${file.name}`));
				return;
			}
			const base64 = dataUrl.split(",")[1];
			if (!base64) {
				reject(new Error(`Empty base64 for ${file.name}`));
				return;
			}
			resolve(base64);
		};
		reader.onerror = () => reject(new Error(`Failed to read: ${file.name}`));
		reader.readAsDataURL(file);
	});
}

function ImageLightbox({
	src,
	fileName,
	onClose,
}: {
	src: string;
	fileName: string;
	onClose: () => void;
}) {
	useEffect(() => {
		const handleKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", handleKey as any);
		return () => window.removeEventListener("keydown", handleKey as any);
	}, [onClose]);

	return createPortal(
		// biome-ignore lint/a11y/noStaticElementInteractions: lightbox backdrop
		// biome-ignore lint/a11y/useKeyWithClickEvents: Escape key handles keyboard close
		<div
			style={{
				position: "fixed",
				inset: 0,
				zIndex: 1000,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				background: "rgba(0,0,0,0.78)",
				backdropFilter: "blur(4px)",
			}}
			onClick={onClose}
		>
			{/* biome-ignore lint/a11y/noStaticElementInteractions: stop propagation */}
			{/* biome-ignore lint/a11y/useKeyWithClickEvents: stop propagation */}
			<div
				style={{ position: "relative", maxWidth: "90vw", maxHeight: "88vh" }}
				onClick={(e) => e.stopPropagation()}
			>
				<img
					src={src}
					alt={fileName}
					style={{
						display: "block",
						maxWidth: "100%",
						maxHeight: "88vh",
						objectFit: "contain",
						borderRadius: 8,
						boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
					}}
				/>
				<button
					type="button"
					onClick={onClose}
					style={{
						position: "absolute",
						top: -16,
						right: -16,
						width: 32,
						height: 32,
						borderRadius: "50%",
						background: "rgba(0,0,0,0.6)",
						border: "1px solid rgba(255,255,255,0.2)",
						color: "white",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						cursor: "pointer",
					}}
					title="Close preview"
				>
					<X style={{ width: 16, height: 16 }} />
				</button>
			</div>
		</div>,
		document.body,
	);
}

function AttachmentPreview({
	attachment,
	onRemove,
	onPreview,
}: {
	attachment: FileAttachment;
	onRemove: () => void;
	onPreview: (src: string, fileName: string) => void;
}) {
	const isImage =
		attachment.mimeType.startsWith("image/") && attachment.preview;
	return (
		<div
			style={{
				position: "relative",
				borderRadius: 12,
				border: `1px solid var(--color-border, #e5e7eb)`,
				background: "var(--color-fill-quaternary, rgba(0,0,0,0.02))",
				transition: "all 0.2s ease",
			}}
		>
			<div style={{ borderRadius: 11, overflow: "hidden", width: "100%", height: "100%" }}>
				{isImage ? (
					<button
						type="button"
						onClick={() => onPreview(attachment.preview!, attachment.fileName)}
						style={{
							width: 52,
							height: 52,
							padding: 0,
							border: "none",
							background: "transparent",
							cursor: "zoom-in",
							display: "block",
						}}
						title={attachment.fileName}
					>
						<img
							src={attachment.preview!}
							alt={attachment.fileName}
							style={{ width: "100%", height: "100%", objectFit: "cover" }}
						/>
					</button>
				) : (
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: 7,
							padding: "6px 10px",
							background: "rgba(0,0,0,0.04)",
							maxWidth: 180,
						}}
					>
						<FileIconComp
							mimeType={attachment.mimeType}
							style={{ width: 16, height: 16, flexShrink: 0, opacity: 0.6 }}
						/>
						<div style={{ minWidth: 0, overflow: "hidden" }}>
							<p
								style={{
									fontSize: 11,
									fontWeight: 500,
									margin: 0,
									overflow: "hidden",
									textOverflow: "ellipsis",
									whiteSpace: "nowrap",
									color: "var(--color-text, #111)",
								}}
							>
								{attachment.fileName}
							</p>
							<p style={{ fontSize: 10, margin: 0, opacity: 0.6, color: "var(--color-text, #111)" }}>
								{attachment.fileSize > 0
									? formatFileSize(attachment.fileSize)
									: "..."}
							</p>
						</div>
					</div>
				)}
				{attachment.status === "staging" && (
					<div
						style={{
							position: "absolute",
							inset: 0,
							background: "rgba(0,0,0,0.4)",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
						}}
					>
						<Loader2
							style={{
								width: 13,
								height: 13,
								color: "white",
								animation: "spin 1s linear infinite",
							}}
						/>
					</div>
				)}
				{attachment.status === "error" && (
					<div
						style={{
							position: "absolute",
							inset: 0,
							background: "rgba(239,68,68,0.2)",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
						}}
					>
						<span style={{ fontSize: 10, color: "#ef4444", fontWeight: 500 }}>
							Error
						</span>
					</div>
				)}
			</div>
			<button
				type="button"
				onClick={onRemove}
				style={{
					position: "absolute",
					top: -6,
					right: -6,
					background: "var(--color-error, #ef4444)",
					color: "white",
					borderRadius: "50%",
					width: 18,
					height: 18,
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					border: `2px solid var(--color-bg-container, #fff)`,
					cursor: "pointer",
					boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
					transition: "transform 0.2s ease, background 0.2s ease",
				}}
				onMouseEnter={(e) => {
					e.currentTarget.style.transform = "scale(1.1)";
				}}
				onMouseLeave={(e) => {
					e.currentTarget.style.transform = "scale(1)";
				}}
			>
				<X style={{ width: 10, height: 10 }} />
			</button>
		</div>
	);
}
