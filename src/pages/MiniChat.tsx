import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	type KeyboardEvent,
} from "react";
import {
	type FileAttachment,
	readFileAsBase64,
} from "@/components/common/composer-helpers";
import {
	fetchCodeAgentStatus,
	fetchLatestCodeAgentRun,
	inferCodeAgentWorkspaceRoot,
	readStoredCodeAgentWorkspaceRoot,
	runCodeAgentTask,
	writeStoredCodeAgentWorkspaceRoot,
} from "@/lib/code-agent";
import { invokeIpc, toUserMessage } from "@/lib/api-client";
import { subscribeHostEvent } from "@/lib/host-events";
import { hostApiFetch } from "@/lib/host-api";
import {
	mergeUnifiedComposerPaths,
	toCliSubmission,
	toMiniChatSubmission,
	type UnifiedComposerPath,
} from "@/lib/unified-composer";
import i18n from "@/i18n";
import { useChatStore, type RawMessage } from "@/stores/chat";
import { useGatewayStore } from "@/stores/gateway";
import { useSettingsStore } from "@/stores/settings";
import type { CodeAgentStatus } from "../../shared/code-agent";
import type { CodeAgentPermissionRequest } from "../../shared/code-agent";
import type {
	PetMiniChatSeed,
	PetMiniChatSeedAttachment,
} from "../../shared/pet";
import { MiniChatComposer } from "./MiniChat/components/MiniChatComposer";
import { MiniChatHeader } from "./MiniChat/components/MiniChatHeader";
import { MiniChatPermissionCard } from "./MiniChat/components/MiniChatPermissionCard";
import { MiniChatTimeline } from "./MiniChat/components/MiniChatTimeline";
import { useMiniChatStyles } from "./MiniChat/styles";
import type {
	MentionOption,
	MiniChatTarget,
	MiniCodeMessage,
	TimelineItem,
	ToolActivityItem,
} from "./MiniChat/types";
import {
	CODE_TARGET_LABEL,
	MENTION_OPTIONS,
	extractText,
	getMentionDraft,
	isVisibleMessage,
	normalizeMiniChatSeed,
	normalizeTimestampMs,
	parseSubmissionIntent,
	removeTrailingMention,
} from "./MiniChat/utils";

export function MiniChat() {
	const { styles } = useMiniChatStyles();
	const initSettings = useSettingsStore((state) => state.init);
	const language = useSettingsStore((state) => state.language);
	const initGateway = useGatewayStore((state) => state.init);
	const gatewayStatus = useGatewayStore((state) => state.status);
	const messages = useChatStore((state) => state.messages);
	const sending = useChatStore((state) => state.sending);
	const streamingText = useChatStore((state) => state.streamingText);
	const streamingMessage = useChatStore((state) => state.streamingMessage);
	const streamingTools = useChatStore((state) => state.streamingTools);
	const pendingFinal = useChatStore((state) => state.pendingFinal);
	const newSession = useChatStore((state) => state.newSession);
	const sendMessage = useChatStore((state) => state.sendMessage);

	const [input, setInput] = useState("");
	const [attachments, setAttachments] = useState<FileAttachment[]>([]);
	const [droppedPaths, setDroppedPaths] = useState<UnifiedComposerPath[]>([]);
	const [selectedMode, setSelectedMode] = useState<MiniChatTarget | null>(null);
	const [persistentMode, setPersistentMode] = useState<MiniChatTarget | null>(
		null,
	);
	const [isComposing, setIsComposing] = useState(false);
	const [isInputFocused, setIsInputFocused] = useState(false);
	const [caretIndex, setCaretIndex] = useState(0);
	const [activeMentionIndex, setActiveMentionIndex] = useState(0);
	const [codeMessages, setCodeMessages] = useState<MiniCodeMessage[]>([]);
	const [codeSending, setCodeSending] = useState(false);
	const [codeActivities, setCodeActivities] = useState<ToolActivityItem[]>([]);
	// Ref keeps the latest activities accessible in callbacks without dep-array churn
	const codeActivitiesRef = useRef<ToolActivityItem[]>([]);
	// Snapshot taken at run-completed, before the ref is cleared, so
	// runMiniCodeTask can attach it to the completed message even if another
	// run starts before the promise resolves.
	const pendingCompletionActivitiesRef = useRef<ToolActivityItem[]>([]);
	const [codeAgentStatus, setCodeAgentStatus] =
		useState<CodeAgentStatus | null>(null);
	const [codeWorkspaceRoot, setCodeWorkspaceRoot] = useState(() =>
		readStoredCodeAgentWorkspaceRoot(),
	);
	const [pendingPermission, setPendingPermission] =
		useState<CodeAgentPermissionRequest | null>(null);

	const messagesEndRef = useRef<HTMLDivElement>(null);
	const pendingAutoSend = useRef<PetMiniChatSeed | null>(null);
	const chatSeenAtRef = useRef(new Map<string, number>());
	const chatSeenCounterRef = useRef(0);
	const pushedToolIdsRef = useRef<Set<string>>(new Set());

	const gatewayState = gatewayStatus.state;
	const isConnecting =
		gatewayState === "starting" || gatewayState === "reconnecting";
	const isError = gatewayState === "error";
	const isReady = gatewayState === "running";
	const liveStreamingText = useMemo(() => {
		const direct = streamingText.trim();
		if (direct) return direct;
		if (!streamingMessage || typeof streamingMessage !== "object") return "";

		const raw = streamingMessage as Record<string, unknown>;
		if (typeof raw.text === "string" && raw.text.trim()) {
			return raw.text.trim();
		}

		if ("content" in raw) {
			return extractText(raw.content);
		}
		return "";
	}, [streamingMessage, streamingText]);

	useEffect(() => {
		void initSettings();
	}, [initSettings]);

	useEffect(() => {
		if (language && language !== i18n.language) {
			i18n.changeLanguage(language);
		}
	}, [language]);

	useEffect(() => {
		newSession();
	}, [newSession]);

	useEffect(() => {
		void initGateway();
	}, [initGateway]);

	// Sync initial workspace root + status — re-runs only when codeWorkspaceRoot changes.
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
						? (latestRunResult.value?.request.workspaceRoot ??
								(statusResult.status === "fulfilled"
									? statusResult.value.vendorPath
									: ""))
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
	}, [codeWorkspaceRoot]);

	// IPC event subscriptions — registered exactly once on mount.
	// Keeping subscriptions in a separate [] effect prevents duplicate listeners
	// that would otherwise accumulate every time codeWorkspaceRoot changes.
	useEffect(() => {
		const unsubscribeStatus = subscribeHostEvent<CodeAgentStatus>(
			"code-agent:status",
			(payload) => {
				setCodeAgentStatus(payload);
			},
		);

		const unsubscribeActivity = subscribeHostEvent<{
			toolId: string;
			toolName: string;
			inputSummary: string;
		}>("code-agent:activity", (payload) => {
			if (typeof payload?.toolName === "string") {
				const item: ToolActivityItem = {
					id: crypto.randomUUID(),
					toolId: payload.toolId || "",
					toolName: payload.toolName,
					inputSummary: payload.inputSummary || "",
					timestamp: Date.now(),
				};
				setCodeActivities((prev) => {
					const updated = [...prev, item];
					codeActivitiesRef.current = updated;
					return updated;
				});
			}
		});

		const unsubscribeRunStarted = subscribeHostEvent(
			"code-agent:run-started",
			() => {
				setCodeActivities([]);
				codeActivitiesRef.current = [];
			},
		);

		const unsubscribeRunDone = subscribeHostEvent(
			"code-agent:run-completed",
			() => {
				// Snapshot activities before clearing so runMiniCodeTask can
				// attach them to the completed message even if another run
				// starts (and clears the ref) before the promise resolves.
				pendingCompletionActivitiesRef.current = [...codeActivitiesRef.current];
				setCodeActivities([]);
				codeActivitiesRef.current = [];
			},
		);

		const unsubscribeRunFailed = subscribeHostEvent(
			"code-agent:run-failed",
			() => {
				pendingCompletionActivitiesRef.current = [...codeActivitiesRef.current];
				setCodeActivities([]);
				codeActivitiesRef.current = [];
			},
		);

		const unsubscribePermission = subscribeHostEvent<CodeAgentPermissionRequest>(
			"code-agent:permission-request",
			(payload) => {
				if (payload && typeof payload.requestId === "string") {
					setPendingPermission(payload);
				}
			},
		);

		return () => {
			unsubscribeStatus();
			unsubscribeActivity();
			unsubscribeRunStarted();
			unsubscribeRunDone();
			unsubscribeRunFailed();
			unsubscribePermission();
		};
	}, []);

	useEffect(() => {
		writeStoredCodeAgentWorkspaceRoot(codeWorkspaceRoot.trim());
	}, [codeWorkspaceRoot]);

	const clearComposer = useCallback(() => {
		setInput("");
		setSelectedMode(null);
		setAttachments([]);
		setDroppedPaths([]);
	}, []);

	const applyDroppedPaths = useCallback((dropped: UnifiedComposerPath[]) => {
		if (!Array.isArray(dropped) || dropped.length === 0) return;
		setDroppedPaths((current) => mergeUnifiedComposerPaths(current, dropped));
	}, []);

	const resolveSeedTarget = useCallback(
		(seed: PetMiniChatSeed): MiniChatTarget => {
			if (seed.target === "code" || seed.target === "chat") {
				return seed.target;
			}
			return parseSubmissionIntent(seed.text).target;
		},
		[],
	);

	const applySeedState = useCallback(
		(seed: PetMiniChatSeed) => {
			const target = resolveSeedTarget(seed);

			if (seed.persistTarget) {
				setPersistentMode(target);
				setSelectedMode(null);
			} else if (seed.target) {
				setSelectedMode(target);
			}

			if (seed.attachments?.length) {
				setAttachments(seed.attachments as FileAttachment[]);
			}

			if (seed.autoSend === false && seed.text.trim()) {
				setInput((current) => current || seed.text);
				setCaretIndex((current) => current || seed.text.length);
			}

			return target;
		},
		[resolveSeedTarget],
	);

	useEffect(() => {
		void invokeIpc<string | PetMiniChatSeed | null>(
			"pet:consumeInitialMessage",
		).then((payload) => {
			const seed = normalizeMiniChatSeed(payload);
			if (seed) {
				applySeedState(seed);
				if (seed.autoSend !== false) {
					pendingAutoSend.current = seed;
				}
			}
		});
	}, [applySeedState]);

	const runMiniCodeTask = useCallback(
		async (prompt: string) => {
			const workspaceRoot = codeWorkspaceRoot.trim();
			if (!workspaceRoot || codeSending) return false;

			setCodeMessages((previous) => [
				...previous,
				{
					id: crypto.randomUUID(),
					role: "user",
					text: prompt,
					createdAt: Date.now(),
					targetLabel: CODE_TARGET_LABEL,
				},
			]);
			setCodeSending(true);

			await invokeIpc(
				"pet:pushTerminalLine",
				`› 开始执行: ${prompt.substring(0, 30)}${prompt.length > 30 ? "..." : ""}`,
			);

			try {
				const result = await runCodeAgentTask({
					workspaceRoot,
					prompt,
					metadata: {
						source: "pet-mini-chat",
						ui: "floating-pet",
					},
				});

				const outputText =
					result.output?.trim() || result.summary || "任务已完成";
				const lines = outputText.split("\n").slice(0, 5);
				for (const line of lines) {
					if (line.trim()) {
						await invokeIpc("pet:pushTerminalLine", `› ${line.trim()}`);
					}
				}

				const snapshotActivities = pendingCompletionActivitiesRef.current;
				pendingCompletionActivitiesRef.current = [];
				setCodeMessages((previous) => [
					...previous,
					{
						id: crypto.randomUUID(),
						role: "assistant",
						text:
							result.output?.trim() ||
							result.summary ||
							"任务已完成，但没有返回可展示的文本输出。",
						createdAt: Date.now(),
						summary: result.summary,
						status: result.status,
						activities: snapshotActivities,
					},
				]);
				return true;
			} catch (error) {
				const snapshotActivities = pendingCompletionActivitiesRef.current;
				pendingCompletionActivitiesRef.current = [];
				setCodeMessages((previous) => [
					...previous,
					{
						id: crypto.randomUUID(),
						role: "assistant",
						text: toUserMessage(error),
						createdAt: Date.now(),
						status: "failed",
						isError: true,
						activities: snapshotActivities,
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
			pathOverride?: UnifiedComposerPath[],
		) => {
			const target =
				forcedTarget ||
				selectedMode ||
				persistentMode ||
				parseSubmissionIntent(rawText).target;

			const effectiveAttachments =
				(attachmentOverride as FileAttachment[] | undefined) ?? attachments;
			const effectivePaths = pathOverride ?? droppedPaths;
			const prompt =
				target === "code"
					? toCliSubmission({
							text: rawText,
							paths: effectivePaths,
						}).prompt
					: toMiniChatSubmission({
							text: rawText,
							paths: effectivePaths,
							attachments: effectiveAttachments,
						}).prompt;

			if (!prompt && effectiveAttachments.length === 0) return false;

			const readyAttachments = effectiveAttachments.filter(
				(attachment) => attachment.status === "ready",
			);

			if (target === "chat") {
				if (!isReady || sending) return false;
				clearComposer();
				await sendMessage(prompt, readyAttachments);
				return true;
			}

			if (!codeWorkspaceRoot.trim()) return false;

			clearComposer();
			return runMiniCodeTask(prompt);
		},
		[
			attachments,
			clearComposer,
			codeWorkspaceRoot,
			droppedPaths,
			isReady,
			runMiniCodeTask,
			persistentMode,
			selectedMode,
			sendMessage,
			sending,
		],
	);

	useEffect(() => {
		const unsubscribe = window.electron.ipcRenderer.on(
			"mini-chat:initial-message",
			(payload) => {
				const seed = normalizeMiniChatSeed(payload as string | PetMiniChatSeed);
				if (!seed) return;
				const target = applySeedState(seed);
				const canSendNow =
					target === "code"
						? !codeSending && !sending
						: isReady && !sending && !codeSending;
				if (canSendNow && seed.autoSend !== false) {
					void submitPrompt(seed.text, seed.attachments, target);
				} else if (seed.autoSend !== false) {
					pendingAutoSend.current = seed;
				}
			},
		);

		return () => {
			unsubscribe?.();
		};
	}, [applySeedState, codeSending, isReady, sending, submitPrompt]);

	// Receive file/folder paths dropped into the window (will-navigate fallback from main process).
	useEffect(() => {
		const unsubscribe = window.electron.ipcRenderer.on(
			"mini-chat:paths-dropped",
			(payload) => {
				const dropped = payload as UnifiedComposerPath[];
				applyDroppedPaths(dropped);
			},
		);
		return () => {
			unsubscribe?.();
		};
	}, [applyDroppedPaths]);

	useEffect(() => {
		const queuedSeed = pendingAutoSend.current;
		if (!queuedSeed) return;
		if (sending || codeSending) return;

		const target = resolveSeedTarget(queuedSeed);
		if (target === "chat" && !isReady) return;
		if (queuedSeed.autoSend === false) return;

		pendingAutoSend.current = null;
		void submitPrompt(queuedSeed.text, queuedSeed.attachments, target);
	}, [codeSending, isReady, resolveSeedTarget, sending, submitPrompt]);

	useEffect(() => {
		const activity =
			!sending && !codeSending
				? "idle"
				: codeSending
					? "working"
					: pendingFinal || liveStreamingText || streamingTools.length > 0
						? "working"
						: "listening";
		void invokeIpc("pet:setUiActivity", { activity }).catch(() => {});
	}, [codeSending, liveStreamingText, pendingFinal, sending, streamingTools]);

	useEffect(() => {
		if (streamingTools.length === 0) {
			pushedToolIdsRef.current = new Set();
			return;
		}

		for (const tool of streamingTools) {
			const key = tool.id ?? tool.toolCallId ?? tool.name;
			if (!pushedToolIdsRef.current.has(key)) {
				pushedToolIdsRef.current.add(key);
				void invokeIpc("pet:pushTerminalLine", `› ${tool.name}`).catch(
					() => {},
				);
			}
		}
	}, [streamingTools]);

	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages, liveStreamingText, sending, codeMessages, codeSending]);

	const handleClose = useCallback(() => {
		void invokeIpc("pet:closeMiniChat");
	}, []);

	const handlePermissionDecision = useCallback(
		async (requestId: string, decision: "allow" | "deny") => {
			setPendingPermission(null);
			await invokeIpc("code-agent:respond-permission", { requestId, decision });
		},
		[],
	);

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
		return MENTION_OPTIONS.filter(
			(option) =>
				normalizedQuery.length === 0 ||
				option.keywords.some((keyword) => keyword.startsWith(normalizedQuery)),
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

			const nextInput =
				input.slice(0, mentionDraft.start) + input.slice(mentionDraft.end);
			const nextCaret = mentionDraft.start;

			setSelectedMode("code");
			setInput(nextInput);
			setCaretIndex(nextCaret);
		},
		[input, mentionDraft],
	);

	const removeCodeMentionFromInput = useCallback(() => {
		setSelectedMode(null);
		setPersistentMode(null);
		const nextInput = input
			.replace(/(^|\s)@(code|cli|CLI编程|cli编程)(?=\s|$)/i, " ")
			.replace(/\s+/g, " ")
			.trimStart();
		setInput(nextInput);
		setCaretIndex(nextInput.length);
	}, [input]);

	const handleSend = useCallback(async () => {
		if (
			(!input.trim() && attachments.length === 0 && droppedPaths.length === 0) ||
			sending ||
			codeSending
		) {
			return;
		}
		await submitPrompt(input);
	}, [attachments.length, codeSending, droppedPaths.length, input, sending, submitPrompt]);

	const handleUploadFile = useCallback(async () => {
		try {
			const result = (await invokeIpc("dialog:open", {
				properties: ["openFile", "multiSelections"],
			})) as { canceled: boolean; filePaths?: string[] };
			if (result.canceled || !result.filePaths?.length) return;

			const tempIds: string[] = [];
			for (const filePath of result.filePaths) {
				const tempId = crypto.randomUUID();
				tempIds.push(tempId);
				const fileName = filePath.split(/[\\/]/).pop() || "file";
				setAttachments((previous) => [
					...previous,
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

			setAttachments((previous) => {
				let updated = [...previous];
				for (let index = 0; index < tempIds.length; index += 1) {
					const data = staged[index];
					updated = updated.map((attachment) =>
						attachment.id === tempIds[index]
							? data
								? { ...data, status: "ready" as const }
								: {
										...attachment,
										status: "error" as const,
										error: "Staging failed",
									}
							: attachment,
					);
				}
				return updated;
			});
		} catch (error) {
			setAttachments((previous) =>
				previous.map((attachment) =>
					attachment.status === "staging"
						? { ...attachment, status: "error" as const, error: String(error) }
						: attachment,
				),
			);
		}
	}, []);

	const stageBufferFiles = useCallback(async (files: globalThis.File[]) => {
		for (const file of files) {
			const tempId = crypto.randomUUID();
			setAttachments((previous) => [
				...previous,
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
				setAttachments((previous) =>
					previous.map((attachment) =>
						attachment.id === tempId
							? { ...staged, status: "ready" as const }
							: attachment,
					),
				);
			} catch (error) {
				setAttachments((previous) =>
					previous.map((attachment) =>
						attachment.id === tempId
							? {
									...attachment,
									status: "error" as const,
									error: String(error),
								}
							: attachment,
					),
				);
			}
		}
	}, []);

	const handleScreenshot = useCallback(async () => {
		let tempId: string | null = null;

		try {
			await invokeIpc("pet:pushTerminalLine", "› 启动截图工具...");
			const screenshot = await window.electron.captureScreenshot();

			const nextTempId = crypto.randomUUID();
			tempId = nextTempId;
			setAttachments((previous) => [
				...previous,
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

			setAttachments((previous) =>
				previous.map((attachment) =>
					attachment.id === nextTempId
						? { ...staged, status: "ready" as const }
						: attachment,
				),
			);

			await invokeIpc(
				"pet:pushTerminalLine",
				`› 截图上传成功: ${staged.fileName}`,
			);
		} catch (error) {
			if (
				typeof error === "string" &&
				error.includes("timed out or was cancelled")
			) {
				await invokeIpc("pet:pushTerminalLine", "› 截图已取消");
				if (tempId) {
					const idToRemove = tempId;
					setAttachments((previous) =>
						previous.filter((attachment) => attachment.id !== idToRemove),
					);
				}
			} else {
				console.error("Screenshot failed:", error);
				await invokeIpc("pet:pushTerminalLine", "› 截图失败");
				if (tempId) {
					const idToRemove = tempId;
					setAttachments((previous) =>
						previous.map((attachment) =>
							attachment.id === idToRemove
								? {
										...attachment,
										status: "error" as const,
										error: String(error),
									}
								: attachment,
						),
					);
				}
			}
		}
	}, []);

	const handleKeyDown = useCallback(
		(event: KeyboardEvent<HTMLElement>) => {
			if (showMentionPicker && event.key === "ArrowDown") {
				event.preventDefault();
				setActiveMentionIndex(
					(previous) => (previous + 1) % mentionOptions.length,
				);
				return;
			}

			if (showMentionPicker && event.key === "ArrowUp") {
				event.preventDefault();
				setActiveMentionIndex(
					(previous) =>
						(previous - 1 + mentionOptions.length) % mentionOptions.length,
				);
				return;
			}

			if (showMentionPicker && (event.key === "Enter" || event.key === "Tab")) {
				event.preventDefault();
				applyMention(mentionOptions[activeMentionIndex] ?? mentionOptions[0]);
				return;
			}

			if (event.key === "Backspace") {
				const removal = removeTrailingMention(input, caretIndex);
				if (removal) {
					event.preventDefault();
					setInput(removal.text);
					setCaretIndex(removal.caret);
				}
			}
		},
		[
			activeMentionIndex,
			applyMention,
			caretIndex,
			input,
			mentionOptions,
			showMentionPicker,
		],
	);

	const handlePressEnter = useCallback(
		(event: KeyboardEvent<HTMLElement>) => {
			if (showMentionPicker) {
				event.preventDefault();
				applyMention(mentionOptions[activeMentionIndex] ?? mentionOptions[0]);
				return;
			}

			if (!event.shiftKey && !isComposing) {
				event.preventDefault();
				void handleSend();
			}
		},
		[
			activeMentionIndex,
			applyMention,
			handleSend,
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
	const draftTarget = selectedMode || persistentMode || draftIntent.target;
	const disableComposer =
		draftTarget === "chat"
			? isConnecting || isError || sending || codeSending
			: sending || codeSending;
	const composerPlaceholder =
		draftTarget === "code"
			? codeWorkspaceRoot.trim()
				? "写脚本、改文件、整理目录…"
				: "先选择工作目录，再描述你要完成的编程小任务"
			: isConnecting
				? "连接中…"
				: isError
					? "连接断开"
					: "输入消息… 输入 @ 呼唤智能助手";

	const sendDisabled =
		(!input.trim() && attachments.length === 0 && droppedPaths.length === 0) ||
		disableComposer ||
		showMentionPicker ||
		(draftTarget === "code" && !codeWorkspaceRoot.trim());

	const handleOpenFull = useCallback(() => {
		void invokeIpc(
			draftTarget === "code" ? "pet:openCodeAssistant" : "pet:openMainWindow",
		);
		void invokeIpc("pet:closeMiniChat");
	}, [draftTarget]);

	const timelineItems = useMemo<TimelineItem[]>(() => {
		const chatItems = visibleMessages.map((message: RawMessage, index) => {
			const key = message.id
				? `chat:${message.role}:${message.id}`
				: `chat:${message.role}:${index}:${extractText(message.content).slice(0, 40)}`;
			if (!chatSeenAtRef.current.has(key)) {
				const normalizedTimestamp = normalizeTimestampMs(message.timestamp);
				const fallbackTimestamp = Date.now() + chatSeenCounterRef.current;
				chatSeenCounterRef.current += 1;
				chatSeenAtRef.current.set(
					key,
					normalizedTimestamp ?? fallbackTimestamp,
				);
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

		return [...chatItems, ...localCodeItems].sort((left, right) => {
			return left.sortAt - right.sortAt;
		});
	}, [codeMessages, visibleMessages]);

	return (
		<div className={styles.root}>
			<MiniChatHeader
				draftTarget={draftTarget}
				codeSending={codeSending}
				codeAgentStatus={codeAgentStatus}
				isReady={isReady}
				isError={isError}
				isConnecting={isConnecting}
				onOpenFull={handleOpenFull}
				onClose={handleClose}
				codeWorkspaceRoot={codeWorkspaceRoot}
				onRemoveCodeMode={removeCodeMentionFromInput}
				onPickWorkspace={() => {
					void handlePickWorkspace();
				}}
			/>

			<MiniChatTimeline
				timelineItems={timelineItems}
				sending={sending}
				streamingText={liveStreamingText}
				pendingFinal={pendingFinal}
				codeSending={codeSending}
				codeActivities={codeActivities}
				messagesEndRef={messagesEndRef}
			/>

			<div className={styles.inputDock}>
				{pendingPermission && (
					<MiniChatPermissionCard
						request={pendingPermission}
						onDecision={(requestId, decision) => {
							void handlePermissionDecision(requestId, decision);
						}}
					/>
				)}
				<MiniChatComposer
					input={input}
					onInputChange={setInput}
					onSend={() => {
						void handleSend();
					}}
					loading={sending || codeSending}
					disabled={disableComposer}
					sendDisabled={sendDisabled}
					placeholder={composerPlaceholder}
					attachments={attachments}
					droppedPaths={droppedPaths}
					onRemoveAttachment={(id) => {
						setAttachments((previous) =>
							previous.filter((attachment) => attachment.id !== id),
						);
					}}
					onPathsChange={setDroppedPaths}
					onUploadFile={() => {
						void handleUploadFile();
					}}
					onScreenshot={() => {
						void handleScreenshot();
					}}
					stageBufferFiles={stageBufferFiles}
					onDropPaths={(paths) => {
						applyDroppedPaths(paths);
					}}
					showMentionPicker={showMentionPicker}
					mentionOptions={mentionOptions}
					activeMentionIndex={activeMentionIndex}
					onActiveMentionIndexChange={setActiveMentionIndex}
					onApplyMention={applyMention}
					onCaretChange={setCaretIndex}
					onKeyDown={handleKeyDown}
					onPressEnter={handlePressEnter}
					onCompositionStart={() => setIsComposing(true)}
					onCompositionEnd={() => setIsComposing(false)}
					onFocusChange={setIsInputFocused}
				/>
			</div>
		</div>
	);
}
