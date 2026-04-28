/**
 * Zustand store for Claude Code CLI agent state.
 *
 * Receives raw SDK messages from `code-agent:sdk-message` IPC events and
 * transforms them into structured UI state consumed by MiniChat components.
 */
import { create } from "zustand";
import type { Descendant } from "slate";
import { buildUnifiedPatch } from "@/lib/diff-utils";
import { saveCodeAgentSessionPerf, saveMessage, updateMessagePerformance, type DBMessage } from "@/lib/db";
import { normalizeUsageRecord } from "@/lib/usageAdapter";
import type { CodeAgentUsageProtocol } from "../../../shared/code-agent";

/** Lazily read the usage protocol from settings to avoid circular imports */
function getUsageProtocol(): CodeAgentUsageProtocol {
	try {
		// Dynamic import avoidance: settings store is a simple Zustand store,
		// safe to import at module level but kept lazy for loose coupling.
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const { useSettingsStore } = require("@/stores/settings/store") as {
			useSettingsStore: { getState: () => { codeAgent?: { usageProtocol?: CodeAgentUsageProtocol } } };
		};
		return useSettingsStore.getState().codeAgent?.usageProtocol ?? "auto";
	} catch {
		return "auto";
	}
}

// ─── SDK message shape helpers ───────────────────────────────────────────────
// We do not import the full Zod schemas here to keep the renderer bundle lean.
// Instead, we type-narrow on `type` + `subtype` discriminants at runtime.

export type SdkMessageType =
	| "assistant"
	| "user"
	| "stream_event"
	| "result"
	| "system"
	| "tool_progress"
	| "tool_use_summary"
	| "rate_limit_event"
	| "auth_status"
	| "prompt_suggestion";

export type RawSdkMessage = Record<string, unknown> & { type: SdkMessageType };

// ─── Timeline item types ─────────────────────────────────────────────────────

export type SpinnerMode =
	| "requesting"
	| "thinking"
	| "tool-input"
	| "tool-use"
	| "responding"
	| null;

export type VendorStatusSource = "vendor" | "fallback" | null;

const SPINNER_VERBS = [
	"Accomplishing",
	"Actioning",
	"Actualizing",
	"Architecting",
	"Baking",
	"Beaming",
	"Beboppin'",
	"Befuddling",
	"Billowing",
	"Blanching",
	"Bloviating",
	"Boogieing",
	"Boondoggling",
	"Booping",
	"Bootstrapping",
	"Brewing",
	"Bunning",
	"Burrowing",
	"Calculating",
	"Canoodling",
	"Caramelizing",
	"Cascading",
	"Catapulting",
	"Cerebrating",
	"Channeling",
	"Channelling",
	"Choreographing",
	"Churning",
	"Clauding",
	"Coalescing",
	"Cogitating",
	"Combobulating",
	"Composing",
	"Computing",
	"Concocting",
	"Considering",
	"Contemplating",
	"Cooking",
	"Crafting",
	"Creating",
	"Crunching",
	"Crystallizing",
	"Cultivating",
	"Deciphering",
	"Deliberating",
	"Determining",
	"Dilly-dallying",
	"Discombobulating",
	"Doing",
	"Doodling",
	"Drizzling",
	"Ebbing",
	"Effecting",
	"Elucidating",
	"Embellishing",
	"Enchanting",
	"Envisioning",
	"Evaporating",
	"Fermenting",
	"Fiddle-faddling",
	"Finagling",
	"Flambéing",
	"Flibbertigibbeting",
	"Flowing",
	"Flummoxing",
	"Fluttering",
	"Forging",
	"Forming",
	"Frolicking",
	"Frosting",
	"Gallivanting",
	"Galloping",
	"Garnishing",
	"Generating",
	"Gesticulating",
	"Germinating",
	"Gitifying",
	"Grooving",
	"Gusting",
	"Harmonizing",
	"Hashing",
	"Hatching",
	"Herding",
	"Honking",
	"Hullaballooing",
	"Hyperspacing",
	"Ideating",
	"Imagining",
	"Improvising",
	"Incubating",
	"Inferring",
	"Infusing",
	"Ionizing",
	"Jitterbugging",
	"Julienning",
	"Kneading",
	"Leavening",
	"Levitating",
	"Lollygagging",
	"Manifesting",
	"Marinating",
	"Meandering",
	"Metamorphosing",
	"Misting",
	"Moonwalking",
	"Moseying",
	"Mulling",
	"Mustering",
	"Musing",
	"Nebulizing",
	"Nesting",
	"Newspapering",
	"Noodling",
	"Nucleating",
	"Orbiting",
	"Orchestrating",
	"Osmosing",
	"Perambulating",
	"Percolating",
	"Perusing",
	"Philosophising",
	"Photosynthesizing",
	"Pollinating",
	"Pondering",
	"Pontificating",
	"Pouncing",
	"Precipitating",
	"Prestidigitating",
	"Processing",
	"Proofing",
	"Propagating",
	"Puttering",
	"Puzzling",
	"Quantumizing",
	"Razzle-dazzling",
	"Razzmatazzing",
	"Recombobulating",
	"Reticulating",
	"Roosting",
	"Ruminating",
	"Sautéing",
	"Scampering",
	"Schlepping",
	"Scurrying",
	"Seasoning",
	"Shenaniganing",
	"Shimmying",
	"Simmering",
	"Skedaddling",
	"Sketching",
	"Slithering",
	"Smooshing",
	"Sock-hopping",
	"Spelunking",
	"Spinning",
	"Sprouting",
	"Stewing",
	"Sublimating",
	"Swirling",
	"Swooping",
	"Symbioting",
	"Synthesizing",
	"Tempering",
	"Thinking",
	"Thundering",
	"Tinkering",
	"Tomfoolering",
	"Topsy-turvying",
	"Transfiguring",
	"Transmuting",
	"Twisting",
	"Undulating",
	"Unfurling",
	"Unravelling",
	"Vibing",
	"Waddling",
	"Wandering",
	"Warping",
	"Whatchamacalliting",
	"Whirlpooling",
	"Whirring",
	"Whisking",
	"Wibbling",
	"Working",
	"Wrangling",
	"Zesting",
	"Zigzagging",
] as const;

export type ToolStatus =
	| "streaming-input"
	| "executing"
	| "awaiting-permission"
	| "completed"
	| "failed";

export type StreamingToolUse = {
	toolUseId: string;
	toolName: string;
	inputSummary: string;
	rawInput: Record<string, unknown>;
	status: ToolStatus;
	resultSummary?: string;
	/** Elapsed seconds from tool_progress heartbeats */
	elapsedSeconds?: number;
};

export type ThinkingBlockData = {
	text: string;
	isStreaming: boolean;
	isRedacted: boolean;
};

export type DiffFile = {
	filePath: string;
	additions: number;
	deletions: number;
	/** Unified diff patch string generated by the `diff` package */
	patch: string;
};

export type CodeAgentUserImagePreview = {
	preview: string | null;
	fileName: string;
};

export type CodeAgentUserPathTag = {
	absolutePath: string;
	name: string;
	isDirectory: boolean;
};

export type CodeAgentUserMessageMeta = {
	imagePreviews?: CodeAgentUserImagePreview[];
	pathTags?: CodeAgentUserPathTag[];
	richContent?: Descendant[];
};

/** Items that form the visual timeline in CodeTimeline */
export type CodeAgentTimelineItem =
	| { kind: "init"; id: string; model: string; permissionMode: string; toolCount: number; mcpCount: number; cwd: string }
	| { kind: "thinking"; id: string; data: ThinkingBlockData }
	| { kind: "assistant-text"; id: string; text: string; isStreaming: boolean; createdAt?: number }
	| { kind: "assistant-usage"; id: string; usage: { inputTokens: number; outputTokens: number; cacheReadTokens: number; cacheWriteTokens: number; totalTokens: number }; model?: string; costUsd?: number; durationMs?: number; ttftMs?: number; tps?: number }
	| { kind: "tool-use"; id: string; tool: StreamingToolUse }
	| { kind: "diff"; id: string; files: DiffFile[] }
	| {
		kind: "user";
		id: string;
		text: string;
		createdAt?: number;
		imagePreviews?: CodeAgentUserImagePreview[];
		pathTags?: CodeAgentUserPathTag[];
		richContent?: Descendant[];
	}
	| { kind: "system-notice"; id: string; text: string; variant?: "info" | "warning" | "error" }
	| { kind: "compact-boundary"; id: string; preTokens: number; trigger: string }
	| { kind: "rate-limit"; id: string; resetsAt: number | null; utilization: number | null; status: string }
	| { kind: "api-retry"; id: string; attempt: number; maxRetries: number; delayMs: number; error: string }
	| { kind: "hook"; id: string; hookName: string; hookEvent: string; outcome: "started" | "progress" | "success" | "error"; stdout?: string; exitCode?: number | null }
	| { kind: "task-start"; id: string; taskId: string; description: string }
	| { kind: "task-end"; id: string; taskId: string; status: "completed" | "failed" | "stopped"; summary: string }
	| { kind: "result"; id: string; isError: boolean; numTurns: number; totalCostUsd: number; durationMs: number }
	| { kind: "permission-request"; id: string; requestId: string; toolName: string; rawInput: Record<string, unknown>; title?: string; description?: string }
	| { kind: "elicitation"; id: string; elicitationId: string; mcpServerName: string; message: string; requestedSchema: Record<string, unknown> | null };

// ─── Session init info ────────────────────────────────────────────────────────
export type SessionInitInfo = {
	model: string;
	permissionMode: string;
	tools: string[];
	mcpServers: Array<{ name: string; status: string }>;
	cwd: string;
	claudeCodeVersion: string;
};

// ─── Elicitation request ─────────────────────────────────────────────────────
export type PendingElicitation = {
	elicitationId: string;
	mcpServerName: string;
	message: string;
	requestedSchema: Record<string, unknown> | null;
	mode?: string;
};

// ─── Permission request ───────────────────────────────────────────────────────
export type PendingPermission = {
	requestId: string;
	toolName: string;
	rawInput: Record<string, unknown>;
	inputSummary: string;
	title?: string;
	description?: string;
};

// ─── Active subagent task ─────────────────────────────────────────────────────
export type ActiveTask = {
	taskId: string;
	description: string;
	toolUseId?: string;
};

// ─── Rate-limit state ─────────────────────────────────────────────────────────
export type RateLimitInfo = {
	status: string;
	resetsAt?: number;
	utilization?: number;
};

export type CodeAgentContextWindowUsage = {
	/** Model context window size (tokens). */
	contextWindowSize: number;
	/** Whether window size came from SDK payload or local fallback inference. */
	windowSource: "reported" | "estimated";
	model: string | null;
	inputTokens: number;
	outputTokens: number;
	cacheReadInputTokens: number;
	cacheCreationInputTokens: number;
	/** Current prompt footprint used to estimate context pressure. */
	usedTokens: number;
	remainingTokens: number;
	usedPercentage: number;
	remainingPercentage: number;
	updatedAt: number;
	/** Internal: dedupe key for usage accumulation from sdk messages. */
	sourceMessageId?: string | null;
};

// ─── Store interface ──────────────────────────────────────────────────────────
export interface CodeAgentStore {
	// Session metadata
	sessionId: string | null;
	sessionInit: SessionInitInfo | null;
	sessionState: "idle" | "running" | "requires_action";
	/** Title derived from the first user message in this session (first 20 chars) */
	sessionTitle: string | null;
	/** Timestamp (ms) of when the last result message was received */
	lastUpdatedAt: number | null;

	// Full message timeline
	items: CodeAgentTimelineItem[];

	// Current turn streaming state
	streaming: {
		thinkingText: string;
		isThinking: boolean;
		assistantText: string;
		isStreaming: boolean;
		spinnerMode: SpinnerMode;
		vendorStatusText: string;
		vendorStatusSource: VendorStatusSource;
		/** Active tool uses keyed by tool_use_id */
		toolUses: Map<string, StreamingToolUse>;
		/** Accumulated usage from message_start + message_delta stream events */
		accumulatedUsage: { inputTokens: number; outputTokens: number; cacheReadTokens: number; cacheWriteTokens: number } | null;
		/** Timestamp (ms) when message_start arrived */
		turnStartedAt: number;
		/** Timestamp (ms) when first content_block_delta text arrived */
		firstTokenAt: number;
	};

	// Pending user interactions
	pendingPermission: PendingPermission | null;
	pendingElicitation: PendingElicitation | null;

	// Subagent tasks currently running
	activeTasks: Map<string, ActiveTask>;

	// Rate limit state
	rateLimitInfo: RateLimitInfo | null;
	contextUsage: CodeAgentContextWindowUsage | null;

	// Performance timing for current turn (top-level to avoid streaming spread issues)
	perfTurnStartedAt: number;
	perfFirstTokenAt: number;

	// Session-level auto-approved tool types (cleared on reset)
	sessionAllowedTools: Set<string>;

	// Actions
	pushSdkMessage: (raw: unknown) => void;
	pushUserMessage: (text: string, meta?: CodeAgentUserMessageMeta) => void;
	setContextUsage: (usage: CodeAgentContextWindowUsage | null) => void;
	/** Append incremental text from `code-agent:token` IPC events for live streaming */
	appendStreamingText: (text: string) => void;
	setPendingPermission: (p: PendingPermission | null) => void;
	resolvePermission: (requestId: string, _decision: "allow" | "allow-session" | "deny") => void;
	resolveElicitation: (action: "accept" | "decline", content?: Record<string, unknown>) => void;
	addSessionAllowedTool: (toolName: string) => void;
	/** Full reset — clears items + streaming + session state */
	reset: () => void;
	/** Light reset — clears only streaming state, keeps items for persistent timeline */
	resetStreaming: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid() {
	return crypto.randomUUID();
}

function extractTextContent(value: unknown): string {
	if (!value) return "";
	if (typeof value === "string") return value;
	if (Array.isArray(value)) {
		return value
			.map((item) => {
				if (typeof item === "string") return item;
				if (item && typeof (item as Record<string, unknown>).text === "string")
					return (item as Record<string, unknown>).text as string;
				return "";
			})
			.filter(Boolean)
			.join("\n");
	}
	if (typeof value === "object") {
		const obj = value as Record<string, unknown>;
		if (typeof obj.text === "string") return obj.text;
	}
	return "";
}

/** Build a short display summary for a tool's input parameters */
export function buildInputSummary(toolName: string, input: Record<string, unknown>): string {
	if (!input) return "";
	const name = toolName.toLowerCase();
	const truncate = (s: string, max = 80) =>
		s.length > max ? `${s.slice(0, max)}…` : s;

	const str = (v: unknown) => (typeof v === "string" ? v : "");

	if (["read", "write", "edit", "multiedit", "notebookedit"].includes(name)) {
		return truncate(str(input.file_path) || str(input.path));
	}
	if (name === "bash") return truncate(str(input.command), 72);
	if (name === "grep") {
		const pat = str(input.pattern);
		const path = str(input.path);
		return pat ? truncate(path ? `"${pat}" in ${path}` : `"${pat}"`) : "";
	}
	if (name === "glob") {
		const glob = str(input.pattern) || str(input.glob_pattern);
		const dir = str(input.path) || str(input.target_directory);
		return truncate(dir ? `${glob} in ${dir}` : glob);
	}
	if (name === "webfetch") return truncate(str(input.url));
	if (name === "agent" || name === "task") return truncate(str(input.description) || str(input.prompt), 60);
	const first = Object.values(input).find((v) => typeof v === "string" && (v as string).length > 0);
	return first ? truncate(first as string) : "";
}

/** Extract and add a diff item for file-edit/write tool uses */
function buildDiffForToolUse(
	tu: StreamingToolUse,
	addItem: (item: CodeAgentTimelineItem) => void,
) {
	const name = tu.toolName.toLowerCase();
	const isFileEdit = ["edit", "fileedit", "strreplacebasededitattempt", "multiedit", "write", "filewrite"].includes(name);
	if (!isFileEdit || !tu.rawInput) return;
	const filePath = String(tu.rawInput.file_path || tu.rawInput.path || "");
	const oldContent = String(tu.rawInput.old_content || tu.rawInput.old_string || "");
	const newContent = String(tu.rawInput.new_content || tu.rawInput.new_string || tu.rawInput.content || "");
	if (!filePath || !(oldContent || newContent)) return;
	const { patch, additions, deletions } = buildUnifiedPatch(filePath, oldContent, newContent);
	if (additions + deletions > 0) {
		addItem({ kind: "diff", id: uid(), files: [{ filePath, additions, deletions, patch }] });
	}
}

// ─── Initial state factory ────────────────────────────────────────────────────
function sampleSpinnerVerb(): string {
	return SPINNER_VERBS[Math.floor(Math.random() * SPINNER_VERBS.length)] || "Thinking";
}

function buildFallbackVendorStatus(
	spinnerMode: SpinnerMode,
	currentVendorStatusText = "",
): string {
	switch (spinnerMode) {
		case "requesting":
		case "thinking": {
			const normalized = currentVendorStatusText.trim();
			if (normalized.startsWith("✶ ") && normalized.endsWith("…")) {
				return normalized.slice(2, -1).trim();
			}
			if (normalized) {
				return normalized.replace(/[.…]+$/u, "").trim();
			}
			return sampleSpinnerVerb();
		}
		case "tool-input":
			return "Preparing tool input";
		case "tool-use":
			return "Using tools";
		case "responding":
			return "Responding";
		default:
			return "";
	}
}

function formatVendorStatusLabel(statusText: string): string {
	const normalized = statusText.trim().replace(/[.…]+$/u, "");
	if (!normalized) return "";
	return `✶ ${normalized}…`;
}

function extractVendorStatus(msg: Record<string, unknown>): string {
	const direct = typeof msg.vendorStatusText === "string" ? msg.vendorStatusText : "";
	if (direct.trim()) return direct.trim();

	const nested = msg.meta;
	if (nested && typeof nested === "object") {
		const metaStatus = (nested as Record<string, unknown>).vendorStatusText;
		if (typeof metaStatus === "string" && metaStatus.trim()) {
			return metaStatus.trim();
		}
	}

	return "";
}

const DEFAULT_CONTEXT_WINDOW_TOKENS = 200_000;

function asRecord(value: unknown): Record<string, unknown> | null {
	return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function toFiniteNumber(value: unknown): number | null {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value === "string") {
		const parsed = Number(value);
		if (Number.isFinite(parsed)) return parsed;
	}
	return null;
}

function pickNumber(record: Record<string, unknown> | null, keys: string[]): number | null {
	if (!record) return null;
	for (const key of keys) {
		const num = toFiniteNumber(record[key]);
		if (num != null) return num;
	}
	return null;
}

function normalizeModelIdentifier(value: string | null | undefined): string {
	return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function pickModelUsageRecord(
	modelUsage: Record<string, unknown> | null,
	preferredModel: string | null,
): {
	model: string | null;
	usage: Record<string, unknown> | null;
} {
	if (!modelUsage) {
		return { model: null, usage: null };
	}

	const preferred = normalizeModelIdentifier(preferredModel);
	let fallbackModel: string | null = null;
	let fallbackUsage: Record<string, unknown> | null = null;

	for (const [modelName, value] of Object.entries(modelUsage)) {
		const usage = asRecord(value);
		if (!usage) continue;

		if (!fallbackUsage) {
			fallbackModel = modelName;
			fallbackUsage = usage;
		}

		if (preferred && normalizeModelIdentifier(modelName) === preferred) {
			return { model: modelName, usage };
		}
	}

	return { model: fallbackModel, usage: fallbackUsage };
}

function extractLastIterationUsage(record: Record<string, unknown> | null): {
	inputTokens: number;
	outputTokens: number;
} | null {
	if (!record || !Array.isArray(record.iterations) || record.iterations.length === 0) {
		return null;
	}
	for (let index = record.iterations.length - 1; index >= 0; index -= 1) {
		const iteration = asRecord(record.iterations[index]);
		if (!iteration) continue;
		const inputTokens = pickNumber(iteration, ["input_tokens", "inputTokens", "input"]);
		const outputTokens = pickNumber(iteration, ["output_tokens", "outputTokens", "output"]);
		if (inputTokens == null && outputTokens == null) continue;
		return {
			inputTokens: Math.max(0, Math.round(inputTokens ?? 0)),
			outputTokens: Math.max(0, Math.round(outputTokens ?? 0)),
		};
	}
	return null;
}

function extractUsageShape(
	record: Record<string, unknown> | null,
	protocol?: CodeAgentUsageProtocol,
	model?: string | null,
): {
	inputTokens: number;
	outputTokens: number;
	cacheReadInputTokens: number;
	cacheCreationInputTokens: number;
} | null {
	if (!record) return null;
	// Normalize provider-specific nested fields (e.g. OpenAI's prompt_tokens_details)
	record = normalizeUsageRecord(record, protocol, model);
	const inputTokens = pickNumber(record, ["input_tokens", "inputTokens", "input"]);
	const outputTokens = pickNumber(record, ["output_tokens", "outputTokens", "output"]);
	const iterationUsage = extractLastIterationUsage(record);
	const resolvedInputTokens =
		(inputTokens != null && inputTokens > 0)
			? inputTokens
			: iterationUsage?.inputTokens ?? inputTokens;
	const resolvedOutputTokens =
		(outputTokens != null && outputTokens > 0)
			? outputTokens
			: iterationUsage?.outputTokens ?? outputTokens;
	const cacheReadInputTokens =
		pickNumber(record, ["cache_read_input_tokens", "cacheReadInputTokens", "cacheRead"]) ?? 0;
	const cacheCreationInputTokens =
		pickNumber(record, ["cache_creation_input_tokens", "cacheCreationInputTokens", "cacheWrite"]) ?? 0;

	if (resolvedInputTokens == null && resolvedOutputTokens == null) return null;
	return {
		inputTokens: Math.max(0, Math.round(resolvedInputTokens ?? 0)),
		outputTokens: Math.max(0, Math.round(resolvedOutputTokens ?? 0)),
		cacheReadInputTokens: Math.max(0, Math.round(cacheReadInputTokens)),
		cacheCreationInputTokens: Math.max(0, Math.round(cacheCreationInputTokens)),
	};
}

function inferContextWindowFromModel(model: string | null): number {
	if (model && /\[1m\]/i.test(model)) return 1_000_000;
	return DEFAULT_CONTEXT_WINDOW_TOKENS;
}

function clampPercent(value: number): number {
	if (!Number.isFinite(value)) return 0;
	return Math.max(0, Math.min(100, value));
}

function safeJsonStringify(value: unknown): string {
	try {
		return JSON.stringify(value);
	} catch {
		return "";
	}
}

function roughTokenCountEstimation(content: string, bytesPerToken = 4): number {
	if (!content) return 0;
	return Math.max(0, Math.round(content.length / bytesPerToken));
}

function roughTokenCountForContent(content: unknown): number {
	if (!content) return 0;
	if (typeof content === "string") return roughTokenCountEstimation(content);
	if (Array.isArray(content)) {
		return content.reduce((sum, block) => sum + roughTokenCountForBlock(block), 0);
	}
	const record = asRecord(content);
	if (!record) return 0;
	if (typeof record.text === "string") {
		return roughTokenCountEstimation(record.text);
	}
	if (typeof record.thinking === "string") {
		return roughTokenCountEstimation(record.thinking);
	}
	if (typeof record.data === "string") {
		return roughTokenCountEstimation(record.data);
	}
	if ("content" in record) {
		return roughTokenCountForContent(record.content);
	}
	return roughTokenCountEstimation(safeJsonStringify(record));
}

function roughTokenCountForBlock(block: unknown): number {
	if (typeof block === "string") {
		return roughTokenCountEstimation(block);
	}
	const record = asRecord(block);
	if (!record) return 0;

	const type = typeof record.type === "string" ? record.type : "";
	if (type === "text") {
		return roughTokenCountEstimation(typeof record.text === "string" ? record.text : "");
	}
	if (type === "thinking") {
		return roughTokenCountEstimation(
			typeof record.thinking === "string" ? record.thinking : "",
		);
	}
	if (type === "redacted_thinking") {
		return roughTokenCountEstimation(typeof record.data === "string" ? record.data : "");
	}
	if (type === "tool_result") {
		return roughTokenCountForContent(record.content);
	}
	if (type === "tool_use") {
		const name = typeof record.name === "string" ? record.name : "";
		return roughTokenCountEstimation(name + safeJsonStringify(record.input ?? {}));
	}
	if (type === "image" || type === "document") {
		// Keep parity with Claude Code rough estimator defaults.
		return 2_000;
	}

	return roughTokenCountEstimation(safeJsonStringify(record));
}

function roughTokenCountForRawMessage(msg: Record<string, unknown>): number {
	const type = typeof msg.type === "string" ? msg.type : "";
	if (type === "assistant" || type === "user") {
		const message = asRecord(msg.message);
		return roughTokenCountForContent(message?.content);
	}
	if (type === "attachment") {
		return roughTokenCountEstimation(safeJsonStringify(msg.attachment));
	}
	return 0;
}

function roughTokenCountForRawMessages(
	messages: readonly Record<string, unknown>[],
): number {
	return messages.reduce((sum, message) => sum + roughTokenCountForRawMessage(message), 0);
}

type HistoryUsageCandidate = {
	usage: {
		inputTokens: number;
		outputTokens: number;
		cacheReadInputTokens: number;
		cacheCreationInputTokens: number;
	};
	model: string | null;
	contextWindowSize: number;
	windowSource: "reported" | "estimated";
	sourceMessageId: string | null;
	usedPercentageFromPayload: number | null;
	remainingPercentageFromPayload: number | null;
	assistantMessageId: string | null;
};

function extractHistoryUsageCandidate(
	msg: Record<string, unknown>,
	fallbackModel: string | null,
): HistoryUsageCandidate | null {
	const message = asRecord(msg.message);
	const request = asRecord(msg.request);
	const contextWindow = asRecord(msg.context_window)
		?? asRecord(message?.context_window)
		?? asRecord(request?.context_window);
	const preferredModel =
		typeof message?.model === "string"
			? message.model
			: typeof msg.model === "string"
				? (msg.model as string)
				: fallbackModel;
	const modelUsage = asRecord(msg.modelUsage) ?? asRecord(message?.modelUsage);
	const modelUsageRecord = pickModelUsageRecord(modelUsage, preferredModel);
	const usage =
		extractUsageShape(asRecord(contextWindow?.current_usage))
		?? extractUsageShape(asRecord(message?.usage))
		?? extractUsageShape(asRecord(msg.usage))
		?? extractUsageShape(modelUsageRecord.usage);
	if (!usage) return null;

	const model =
		typeof message?.model === "string"
			? message.model
			: typeof msg.model === "string"
				? (msg.model as string)
				: modelUsageRecord.model ?? fallbackModel;
	const reportedWindowSizeFromContext = pickNumber(
		contextWindow,
		["context_window_size", "contextWindowSize"],
	);
	const reportedWindowSizeFromModelUsage = pickNumber(
		modelUsageRecord.usage,
		["contextWindow", "context_window_size", "contextWindowSize"],
	);
	const reportedWindowSize = reportedWindowSizeFromContext ?? reportedWindowSizeFromModelUsage;
	const contextWindowSize = Math.max(
		1,
		Math.round(reportedWindowSize ?? inferContextWindowFromModel(model)),
	);
	const sourceMessageId =
		typeof message?.id === "string" && message.id.trim()
			? `assistant:${message.id.trim()}`
			: typeof msg.uuid === "string" && msg.uuid.trim()
				? `uuid:${msg.uuid.trim()}`
				: null;

	return {
		usage,
		model: model ?? null,
		contextWindowSize,
		windowSource: reportedWindowSize != null ? "reported" : "estimated",
		sourceMessageId,
		usedPercentageFromPayload: pickNumber(contextWindow, ["used_percentage", "usedPercentage"]),
		remainingPercentageFromPayload: pickNumber(contextWindow, ["remaining_percentage", "remainingPercentage"]),
		assistantMessageId:
			typeof message?.id === "string" && message.id.trim()
				? message.id.trim()
				: null,
	};
}

function findLatestModelFromRawMessages(
	messages: readonly Record<string, unknown>[],
	fallbackModel: string | null,
): string | null {
	for (let i = messages.length - 1; i >= 0; i -= 1) {
		const msg = messages[i];
		const message = asRecord(msg.message);
		if (typeof message?.model === "string" && message.model.trim()) {
			return message.model.trim();
		}
		if (typeof msg.model === "string" && msg.model.trim()) {
			return msg.model.trim();
		}
	}
	return fallbackModel;
}

function getUsageTokenCount(candidate: HistoryUsageCandidate): number {
	return (
		candidate.usage.inputTokens
		+ candidate.usage.cacheReadInputTokens
		+ candidate.usage.cacheCreationInputTokens
		+ candidate.usage.outputTokens
	);
}

function estimateContextTokensFromRawMessages(
	messages: readonly Record<string, unknown>[],
	fallbackModel: string | null,
): {
	estimatedTokens: number;
	candidate: HistoryUsageCandidate | null;
} {
	const roughAllMessages = roughTokenCountForRawMessages(messages);

	for (let i = messages.length - 1; i >= 0; i -= 1) {
		const msg = messages[i];
		const candidate = extractHistoryUsageCandidate(msg, fallbackModel);
		if (!candidate) continue;

		let anchorIndex = i;
		if (candidate.assistantMessageId) {
			let j = i - 1;
			while (j >= 0) {
				const previous = messages[j];
				const previousMessage = asRecord(previous.message);
				const previousAssistantMessageId =
					typeof previousMessage?.id === "string" && previousMessage.id.trim()
						? previousMessage.id.trim()
						: null;
				if (previousAssistantMessageId === candidate.assistantMessageId) {
					anchorIndex = j;
				} else if (previousAssistantMessageId != null) {
					break;
				}
				j -= 1;
			}
		}

		const strictVendorEstimate =
			getUsageTokenCount(candidate)
			+ roughTokenCountForRawMessages(messages.slice(anchorIndex + 1));
		const inputFootprintTokens =
			candidate.usage.inputTokens
			+ candidate.usage.cacheReadInputTokens
			+ candidate.usage.cacheCreationInputTokens;
		const estimatedTokens =
			inputFootprintTokens > 0
				? strictVendorEstimate
				: Math.max(strictVendorEstimate, roughAllMessages);
		return {
			estimatedTokens,
			candidate,
		};
	}

	return {
		estimatedTokens: roughAllMessages,
		candidate: null,
	};
}

/**
 * Compute the final context usage snapshot from replayed transcript rows.
 *
 * For normal SDK rows, this matches Claude Code's "last usage + estimate newer
 * messages" strategy. If transcript usage is output-only (input/cache=0), we
 * fall back to a full-message rough estimate so session switching doesn't show 0.
 */
export function deriveContextUsageFromRawMessages(
	rawSdkMessages: unknown[],
	fallbackModel: string | null,
): CodeAgentContextWindowUsage | null {
	const messages: Record<string, unknown>[] = rawSdkMessages
		.map((item) => asRecord(item))
		.filter((item): item is Record<string, unknown> => Boolean(item));
	if (messages.length === 0) return null;

	const model = findLatestModelFromRawMessages(messages, fallbackModel);
	const { estimatedTokens, candidate } = estimateContextTokensFromRawMessages(
		messages,
		model,
	);
	const contextWindowSize = Math.max(
		1,
		Math.round(candidate?.contextWindowSize ?? inferContextWindowFromModel(model)),
	);
	const inputTokens = candidate?.usage.inputTokens ?? 0;
	const outputTokens = candidate?.usage.outputTokens ?? 0;
	const cacheReadInputTokens = candidate?.usage.cacheReadInputTokens ?? 0;
	const cacheCreationInputTokens = candidate?.usage.cacheCreationInputTokens ?? 0;
	const inputFootprintTokens =
		inputTokens + cacheReadInputTokens + cacheCreationInputTokens;
	const rawUsedTokens =
		inputFootprintTokens > 0 ? inputFootprintTokens : Math.max(0, Math.round(estimatedTokens));
	const usedTokens = Math.max(0, Math.min(contextWindowSize, rawUsedTokens));
	if (usedTokens <= 0) return null;
	const remainingTokens = Math.max(0, contextWindowSize - usedTokens);
	const computedUsedPercentage = Math.round((usedTokens / contextWindowSize) * 100);
	const usedPercentage = clampPercent(
		candidate?.usedPercentageFromPayload ?? computedUsedPercentage,
	);
	const remainingPercentage = clampPercent(
		candidate?.remainingPercentageFromPayload ?? 100 - usedPercentage,
	);

	return {
		contextWindowSize,
		windowSource: candidate?.windowSource ?? "estimated",
		model: candidate?.model ?? model ?? null,
		inputTokens,
		outputTokens,
		cacheReadInputTokens,
		cacheCreationInputTokens,
		usedTokens,
		remainingTokens,
		usedPercentage,
		remainingPercentage,
		updatedAt: Date.now(),
		sourceMessageId: candidate?.sourceMessageId ?? null,
	};
}

function extractContextUsage(
	msg: Record<string, unknown>,
	fallbackModel: string | null,
	previousUsage: CodeAgentContextWindowUsage | null,
	protocol?: CodeAgentUsageProtocol,
): CodeAgentContextWindowUsage | null {
	const message = asRecord(msg.message);
	const request = asRecord(msg.request);
	const event = asRecord(msg.event);
	const isStreamEventMessage = msg.type === "stream_event";
	const streamEventType = isStreamEventMessage && typeof event?.type === "string"
		? (event.type as string)
		: null;
	const streamEventMessage = asRecord(event?.message);
	const contextWindow = asRecord(msg.context_window) ?? asRecord(message?.context_window) ?? asRecord(request?.context_window);
	const preferredModel =
		typeof message?.model === "string"
			? message.model
			: typeof msg.model === "string"
				? (msg.model as string)
				: fallbackModel;
	const modelUsage = asRecord(msg.modelUsage) ?? asRecord(message?.modelUsage);
	const modelUsageRecord = pickModelUsageRecord(modelUsage, preferredModel);
	let sourceMessageId: string | null = null;
	if (typeof message?.id === "string" && message.id.trim()) {
		sourceMessageId = `assistant:${message.id.trim()}`;
	} else if (
		typeof streamEventMessage?.id === "string"
		&& streamEventMessage.id.trim()
	) {
		sourceMessageId = `assistant:${streamEventMessage.id.trim()}`;
	} else if (
		isStreamEventMessage
		&& (streamEventType === "message_delta" || streamEventType === "message_stop")
		&& previousUsage?.sourceMessageId
	) {
		// Stream deltas usually do not carry message ids; keep the previous id so
		// we can merge partial usage updates for the same assistant message.
		sourceMessageId = previousUsage.sourceMessageId;
	} else if (!isStreamEventMessage && typeof msg.uuid === "string" && msg.uuid.trim()) {
		sourceMessageId = `uuid:${msg.uuid.trim()}`;
	}
	const streamEventUsage =
		isStreamEventMessage && streamEventType === "message_start"
			? extractUsageShape(asRecord(streamEventMessage?.usage), protocol, preferredModel)
			: isStreamEventMessage && streamEventType === "message_delta"
				? extractUsageShape(asRecord(event?.usage), protocol, preferredModel)
				: null;
	const usage =
		extractUsageShape(asRecord(contextWindow?.current_usage), protocol, preferredModel)
		?? streamEventUsage
		?? (
			!isStreamEventMessage
				? extractUsageShape(asRecord(event?.usage), protocol, preferredModel)
					?? extractUsageShape(asRecord(asRecord(event?.message)?.usage), protocol, preferredModel)
				: null
		)
		?? extractUsageShape(asRecord(message?.usage), protocol, preferredModel)
		?? extractUsageShape(asRecord(msg.usage), protocol, preferredModel)
		?? extractUsageShape(modelUsageRecord.usage, protocol, preferredModel);

	if (!usage) return null;
	const isDuplicateUsageSample =
		Boolean(sourceMessageId)
		&& sourceMessageId === (previousUsage?.sourceMessageId ?? null);
	const mergedUsage = isDuplicateUsageSample
		? {
			// Match Claude Code's stream usage merge behavior:
			// message_delta can emit 0 for input/cache fields.
			inputTokens:
				usage.inputTokens > 0
					? usage.inputTokens
					: previousUsage?.inputTokens ?? usage.inputTokens,
			outputTokens:
				usage.outputTokens > 0
					? usage.outputTokens
					: previousUsage?.outputTokens ?? usage.outputTokens,
			cacheReadInputTokens:
				usage.cacheReadInputTokens > 0
					? usage.cacheReadInputTokens
					: previousUsage?.cacheReadInputTokens ?? usage.cacheReadInputTokens,
			cacheCreationInputTokens:
				usage.cacheCreationInputTokens > 0
					? usage.cacheCreationInputTokens
					: previousUsage?.cacheCreationInputTokens ?? usage.cacheCreationInputTokens,
		}
		: usage;

	const model =
		typeof message?.model === "string"
			? message.model
			: typeof msg.model === "string"
				? (msg.model as string)
				: modelUsageRecord.model ?? fallbackModel;

	const reportedWindowSizeFromContext = pickNumber(
		contextWindow,
		["context_window_size", "contextWindowSize"],
	);
	const reportedWindowSizeFromModelUsage = pickNumber(
		modelUsageRecord.usage,
		["contextWindow", "context_window_size", "contextWindowSize"],
	);
	const reportedWindowSize = reportedWindowSizeFromContext ?? reportedWindowSizeFromModelUsage;
	const contextWindowSize = Math.max(
		1,
		Math.round(reportedWindowSize ?? inferContextWindowFromModel(model)),
	);
	const hasExplicitContextWindowUsageFromContext = Boolean(
		contextWindow && (
			asRecord(contextWindow.current_usage)
			|| pickNumber(contextWindow, ["used_percentage", "usedPercentage"]) != null
			|| pickNumber(contextWindow, ["remaining_percentage", "remainingPercentage"]) != null
			|| pickNumber(contextWindow, ["total_input_tokens", "totalInputTokens"]) != null
			|| pickNumber(contextWindow, ["total_output_tokens", "totalOutputTokens"]) != null
		),
	);
	const hasExplicitContextWindowUsage =
		hasExplicitContextWindowUsageFromContext || reportedWindowSizeFromModelUsage != null;
	const inputFootprintTokens = Math.max(
		0,
		mergedUsage.inputTokens + mergedUsage.cacheReadInputTokens + mergedUsage.cacheCreationInputTokens,
	);
	let usedTokens = inputFootprintTokens;
	// Some providers/transcript replays only expose output tokens. Use a
	// conservative monotonic fallback so session switching does not collapse to 0.
	if (usedTokens === 0 && mergedUsage.outputTokens > 0 && !hasExplicitContextWindowUsageFromContext) {
		if (isDuplicateUsageSample) {
			usedTokens = previousUsage?.usedTokens ?? mergedUsage.outputTokens;
		} else {
			const previousUsedTokens = previousUsage?.usedTokens ?? 0;
			usedTokens = Math.max(
				mergedUsage.outputTokens,
				previousUsedTokens + mergedUsage.outputTokens,
			);
		}
	}
	if (isDuplicateUsageSample && previousUsage && !hasExplicitContextWindowUsageFromContext) {
		usedTokens = Math.max(usedTokens, previousUsage.usedTokens);
	}
	usedTokens = Math.max(0, Math.min(contextWindowSize, Math.round(usedTokens)));
	const remainingTokens = Math.max(0, contextWindowSize - usedTokens);

	const usedPercentageFromPayload = pickNumber(contextWindow, ["used_percentage", "usedPercentage"]);
	const remainingPercentageFromPayload = pickNumber(contextWindow, ["remaining_percentage", "remainingPercentage"]);
	const computedUsedPercentage = Math.round((usedTokens / contextWindowSize) * 100);
	const usedPercentage = clampPercent(
		usedPercentageFromPayload ?? computedUsedPercentage,
	);
	const remainingPercentage = clampPercent(
		remainingPercentageFromPayload ?? 100 - usedPercentage,
	);

	// Keep previous non-zero footprint when current payload has no usable
	// context usage metrics (common with output-only transcript records).
	if (usedTokens === 0 && !hasExplicitContextWindowUsage && previousUsage) {
		return null;
	}

	return {
		contextWindowSize,
		windowSource: reportedWindowSize != null ? "reported" : "estimated",
		model: model ?? null,
		inputTokens: mergedUsage.inputTokens,
		outputTokens: mergedUsage.outputTokens,
		cacheReadInputTokens: mergedUsage.cacheReadInputTokens,
		cacheCreationInputTokens: mergedUsage.cacheCreationInputTokens,
		usedTokens,
		remainingTokens,
		usedPercentage,
		remainingPercentage,
		updatedAt: Date.now(),
		sourceMessageId,
	};
}

function initialStreaming() {
	return {
		thinkingText: "",
		isThinking: false,
		assistantText: "",
		isStreaming: false,
		spinnerMode: null as SpinnerMode,
		vendorStatusText: "",
		vendorStatusSource: null as VendorStatusSource,
		toolUses: new Map<string, StreamingToolUse>(),
		/** Accumulated usage from message_start + message_delta stream events */
		accumulatedUsage: null as { inputTokens: number; outputTokens: number; cacheReadTokens: number; cacheWriteTokens: number } | null,
		/** Timestamp (ms) when message_start arrived — marks start of this turn */
		turnStartedAt: 0,
		/** Timestamp (ms) when the first content_block_delta text arrived */
		firstTokenAt: 0,
	};
}
// ─── Store ────────────────────────────────────────────────────────────────────
export const useChatStore = create<CodeAgentStore>((set, get) => {
	const queuedStreamingDeltas = {
		assistant: "",
		thinking: "",
	};
	let scheduledStreamingFlush: number | ReturnType<typeof setTimeout> | null = null;
	let scheduledWithAnimationFrame = false;
	/** Tracks the DB id of the last saved assistant message so message_delta can
	 *  update it with computed performance (TPS/TTFT). */
	let lastSavedAssistantMsgId: string | null = null;

	const canUseAnimationFrame = () =>
		typeof globalThis !== "undefined"
		&& typeof globalThis.requestAnimationFrame === "function"
		&& typeof globalThis.cancelAnimationFrame === "function";

	const flushQueuedStreamingDeltas = () => {
		const assistantDelta = queuedStreamingDeltas.assistant;
		const thinkingDelta = queuedStreamingDeltas.thinking;
		if (!assistantDelta && !thinkingDelta) return;

		queuedStreamingDeltas.assistant = "";
		queuedStreamingDeltas.thinking = "";

		set((state) => {
			const nextAssistantText = assistantDelta
				? state.streaming.assistantText + assistantDelta
				: state.streaming.assistantText;
			const nextThinkingText = thinkingDelta
				? state.streaming.thinkingText + thinkingDelta
				: state.streaming.thinkingText;
			if (
				nextAssistantText === state.streaming.assistantText
				&& nextThinkingText === state.streaming.thinkingText
			) {
				return state;
			}
			return {
				streaming: {
					...state.streaming,
					assistantText: nextAssistantText,
					thinkingText: nextThinkingText,
				},
			};
		});
	};

	const clearScheduledStreamingFlush = () => {
		if (scheduledStreamingFlush == null) return;

		if (scheduledWithAnimationFrame && canUseAnimationFrame()) {
			globalThis.cancelAnimationFrame(scheduledStreamingFlush as number);
		} else {
			clearTimeout(scheduledStreamingFlush as ReturnType<typeof setTimeout>);
		}
		scheduledStreamingFlush = null;
		scheduledWithAnimationFrame = false;
	};

	const flushQueuedStreamingDeltasNow = () => {
		clearScheduledStreamingFlush();
		flushQueuedStreamingDeltas();
	};

	const clearQueuedStreamingDeltas = () => {
		clearScheduledStreamingFlush();
		queuedStreamingDeltas.assistant = "";
		queuedStreamingDeltas.thinking = "";
	};

	const scheduleStreamingFlush = () => {
		if (scheduledStreamingFlush != null) return;

		if (canUseAnimationFrame()) {
			scheduledWithAnimationFrame = true;
			scheduledStreamingFlush = globalThis.requestAnimationFrame(() => {
				scheduledStreamingFlush = null;
				scheduledWithAnimationFrame = false;
				flushQueuedStreamingDeltas();
			});
			return;
		}

		scheduledWithAnimationFrame = false;
		scheduledStreamingFlush = setTimeout(() => {
			scheduledStreamingFlush = null;
			flushQueuedStreamingDeltas();
		}, 16);
	};

	const queueAssistantStreamingDelta = (text: string) => {
		if (!text) return;
		queuedStreamingDeltas.assistant += text;
		scheduleStreamingFlush();
	};

	const queueThinkingStreamingDelta = (text: string) => {
		if (!text) return;
		queuedStreamingDeltas.thinking += text;
		scheduleStreamingFlush();
	};

	return {
	sessionId: null,
	sessionInit: null,
	sessionState: "idle",
	sessionTitle: null,
	lastUpdatedAt: null,
	items: [],
	streaming: initialStreaming(),
	pendingPermission: null,
	pendingElicitation: null,
	activeTasks: new Map(),
	rateLimitInfo: null,
	contextUsage: null,
	perfTurnStartedAt: 0,
	perfFirstTokenAt: 0,
	sessionAllowedTools: new Set(),

	reset: () => {
		clearQueuedStreamingDeltas();
		set({
			sessionId: null,
			sessionInit: null,
			sessionState: "idle",
			sessionTitle: null,
			lastUpdatedAt: null,
			items: [],
			streaming: initialStreaming(),
			pendingPermission: null,
			pendingElicitation: null,
				activeTasks: new Map(),
				rateLimitInfo: null,
				contextUsage: null,
				sessionAllowedTools: new Set(),
			});
		},

	resetStreaming: () => {
		clearQueuedStreamingDeltas();
		set({
			streaming: initialStreaming(),
			pendingPermission: null,
			pendingElicitation: null,
			rateLimitInfo: null,
		});
	},

	appendStreamingText: (text) => {
		if (!text) return;
		queueAssistantStreamingDelta(text);
		set((state) => {
			const shouldKeepStreamingFlags =
				state.streaming.isStreaming
				&& state.streaming.spinnerMode === "responding"
				&& (
					state.streaming.vendorStatusSource === "vendor"
					|| state.streaming.vendorStatusText
						=== formatVendorStatusLabel(buildFallbackVendorStatus("responding"))
				);
			if (shouldKeepStreamingFlags) return state;
			return {
				streaming: {
					...state.streaming,
					isStreaming: true,
					spinnerMode: "responding",
					vendorStatusText:
						state.streaming.vendorStatusSource === "vendor"
							? state.streaming.vendorStatusText
							: formatVendorStatusLabel(buildFallbackVendorStatus("responding")),
					vendorStatusSource:
						state.streaming.vendorStatusSource === "vendor" ? "vendor" : "fallback",
				},
			};
		});
	},

	setPendingPermission: (p) => {
		set({ pendingPermission: p });
	},

	setContextUsage: (usage) => {
		set({ contextUsage: usage });
	},

	resolvePermission: (requestId, _decision) => {
		const current = get().pendingPermission;
		if (current?.requestId === requestId) {
			set({ pendingPermission: null });
		}
		// Remove any pending permission item from timeline so the card disappears
		set((state) => ({
			items: state.items.filter(
				(item) =>
					!(item.kind === "permission-request" && item.requestId === requestId),
			),
		}));
	},

	resolveElicitation: (_action, _content) => {
		set({ pendingElicitation: null });
		set((state) => ({
			items: state.items.filter((item) => item.kind !== "elicitation"),
		}));
	},

	addSessionAllowedTool: (toolName) => {
		set((state) => {
			const next = new Set(state.sessionAllowedTools);
			next.add(toolName.toLowerCase());
			return { sessionAllowedTools: next };
		});
	},

	pushUserMessage: (text, meta) => {
		const imagePreviews = meta?.imagePreviews?.length ? meta.imagePreviews : undefined;
		const pathTags = meta?.pathTags?.length ? meta.pathTags : undefined;
		const richContent = meta?.richContent?.length ? meta.richContent : undefined;
		const msgId = uid();
		set((state) => ({
			items: [
				...state.items,
				{
					kind: "user",
					id: msgId,
					text,
					imagePreviews,
					pathTags,
					richContent,
				},
			],
		}));

		// Persist user message to IndexedDB
		const sessionKey = get().sessionId || "default";
		void saveMessage({
			id: msgId,
			sessionKey,
			role: "user",
			content: text,
			timestamp: Date.now(),
		} satisfies DBMessage);
	},

	pushSdkMessage: (raw) => {
		if (!raw || typeof raw !== "object") return;
		const msg = raw as Record<string, unknown>;
		const type = msg.type as string | undefined;
		if (!type) return;
		if (type !== "stream_event") {
			flushQueuedStreamingDeltasNow();
		}

			const vendorStatusText = extractVendorStatus(msg);
			if (vendorStatusText) {
				set((state) => ({
					streaming: {
						...state.streaming,
						vendorStatusText: formatVendorStatusLabel(vendorStatusText),
						vendorStatusSource: "vendor",
					},
				}));
			}

			const contextUsage = extractContextUsage(
				msg,
				get().sessionInit?.model ?? null,
				get().contextUsage,
				getUsageProtocol(),
			);
			if (contextUsage) {
				set({ contextUsage });
			}

		const addItem = (item: CodeAgentTimelineItem) => {
			set((state) => ({ items: [...state.items, item] }));
		};

		// ── system messages ────────────────────────────────────────────────────
		if (type === "system") {
			const subtype = msg.subtype as string | undefined;

			if (subtype === "init") {
				const tools = Array.isArray(msg.tools) ? (msg.tools as string[]) : [];
				const mcpServers = Array.isArray(msg.mcp_servers)
					? (msg.mcp_servers as Array<{ name: string; status: string }>)
					: [];
				const init: SessionInitInfo = {
					model: String(msg.model || ""),
					permissionMode: String(msg.permissionMode || "default"),
					tools,
					mcpServers,
					cwd: String(msg.cwd || ""),
					claudeCodeVersion: String(msg.claude_code_version || ""),
				};
				set({
					sessionId: String(msg.session_id || ""),
					sessionInit: init,
				});
				addItem({
					kind: "init",
					id: uid(),
					model: init.model,
					permissionMode: init.permissionMode,
					toolCount: tools.length,
					mcpCount: mcpServers.length,
					cwd: init.cwd,
				});
				return;
			}

			if (subtype === "compact_boundary") {
				const meta = msg.compact_metadata as Record<string, unknown> | undefined;
				addItem({
					kind: "compact-boundary",
					id: uid(),
					preTokens: Number(meta?.pre_tokens ?? 0),
					trigger: String(meta?.trigger ?? "auto"),
				});
				return;
			}

			if (subtype === "status") {
				const s = msg.status;
				if (s === "compacting") {
					addItem({ kind: "system-notice", id: uid(), text: "⟳ 正在压缩上下文…", variant: "info" });
				}
				set((state) => {
					if (s === null) {
						const hasLiveStreaming =
							state.streaming.spinnerMode !== null
							|| state.streaming.isThinking
							|| state.streaming.isStreaming
							|| state.streaming.assistantText.trim().length > 0
							|| state.streaming.thinkingText.trim().length > 0
							|| state.streaming.toolUses.size > 0
							|| state.pendingPermission !== null
							|| state.pendingElicitation !== null;

						// Some CLI runs emit system status=null while the turn is still active.
						// Preserve active streaming state so "working..." feedback doesn't vanish.
						if (hasLiveStreaming) {
							return {
								sessionState: "running" as const,
								streaming: {
									...state.streaming,
									vendorStatusText:
										state.streaming.vendorStatusSource === "vendor"
											? state.streaming.vendorStatusText
											: formatVendorStatusLabel(
												buildFallbackVendorStatus(
													state.streaming.spinnerMode ?? "requesting",
													state.streaming.vendorStatusText,
												),
											),
									vendorStatusSource:
										state.streaming.vendorStatusSource === "vendor"
											? "vendor"
											: "fallback",
								},
							};
						}

						return {
							sessionState: "idle" as const,
							streaming: initialStreaming(),
						};
					}

					return {
						sessionState: "running" as const,
						streaming: {
							...state.streaming,
							vendorStatusText:
								state.streaming.vendorStatusSource === "vendor"
									? state.streaming.vendorStatusText
									: formatVendorStatusLabel(buildFallbackVendorStatus(state.streaming.spinnerMode)),
							vendorStatusSource:
								state.streaming.vendorStatusSource === "vendor"
									? "vendor"
									: state.streaming.spinnerMode
										? "fallback"
										: null,
						},
					};
				});
				return;
			}

			if (subtype === "session_state_changed") {
				const state = msg.state as "idle" | "running" | "requires_action" | undefined;
				if (state) set({ sessionState: state });
				return;
			}

			if (subtype === "api_retry") {
					// Retry starts a fresh upstream attempt; drop partial text/tool state
					// from the failed attempt so the next stream doesn't concatenate it.
					clearQueuedStreamingDeltas();
					set((state) => ({
						streaming: {
							...initialStreaming(),
							spinnerMode: "requesting",
							vendorStatusText:
								state.streaming.vendorStatusSource === "vendor"
									? state.streaming.vendorStatusText
									: formatVendorStatusLabel(buildFallbackVendorStatus("requesting")),
							vendorStatusSource:
								state.streaming.vendorStatusSource === "vendor" ? "vendor" : "fallback",
						},
					}));
					addItem({
						kind: "api-retry",
						id: uid(),
						attempt: Number(msg.attempt ?? 0),
						maxRetries: Number(msg.max_retries ?? 0),
						delayMs: Number(msg.retry_delay_ms ?? 0),
						error: String(msg.error ?? "unknown"),
					});
					return;
				}

			if (subtype === "hook_started") {
				addItem({
					kind: "hook",
					id: String(msg.hook_id || uid()),
					hookName: String(msg.hook_name || ""),
					hookEvent: String(msg.hook_event || ""),
					outcome: "started",
				});
				return;
			}

			if (subtype === "hook_progress") {
				const hookId = String(msg.hook_id || "");
				const stdout = String(msg.stdout || "");
				set((state) => ({
					items: state.items.map((item) =>
						item.kind === "hook" && item.id === hookId
							? { ...item, outcome: "progress" as const, stdout: stdout.slice(0, 160) }
							: item,
					),
				}));
				return;
			}

			if (subtype === "hook_response") {
				const hookId = String(msg.hook_id || "");
				const outcome = msg.outcome === "success" ? "success" : "error";
				const exitCode = typeof msg.exit_code === "number" ? msg.exit_code : null;
				set((state) => ({
					items: state.items.map((item) =>
						item.kind === "hook" && item.id === hookId
							? { ...item, outcome: outcome as "success" | "error", exitCode }
							: item,
					),
				}));
				return;
			}

			if (subtype === "task_started") {
				const taskId = String(msg.task_id || uid());
				const description = String(msg.description || "");
				const toolUseId = typeof msg.tool_use_id === "string" ? msg.tool_use_id : undefined;
				const task: ActiveTask = { taskId, description, toolUseId };
				set((state) => {
					const next = new Map(state.activeTasks);
					next.set(taskId, task);
					return { activeTasks: next };
				});
				addItem({ kind: "task-start", id: uid(), taskId, description });
				return;
			}

			if (subtype === "task_progress") {
				// Update tool summary text inside the timeline for the active task
				return;
			}

			if (subtype === "task_notification") {
				const taskId = String(msg.task_id || "");
				const status = (msg.status as "completed" | "failed" | "stopped") || "completed";
				const summary = String(msg.summary || "");
				set((state) => {
					const next = new Map(state.activeTasks);
					next.delete(taskId);
					return { activeTasks: next };
				});
				addItem({ kind: "task-end", id: uid(), taskId, status, summary });
				return;
			}

			if (subtype === "elicitation_complete") {
				set({ pendingElicitation: null });
				return;
			}

			if (subtype === "local_command_output") {
				addItem({
					kind: "system-notice",
					id: uid(),
					text: String(msg.content || ""),
					variant: "info",
				});
				return;
			}

			return;
		}

			// ── assistant turn (completed) ─────────────────────────────────────────
			if (type === "assistant") {
				flushQueuedStreamingDeltasNow();
				const content = (msg.message as Record<string, unknown>)?.content;
				const streaming = get().streaming;
				const thinkingText = streaming.thinkingText;
			const toolUses = streaming.toolUses;

			// Extract per-message usage from the raw SDK message.
			// The assistant message itself often has zeroed-out usage; the real
			// token counts arrive via message_start (input) and message_delta
			// (output) stream events and are accumulated in streaming.accumulatedUsage.
			const msgUsageRawOriginal = asRecord(asRecord(msg.message)?.usage) ?? asRecord(msg.usage);
			const msgModel = typeof (msg.message as Record<string, unknown>)?.model === "string"
				? (msg.message as Record<string, unknown>).model as string
				: typeof msg.model === "string" ? msg.model as string : undefined;
			const msgUsageRaw = msgUsageRawOriginal
				? normalizeUsageRecord(msgUsageRawOriginal, getUsageProtocol(), msgModel ?? get().sessionInit?.model ?? null)
				: null;
			if (msgUsageRawOriginal) {
				console.debug("[code-agent] assistant usage raw:", JSON.stringify(msgUsageRawOriginal));
				console.debug("[code-agent] assistant usage normalized:", JSON.stringify(msgUsageRaw));
			}
			const msgCostUsd = toFiniteNumber(msg.costUSD) ?? toFiniteNumber(msg.cost_usd) ?? undefined;
			const msgDurationMs = toFiniteNumber(msg.duration_ms) ?? toFiniteNumber(msg.durationMs) ?? undefined;
			const accUsage = streaming.accumulatedUsage;
			let msgUsage = msgUsageRaw ? {
				inputTokens: Math.max(0, Math.round(
					pickNumber(msgUsageRaw, ["input_tokens", "inputTokens", "input"]) ?? 0)),
				outputTokens: Math.max(0, Math.round(
					pickNumber(msgUsageRaw, ["output_tokens", "outputTokens", "output"]) ?? 0)),
				cacheReadTokens: Math.max(0, Math.round(
					pickNumber(msgUsageRaw, ["cache_read_input_tokens", "cacheReadInputTokens", "cacheRead"]) ?? 0)),
				cacheWriteTokens: Math.max(0, Math.round(
					pickNumber(msgUsageRaw, ["cache_creation_input_tokens", "cacheCreationInputTokens", "cacheWrite"]) ?? 0)),
				totalTokens: 0,
			} : undefined;
			// Merge accumulated streaming usage when message usage is zero
			if (accUsage) {
				if (!msgUsage) {
					msgUsage = { ...accUsage, totalTokens: 0 };
				} else {
					if (msgUsage.inputTokens === 0 && accUsage.inputTokens > 0) msgUsage.inputTokens = accUsage.inputTokens;
					if (msgUsage.outputTokens === 0 && accUsage.outputTokens > 0) msgUsage.outputTokens = accUsage.outputTokens;
					if (msgUsage.cacheReadTokens === 0 && accUsage.cacheReadTokens > 0) msgUsage.cacheReadTokens = accUsage.cacheReadTokens;
					if (msgUsage.cacheWriteTokens === 0 && accUsage.cacheWriteTokens > 0) msgUsage.cacheWriteTokens = accUsage.cacheWriteTokens;
				}
			}
			if (msgUsage) {
				msgUsage.totalTokens = msgUsage.inputTokens + msgUsage.outputTokens + msgUsage.cacheReadTokens + msgUsage.cacheWriteTokens;
			}
			const assistantTs = typeof msg.timestamp === "string" ? Date.parse(msg.timestamp) : toFiniteNumber(msg.timestamp);
			const assistantCreatedAt = (assistantTs != null && assistantTs > 0) ? assistantTs : undefined;

			// Flush any accumulated thinking block
			if (thinkingText) {
				addItem({
					kind: "thinking",
					id: uid(),
					data: { text: thinkingText, isStreaming: false, isRedacted: false },
				});
			}

			// Backfill streaming tool uses with full input from the completed
			// assistant message content blocks.  During streaming, input_json_delta
			// events are not accumulated, so rawInput stays as {}.  The completed
			// message carries the authoritative input for each tool_use block.
			if (toolUses.size > 0 && Array.isArray(content)) {
				for (const block of content as Array<Record<string, unknown>>) {
					if (block.type === "tool_use" && typeof block.id === "string") {
						const existing = toolUses.get(block.id);
						if (existing && Object.keys(existing.rawInput).length === 0) {
							const fullInput = (block.input as Record<string, unknown>) || {};
							existing.rawInput = fullInput;
							existing.inputSummary = buildInputSummary(existing.toolName, fullInput);
						}
					}
				}
			}

			// Flush tool uses accumulated during streaming (SDK streaming mode only).
			// In CLI stream-json mode these are empty; tool_use comes from content blocks below.
			for (const [, tu] of toolUses) {
				addItem({ kind: "tool-use", id: uid(), tool: { ...tu, status: "completed" } });
				buildDiffForToolUse(tu, addItem);
			}

			// Flush accumulated streaming text (populated via appendStreamingText from
			// code-agent:token events which fire before this sdk-message arrives).
			const assistantText = streaming.assistantText;
			if (assistantText.trim()) {
				addItem({ kind: "assistant-text", id: uid(), text: assistantText, isStreaming: false, createdAt: assistantCreatedAt });
			}

			// Reset streaming state
				clearQueuedStreamingDeltas();
				set({ streaming: initialStreaming() });

			// In CLI stream-json mode there are no incremental stream events, so
			// streaming.toolUses and streaming.assistantText are empty.
			// Parse content blocks directly from the completed assistant message.
			if (Array.isArray(content)) {
				for (const block of content as Array<Record<string, unknown>>) {
					if (block.type === "text" && block.text && !assistantText) {
						// Only add text directly if streaming path didn't already flush it
						addItem({ kind: "assistant-text", id: uid(), text: String(block.text), isStreaming: false, createdAt: assistantCreatedAt });
					}
					if (block.type === "tool_use" && toolUses.size === 0) {
						// CLI mode: tool uses come here, not from streaming events
						const toolUseId = String(block.id || uid());
						const toolName = String(block.name || "");
						const rawInput = (block.input as Record<string, unknown>) || {};
						const inputSummary = buildInputSummary(toolName, rawInput);
						const tu: StreamingToolUse = {
							toolUseId,
							toolName,
							inputSummary,
							rawInput,
							status: "completed",
						};
						addItem({ kind: "tool-use", id: uid(), tool: tu });
						buildDiffForToolUse(tu, addItem);
					}
					if (block.type === "thinking" && toolUses.size === 0 && !thinkingText) {
						addItem({
							kind: "thinking",
							id: uid(),
							data: { text: String(block.thinking || ""), isStreaming: false, isRedacted: false },
						});
					}
					if (block.type === "redacted_thinking") {
						addItem({
							kind: "thinking",
							id: uid(),
							data: { text: "", isStreaming: false, isRedacted: true },
						});
					}
				}
			}

			// Emit a dedicated usage line for this assistant message.
			// Use msg.message.id (Claude API message ID) as stable key — it matches
			// the ID captured in message_start during live streaming.
			if (msgUsage && msgUsage.totalTokens > 0) {
				addItem({
					kind: "assistant-usage",
					id: uid(),
					usage: msgUsage,
					model: msgModel,
					costUsd: msgCostUsd ?? undefined,
					durationMs: msgDurationMs ?? undefined,
				});
			}

			// Persist assistant message to IndexedDB
			{
				const sessionKey = get().sessionId || "default";
				const finalText = assistantText || extractTextContent(content);
				if (finalText.trim()) {
					const turnStart = get().perfTurnStartedAt;
					const firstToken = get().perfFirstTokenAt;
					const ttft = (firstToken > 0 && turnStart > 0) ? (firstToken - turnStart) : undefined;
					const savedId = uid();
					lastSavedAssistantMsgId = savedId;
					void saveMessage({
						id: savedId,
						sessionKey,
						role: "assistant",
						content: finalText,
						timestamp: assistantCreatedAt ?? Date.now(),
						usage: msgUsage as Record<string, unknown> | undefined,
						model: msgModel,
						elapsed: msgDurationMs,
						performance: ttft !== undefined ? { ttft } : undefined,
					} satisfies DBMessage);
				}
			}
			return;
		}

		// ── stream_event (incremental) ─────────────────────────────────────────
		if (type === "stream_event") {
			const event = msg.event as Record<string, unknown> | undefined;
			if (!event) return;
			const evType = String(event.type || "");

			if (evType === "content_block_start") {
				const block = event.content_block as Record<string, unknown> | undefined;
				if (!block) return;
				const blockType = String(block.type || "");
				if (blockType === "thinking") {
					set((state) => ({
						streaming: {
							...state.streaming,
							isThinking: true,
							thinkingText: "",
							spinnerMode: "thinking",
							vendorStatusText:
								state.streaming.vendorStatusSource === "vendor"
									? state.streaming.vendorStatusText
									: formatVendorStatusLabel(buildFallbackVendorStatus("thinking")),
							vendorStatusSource:
								state.streaming.vendorStatusSource === "vendor" ? "vendor" : "fallback",
						},
					}));
				} else if (blockType === "redacted_thinking") {
					addItem({
						kind: "thinking",
						id: uid(),
						data: { text: "", isStreaming: false, isRedacted: true },
					});
				} else if (blockType === "text") {
					set((state) => ({
						streaming: {
							...state.streaming,
							isStreaming: true,
							spinnerMode: "responding",
							vendorStatusText:
								state.streaming.vendorStatusSource === "vendor"
									? state.streaming.vendorStatusText
									: formatVendorStatusLabel(buildFallbackVendorStatus("responding")),
							vendorStatusSource:
								state.streaming.vendorStatusSource === "vendor" ? "vendor" : "fallback",
						},
					}));
				} else if (blockType === "tool_use") {
					const toolUseId = String(block.id || uid());
					const toolName = String(block.name || "");
					const tu: StreamingToolUse = {
						toolUseId,
						toolName,
						inputSummary: "",
						rawInput: {},
						status: "streaming-input",
					};
					set((state) => {
						const next = new Map(state.streaming.toolUses);
						next.set(toolUseId, tu);
						return {
							streaming: {
								...state.streaming,
								toolUses: next,
								spinnerMode: "tool-input",
								vendorStatusText:
									state.streaming.vendorStatusSource === "vendor"
										? state.streaming.vendorStatusText
										: formatVendorStatusLabel(buildFallbackVendorStatus("tool-input")),
								vendorStatusSource:
									state.streaming.vendorStatusSource === "vendor" ? "vendor" : "fallback",
							},
						};
					});
				}
				return;
			}

				if (evType === "content_block_delta") {
					const delta = event.delta as Record<string, unknown> | undefined;
					if (!delta) return;
					const deltaType = String(delta.type || "");

					if (deltaType === "thinking_delta") {
						const text = String(delta.thinking || "");
						queueThinkingStreamingDelta(text);
					} else if (deltaType === "text_delta") {
						const text = String(delta.text || "");
						if (get().perfFirstTokenAt === 0) {
							set({ perfFirstTokenAt: Date.now() });
						}
						get().appendStreamingText(text);
					}
					return;
				}

				if (evType === "content_block_stop") {
					flushQueuedStreamingDeltasNow();
					const s = get().streaming;
					if (s.isThinking && s.thinkingText) {
						addItem({
							kind: "thinking",
							id: uid(),
							data: { text: s.thinkingText, isStreaming: false, isRedacted: false },
						});
						set((state) => ({
							streaming: { ...state.streaming, isThinking: false, thinkingText: "" },
						}));
					}
					return;
				}

				if (evType === "message_start") {
					clearQueuedStreamingDeltas();
					set({ perfTurnStartedAt: Date.now(), perfFirstTokenAt: 0 });
					const startUsageRaw = asRecord(asRecord(event.message)?.usage);
					const startUsage = startUsageRaw
						? normalizeUsageRecord(startUsageRaw, getUsageProtocol(), get().sessionInit?.model ?? null)
						: null;
					if (startUsageRaw) {
						console.debug("[code-agent] message_start usage raw:", JSON.stringify(startUsageRaw));
						console.debug("[code-agent] message_start usage normalized:", JSON.stringify(startUsage));
					}
					const startInputTokens = startUsage ? Math.max(0, Math.round(
						pickNumber(startUsage, ["input_tokens", "inputTokens", "input"]) ?? 0)) : 0;
					const startCacheRead = startUsage ? Math.max(0, Math.round(
						pickNumber(startUsage, ["cache_read_input_tokens", "cacheReadInputTokens", "cacheRead"]) ?? 0)) : 0;
					const startCacheWrite = startUsage ? Math.max(0, Math.round(
						pickNumber(startUsage, ["cache_creation_input_tokens", "cacheCreationInputTokens", "cacheWrite"]) ?? 0)) : 0;
					set((state) => ({
						streaming: {
							...(state.streaming.assistantText
									|| state.streaming.thinkingText
									|| state.streaming.toolUses.size > 0
								? initialStreaming()
								: state.streaming),
							spinnerMode: "requesting",
							vendorStatusText:
								state.streaming.vendorStatusSource === "vendor"
									? state.streaming.vendorStatusText
									: formatVendorStatusLabel(buildFallbackVendorStatus("requesting")),
							vendorStatusSource:
								state.streaming.vendorStatusSource === "vendor" ? "vendor" : "fallback",
							accumulatedUsage: (startInputTokens > 0 || startCacheRead > 0 || startCacheWrite > 0)
								? { inputTokens: startInputTokens, outputTokens: 0, cacheReadTokens: startCacheRead, cacheWriteTokens: startCacheWrite }
								: null,
							turnStartedAt: Date.now(),
							firstTokenAt: 0,
						},
					}));
				}

				if (evType === "message_delta") {
				const deltaUsageRaw = asRecord(event.usage);
				const deltaUsage = deltaUsageRaw
					? normalizeUsageRecord(deltaUsageRaw, getUsageProtocol(), get().sessionInit?.model ?? null)
					: null;
				if (deltaUsageRaw) {
					console.debug("[code-agent] message_delta usage raw:", JSON.stringify(deltaUsageRaw));
					console.debug("[code-agent] message_delta usage normalized:", JSON.stringify(deltaUsage));
				}
				const deltaOutputTokens = deltaUsage ? Math.max(0, Math.round(
					pickNumber(deltaUsage, ["output_tokens", "outputTokens", "output"]) ?? 0)) : 0;
				const deltaInputTokens = deltaUsage ? Math.max(0, Math.round(
					pickNumber(deltaUsage, ["input_tokens", "inputTokens", "input"]) ?? 0)) : 0;
				const deltaCacheRead = deltaUsage ? Math.max(0, Math.round(
					pickNumber(deltaUsage, ["cache_read_input_tokens", "cacheReadInputTokens"]) ?? 0)) : 0;
				const deltaCacheWrite = deltaUsage ? Math.max(0, Math.round(
					pickNumber(deltaUsage, ["cache_creation_input_tokens", "cacheCreationInputTokens"]) ?? 0)) : 0;

				// message_delta arrives AFTER the assistant message, so we
				// emit the assistant-usage item here when we finally have data.
				const totalDelta = deltaOutputTokens + deltaInputTokens + deltaCacheRead + deltaCacheWrite;
				if (totalDelta > 0) {
					const streamState = get().streaming;
					const prev = streamState.accumulatedUsage;
					const finalUsage = {
						inputTokens: Math.max(prev?.inputTokens ?? 0, deltaInputTokens),
						outputTokens: Math.max(prev?.outputTokens ?? 0, deltaOutputTokens),
						cacheReadTokens: Math.max(prev?.cacheReadTokens ?? 0, deltaCacheRead),
						cacheWriteTokens: Math.max(prev?.cacheWriteTokens ?? 0, deltaCacheWrite),
						totalTokens: 0,
					};
					finalUsage.totalTokens = finalUsage.inputTokens + finalUsage.outputTokens + finalUsage.cacheReadTokens + finalUsage.cacheWriteTokens;

					// Extract model from the stream event's message context
					const streamMsg = asRecord(msg.message) ?? asRecord((msg as Record<string,unknown>).streamEventMessage);
					const deltaModel = typeof streamMsg?.model === "string" ? streamMsg.model as string : undefined;

					// Compute elapsed (ms) and performance metrics
					const now = Date.now();
					const turnStart = get().perfTurnStartedAt;
					const firstToken = get().perfFirstTokenAt;
					const elapsedMs = turnStart > 0 ? (now - turnStart) : undefined;
					const ttftMs = (firstToken > 0 && turnStart > 0) ? (firstToken - turnStart) : undefined;
					const tps = (elapsedMs && elapsedMs > 0 && finalUsage.outputTokens > 0)
						? finalUsage.outputTokens / (elapsedMs / 1000)
						: undefined;

					addItem({
						kind: "assistant-usage",
						id: uid(),
						usage: finalUsage,
						model: deltaModel,
						durationMs: elapsedMs,
						ttftMs,
						tps,
					});

					// Update the last saved assistant message in DB with final performance
					if (lastSavedAssistantMsgId && (ttftMs !== undefined || tps !== undefined)) {
						void updateMessagePerformance(lastSavedAssistantMsgId, { ttft: ttftMs, tps });
						lastSavedAssistantMsgId = null;
					}

				}

				set((state) => {
					const prev = state.streaming.accumulatedUsage;
					return {
						streaming: {
							...state.streaming,
							spinnerMode: "responding",
							vendorStatusText:
								state.streaming.vendorStatusSource === "vendor"
									? state.streaming.vendorStatusText
									: formatVendorStatusLabel(buildFallbackVendorStatus("responding")),
							vendorStatusSource:
								state.streaming.vendorStatusSource === "vendor" ? "vendor" : "fallback",
							accumulatedUsage: totalDelta > 0
								? {
									inputTokens: Math.max(prev?.inputTokens ?? 0, deltaInputTokens),
									outputTokens: Math.max(prev?.outputTokens ?? 0, deltaOutputTokens),
									cacheReadTokens: Math.max(prev?.cacheReadTokens ?? 0, deltaCacheRead),
									cacheWriteTokens: Math.max(prev?.cacheWriteTokens ?? 0, deltaCacheWrite),
								}
								: prev,
						},
					};
				});
				}
				return;
			}

		// ── tool_progress ─────────────────────────────────────────────────────
		if (type === "tool_progress") {
			const toolUseId = String(msg.tool_use_id || "");
			const elapsed = Number(msg.elapsed_time_seconds ?? 0);
			set((state) => {
				if (!state.streaming.toolUses.has(toolUseId)) return state;
				const next = new Map(state.streaming.toolUses);
				const existing = next.get(toolUseId);
				if (existing) {
					next.set(toolUseId, { ...existing, elapsedSeconds: elapsed, status: "executing" });
				}
				return {
					streaming: {
						...state.streaming,
						toolUses: next,
						spinnerMode: "tool-use",
						vendorStatusText:
							state.streaming.vendorStatusSource === "vendor"
								? state.streaming.vendorStatusText
								: formatVendorStatusLabel(buildFallbackVendorStatus("tool-use")),
						vendorStatusSource:
							state.streaming.vendorStatusSource === "vendor" ? "vendor" : "fallback",
					},
				};
			});
			return;
		}

		// ── result (turn complete) ─────────────────────────────────────────────
			if (type === "result") {
				clearQueuedStreamingDeltas();
				const isError = Boolean(msg.is_error);
				const numTurns = Number(msg.num_turns ?? 0);
				const totalCostUsd = Number(msg.total_cost_usd ?? 0);
			const durationMs = Number(msg.duration_ms ?? 0);

			// The result message carries aggregate usage across all turns.
			// Backfill any zero fields in the last assistant-usage item.
			const resultUsageRaw = asRecord(msg.usage);
			const resultUsage = resultUsageRaw
				? normalizeUsageRecord(resultUsageRaw, getUsageProtocol(), get().sessionInit?.model ?? null)
				: null;
			if (resultUsageRaw) {
				console.debug("[code-agent] result usage raw:", JSON.stringify(resultUsageRaw));
				console.debug("[code-agent] result usage normalized:", JSON.stringify(resultUsage));
			}
			if (resultUsage) {
				const items = get().items;
				for (let i = items.length - 1; i >= 0; i--) {
					const it = items[i];
					if (it.kind === "assistant-usage") {
						let updated = false;
						const u = { ...it.usage };
						const rInput = Math.max(0, Math.round(
							pickNumber(resultUsage, ["input_tokens", "inputTokens"]) ?? 0));
						const rCacheRead = Math.max(0, Math.round(
							pickNumber(resultUsage, ["cache_read_input_tokens", "cacheReadInputTokens"]) ?? 0));
						const rCacheWrite = Math.max(0, Math.round(
							pickNumber(resultUsage, ["cache_creation_input_tokens", "cacheCreationInputTokens"]) ?? 0));
						if (u.inputTokens === 0 && rInput > 0) { u.inputTokens = rInput; updated = true; }
						if (u.cacheReadTokens === 0 && rCacheRead > 0) { u.cacheReadTokens = rCacheRead; updated = true; }
						if (u.cacheWriteTokens === 0 && rCacheWrite > 0) { u.cacheWriteTokens = rCacheWrite; updated = true; }
						if (updated) {
							u.totalTokens = u.inputTokens + u.outputTokens + u.cacheReadTokens + u.cacheWriteTokens;
							const newItems = [...items];
							newItems[i] = { ...it, usage: u, durationMs: it.durationMs ?? (durationMs || undefined) };
							set({ items: newItems });
						}
						break;
					}
				}
			}

			addItem({ kind: "result", id: uid(), isError, numTurns, totalCostUsd, durationMs });
			set({ sessionState: "idle", streaming: initialStreaming(), lastUpdatedAt: Date.now() });

			// Persist all assistant-usage TPS data to IndexedDB for the session
			const sid = get().sessionId;
			if (sid) {
				const allItems = get().items;
				const perfEntries = allItems
					.filter((it): it is Extract<typeof it, { kind: "assistant-usage" }> =>
						it.kind === "assistant-usage" && (!!it.tps || !!it.ttftMs || !!it.durationMs))
					.map((it) => ({
						outputTokens: it.usage.outputTokens,
						tps: it.tps,
						ttftMs: it.ttftMs,
						durationMs: it.durationMs,
					}));
				if (perfEntries.length > 0) {
					void saveCodeAgentSessionPerf(sid, perfEntries);
				}
			}
				return;
			}

		// ── rate_limit_event ──────────────────────────────────────────────────
		if (type === "rate_limit_event") {
			const info = msg.rate_limit_info as Record<string, unknown> | undefined;
			const status = String(info?.status ?? "allowed");
			const resetsAt = typeof info?.resetsAt === "number" ? info.resetsAt : null;
			const utilization = typeof info?.utilization === "number" ? info.utilization : null;
			set({ rateLimitInfo: { status, resetsAt: resetsAt ?? undefined, utilization: utilization ?? undefined } });
			if (status === "rejected" || status === "allowed_warning") {
				addItem({
					kind: "rate-limit",
					id: uid(),
					resetsAt,
					utilization,
					status,
				});
			}
			return;
		}

		// ── auth_status ───────────────────────────────────────────────────────
		if (type === "auth_status") {
			const output = Array.isArray(msg.output) ? (msg.output as string[]).join("\n") : "";
			if (output) {
				addItem({ kind: "system-notice", id: uid(), text: output, variant: "info" });
			}
			return;
		}

		// ── user (tool_result or first user message) ──────────────────────────
			if (type === "user") {
			const message = msg.message as Record<string, unknown> | undefined;
			const content = message?.content;
			// Capture session title from the first plain text user message
			if (!get().sessionTitle && typeof content === "string" && content.trim()) {
				const title = content.trim().slice(0, 20);
				set({ sessionTitle: title });
			} else if (!get().sessionTitle && Array.isArray(content)) {
				const textBlock = (content as Array<Record<string, unknown>>).find(
					(b) => b.type === "text" && typeof b.text === "string" && (b.text as string).trim(),
				);
				if (textBlock) {
					const title = (textBlock.text as string).trim().slice(0, 20);
					set({ sessionTitle: title });
				}
			}
			
			// Also add the user message to the timeline if it is not just meta/tool_result
			if (!msg.isMeta) {
				const userText = extractTextContent(content);
				if (userText.trim()) {
					// Check if we already optimistically added this message
					const existingUserMsgs = get().items.filter(i => i.kind === "user");
					const lastUserMsg = existingUserMsgs[existingUserMsgs.length - 1];
					if (!lastUserMsg || lastUserMsg.text !== userText.trim()) {
						const userTs = typeof msg.timestamp === "string" ? Date.parse(msg.timestamp) : toFiniteNumber(msg.timestamp);
						addItem({ kind: "user", id: String(msg.uuid || uid()), text: userText.trim(), createdAt: userTs ?? undefined });
					}
				}
			}

			if (Array.isArray(content)) {
				for (const block of content as Array<Record<string, unknown>>) {
					if (block.type === "tool_result") {
						const toolUseId = String(block.tool_use_id || "");
						const resultText = extractTextContent(block.content);
						// Update the completed tool-use item in the timeline with result info
						set((state) => ({
							items: state.items.map((item) =>
								item.kind === "tool-use" && item.tool.toolUseId === toolUseId
									? {
											...item,
											tool: {
												...item.tool,
												status: "completed" as const,
												resultSummary: resultText.slice(0, 120),
											},
										}
									: item,
							),
						}));
					}
				}
			}
				return;
			}
		},
	};
});

/** Backward-compatible alias — use `useChatStore` for new code */
export const useCodeAgentStore = useChatStore;
