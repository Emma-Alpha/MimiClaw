/**
 * Class-based action implementation for the CodeAgent chat store.
 *
 * This is a pure structural refactoring — all logic is identical to the
 * closure-based implementation previously in store.ts lines 1245-2495.
 *
 * Follows the same pattern as `src/stores/agents/action.ts`.
 */
import {
	saveCodeAgentSessionPerf,
	saveMessage,
	saveSession,
	updateMessagePerformance,
	type DBMessage,
} from "@/lib/db";
import { normalizeUsageRecord } from "@/lib/usageAdapter";
import type { StoreSetter, StoreGetter, StorePublicActions } from "@/stores/types";
import type {
	ActiveTask,
	CodeAgentContextWindowUsage,
	CodeAgentStore,
	CodeAgentTimelineItem,
	CodeAgentUserMessageMeta,
	PendingPermission,
	SessionInitInfo,
	StreamingToolUse,
} from "./types";
import {
	uid,
	extractTextContent,
	buildInputSummary,
	buildDiffForToolUse,
	buildFallbackVendorStatus,
	formatVendorStatusLabel,
	extractVendorStatus,
	asRecord,
	toFiniteNumber,
	pickNumber,
	extractContextUsage,
	initialStreaming,
	getUsageProtocol,
	getSessionConfig,
} from "./helpers";

type Setter = StoreSetter<CodeAgentStore>;
type Getter = StoreGetter<CodeAgentStore>;

export class TimelineActionImpl {
	readonly #set: Setter;
	readonly #get: Getter;

	// Streaming queue state (was closure-scoped in store.ts lines 1246-1254)
	#queuedStreamingDeltas = { assistant: "", thinking: "" };
	#scheduledStreamingFlush: number | ReturnType<typeof setTimeout> | null = null;
	#scheduledWithAnimationFrame = false;
	/** Tracks the DB id of the last saved assistant message so message_delta can
	 *  update it with computed performance (TPS/TTFT). */
	#lastSavedAssistantMsgId: string | null = null;

	constructor(set: Setter, get: Getter, _api?: unknown) {
		void _api;
		this.#set = set;
		this.#get = get;
	}

	// ── Private streaming queue methods (were closure functions in lines 1256-1345) ──

	#canUseAnimationFrame = () =>
		typeof globalThis !== "undefined"
		&& typeof globalThis.requestAnimationFrame === "function"
		&& typeof globalThis.cancelAnimationFrame === "function";

	#flushQueuedStreamingDeltas = () => {
		const assistantDelta = this.#queuedStreamingDeltas.assistant;
		const thinkingDelta = this.#queuedStreamingDeltas.thinking;
		if (!assistantDelta && !thinkingDelta) return;

		this.#queuedStreamingDeltas.assistant = "";
		this.#queuedStreamingDeltas.thinking = "";

		this.#set((state) => {
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

	#clearScheduledStreamingFlush = () => {
		if (this.#scheduledStreamingFlush == null) return;

		if (this.#scheduledWithAnimationFrame && this.#canUseAnimationFrame()) {
			globalThis.cancelAnimationFrame(this.#scheduledStreamingFlush as number);
		} else {
			clearTimeout(this.#scheduledStreamingFlush as ReturnType<typeof setTimeout>);
		}
		this.#scheduledStreamingFlush = null;
		this.#scheduledWithAnimationFrame = false;
	};

	#flushQueuedStreamingDeltasNow = () => {
		this.#clearScheduledStreamingFlush();
		this.#flushQueuedStreamingDeltas();
	};

	#clearQueuedStreamingDeltas = () => {
		this.#clearScheduledStreamingFlush();
		this.#queuedStreamingDeltas.assistant = "";
		this.#queuedStreamingDeltas.thinking = "";
	};

	#scheduleStreamingFlush = () => {
		if (this.#scheduledStreamingFlush != null) return;

		if (this.#canUseAnimationFrame()) {
			this.#scheduledWithAnimationFrame = true;
			this.#scheduledStreamingFlush = globalThis.requestAnimationFrame(() => {
				this.#scheduledStreamingFlush = null;
				this.#scheduledWithAnimationFrame = false;
				this.#flushQueuedStreamingDeltas();
			});
			return;
		}

		this.#scheduledWithAnimationFrame = false;
		this.#scheduledStreamingFlush = setTimeout(() => {
			this.#scheduledStreamingFlush = null;
			this.#flushQueuedStreamingDeltas();
		}, 16);
	};

	#queueAssistantStreamingDelta = (text: string) => {
		if (!text) return;
		this.#queuedStreamingDeltas.assistant += text;
		this.#scheduleStreamingFlush();
	};

	#queueThinkingStreamingDelta = (text: string) => {
		if (!text) return;
		this.#queuedStreamingDeltas.thinking += text;
		this.#scheduleStreamingFlush();
	};

	// ── Private helper ──

	#addItem = (item: CodeAgentTimelineItem) => {
		this.#set((state) => ({ items: [...state.items, item] }));
	};

	// ── Public actions ──────────────────────────────────────────────────────────

	reset = () => {
		this.#clearQueuedStreamingDeltas();
		this.#get().resetSessionConfig();
		this.#set({
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
	};

	resetStreaming = () => {
		this.#clearQueuedStreamingDeltas();
		this.#set({
			streaming: initialStreaming(),
			pendingPermission: null,
			pendingElicitation: null,
			rateLimitInfo: null,
		});
	};

	appendStreamingText = (text: string) => {
		if (!text) return;
		this.#queueAssistantStreamingDelta(text);
		this.#set((state) => {
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
	};

	setPendingPermission = (p: PendingPermission | null) => {
		this.#set({ pendingPermission: p });
	};

	setContextUsage = (usage: CodeAgentContextWindowUsage | null) => {
		this.#set({ contextUsage: usage });
	};

	resolvePermission = (requestId: string, _decision: "allow" | "allow-session" | "deny") => {
		const current = this.#get().pendingPermission;
		if (current?.requestId === requestId) {
			this.#set({ pendingPermission: null });
		}
		// Remove any pending permission item from timeline so the card disappears
		this.#set((state) => ({
			items: state.items.filter(
				(item) =>
					!(item.kind === "permission-request" && item.requestId === requestId),
			),
		}));
	};

	resolveElicitation = (_action: "accept" | "decline", _content?: Record<string, unknown>) => {
		this.#set({ pendingElicitation: null });
		this.#set((state) => ({
			items: state.items.filter((item) => item.kind !== "elicitation"),
		}));
	};

	addSessionAllowedTool = (toolName: string) => {
		this.#set((state) => {
			const next = new Set(state.sessionAllowedTools);
			next.add(toolName.toLowerCase());
			return { sessionAllowedTools: next };
		});
	};

	pushUserMessage = (text: string, meta?: CodeAgentUserMessageMeta) => {
		const imagePreviews = meta?.imagePreviews?.length ? meta.imagePreviews : undefined;
		const mentionTags = meta?.mentionTags?.length ? meta.mentionTags : undefined;
		const pathTags = meta?.pathTags?.length ? meta.pathTags : undefined;
		const richContent = meta?.richContent?.length ? meta.richContent : undefined;
		const msgId = uid();
		this.#set((state) => ({
			items: [
				...state.items,
				{
					kind: "user",
					id: msgId,
					text,
					imagePreviews,
					mentionTags,
					pathTags,
					richContent,
				},
			],
		}));

		// Persist user message to IndexedDB
		const sessionKey = this.#get().sessionId || "default";
		void saveMessage({
			id: msgId,
			sessionKey,
			role: "user",
			content: text,
			timestamp: Date.now(),
		} satisfies DBMessage);
	};

	pushSdkMessage = (raw: unknown) => {
		if (!raw || typeof raw !== "object") return;
		const msg = raw as Record<string, unknown>;
		const type = msg.type as string | undefined;
		if (!type) return;

		// ── MCP diagnostics: log control_request and elicitation events ──
		if (type === "control_request") {
			const request = msg.request as Record<string, unknown> | undefined;
			const subtype = (msg.subtype || request?.subtype) as string | undefined;
			if (subtype === "elicitation") {
				console.log(
					"%c[MCP-DIAG] ✅ Elicitation received (adapter auto-responds)",
					"color: #22c55e; font-weight: bold; font-size: 13px",
					{
						requestId: msg.request_id,
						mcpServerName: request?.mcp_server_name,
						message: typeof request?.message === "string" ? request.message.substring(0, 120) : undefined,
						schema: request?.requested_schema,
					},
				);
			} else {
				console.log(
					"%c[MCP-DIAG] control_request in store",
					"color: #f59e0b; font-weight: bold",
					{ subtype, requestId: msg.request_id },
				);
			}
		}
		if (type !== "stream_event") {
			this.#flushQueuedStreamingDeltasNow();
		}

			const vendorStatusText = extractVendorStatus(msg);
			if (vendorStatusText) {
				this.#set((state) => ({
					streaming: {
						...state.streaming,
						vendorStatusText: formatVendorStatusLabel(vendorStatusText),
						vendorStatusSource: "vendor",
					},
				}));
			}

			const contextUsage = extractContextUsage(
				msg,
				this.#get().sessionInit?.model ?? null,
				this.#get().contextUsage,
				getUsageProtocol(),
			);
			if (contextUsage) {
				this.#set({ contextUsage });
			}

		// ── system messages ────────────────────────────────────────────────────
		if (type === "system") {
			const subtype = msg.subtype as string | undefined;

			if (subtype === "init") {
				const tools = Array.isArray(msg.tools) ? (msg.tools as string[]) : [];
				const mcpServers = Array.isArray(msg.mcp_servers)
					? (msg.mcp_servers as Array<{ name: string; status: string }>)
					: [];

				// ── MCP diagnostics: log init info to browser console ──
				const mcpTools = tools.filter((t) => t.includes("__"));
				console.log(
					"%c[MCP-DIAG] system.init",
					"color: #0ea5e9; font-weight: bold",
					{
						totalTools: tools.length,
						mcpTools: mcpTools.length > 0 ? mcpTools : "(none)",
						mcpServers: mcpServers.length > 0 ? mcpServers : "(none)",
						allTools: tools,
						model: msg.model,
						cwd: msg.cwd,
					},
				);
				if (mcpTools.length === 0 && mcpServers.length === 0) {
					console.warn(
						"%c[MCP-DIAG] ⚠ No MCP tools or servers detected! MCP plugins will not work.",
						"color: #f59e0b; font-weight: bold",
					);
				}

				const init: SessionInitInfo = {
					model: String(msg.model || ""),
					permissionMode: String(msg.permissionMode || "default"),
					tools,
					mcpServers,
					cwd: String(msg.cwd || ""),
					claudeCodeVersion: String(msg.claude_code_version || ""),
				};
				const sid = String(msg.session_id || "");
				this.#set({
					sessionId: sid,
					sessionInit: init,
				});

				// Initialize per-session config from global defaults if not already set
				if (this.#get().sessionModel == null) {
					try {
						// eslint-disable-next-line @typescript-eslint/no-require-imports
						const { useSettingsStore: settingsStore } = require("@/stores/settings/store") as {
							useSettingsStore: { getState: () => { codeAgent?: { model?: string; effort?: string } } };
						};
						const g = settingsStore.getState().codeAgent;
						this.#get().restoreSessionConfig({
							model: init.model || g?.model || '',
							effort: g?.effort ?? '',
							thinkingLevel: 'none',
						});
					} catch { /* ignore */ }
				}

				// Persist session metadata to IndexedDB
				if (sid) {
					const now = Date.now();
					const state = this.#get();
					void saveSession({
						key: sid,
						model: state.sessionModel || init.model || undefined,
						effort: state.sessionEffort || undefined,
						thinkingLevel: state.sessionThinkingLevel || undefined,
						updatedAt: now,
						createdAt: now,
					});
				}

				this.#addItem({
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
				this.#addItem({
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
					this.#addItem({ kind: "system-notice", id: uid(), text: "⟳ 正在压缩上下文…", variant: "info" });
				}
				this.#set((state) => {
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
				if (state) this.#set({ sessionState: state });
				return;
			}

			if (subtype === "api_retry") {
					// Retry starts a fresh upstream attempt; drop partial text/tool state
					// from the failed attempt so the next stream doesn't concatenate it.
					// However, if another request in the same session is already streaming
					// meaningful content, don't destroy it — the retry is for a different
					// parallel API call (e.g. a model that 502s while another streams).
					const currentStreaming = this.#get().streaming;
					const hasActiveContent =
						currentStreaming.assistantText.length > 0
						|| currentStreaming.thinkingText.length > 0
						|| currentStreaming.toolUses.size > 0;
					if (!hasActiveContent) {
						this.#clearQueuedStreamingDeltas();
						this.#set((state) => ({
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
					}
					this.#addItem({
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
				this.#addItem({
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
				this.#set((state) => ({
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
				this.#set((state) => ({
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
				const parentTaskId = typeof msg.parent_task_id === "string" ? msg.parent_task_id : undefined;
				const task: ActiveTask = {
					taskId,
					description,
					toolUseId,
					parentTaskId,
					status: "running",
					progressEntries: [],
					toolNames: [],
					startedAt: Date.now(),
				};
				this.#set((state) => {
					const next = new Map(state.activeTasks);
					next.set(taskId, task);
					return { activeTasks: next };
				});
				this.#addItem({ kind: "task-start", id: uid(), taskId, description, parentTaskId });
				return;
			}

			if (subtype === "task_progress") {
				const taskId = String(msg.task_id || "");
				const progressText = String(msg.content || msg.text || "");
				const toolName = typeof msg.tool_name === "string" ? msg.tool_name : undefined;
				this.#set((state) => {
					const existing = state.activeTasks.get(taskId);
					if (!existing) return state;
					const next = new Map(state.activeTasks);
					const updated = { ...existing };
					if (progressText) {
						updated.progressEntries = [
							...updated.progressEntries,
							{ text: progressText, timestamp: Date.now() },
						];
					}
					if (toolName && !updated.toolNames.includes(toolName)) {
						updated.toolNames = [...updated.toolNames, toolName];
					}
					next.set(taskId, updated);
					return { activeTasks: next };
				});
				return;
			}

			if (subtype === "task_notification") {
				const taskId = String(msg.task_id || "");
				const status = (msg.status as "completed" | "failed" | "stopped") || "completed";
				const summary = String(msg.summary || "");
				const existing = this.#get().activeTasks.get(taskId);
				const durationMs = existing ? (Date.now() - existing.startedAt) : undefined;
				this.#set((state) => {
					const next = new Map(state.activeTasks);
					const task = next.get(taskId);
					if (task) {
						next.set(taskId, { ...task, status, completedAt: Date.now(), summary });
					} else {
						next.delete(taskId);
					}
					return { activeTasks: next };
				});
				this.#addItem({ kind: "task-end", id: uid(), taskId, status, summary, durationMs });
				return;
			}

			if (subtype === "elicitation_complete") {
				this.#set({ pendingElicitation: null });
				return;
			}

			if (subtype === "local_command_output") {
				this.#addItem({
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
				this.#flushQueuedStreamingDeltasNow();
				const content = (msg.message as Record<string, unknown>)?.content;
				const streaming = this.#get().streaming;
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
				? normalizeUsageRecord(msgUsageRawOriginal, getUsageProtocol(), msgModel ?? this.#get().sessionInit?.model ?? null)
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
				this.#addItem({
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
				this.#addItem({ kind: "tool-use", id: uid(), tool: { ...tu, status: "completed" } });
				buildDiffForToolUse(tu, this.#addItem);
			}

			// Flush accumulated streaming text (populated via appendStreamingText from
			// code-agent:token events which fire before this sdk-message arrives).
			const assistantText = streaming.assistantText;
			if (assistantText.trim()) {
				this.#addItem({ kind: "assistant-text", id: uid(), text: assistantText, isStreaming: false, createdAt: assistantCreatedAt });
			}

			// Reset streaming state
				this.#clearQueuedStreamingDeltas();
				this.#set({ streaming: initialStreaming() });

			// In CLI stream-json mode there are no incremental stream events, so
			// streaming.toolUses and streaming.assistantText are empty.
			// Parse content blocks directly from the completed assistant message.
			if (Array.isArray(content)) {
				for (const block of content as Array<Record<string, unknown>>) {
					if (block.type === "text" && block.text && !assistantText) {
						// Only add text directly if streaming path didn't already flush it
						this.#addItem({ kind: "assistant-text", id: uid(), text: String(block.text), isStreaming: false, createdAt: assistantCreatedAt });
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
						this.#addItem({ kind: "tool-use", id: uid(), tool: tu });
						buildDiffForToolUse(tu, this.#addItem);
					}
					if (block.type === "thinking" && toolUses.size === 0 && !thinkingText) {
						this.#addItem({
							kind: "thinking",
							id: uid(),
							data: { text: String(block.thinking || ""), isStreaming: false, isRedacted: false },
						});
					}
					if (block.type === "redacted_thinking") {
						this.#addItem({
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
				this.#addItem({
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
				const sessionKey = this.#get().sessionId || "default";
				const finalText = assistantText || extractTextContent(content);
				if (finalText.trim()) {
					const turnStart = this.#get().perfTurnStartedAt;
					const firstToken = this.#get().perfFirstTokenAt;
					const ttft = (firstToken > 0 && turnStart > 0) ? (firstToken - turnStart) : undefined;
					const savedId = uid();
					this.#lastSavedAssistantMsgId = savedId;
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
					this.#set((state) => ({
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
					this.#addItem({
						kind: "thinking",
						id: uid(),
						data: { text: "", isStreaming: false, isRedacted: true },
					});
				} else if (blockType === "text") {
					this.#set((state) => ({
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
					this.#set((state) => {
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
						this.#queueThinkingStreamingDelta(text);
					} else if (deltaType === "text_delta") {
						const text = String(delta.text || "");
						if (this.#get().perfFirstTokenAt === 0) {
							this.#set({ perfFirstTokenAt: Date.now() });
						}
						this.appendStreamingText(text);
					}
					return;
				}

				if (evType === "content_block_stop") {
					this.#flushQueuedStreamingDeltasNow();
					const s = this.#get().streaming;
					if (s.isThinking && s.thinkingText) {
						this.#addItem({
							kind: "thinking",
							id: uid(),
							data: { text: s.thinkingText, isStreaming: false, isRedacted: false },
						});
						this.#set((state) => ({
							streaming: { ...state.streaming, isThinking: false, thinkingText: "" },
						}));
					}
					return;
				}

				if (evType === "message_start") {
					this.#clearQueuedStreamingDeltas();
					this.#set({ perfTurnStartedAt: Date.now(), perfFirstTokenAt: 0 });
					const startUsageRaw = asRecord(asRecord(event.message)?.usage);
					const startUsage = startUsageRaw
						? normalizeUsageRecord(startUsageRaw, getUsageProtocol(), this.#get().sessionInit?.model ?? null)
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
					this.#set((state) => ({
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
					? normalizeUsageRecord(deltaUsageRaw, getUsageProtocol(), this.#get().sessionInit?.model ?? null)
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
					const streamState = this.#get().streaming;
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
					const turnStart = this.#get().perfTurnStartedAt;
					const firstToken = this.#get().perfFirstTokenAt;
					const elapsedMs = turnStart > 0 ? (now - turnStart) : undefined;
					const ttftMs = (firstToken > 0 && turnStart > 0) ? (firstToken - turnStart) : undefined;
					const tps = (elapsedMs && elapsedMs > 0 && finalUsage.outputTokens > 0)
						? finalUsage.outputTokens / (elapsedMs / 1000)
						: undefined;

					this.#addItem({
						kind: "assistant-usage",
						id: uid(),
						usage: finalUsage,
						model: deltaModel,
						durationMs: elapsedMs,
						ttftMs,
						tps,
					});

					// Update the last saved assistant message in DB with final performance
					if (this.#lastSavedAssistantMsgId && (ttftMs !== undefined || tps !== undefined)) {
						void updateMessagePerformance(this.#lastSavedAssistantMsgId, { ttft: ttftMs, tps });
						this.#lastSavedAssistantMsgId = null;
					}

				}

				this.#set((state) => {
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
			this.#set((state) => {
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
				this.#clearQueuedStreamingDeltas();
				const isError = Boolean(msg.is_error);
				const numTurns = Number(msg.num_turns ?? 0);
				const totalCostUsd = Number(msg.total_cost_usd ?? 0);
			const durationMs = Number(msg.duration_ms ?? 0);

			// The result message carries aggregate usage across all turns.
			// Backfill any zero fields in the last assistant-usage item.
			const resultUsageRaw = asRecord(msg.usage);
			const resultUsage = resultUsageRaw
				? normalizeUsageRecord(resultUsageRaw, getUsageProtocol(), this.#get().sessionInit?.model ?? null)
				: null;
			if (resultUsageRaw) {
				console.debug("[code-agent] result usage raw:", JSON.stringify(resultUsageRaw));
				console.debug("[code-agent] result usage normalized:", JSON.stringify(resultUsage));
			}
			if (resultUsage) {
				const items = this.#get().items;
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
							this.#set({ items: newItems });
						}
						break;
					}
				}
			}

			this.#addItem({ kind: "result", id: uid(), isError, numTurns, totalCostUsd, durationMs });
			this.#set({ sessionState: "idle", streaming: initialStreaming(), lastUpdatedAt: Date.now() });

			// Update session updatedAt in IndexedDB when a result is received
			{
				const sid = this.#get().sessionId;
				const title = this.#get().sessionTitle;
				const model = this.#get().sessionInit?.model;
				if (sid) {
					void saveSession({
						key: sid,
						displayName: title || undefined,
						model: getSessionConfig().model || model || undefined,
						effort: getSessionConfig().effort || undefined,
						thinkingLevel: getSessionConfig().thinkingLevel || undefined,
						updatedAt: Date.now(),
						createdAt: Date.now(),
					});
				}
			}

			// Persist all assistant-usage TPS data to IndexedDB for the session
			const sid = this.#get().sessionId;
			if (sid) {
				const allItems = this.#get().items;
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
			this.#set({ rateLimitInfo: { status, resetsAt: resetsAt ?? undefined, utilization: utilization ?? undefined } });
			if (status === "rejected" || status === "allowed_warning") {
				this.#addItem({
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
				this.#addItem({ kind: "system-notice", id: uid(), text: output, variant: "info" });
			}
			return;
		}

		// ── user (tool_result or first user message) ──────────────────────────
			if (type === "user") {
			const message = msg.message as Record<string, unknown> | undefined;
			const content = message?.content;
			// Capture session title from the first plain text user message
			if (!this.#get().sessionTitle && typeof content === "string" && content.trim()) {
				const title = content.trim().slice(0, 20);
				this.#set({ sessionTitle: title });
				// Update session in IndexedDB with the derived title
				const sid = this.#get().sessionId;
				if (sid) {
					void saveSession({ key: sid, displayName: title, model: getSessionConfig().model || undefined, effort: getSessionConfig().effort || undefined, thinkingLevel: getSessionConfig().thinkingLevel || undefined, updatedAt: Date.now(), createdAt: Date.now() });
				}
			} else if (!this.#get().sessionTitle && Array.isArray(content)) {
				const textBlock = (content as Array<Record<string, unknown>>).find(
					(b) => b.type === "text" && typeof b.text === "string" && (b.text as string).trim(),
				);
				if (textBlock) {
					const title = (textBlock.text as string).trim().slice(0, 20);
					this.#set({ sessionTitle: title });
					// Update session in IndexedDB with the derived title
					const sid = this.#get().sessionId;
					if (sid) {
						void saveSession({ key: sid, displayName: title, model: getSessionConfig().model || undefined, effort: getSessionConfig().effort || undefined, thinkingLevel: getSessionConfig().thinkingLevel || undefined, updatedAt: Date.now(), createdAt: Date.now() });
					}
				}
			}

			// Also add the user message to the timeline if it is not just meta/tool_result
			if (!msg.isMeta) {
				const userText = extractTextContent(content);
				if (userText.trim()) {
					// Check if we already optimistically added this message
					const existingUserMsgs = this.#get().items.filter(i => i.kind === "user");
					const lastUserMsg = existingUserMsgs[existingUserMsgs.length - 1];
					if (!lastUserMsg || lastUserMsg.text !== userText.trim()) {
						const userTs = typeof msg.timestamp === "string" ? Date.parse(msg.timestamp) : toFiniteNumber(msg.timestamp);
						this.#addItem({ kind: "user", id: String(msg.uuid || uid()), text: userText.trim(), createdAt: userTs ?? undefined });
					}
				}
			}

			if (Array.isArray(content)) {
				for (const block of content as Array<Record<string, unknown>>) {
					if (block.type === "tool_result") {
						const toolUseId = String(block.tool_use_id || "");
						const resultText = extractTextContent(block.content);
						// Update the completed tool-use item in the timeline with result info
						this.#set((state) => ({
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
	};
}

export type TimelineAction = StorePublicActions<TimelineActionImpl>;

export const createTimelineSlice = (set: Setter, get: Getter, api?: unknown): TimelineAction =>
	new TimelineActionImpl(set, get, api) as unknown as TimelineAction;
