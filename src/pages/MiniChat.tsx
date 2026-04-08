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
} from "@/components/common/composer-helpers";
import {
	fetchClaudeCodeSkills,
	fetchCodeAgentStatus,
	fetchLatestCodeAgentRun,
	fetchProjectMentionEntries,
	inferCodeAgentWorkspaceRoot,
	readStoredCodeAgentWorkspaceRoot,
	writeStoredCodeAgentWorkspaceRoot,
	type ClaudeCodeSkillEntry,
} from "@/lib/code-agent";
import { invokeIpc } from "@/lib/api-client";
import { useCodeAgentStore } from "@/stores/code-agent";
import {
	type UnifiedComposerPath,
} from "@/lib/unified-composer";
import type { UnifiedComposerInputHandle } from "@/components/common/unified-composer-input";
import i18n from "@/i18n";
import { useChatStore, type RawMessage } from "@/stores/chat";
import { useGatewayStore } from "@/stores/gateway";
import { useSettingsStore } from "@/stores/settings";
import { useSkillsStore } from "@/stores/skills";
import type {
	CodeAgentStatus,
	CodeAgentPermissionMode,
} from "../../shared/code-agent";
import type {
	PetMiniChatSeed,
} from "../../shared/pet";
import { MiniChatComposer } from "./MiniChat/components/MiniChatComposer";
import { MiniChatHeader } from "./MiniChat/components/MiniChatHeader";
import { MiniChatTimeline } from "./MiniChat/components/MiniChatTimeline";
import { ElicitationForm } from "./MiniChat/components/code-agent/ElicitationForm";
import { PermissionDispatcher } from "./MiniChat/components/code-agent/permissions/PermissionDispatcher";
import { useMiniChatAttachmentActions } from "./MiniChat/hooks/useMiniChatAttachmentActions";
import { useMiniChatCodeAgentControls } from "./MiniChat/hooks/useMiniChatCodeAgentControls";
import { useMiniChatClaudeSessions } from "./MiniChat/hooks/useMiniChatClaudeSessions";
import { useMiniChatCodeAgentEvents } from "./MiniChat/hooks/useMiniChatCodeAgentEvents";
import { useMiniChatMentionsAndSlash } from "./MiniChat/hooks/useMiniChatMentionsAndSlash";
import { useMiniChatSeedAndAutoSend } from "./MiniChat/hooks/useMiniChatSeedAndAutoSend";
import { useMiniChatSessionActions } from "./MiniChat/hooks/useMiniChatSessionActions";
import { useMiniChatSubmissionActions } from "./MiniChat/hooks/useMiniChatSubmissionActions";
import { getChatSessionTitle } from "./MiniChat/session-title";
import { useMiniChatStyles } from "./MiniChat/styles";
import type {
	MentionOption,
	MiniChatTarget,
	SlashOption,
	TimelineItem,
	ToolActivityItem,
} from "./MiniChat/types";
import {
	extractText,
	isVisibleMessage,
	normalizeTimestampMs,
	parseSubmissionIntent,
} from "./MiniChat/utils";

const MINI_CHAT_RUNTIME_TIMESTAMP = Date.now();

function getTimelineMessageKey(message: RawMessage, index: number) {
	return message.id
		? `chat:${message.role}:${message.id}`
		: `chat:${message.role}:${index}:${extractText(message.content).slice(0, 40)}`;
}

export function MiniChat() {
	const { styles } = useMiniChatStyles();
	const initSettings = useSettingsStore((state) => state.init);
	const language = useSettingsStore((state) => state.language);
	const codeAgentConfig = useSettingsStore((state) => state.codeAgent);
	const setCodeAgentConfig = useSettingsStore((state) => state.setCodeAgent);
	const initGateway = useGatewayStore((state) => state.init);
	const gatewayStatus = useGatewayStore((state) => state.status);
	const skills = useSkillsStore((state) => state.skills);
	const fetchSkills = useSkillsStore((state) => state.fetchSkills);
	const messages = useChatStore((state) => state.messages);
	const sending = useChatStore((state) => state.sending);
	const streamingText = useChatStore((state) => state.streamingText);
	const streamingMessage = useChatStore((state) => state.streamingMessage);
	const streamingTools = useChatStore((state) => state.streamingTools);
	const pendingFinal = useChatStore((state) => state.pendingFinal);
	const sessions = useChatStore((state) => state.sessions);
	const currentSessionKey = useChatStore((state) => state.currentSessionKey);
	const sessionLabels = useChatStore((state) => state.sessionLabels);
	const sessionLastActivity = useChatStore((state) => state.sessionLastActivity);
	const loadSessions = useChatStore((state) => state.loadSessions);
	const loadHistory = useChatStore((state) => state.loadHistory);
	const switchSession = useChatStore((state) => state.switchSession);
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
	const [activeSlashIndex, setActiveSlashIndex] = useState(0);
	const [projectMentionEntries, setProjectMentionEntries] = useState<MentionOption[]>([]);
	const [projectMentionStatus, setProjectMentionStatus] = useState<
		"idle" | "loading" | "ready" | "error"
	>("idle");
	const [codeSending, setCodeSending] = useState(false);
	const [_codeActivities, setCodeActivities] = useState<ToolActivityItem[]>([]);
	const [_codeStreamingText, setCodeStreamingText] = useState("");
	// Ref keeps the latest activities accessible in callbacks without dep-array churn
	const codeActivitiesRef = useRef<ToolActivityItem[]>([]);
	// Snapshot taken at run-completed, before the ref is cleared, so
	// runMiniCodeTask can attach it to the completed message even if another
	// run starts before the promise resolves.
	const pendingCompletionActivitiesRef = useRef<ToolActivityItem[]>([]);

	// New SDK-message driven store
	const pushSdkMessage = useCodeAgentStore((s) => s.pushSdkMessage);
	const pushUserMessage = useCodeAgentStore((s) => s.pushUserMessage);
	const resetCodeAgent = useCodeAgentStore((s) => s.reset);
	const resetCodeAgentStreaming = useCodeAgentStore((s) => s.resetStreaming);
	const codeAgentItems = useCodeAgentStore((s) => s.items);
	const codeStreaming = useCodeAgentStore((s) => s.streaming);
	const codeAgentPendingPermission = useCodeAgentStore(
		(s) => s.pendingPermission,
	);
	const setCodeAgentPendingPermission = useCodeAgentStore(
		(s) => s.setPendingPermission,
	);
	const resolveCodeAgentPermission = useCodeAgentStore(
		(s) => s.resolvePermission,
	);
	const addSessionAllowedTool = useCodeAgentStore((s) => s.addSessionAllowedTool);
	const pendingElicitation = useCodeAgentStore((s) => s.pendingElicitation);
	const resolveElicitation = useCodeAgentStore((s) => s.resolveElicitation);
	const sessionInit = useCodeAgentStore((s) => s.sessionInit);
	const sessionTitle = useCodeAgentStore((s) => s.sessionTitle);
	const lastUpdatedAt = useCodeAgentStore((s) => s.lastUpdatedAt);
	const [codeAgentStatus, setCodeAgentStatus] =
		useState<CodeAgentStatus | null>(null);
	const [codeWorkspaceRoot, setCodeWorkspaceRoot] = useState(() =>
		readStoredCodeAgentWorkspaceRoot(),
	);
	const [claudeCodeSkills, setClaudeCodeSkills] = useState<{
		global: ClaudeCodeSkillEntry[];
		project: ClaudeCodeSkillEntry[];
	}>({ global: [], project: [] });
	const composerInputRef = useRef<UnifiedComposerInputHandle>(null);
	const activeSkillRef = useRef<SlashOption | null>(null);
	const richContentRef = useRef<import("slate").Descendant[] | undefined>(undefined);

	const pendingAutoSend = useRef<PetMiniChatSeed | null>(null);
	const [chatSeenAt, setChatSeenAt] = useState<Map<string, number>>(() => new Map());
	const chatSeenCounterRef = useRef(0);
	const lastHydratedClaudeSessionRef = useRef("");
	const pushedToolIdsRef = useRef<Set<string>>(new Set());
	const chatSubmitInFlightRef = useRef(false);
	const gatewayState = gatewayStatus.state;
	const isConnecting =
		gatewayState === "starting" || gatewayState === "reconnecting";
	const isError = gatewayState === "error";
	const isReady = gatewayState === "running";

	useEffect(() => {
		void loadSessions();
	}, [loadSessions]);

	useEffect(() => {
		if (!isReady) return;
		void loadSessions();
	}, [isReady, loadSessions]);

	useEffect(() => {
		if (skills.length > 0) return;
		void fetchSkills();
	}, [fetchSkills, skills.length]);
	const chatSessions = useMemo(
		() =>
			[...sessions]
				.sort((left, right) => {
					const rightUpdated =
						sessionLastActivity[right.key] ?? right.updatedAt ?? 0;
					const leftUpdated =
						sessionLastActivity[left.key] ?? left.updatedAt ?? 0;
					return rightUpdated - leftUpdated;
				})
				.map((session) => ({
					key: session.key,
					title: getChatSessionTitle(session, sessionLabels),
					updatedAt:
						sessionLastActivity[session.key] ?? session.updatedAt ?? null,
				})),
		[sessions, sessionLabels, sessionLastActivity],
	);
	const resetCodeTimelineState = useCallback(() => {
		resetCodeAgent();
		setCodeStreamingText("");
		setCodeActivities([]);
		codeActivitiesRef.current = [];
		pendingCompletionActivitiesRef.current = [];
	}, [resetCodeAgent]);
	const resetChatSeenState = useCallback(() => {
		setChatSeenAt(new Map());
		chatSeenCounterRef.current = 0;
	}, []);

	useEffect(() => {
		const workspaceRoot = codeWorkspaceRoot.trim();
		if (!workspaceRoot) {
			setProjectMentionEntries([]);
			setProjectMentionStatus("idle");
			return;
		}
		let cancelled = false;
		setProjectMentionStatus("loading");
		void fetchProjectMentionEntries(workspaceRoot)
			.then((entries) => {
				if (cancelled) return;
				setProjectMentionEntries(
					entries.map((entry) => ({
						id: entry.relativePath,
						label: entry.name,
						relativePath: entry.relativePath,
						absolutePath: entry.absolutePath,
						isDirectory: entry.isDirectory,
					})),
				);
				setProjectMentionStatus("ready");
			})
			.catch(() => {
				if (cancelled) return;
				setProjectMentionEntries([]);
				setProjectMentionStatus("error");
			});
		return () => {
			cancelled = true;
		};
	}, [codeWorkspaceRoot]);

	const {
		claudeSessions,
		activeClaudeSessionId,
		setActiveClaudeSessionId,
		loadClaudeSessions,
		hydrateClaudeSessionHistory,
	} = useMiniChatClaudeSessions({
		codeWorkspaceRoot,
		resetCodeTimelineState,
		resetChatSeenState,
		pushSdkMessage,
		pushUserMessage,
		resetCodeAgentStreaming,
	});

	useEffect(() => {
		void loadClaudeSessions();
	}, [loadClaudeSessions]);

	useEffect(() => {
		lastHydratedClaudeSessionRef.current = "";
	}, [codeWorkspaceRoot]);

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

	useMiniChatCodeAgentEvents({
		pushSdkMessage,
		resetCodeAgentStreaming,
		setCodeAgentStatus,
		setCodeStreamingText,
		setCodeActivities,
		setCodeAgentPendingPermission,
		codeActivitiesRef,
		pendingCompletionActivitiesRef,
	});

	useEffect(() => {
		writeStoredCodeAgentWorkspaceRoot(codeWorkspaceRoot.trim());
	}, [codeWorkspaceRoot]);

	useEffect(() => {
		const ws = codeWorkspaceRoot.trim();
		fetchClaudeCodeSkills(ws)
			.then(setClaudeCodeSkills)
			.catch(() => setClaudeCodeSkills({ global: [], project: [] }));
	}, [codeWorkspaceRoot]);

	const clearComposer = useCallback(() => {
		setInput("");
		setSelectedMode(null);
		setAttachments([]);
		setDroppedPaths([]);
		activeSkillRef.current = null;
		richContentRef.current = undefined;
	}, []);
	const {
		applyDroppedPaths,
		handleUploadFile,
		handleUploadFolder,
		stageBufferFiles,
		handleScreenshot,
	} = useMiniChatAttachmentActions({
		setAttachments,
		setDroppedPaths,
	});

	const {
		effortEnabled,
		thinkingEnabled,
		fastModeEnabled,
		modelLabel,
		handleCycleModel,
		handleToggleEffort,
		handleToggleThinking,
		handleToggleFastMode,
	} = useMiniChatCodeAgentControls({
		codeAgentConfig,
		setCodeAgentConfig,
	});
	const { submitPrompt, allComposerAttachmentsReady, handleSend } =
		useMiniChatSubmissionActions({
			input,
			attachments,
			droppedPaths,
			selectedMode,
			persistentMode,
			isReady,
			sending,
			codeSending,
			codeWorkspaceRoot,
			activeClaudeSessionId,
			setActiveClaudeSessionId,
			setCodeSending,
			setCodeAgentStatus,
			loadClaudeSessions,
			pushUserMessage,
			pushSdkMessage,
			resetCodeAgentStreaming,
			sendMessage,
			clearComposer,
			activeSkillRef,
			richContentRef,
			pendingCompletionActivitiesRef,
			chatSubmitInFlightRef,
		});

	const handlePermissionModeChange = useCallback(
		(mode: CodeAgentPermissionMode) => {
			const latestConfig = useSettingsStore.getState().codeAgent;
			if (latestConfig.permissionMode === mode) return;
			setCodeAgentConfig({
				...latestConfig,
				permissionMode: mode,
			});
			setActiveClaudeSessionId("");
		},
		[setActiveClaudeSessionId, setCodeAgentConfig],
	);

	useMiniChatSeedAndAutoSend({
		pendingAutoSendRef: pendingAutoSend,
		setPersistentMode,
		setSelectedMode,
		setAttachments,
		setInput,
		setCaretIndex,
		submitPrompt,
		sending,
		codeSending,
		isReady,
	});

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

	const draftIntent = useMemo(() => parseSubmissionIntent(input), [input]);
	const draftTarget = selectedMode || persistentMode || draftIntent.target;
	const isClaudeCodeCliMode = draftTarget === "code";
	const {
		handleNewConversation,
		handleSwitchSession,
		handleRewindConversation,
		handleOpenAccountUsage,
		handlePickWorkspaceClick,
	} = useMiniChatSessionActions({
		draftTarget,
		activeClaudeSessionId,
		setActiveClaudeSessionId,
		claudeSessions,
		currentSessionKey,
		resetCodeTimelineState,
		clearComposer,
		resetChatSeenState,
		lastHydratedClaudeSessionRef,
		newSession,
		loadSessions,
		switchSession,
		loadHistory,
		setCodeWorkspaceRoot,
	});

	useEffect(() => {
		if (draftTarget !== "code") return;
		if (!activeClaudeSessionId) return;
		if (codeAgentItems.length > 0 || codeSending) return;
		if (lastHydratedClaudeSessionRef.current === activeClaudeSessionId) return;
		lastHydratedClaudeSessionRef.current = activeClaudeSessionId;
		void hydrateClaudeSessionHistory(activeClaudeSessionId);
	}, [
		activeClaudeSessionId,
		codeAgentItems.length,
		codeSending,
		draftTarget,
		hydrateClaudeSessionHistory,
	]);

	const handleClose = useCallback(() => {
		void invokeIpc("pet:closeMiniChat");
	}, []);

	const handlePermissionDecision = useCallback(
		async (
			requestId: string,
			decision: "allow" | "deny",
			feedback?: string,
		) => {
			setCodeAgentPendingPermission(null);
			await invokeIpc("code-agent:respond-permission", { requestId, decision, feedback });
		},
		[setCodeAgentPendingPermission],
	);

	const {
		mentionDraft,
		slashDraft,
		mentionOptions,
		mentionEmptyState,
		filteredSlashOptions,
		showMentionPanel,
		showMentionPicker,
		showSlashPicker,
	} = useMiniChatMentionsAndSlash({
		input,
		caretIndex,
		isInputFocused,
		isClaudeCodeCliMode,
		projectMentionEntries,
		projectMentionStatus,
		codeWorkspaceRoot,
		claudeCodeSkills,
	});

	const applyMention = useCallback(
		(option: MentionOption) => {
			if (!mentionDraft) return;

			const nextInput =
				input.slice(0, mentionDraft.start) + input.slice(mentionDraft.end);
			const nextCaret = mentionDraft.start;

			setInput(nextInput);
			setCaretIndex(nextCaret);
			applyDroppedPaths([
				{
					absolutePath: option.absolutePath,
					name: option.label,
					isDirectory: option.isDirectory,
				},
			]);
		},
		[applyDroppedPaths, input, mentionDraft],
	);

	const applySlashOption = useCallback(
		(option: SlashOption) => {
			if (!slashDraft) return;
			setActiveSlashIndex(0);
			activeSkillRef.current = option;
			composerInputRef.current?.insertSkill(option.command, {
				start: slashDraft.start,
				end: slashDraft.end,
			});
		},
		[slashDraft],
	);

	const removeCodeMentionFromInput = useCallback(() => {
		setSelectedMode(null);
		setPersistentMode(null);
		setInput((previous) => {
			const nextInput = previous
				.replace(/(^|\s)@(code|cli|CLI编程|cli编程)(?=\s|$)/i, " ")
				.replace(/\s+/g, " ")
				.trimStart();
			setCaretIndex(nextInput.length);
			return nextInput;
		});
	}, []);

	const handleKeyDown = useCallback(
		(event: KeyboardEvent<HTMLElement>) => {
			if (isComposing) return;

			if (showSlashPicker && event.key === "ArrowDown") {
				event.preventDefault();
				setActiveSlashIndex((previous) =>
					filteredSlashOptions.length === 0
						? 0
						: (previous + 1) % filteredSlashOptions.length,
				);
				return;
			}

			if (showSlashPicker && event.key === "ArrowUp") {
				event.preventDefault();
				setActiveSlashIndex((previous) =>
					filteredSlashOptions.length === 0
						? 0
						: (previous - 1 + filteredSlashOptions.length) % filteredSlashOptions.length,
				);
				return;
			}

			if (showSlashPicker && (event.key === "Enter" || event.key === "Tab")) {
				event.preventDefault();
				applySlashOption(
					filteredSlashOptions[activeSlashIndex] ?? filteredSlashOptions[0],
				);
				return;
			}

			if (showSlashPicker && event.key === "Escape") {
				event.preventDefault();
				setCaretIndex(-1);
				setActiveSlashIndex(0);
				return;
			}

			if (showMentionPicker && event.key === "ArrowDown") {
				event.preventDefault();
				setActiveMentionIndex(
					(previous) =>
						mentionOptions.length === 0
							? 0
							: (previous + 1) % mentionOptions.length,
				);
				return;
			}

			if (showMentionPicker && event.key === "ArrowUp") {
				event.preventDefault();
				setActiveMentionIndex(
					(previous) =>
						mentionOptions.length === 0
							? 0
							: (previous - 1 + mentionOptions.length) % mentionOptions.length,
				);
				return;
			}

			if (showMentionPicker && (event.key === "Enter" || event.key === "Tab")) {
				event.preventDefault();
				applyMention(mentionOptions[activeMentionIndex] ?? mentionOptions[0]);
				return;
			}

			if (showMentionPanel && event.key === "Escape") {
				event.preventDefault();
				setCaretIndex(-1);
				setActiveMentionIndex(0);
				return;
			}
		},
		[
			activeMentionIndex,
			activeSlashIndex,
			applyMention,
			applySlashOption,
			filteredSlashOptions,
			isComposing,
			mentionOptions,
			showMentionPanel,
			showMentionPicker,
			showSlashPicker,
		],
	);

	const handlePressEnter = useCallback(
		(event: KeyboardEvent<HTMLElement>) => {
			if (showSlashPicker) {
				event.preventDefault();
				applySlashOption(
					filteredSlashOptions[activeSlashIndex] ?? filteredSlashOptions[0],
				);
				return;
			}

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
			activeSlashIndex,
			applyMention,
			applySlashOption,
			filteredSlashOptions,
			handleSend,
			isComposing,
			mentionOptions,
			showMentionPicker,
			showSlashPicker,
		],
	);

	const visibleMessages = useMemo(
		() => messages.filter(isVisibleMessage),
		[messages],
	);

	useEffect(() => {
		setChatSeenAt((previous) => {
			let changed = false;
			const next = new Map(previous);
			for (const [index, message] of visibleMessages.entries()) {
				const key = getTimelineMessageKey(message, index);
				if (next.has(key)) continue;
				const normalizedTimestamp = normalizeTimestampMs(message.timestamp);
				const fallbackTimestamp =
					MINI_CHAT_RUNTIME_TIMESTAMP + chatSeenCounterRef.current;
				chatSeenCounterRef.current += 1;
				next.set(key, normalizedTimestamp ?? fallbackTimestamp);
				changed = true;
			}
			return changed ? next : previous;
		});
	}, [visibleMessages]);

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
		!allComposerAttachmentsReady ||
		disableComposer ||
		showMentionPicker ||
		(draftTarget === "code" && !codeWorkspaceRoot.trim());
	const headerSessions =
		draftTarget === "code" ? claudeSessions : chatSessions;
	const headerSessionKey =
		draftTarget === "code" ? activeClaudeSessionId : currentSessionKey;
	const isHeaderGenerating =
		sending ||
		codeSending ||
		pendingFinal ||
		Boolean(liveStreamingText) ||
		codeStreaming.isStreaming;

	const handleOpenFull = useCallback(() => {
		void invokeIpc(
			draftTarget === "code" ? "pet:openCodeAssistant" : "pet:openMainWindow",
		);
		void invokeIpc("pet:closeMiniChat");
	}, [draftTarget]);

	const timelineItems = useMemo<TimelineItem[]>(() => {
		const chatItems = visibleMessages.map((message: RawMessage, index) => {
			const key = getTimelineMessageKey(message, index);
			return {
				kind: "chat" as const,
				key,
				sortAt: chatSeenAt.get(key) ?? MINI_CHAT_RUNTIME_TIMESTAMP,
				message,
			};
		});

		return chatItems.sort((left, right) => {
			return left.sortAt - right.sortAt;
		});
	}, [chatSeenAt, visibleMessages]);

	return (
		<div className={styles.root}>
			<MiniChatHeader
				draftTarget={draftTarget}
				codeSending={codeSending}
				isGenerating={isHeaderGenerating}
				codeAgentStatus={codeAgentStatus}
				sessionInit={sessionInit}
				sessionTitle={sessionTitle}
				lastUpdatedAt={lastUpdatedAt}
				chatSessions={headerSessions}
				currentSessionKey={headerSessionKey}
				isReady={isReady}
				isError={isError}
				isConnecting={isConnecting}
				onOpenFull={handleOpenFull}
				onClose={handleClose}
				codeWorkspaceRoot={codeWorkspaceRoot}
				onRemoveCodeMode={removeCodeMentionFromInput}
				onPickWorkspace={handlePickWorkspaceClick}
				permissionMode={codeAgentConfig.permissionMode}
				onPermissionModeChange={handlePermissionModeChange}
				onNewConversation={handleNewConversation}
				onSwitchSession={handleSwitchSession}
			/>

			<MiniChatTimeline
				timelineItems={timelineItems}
				sending={sending}
				streamingText={liveStreamingText}
				pendingFinal={pendingFinal}
				codeSending={codeSending}
				codeAgentItems={codeAgentItems}
				streamingThinkingText={codeStreaming.thinkingText}
				streamingAssistantText={codeStreaming.assistantText}
				vendorStatusText={codeStreaming.vendorStatusText}
				isThinking={codeStreaming.isThinking}
				isCodeStreaming={codeStreaming.isStreaming}
				codeWorkspaceRoot={codeWorkspaceRoot}
				spinnerMode={codeStreaming.spinnerMode}
			/>

			<div className={styles.inputDock}>
				{/* New SDK-driven permission dispatcher (tool-specific UI) */}
				{codeAgentPendingPermission && (
					<PermissionDispatcher
						permission={codeAgentPendingPermission}
						onDecision={(requestId, decision, feedback) => {
							if (decision === "allow-session") {
								addSessionAllowedTool(codeAgentPendingPermission.toolName);
							}
							const ipcDecision = decision === "allow-session" ? "allow" : decision;
							resolveCodeAgentPermission(requestId, ipcDecision);
							void handlePermissionDecision(requestId, ipcDecision, feedback);
						}}
					/>
				)}
				{/* MCP Elicitation form */}
				{pendingElicitation && (
					<div className={styles.elicitationPopup}>
						<ElicitationForm
							elicitation={pendingElicitation}
							onClose={() => {
								resolveElicitation("decline");
								void invokeIpc("code-agent:respond-elicitation", {
									elicitationId: pendingElicitation.elicitationId,
									action: "decline",
								}).catch(() => {});
							}}
							onSubmit={(action, content) => {
								resolveElicitation(action, content);
								void invokeIpc("code-agent:respond-elicitation", {
									elicitationId: pendingElicitation.elicitationId,
									action,
									content,
								}).catch(() => {});
							}}
						/>
					</div>
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
					isClaudeCodeCliMode={draftTarget === "code"}
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
					onUploadFolder={() => {
						void handleUploadFolder();
					}}
					onScreenshot={() => {
						void handleScreenshot();
					}}
					stageBufferFiles={stageBufferFiles}
					onDropPaths={(paths) => {
						applyDroppedPaths(paths);
					}}
					showMentionPanel={showMentionPanel}
					showMentionPicker={showMentionPicker}
					mentionOptions={mentionOptions}
					mentionEmptyState={mentionEmptyState}
					activeMentionIndex={activeMentionIndex}
					onActiveMentionIndexChange={setActiveMentionIndex}
					onApplyMention={applyMention}
					onPickWorkspace={handlePickWorkspaceClick}
					showSlashPicker={showSlashPicker}
					slashOptions={filteredSlashOptions}
					claudeCodeSkills={claudeCodeSkills}
					activeSlashIndex={activeSlashIndex}
					onActiveSlashIndexChange={setActiveSlashIndex}
					onApplySlashOption={applySlashOption}
					composerInputRef={composerInputRef}
					onSkillChange={(skill) => { if (!skill) activeSkillRef.current = null; }}
					onRichContentChange={(content) => { richContentRef.current = content; }}
					onCaretChange={setCaretIndex}
					onKeyDown={handleKeyDown}
					onPressEnter={handlePressEnter}
					modelLabel={modelLabel}
					onCycleModel={handleCycleModel}
					effortEnabled={effortEnabled}
					thinkingEnabled={thinkingEnabled}
					fastModeEnabled={fastModeEnabled}
					onToggleEffort={handleToggleEffort}
					onToggleThinking={handleToggleThinking}
					onToggleFastMode={handleToggleFastMode}
					onOpenAccountUsage={handleOpenAccountUsage}
					onRewind={handleRewindConversation}
					onClearConversation={handleNewConversation}
					onCompositionStart={() => setIsComposing(true)}
					onCompositionEnd={() => setIsComposing(false)}
					onFocusChange={setIsInputFocused}
				/>
			</div>
		</div>
	);
}
