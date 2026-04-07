import type { ContentBlock, RawMessage } from "@/stores/chat";
import type { PetMiniChatSeed } from "../../../shared/pet";
import type { CodeAgentStatus } from "../../../shared/code-agent";
import type {
	MentionDraft,
	MentionOption,
	SubmissionIntent,
} from "./types";

const CODE_MODE_PREFIXES = ["@code", "@cli", "@cli编程", "@CLI编程"];
const CHAT_MODE_PREFIXES = ["@chat"];

export const MENTION_OPTIONS: MentionOption[] = [
	{
		id: "code",
		label: "CLI 编程",
		insertText: "@CLI编程 ",
		description: "把这一条消息直接发给代码助手",
		keywords: ["code", "cli", "coding", "cli编程"],
	},
];

export function normalizeMiniChatSeed(
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
		target:
			value.target === "code"
				? "code"
				: value.target === "chat"
					? "chat"
					: undefined,
		persistTarget: value.persistTarget === true,
	};
}

export function extractText(content: unknown): string {
	if (typeof content === "string") return content.trim();
	if (Array.isArray(content)) {
		const parts: string[] = [];
		for (const block of content as ContentBlock[]) {
			if (!block || typeof block !== "object") continue;
			if (block.type === "text" && typeof block.text === "string") {
				const text = block.text.trim();
				if (text) parts.push(text);
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

export function isVisibleMessage(message: RawMessage): boolean {
	if (message.role === "system" || message.role === "toolresult") return false;
	return extractText(message.content).length > 0;
}

export function parseSubmissionIntent(rawText: string): SubmissionIntent {
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

export function normalizeTimestampMs(value: number | undefined): number | null {
	if (typeof value !== "number" || !Number.isFinite(value)) return null;
	return value < 1e12 ? value * 1000 : value;
}

export function getMentionDraft(
	text: string,
	caretIndex: number,
): MentionDraft | null {
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

export function removeTrailingMention(
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

export function formatWorkspaceLabel(path: string): string {
	if (!path) return "未选择工作目录";
	const normalized = path.replace(/\\/g, "/");
	const parts = normalized.split("/").filter(Boolean);
	if (normalized.startsWith("/") && parts.length <= 3) return normalized;
	if (/^[A-Za-z]:\//.test(normalized) && parts.length <= 3) return normalized;
	return parts.length > 3 ? `.../${parts.slice(-3).join("/")}` : normalized;
}

export function getCodeAgentStateLabel(
	state?: CodeAgentStatus["state"],
): string {
	if (state === "running") return "CLI 就绪";
	if (state === "starting") return "CLI 启动中";
	if (state === "error") return "CLI 异常";
	return "CLI 待唤起";
}

export function getCodeStatusLabel(status?: string): string | null {
	if (!status) return null;
	if (status === "completed") return "已完成";
	if (status === "analysis_only") return "仅分析";
	if (status === "cancelled") return "已取消";
	if (status === "not_implemented") return "未执行";
	if (status === "failed") return "执行失败";
	return status;
}
