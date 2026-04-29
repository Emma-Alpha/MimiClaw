/**
 * Pure helper functions extracted from the CodeAgent chat store.
 *
 * These are stateless utilities used by the store actions and, in some cases,
 * exported for consumption by other modules.
 */
import { buildUnifiedPatch } from "@/lib/diff-utils";
import { normalizeUsageRecord } from "@/lib/usageAdapter";
import type { CodeAgentUsageProtocol } from "../../../../../shared/code-agent";
import type {
	CodeAgentContextWindowUsage,
	CodeAgentTimelineItem,
	SpinnerMode,
	StreamingToolUse,
	VendorStatusSource,
} from "./types";

// ─── Lazy store accessors ───────────────────────────────────────────────────

/** Lazily read the usage protocol from settings to avoid circular imports */
export function getUsageProtocol(): CodeAgentUsageProtocol {
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

/** Lazily read per-session config from the chat store's sessionConfig slice */
export function getSessionConfig(): { model?: string; effort?: string; thinkingLevel?: string } {
	try {
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const { useChatStore } = require("@/stores/chat/store") as {
			useChatStore: { getState: () => { sessionModel: string | null; sessionEffort: string | null; sessionThinkingLevel: string | null } };
		};
		const s = useChatStore.getState();
		return { model: s.sessionModel || undefined, effort: s.sessionEffort || undefined, thinkingLevel: s.sessionThinkingLevel || undefined };
	} catch {
		return {};
	}
}

// ─── ID generation ──────────────────────────────────────────────────────────

export function uid() {
	return crypto.randomUUID();
}

// ─── Text extraction ────────────────────────────────────────────────────────

export function extractTextContent(value: unknown): string {
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

// ─── Tool input summary ─────────────────────────────────────────────────────

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

// ─── Diff generation ────────────────────────────────────────────────────────

/** Extract and add a diff item for file-edit/write tool uses */
export function buildDiffForToolUse(
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

// ─── Spinner verbs ──────────────────────────────────────────────────────────

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

export function sampleSpinnerVerb(): string {
	return SPINNER_VERBS[Math.floor(Math.random() * SPINNER_VERBS.length)] || "Thinking";
}

// ─── Vendor status helpers ──────────────────────────────────────────────────

export function buildFallbackVendorStatus(
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

export function formatVendorStatusLabel(statusText: string): string {
	const normalized = statusText.trim().replace(/[.…]+$/u, "");
	if (!normalized) return "";
	return `✶ ${normalized}…`;
}

export function extractVendorStatus(msg: Record<string, unknown>): string {
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

// ─── Context window / usage helpers ─────────────────────────────────────────

const DEFAULT_CONTEXT_WINDOW_TOKENS = 200_000;

export function asRecord(value: unknown): Record<string, unknown> | null {
	return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

export function toFiniteNumber(value: unknown): number | null {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value === "string") {
		const parsed = Number(value);
		if (Number.isFinite(parsed)) return parsed;
	}
	return null;
}

export function pickNumber(record: Record<string, unknown> | null, keys: string[]): number | null {
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

// ─── Rough token estimation ─────────────────────────────────────────────────

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

// ─── History usage candidate ────────────────────────────────────────────────

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

// ─── extractContextUsage (live streaming) ───────────────────────────────────

export function extractContextUsage(
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

// ─── Initial streaming state factory ────────────────────────────────────────

export function initialStreaming() {
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
