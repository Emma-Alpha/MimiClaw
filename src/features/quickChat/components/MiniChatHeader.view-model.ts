import type { CodeAgentStatus } from "../../../../shared/code-agent";
import type {
	SessionInitInfo,
	CodeAgentContextWindowUsage,
} from "@/stores/code-agent";
import type { MiniChatTarget } from "../types";

const MAX_SESSION_TITLE_LENGTH = 28;

export type HeaderStatusKind = "error" | "connecting" | "generating" | "ready";

export type HeaderStatusModel = {
	kind: HeaderStatusKind;
	label: string;
	brandLabel: string;
};

export type HeaderContextIndicator = {
	contextWindowSize: number;
	usedTokens: number;
	remainingTokens: number;
	usedPercentage: number;
	remainingPercentage: number;
	ringColor: string;
	windowSource: "reported" | "estimated";
};

export type MiniChatHeaderViewModel = {
	isCodeMode: boolean;
	headerTitle: string;
	islandLabel: string;
	islandModelLabel: string | null;
	status: HeaderStatusModel;
	contextIndicator: HeaderContextIndicator | null;
};

export type BuildMiniChatHeaderViewModelInput = {
	draftTarget: MiniChatTarget;
	codeSending: boolean;
	isGenerating: boolean;
	isReady: boolean;
	isError: boolean;
	isConnecting: boolean;
	codeAgentStatus: CodeAgentStatus | null;
	sessionInit: SessionInitInfo | null;
	sessionTitle: string | null;
	currentSessionKey: string;
	activeSessionTitle: string | null;
	contextUsage: CodeAgentContextWindowUsage | null;
};

function shortModel(model: string): string {
	return model.replace(/^claude-/i, "").replace(/-\d{8}$/, "");
}

function isOpaqueSessionId(value: string): boolean {
	const normalized = value.trim();
	if (!normalized) return true;
	if (/^agent:[^:]+:session-\d+(?::.*)?$/i.test(normalized)) return true;
	if (/^session[-:_][a-z0-9-]{6,}$/i.test(normalized)) return true;
	if (/^[0-9a-f]{24,}$/i.test(normalized)) return true;
	if (
		/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
			normalized,
		)
	)
		return true;
	return false;
}

function isAbsolutePathLike(value: string): boolean {
	const normalized = value.trim();
	if (!normalized) return false;
	if (/^(\/|~\/)/.test(normalized)) return true;
	if (/^[A-Za-z]:[\\/]/.test(normalized)) return true;
	if (/^\\\\/.test(normalized)) return true;
	return false;
}

function normalizeDisplayTitle(value: string | null | undefined): string | null {
	const normalized = typeof value === "string" ? value.trim() : "";
	if (!normalized) return null;
	if (isOpaqueSessionId(normalized) || isAbsolutePathLike(normalized)) return null;
	if (normalized.length <= MAX_SESSION_TITLE_LENGTH) return normalized;
	return `${normalized.slice(0, MAX_SESSION_TITLE_LENGTH)}…`;
}

function resolveHeaderTitle(input: {
	activeSessionTitle: string | null;
	sessionTitle: string | null;
	currentSessionKey: string;
	defaultTitle: string;
}): string {
	const active = normalizeDisplayTitle(input.activeSessionTitle);
	if (active) return active;
	const explicit = normalizeDisplayTitle(input.sessionTitle);
	if (explicit) return explicit;
	const fromKey = normalizeDisplayTitle(input.currentSessionKey);
	if (fromKey) return fromKey;
	return input.defaultTitle;
}

function resolveStatus(input: {
	isCodeMode: boolean;
	isError: boolean;
	isConnecting: boolean;
	isGenerating: boolean;
	codeSending: boolean;
	isReady: boolean;
	codeAgentStatus: CodeAgentStatus | null;
}): HeaderStatusModel {
	const codeAgentState = input.codeAgentStatus?.state;
	const hasRuntimeError = input.isCodeMode && codeAgentState === "error";
	const hasRuntimePending =
		input.isCodeMode &&
		(codeAgentState === "starting" || codeAgentState === "stopped");

	if (input.isError || hasRuntimeError) {
		const label = input.isError ? "连接断开" : "运行异常";
		return { kind: "error", label, brandLabel: label };
	}

	if (input.isConnecting || !input.isReady || hasRuntimePending) {
		return { kind: "connecting", label: "连接中…", brandLabel: "连接中…" };
	}

	if (input.isGenerating || input.codeSending) {
		return { kind: "generating", label: "生成中…", brandLabel: "生成中…" };
	}

	return {
		kind: "ready",
		label: "就绪",
		brandLabel: input.isCodeMode ? "就绪" : "快捷聊天",
	};
}

function resolveContextIndicator(
	isCodeMode: boolean,
	contextUsage: CodeAgentContextWindowUsage | null,
): HeaderContextIndicator | null {
	if (!isCodeMode || !contextUsage) return null;
	if (!Number.isFinite(contextUsage.contextWindowSize) || contextUsage.contextWindowSize <= 0) {
		return null;
	}
	const contextWindowSize = Math.max(1, Math.round(contextUsage.contextWindowSize));
	const usedTokens = Math.max(
		0,
		Math.min(contextWindowSize, Math.round(contextUsage.usedTokens)),
	);
	const remainingTokens = Math.max(0, contextWindowSize - usedTokens);
	const usedPercentage = Math.max(
		0,
		Math.min(100, Math.round(contextUsage.usedPercentage)),
	);
	const remainingPercentage = Math.max(
		0,
		Math.min(100, Math.round(contextUsage.remainingPercentage)),
	);
	const ringColor =
		usedPercentage >= 90
			? "#ef4444"
			: usedPercentage >= 75
				? "#f59e0b"
				: "#3b82f6";

	return {
		contextWindowSize,
		usedTokens,
		remainingTokens,
		usedPercentage,
		remainingPercentage,
		ringColor,
		windowSource: contextUsage.windowSource,
	};
}

export function buildMiniChatHeaderViewModel(
	input: BuildMiniChatHeaderViewModelInput,
): MiniChatHeaderViewModel {
	const isCodeMode = input.draftTarget === "code";
	const defaultTitle = isCodeMode ? "CLI 会话" : "当前会话";
	const headerTitle = resolveHeaderTitle({
		activeSessionTitle: input.activeSessionTitle,
		sessionTitle: input.sessionTitle,
		currentSessionKey: input.currentSessionKey,
		defaultTitle,
	});

	const status = resolveStatus({
		isCodeMode,
		isError: input.isError,
		isConnecting: input.isConnecting,
		isGenerating: input.isGenerating,
		codeSending: input.codeSending,
		isReady: input.isReady,
		codeAgentStatus: input.codeAgentStatus,
	});

	return {
		isCodeMode,
		headerTitle,
		islandLabel: headerTitle,
		islandModelLabel:
			isCodeMode && input.sessionInit?.model
				? shortModel(input.sessionInit.model)
				: null,
		status,
		contextIndicator: resolveContextIndicator(isCodeMode, input.contextUsage),
	};
}
