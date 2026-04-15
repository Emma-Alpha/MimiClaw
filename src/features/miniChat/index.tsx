import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	type KeyboardEvent,
} from "react";
import { useLocation } from "react-router-dom";
import type { MenuProps } from "antd";
import {
	Check,
	ChevronDown,
	GitBranch,
	Monitor,
	Plus,
	Search,
	Shield,
	ShieldAlert,
} from "lucide-react";
import {
	type FileAttachment,
} from "@/features/chat/lib/composer-helpers";
import { ContextUsageTooltip } from "@/components/ui/context-usage-tooltip";
import { StyledDropdown } from "@/components/ui/styled-dropdown";
import {
	fetchClaudeCodeSkills,
	fetchCodeAgentStatus,
	fetchLatestCodeAgentRun,
	fetchProjectMentionEntries,
	fetchWorkspaceGitBranch,
	inferCodeAgentWorkspaceRoot,
	readStoredCodeAgentWorkspaceRoot,
	writeStoredCodeAgentWorkspaceRoot,
	type ClaudeCodeSkillEntry,
} from "@/lib/code-agent";
import { invokeIpc } from "@/lib/api-client";
import { useCodeAgentStore, type StreamingToolUse } from "@/stores/code-agent";
import {
	type UnifiedComposerPath,
} from "@/lib/unified-composer";
import type { UnifiedComposerInputHandle } from "@/features/chat/components/unified-composer-input";
import i18n from "@/i18n";
import { useChatStore, type RawMessage } from "@/stores/chat";
import { useGatewayStore } from "@/stores/gateway";
import { useSettingsStore } from "@/stores/settings";
import { useSkillsStore } from "@/stores/skills";
import type {
	CodeAgentStatus,
	CodeAgentPermissionMode,
} from "../../../shared/code-agent";
import type {
	PetMiniChatSeed,
} from "../../../shared/pet";
import { MiniChatComposer } from "./components/MiniChatComposer";
import { MiniChatHeader } from "./components/MiniChatHeader";
import { MiniChatTimeline } from "./components/MiniChatTimeline";
import { ElicitationForm } from "./components/code-agent/ElicitationForm";
import { PermissionDispatcher } from "./components/code-agent/permissions/PermissionDispatcher";
import { TodoListCard } from "./components/code-agent/TodoListCard";
import { useMiniChatAttachmentActions } from "./hooks/useMiniChatAttachmentActions";
import { useMiniChatCodeAgentControls } from "./hooks/useMiniChatCodeAgentControls";
import { useMiniChatClaudeSessions } from "./hooks/useMiniChatClaudeSessions";
import { useMiniChatCodeAgentEvents } from "./hooks/useMiniChatCodeAgentEvents";
import { useMiniChatMentionsAndSlash } from "./hooks/useMiniChatMentionsAndSlash";
import { useMiniChatMode } from "./hooks/useMiniChatMode";
import { useMiniChatSeedAndAutoSend } from "./hooks/useMiniChatSeedAndAutoSend";
import { useMiniChatSessionActions } from "./hooks/useMiniChatSessionActions";
import { useMiniChatSubmissionActions } from "./hooks/useMiniChatSubmissionActions";
import { getChatSessionTitle } from "./session-title";
import { useMiniChatStyles } from "./styles";
import type {
	MentionOption,
	MiniChatTarget,
	SlashOption,
	TimelineItem,
	ToolActivityItem,
} from "./types";
import {
	extractText,
	getMentionDraft,
	getSlashDraft,
	isVisibleMessage,
	normalizeTimestampMs,
	parseSubmissionIntent,
} from "./utils";

const MINI_CHAT_RUNTIME_TIMESTAMP = Date.now();

function getTimelineMessageKey(message: RawMessage, index: number) {
	return message.id
		? `chat:${message.role}:${message.id}`
		: `chat:${message.role}:${index}:${extractText(message.content).slice(0, 40)}`;
}

const CODE_PERMISSION_MODE_LABELS: Record<CodeAgentPermissionMode, string> = {
	default: "默认权限",
	acceptEdits: "接受编辑",
	auto: "自动模式",
	plan: "规划模式",
	dontAsk: "免确认",
	bypassPermissions: "完全访问权限",
};
const CODE_PERMISSION_MODE_OPTIONS = (
	Object.entries(CODE_PERMISSION_MODE_LABELS) as Array<[CodeAgentPermissionMode, string]>
).map(([value, label]) => ({ value, label }));

function getPermissionModeLabel(mode: CodeAgentPermissionMode): string {
	return CODE_PERMISSION_MODE_LABELS[mode] ?? mode;
}

function formatTokenCount(value: number): string {
	if (!Number.isFinite(value)) return "0";
	if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
	if (value >= 1_000) return `${(value / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
	return `${Math.round(value)}`;
}

function isTodoWriteToolName(name: string): boolean {
	return name.trim().toLowerCase() === "todowrite";
}

function hasValidTodoItems(rawInput: Record<string, unknown>): boolean {
	const todos = rawInput?.todos;
	if (!Array.isArray(todos)) return false;
	return todos.some(
		(todo) =>
			todo != null
			&& typeof todo === "object"
			&& typeof (todo as { content?: unknown }).content === "string"
			&& typeof (todo as { status?: unknown }).status === "string",
	);
}

type MiniChatProps = {
	embeddedCodeAssistant?: boolean;
};

export function MiniChat({ embeddedCodeAssistant = false }: MiniChatProps) {
	const { styles, cx } = useMiniChatStyles();
	const location = useLocation();
	const isMiniChatMode = useMiniChatMode();
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
		embeddedCodeAssistant ? "code" : null,
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
	const [codeRunActive, setCodeRunActive] = useState(false);
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
	const codeSessionState = useCodeAgentStore((s) => s.sessionState);
	const contextUsage = useCodeAgentStore((s) => s.contextUsage);
	const setCodeAgentContextUsage = useCodeAgentStore((s) => s.setContextUsage);
	const [codeAgentStatus, setCodeAgentStatus] =
		useState<CodeAgentStatus | null>(null);
	const [codeWorkspaceRoot, setCodeWorkspaceRoot] = useState(() =>
		readStoredCodeAgentWorkspaceRoot(),
	);
	const [embeddedBranchLabel, setEmbeddedBranchLabel] = useState("main");
	const [embeddedBranchNames, setEmbeddedBranchNames] = useState<string[]>(() => ["main"]);
	const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);
	const [branchSearchValue, setBranchSearchValue] = useState("");
	const branchSearchInputRef = useRef<HTMLInputElement>(null);
	const [claudeCodeSkills, setClaudeCodeSkills] = useState<{
		global: ClaudeCodeSkillEntry[];
		project: ClaudeCodeSkillEntry[];
	}>({ global: [], project: [] });
	const requestedWorkspaceRoot = useMemo(() => {
		if (!embeddedCodeAssistant) return "";
		const raw = new URLSearchParams(location.search).get("workspaceRoot");
		return raw?.trim() ?? "";
	}, [embeddedCodeAssistant, location.search]);
	const requestedClaudeSessionId = useMemo(() => {
		if (!embeddedCodeAssistant) return "";
		const raw = new URLSearchParams(location.search).get("sessionId");
		return raw?.trim() ?? "";
	}, [embeddedCodeAssistant, location.search]);
	const requestedNewThreadToken = useMemo(() => {
		if (!embeddedCodeAssistant) return "";
		const raw = new URLSearchParams(location.search).get("newThread");
		return raw?.trim() ?? "";
	}, [embeddedCodeAssistant, location.search]);
	const composerInputRef = useRef<UnifiedComposerInputHandle>(null);
	const activeSkillsRef = useRef<SlashOption[]>([]);
	const richContentRef = useRef<import("slate").Descendant[] | undefined>(undefined);

	const pendingAutoSend = useRef<PetMiniChatSeed | null>(null);
	const floatingTodoRef = useRef<HTMLDivElement | null>(null);
	const [chatSeenAt, setChatSeenAt] = useState<Map<string, number>>(() => new Map());
	const [floatingTodoHeight, setFloatingTodoHeight] = useState(0);
	const [floatingTodoTool, setFloatingTodoTool] = useState<StreamingToolUse | null>(null);
	const [todoPanelArmed, setTodoPanelArmed] = useState(false);
	const [todoRunStartCursor, setTodoRunStartCursor] = useState<number | null>(null);
	const chatSeenCounterRef = useRef(0);
	const prevCodeSendingRef = useRef(codeSending);
	const prevTodoSessionKeyRef = useRef("");
	const inputRef = useRef(input);
	const caretIndexRef = useRef(caretIndex);
	const lastHydratedClaudeSessionRef = useRef("");
	const lastRequestedClaudeSessionRef = useRef("");
	const lastRequestedNewThreadTokenRef = useRef("");
	const forceFreshSessionOnNextSubmitRef = useRef(false);
	const pushedToolIdsRef = useRef<Set<string>>(new Set());
	const chatSubmitInFlightRef = useRef(false);
	const gatewayState = gatewayStatus.state;
	const isConnecting =
		gatewayState === "starting" || gatewayState === "reconnecting";
	const isError = gatewayState === "error";
	const isReady = gatewayState === "running";
	const isCodeTurnInProgress =
		codeSending
		|| codeRunActive
		|| codeSessionState === "running"
		|| codeSessionState === "requires_action";

	useEffect(() => {
		if (!branchDropdownOpen) return;
		const timer = window.setTimeout(() => {
			branchSearchInputRef.current?.focus();
		}, 0);
		return () => window.clearTimeout(timer);
	}, [branchDropdownOpen]);

	useEffect(() => {
		inputRef.current = input;
	}, [input]);

	useEffect(() => {
		caretIndexRef.current = caretIndex;
	}, [caretIndex]);

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
		forceFreshSessionOnNextSubmitRef,
		resetCodeTimelineState,
		resetChatSeenState,
		pushSdkMessage,
		pushUserMessage,
		resetCodeAgentStreaming,
		setContextUsage: setCodeAgentContextUsage,
	});

	useEffect(() => {
		void loadClaudeSessions();
	}, [loadClaudeSessions]);

	useEffect(() => {
		lastHydratedClaudeSessionRef.current = "";
		lastRequestedClaudeSessionRef.current = "";
	}, [codeWorkspaceRoot]);

	useEffect(() => {
		if (!embeddedCodeAssistant) return;
		const nextWorkspaceRoot = requestedWorkspaceRoot.trim();
		if (!nextWorkspaceRoot) return;
		if (nextWorkspaceRoot === codeWorkspaceRoot.trim()) return;
		const timer = window.setTimeout(() => {
			setCodeWorkspaceRoot(nextWorkspaceRoot);
		}, 0);
		return () => window.clearTimeout(timer);
	}, [codeWorkspaceRoot, embeddedCodeAssistant, requestedWorkspaceRoot]);

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
		if (embeddedCodeAssistant) return;
		newSession();
	}, [embeddedCodeAssistant, newSession]);

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
		setCodeRunActive,
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

	useEffect(() => {
		const ws = codeWorkspaceRoot.trim();
		if (!ws) return;
		fetchWorkspaceGitBranch(ws)
			.then(({ branch, branches }) => {
				if (branch) setEmbeddedBranchLabel(branch);
				if (branches.length > 0) setEmbeddedBranchNames(branches);
			})
			.catch(() => {});
	}, [codeWorkspaceRoot]);

	const clearComposer = useCallback(() => {
		setInput("");
		setSelectedMode(null);
		setAttachments([]);
		setDroppedPaths([]);
		activeSkillsRef.current = [];
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
		modelOptions,
		selectedModel,
		modelLabel,
		handleSelectModel,
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
			activeSkillsRef,
			richContentRef,
			pendingCompletionActivitiesRef,
			chatSubmitInFlightRef,
			forceFreshSessionOnNextSubmitRef,
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
			!sending && !isCodeTurnInProgress
				? "idle"
				: isCodeTurnInProgress
					? "working"
					: pendingFinal || liveStreamingText || streamingTools.length > 0
						? "working"
						: "listening";
		void invokeIpc("pet:setUiActivity", { activity }).catch(() => {});
	}, [
		isCodeTurnInProgress,
		liveStreamingText,
		pendingFinal,
		sending,
		streamingTools,
	]);

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
	const draftTarget = embeddedCodeAssistant
		? "code"
		: selectedMode || persistentMode || draftIntent.target;
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

	useEffect(() => {
		if (!embeddedCodeAssistant) return;
		if (!requestedNewThreadToken) return;
		if (lastRequestedNewThreadTokenRef.current === requestedNewThreadToken) return;
		lastRequestedNewThreadTokenRef.current = requestedNewThreadToken;
		forceFreshSessionOnNextSubmitRef.current = true;
		lastRequestedClaudeSessionRef.current = "";
		lastHydratedClaudeSessionRef.current = "";
		setActiveClaudeSessionId("");
		resetCodeTimelineState();
		resetChatSeenState();
		clearComposer();
	}, [
		clearComposer,
		embeddedCodeAssistant,
		forceFreshSessionOnNextSubmitRef,
		requestedNewThreadToken,
		resetChatSeenState,
		resetCodeTimelineState,
		setActiveClaudeSessionId,
	]);

	useEffect(() => {
		if (!embeddedCodeAssistant) return;
		if (!requestedClaudeSessionId) return;
		if (lastRequestedClaudeSessionRef.current === requestedClaudeSessionId) return;
		lastRequestedClaudeSessionRef.current = requestedClaudeSessionId;
		forceFreshSessionOnNextSubmitRef.current = false;
		const timer = window.setTimeout(() => {
			lastHydratedClaudeSessionRef.current = "";
			setActiveClaudeSessionId(requestedClaudeSessionId);
			resetCodeTimelineState();
			resetChatSeenState();
		}, 0);
		return () => window.clearTimeout(timer);
	}, [
		embeddedCodeAssistant,
		requestedClaudeSessionId,
		resetChatSeenState,
		resetCodeTimelineState,
		setActiveClaudeSessionId,
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
			const liveInput = inputRef.current;
			const liveCaret = caretIndexRef.current;
			const resolvedDraft = mentionDraft ?? getMentionDraft(liveInput, liveCaret);
			if (!resolvedDraft) return;

			setActiveMentionIndex(0);
			composerInputRef.current?.insertMention(
				{
					absolutePath: option.absolutePath,
					name: option.label,
					isDirectory: option.isDirectory,
				},
				{ start: resolvedDraft.start, end: resolvedDraft.end },
			);
			requestAnimationFrame(() => {
				composerInputRef.current?.focus();
				setIsInputFocused(true);
			});
		},
		[mentionDraft],
	);

	const applySlashOption = useCallback(
		(option: SlashOption) => {
			const liveInput = inputRef.current;
			const liveCaret = caretIndexRef.current;
			const liveDraft = getSlashDraft(liveInput, liveCaret);
			const resolvedDraft = liveDraft ?? slashDraft;

			setActiveSlashIndex(0);
			const already = activeSkillsRef.current.some((s) => s.command === option.command);
			if (!already) {
				activeSkillsRef.current = [...activeSkillsRef.current, option];
			}
			if (resolvedDraft) {
				composerInputRef.current?.insertSkill(option.command, {
					start: resolvedDraft.start,
					end: resolvedDraft.end,
				});
				return;
			}
			composerInputRef.current?.insertSkill(option.command);
		},
		[slashDraft],
	);

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
				const option = mentionOptions[activeMentionIndex] ?? mentionOptions[0];
				if (!option) {
					setActiveMentionIndex(0);
					setCaretIndex(-1);
					return;
				}
				applyMention(option);
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
				const option = mentionOptions[activeMentionIndex] ?? mentionOptions[0];
				if (!option) {
					setActiveMentionIndex(0);
					setCaretIndex(-1);
					return;
				}
				applyMention(option);
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
			? isConnecting || isError || sending || isCodeTurnInProgress
			: sending || isCodeTurnInProgress;
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
		isCodeTurnInProgress ||
		pendingFinal ||
		Boolean(liveStreamingText) ||
		codeStreaming.isStreaming;
	const showEmbeddedComposerMeta = embeddedCodeAssistant && draftTarget === "code";
	const embeddedPermissionLabel = useMemo(
		() => getPermissionModeLabel(codeAgentConfig.permissionMode),
		[codeAgentConfig.permissionMode],
	);
	const permissionDropdownMenu = useMemo<MenuProps>(
		() => ({
			items: [
				{
					type: "group",
					label: "权限模式",
					children: CODE_PERMISSION_MODE_OPTIONS.map((option) => ({
						key: option.value,
						label: option.label,
						icon:
							option.value === "bypassPermissions" ? (
								<ShieldAlert size={14} />
							) : (
								<Shield size={14} />
							),
					})),
				},
			],
			selectable: true,
			selectedKeys: [codeAgentConfig.permissionMode],
			onClick: ({ key }) => {
				handlePermissionModeChange(key as CodeAgentPermissionMode);
			},
		}),
		[codeAgentConfig.permissionMode, handlePermissionModeChange],
	);
	const embeddedFallbackContextWindow =
		sessionInit?.model && /\[1m\]/i.test(sessionInit.model)
			? 1_000_000
			: 200_000;
	const embeddedContextSummary = useMemo(() => {
		const contextWindowSize = contextUsage?.contextWindowSize
			&& Number.isFinite(contextUsage.contextWindowSize)
			? Math.max(1, Math.round(contextUsage.contextWindowSize))
			: embeddedFallbackContextWindow;
		const usedTokens = Math.max(
			0,
			Math.min(contextWindowSize, Math.round(contextUsage?.usedTokens ?? 0)),
		);
		const remainingTokens = Math.max(0, contextWindowSize - usedTokens);
		const usedPercentage = Math.max(
			0,
			Math.min(
				100,
				contextUsage?.usedPercentage ?? (usedTokens / contextWindowSize) * 100,
			),
		);
		const remainingPercentage = Math.max(
			0,
			Math.min(
				100,
				contextUsage?.remainingPercentage ?? 100 - usedPercentage,
			),
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
		};
	}, [contextUsage, embeddedFallbackContextWindow]);
	const normalizedBranchSearch = branchSearchValue.trim().toLowerCase();
	const embeddedBranchDetailMap = useMemo(() => new Map<string, string>(), []);
	const filteredEmbeddedBranches = useMemo(() => {
		const matchedBranchNames = embeddedBranchNames.filter((branchName) =>
			branchName.toLowerCase().includes(normalizedBranchSearch),
		);
		const branchNamesWithCurrent = matchedBranchNames.includes(embeddedBranchLabel)
			? matchedBranchNames
			: [embeddedBranchLabel, ...matchedBranchNames];
		const deduplicatedBranchNames = Array.from(new Set(branchNamesWithCurrent));

		return deduplicatedBranchNames.map((name) => ({
			name,
			detail: embeddedBranchDetailMap.get(name),
		}));
	}, [
		embeddedBranchDetailMap,
		embeddedBranchLabel,
		embeddedBranchNames,
		normalizedBranchSearch,
	]);
	const handleSelectEmbeddedBranch = useCallback((branchName: string) => {
		const normalized = branchName.trim();
		if (!normalized) return;
		setEmbeddedBranchLabel(normalized);
		setEmbeddedBranchNames((previous) => (
			previous.includes(normalized) ? previous : [normalized, ...previous]
		));
		setBranchDropdownOpen(false);
		setBranchSearchValue("");
	}, []);
	const handleCreateEmbeddedBranch = useCallback(() => {
		const nextBranch = branchSearchValue.trim();
		if (!nextBranch) {
			branchSearchInputRef.current?.focus();
			return;
		}
		handleSelectEmbeddedBranch(nextBranch);
	}, [branchSearchValue, handleSelectEmbeddedBranch]);

	const handleOpenFull = useCallback(() => {
		if (embeddedCodeAssistant) return;
		void invokeIpc(
			draftTarget === "code" ? "pet:openCodeAssistant" : "pet:openMainWindow",
		);
		void invokeIpc("pet:closeMiniChat");
	}, [draftTarget, embeddedCodeAssistant]);

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
	const latestTodoToolInCurrentRun = useMemo(() => {
		if (!todoPanelArmed) return null;
		if (todoRunStartCursor == null) return null;
		const scanStart = Math.max(0, todoRunStartCursor);
		for (let index = codeAgentItems.length - 1; index >= scanStart; index -= 1) {
			const item = codeAgentItems[index];
			if (item.kind !== "tool-use") continue;
			if (!isTodoWriteToolName(item.tool.toolName)) continue;
			if (!hasValidTodoItems(item.tool.rawInput)) continue;
			return item.tool;
		}
		return null;
	}, [codeAgentItems, todoPanelArmed, todoRunStartCursor]);
	const todoSessionKey =
		draftTarget === "code"
			? activeClaudeSessionId.trim() || "__code_pending__"
			: "__not_code__";

	useEffect(() => {
		const previous = prevTodoSessionKeyRef.current;
		const isPendingToActiveSession =
			previous === "__code_pending__"
			&& todoSessionKey !== "__not_code__"
			&& isCodeTurnInProgress;
		if (previous && previous !== todoSessionKey && !isPendingToActiveSession) {
			setFloatingTodoTool(null);
			setTodoPanelArmed(false);
			setTodoRunStartCursor(null);
			setFloatingTodoHeight(0);
		}
		prevTodoSessionKeyRef.current = todoSessionKey;
	}, [isCodeTurnInProgress, todoSessionKey]);

	useEffect(() => {
		const wasSending = prevCodeSendingRef.current;
		if (draftTarget === "code" && codeSending && !wasSending) {
			setTodoPanelArmed(true);
			setTodoRunStartCursor(codeAgentItems.length);
			setFloatingTodoTool(null);
			setFloatingTodoHeight(0);
		}
		prevCodeSendingRef.current = codeSending;
	}, [codeAgentItems.length, codeSending, draftTarget]);

	useEffect(() => {
		if (draftTarget !== "code") return;
		if (!todoPanelArmed) return;
		if (!latestTodoToolInCurrentRun) return;
		setFloatingTodoTool(latestTodoToolInCurrentRun);
	}, [draftTarget, latestTodoToolInCurrentRun, todoPanelArmed]);

	const floatingTodoOverlap = 18;
	const timelineBottomReservedHeight = floatingTodoTool
		? Math.max(0, floatingTodoHeight - floatingTodoOverlap + 12)
		: 0;

	useEffect(() => {
		if (!floatingTodoTool) {
			setFloatingTodoHeight(0);
			return;
		}

		const node = floatingTodoRef.current;
		if (!node) return;

		const updateHeight = () => {
			setFloatingTodoHeight(Math.ceil(node.getBoundingClientRect().height));
		};
		updateHeight();

		if (typeof ResizeObserver === "undefined") return;
		const observer = new ResizeObserver(updateHeight);
		observer.observe(node);
		return () => observer.disconnect();
	}, [floatingTodoTool]);

	return (
		<div className={cx(styles.root, embeddedCodeAssistant && styles.rootEmbedded)}>
				<MiniChatHeader
					embedded={embeddedCodeAssistant}
					draftTarget={draftTarget}
					codeSending={codeSending}
					isGenerating={isHeaderGenerating}
					codeAgentStatus={codeAgentStatus}
					sessionInit={sessionInit}
					sessionTitle={sessionTitle}
					contextUsage={contextUsage}
					chatSessions={headerSessions}
					currentSessionKey={headerSessionKey}
					isReady={isReady}
					isError={isError}
					isConnecting={isConnecting}
					onOpenFull={handleOpenFull}
					onClose={handleClose}
					onNewConversation={handleNewConversation}
					onSwitchSession={handleSwitchSession}
					showWindowActions={!embeddedCodeAssistant}
				/>

			<MiniChatTimeline
				embedded={embeddedCodeAssistant}
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
				bottomReservedHeight={timelineBottomReservedHeight}
			/>

			<div className={cx(styles.inputDock, embeddedCodeAssistant && styles.inputDockEmbedded)}>
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
				{floatingTodoTool ? (
					<div
						ref={floatingTodoRef}
						className={cx(
							styles.todoDock,
							styles.todoDockInset,
							styles.todoDockFloating,
							styles.todoDockFused,
						)}
					>
						<TodoListCard
							tool={floatingTodoTool}
							variant="dock"
							fusedWithComposer
						/>
					</div>
				) : null}
					<MiniChatComposer
						fusedWithTodo={Boolean(floatingTodoTool)}
						input={input}
						onInputChange={setInput}
						onSend={() => {
							void handleSend();
						}}
						loading={sending || codeSending}
						disabled={disableComposer}
						sendDisabled={sendDisabled}
						isClaudeCodeCliMode={draftTarget === "code"}
						isMiniChatMode={isMiniChatMode}
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
					onSkillsChange={(skills) => {
						activeSkillsRef.current = activeSkillsRef.current.filter(
							(opt) => skills.includes(opt.command),
						);
					}}
					onRichContentChange={(content) => { richContentRef.current = content; }}
					onCaretChange={setCaretIndex}
					onKeyDown={handleKeyDown}
					onPressEnter={handlePressEnter}
					modelOptions={modelOptions}
					modelValue={selectedModel}
					modelLabel={modelLabel}
					onSelectModel={handleSelectModel}
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
				{showEmbeddedComposerMeta ? (
					<div className={styles.composerStatusRow}>
						<div className={styles.composerStatusLeft}>
							<span className={styles.composerStatusItem}>
								<Monitor size={12} />
								<span>本地</span>
								<ChevronDown size={12} />
							</span>
							<StyledDropdown
								menu={permissionDropdownMenu}
								placement="topLeft"
								trigger={["click"]}
							>
								<button
									type="button"
									className={cx(
										styles.composerStatusItem,
										styles.composerStatusItemButton,
										styles.composerStatusPermission,
									)}
									title="切换权限模式"
								>
									{codeAgentConfig.permissionMode === "bypassPermissions" ? (
										<ShieldAlert size={12} />
									) : (
										<Shield size={12} />
									)}
									<span>{embeddedPermissionLabel}</span>
									<ChevronDown size={12} />
								</button>
							</StyledDropdown>
						</div>
						<div className={styles.composerStatusRight}>
							<ContextUsageTooltip
								usedPercentage={embeddedContextSummary.usedPercentage}
								remainingPercentage={embeddedContextSummary.remainingPercentage}
								usedTokensLabel={formatTokenCount(embeddedContextSummary.usedTokens)}
								remainingTokensLabel={formatTokenCount(embeddedContextSummary.remainingTokens)}
								totalTokensLabel={formatTokenCount(embeddedContextSummary.contextWindowSize)}
								ringColor={embeddedContextSummary.ringColor}
								size={14}
							/>
							<StyledDropdown
								menu={{
									items: [
										{
											key: "__branch-dropdown-anchor",
											label: "",
											disabled: true,
										},
									],
								}}
								variant="default"
								overlayClassName={styles.branchDropdownOverlay}
								placement="topRight"
								trigger={["click"]}
								onOpenChange={(nextOpen) => {
									setBranchDropdownOpen(nextOpen);
									if (!nextOpen) {
										setBranchSearchValue("");
									}
								}}
								dropdownRender={() => (
									<div
										className={styles.branchDropdownPanel}
										onMouseDown={(event) => event.stopPropagation()}
										onClick={(event) => event.stopPropagation()}
									>
										<div className={styles.branchDropdownSearchRow}>
											<Search size={12} className={styles.branchDropdownSearchIcon} />
											<input
												ref={branchSearchInputRef}
												type="text"
												className={styles.branchDropdownSearchInput}
												placeholder="搜索分支"
												value={branchSearchValue}
												onChange={(event) => {
													setBranchSearchValue(event.target.value);
												}}
												onKeyDown={(event) => {
													event.stopPropagation();
													if (event.key !== "Enter") return;
													event.preventDefault();
													handleCreateEmbeddedBranch();
												}}
											/>
										</div>
										<div className={styles.branchDropdownSectionLabel}>分支</div>
										<div className={styles.branchDropdownMenuWrap}>
											{filteredEmbeddedBranches.length > 0 ? (
												filteredEmbeddedBranches.map((branch) => {
													const isActive = branch.name === embeddedBranchLabel;
													return (
														<button
															key={branch.name}
															type="button"
															className={cx(
																styles.branchDropdownItem,
																isActive && styles.branchDropdownItemActive,
															)}
															onClick={() => {
																handleSelectEmbeddedBranch(branch.name);
															}}
														>
															<span className={styles.branchDropdownItemMain}>
																<GitBranch size={12} className={styles.branchDropdownItemIcon} />
																<span className={styles.branchDropdownItemTextWrap}>
																	<span className={styles.branchDropdownItemName}>{branch.name}</span>
																	{branch.detail ? (
																		<span className={styles.branchDropdownItemDetail}>
																			{branch.detail}
																		</span>
																	) : null}
																</span>
															</span>
															<Check
																size={13}
																className={cx(
																	styles.branchDropdownItemCheck,
																	isActive && styles.branchDropdownItemCheckVisible,
																)}
															/>
														</button>
													);
												})
											) : (
												<div className={styles.branchDropdownEmptyState}>未找到匹配分支</div>
											)}
										</div>
										<button
											type="button"
											className={styles.branchDropdownCreateButton}
											onClick={() => {
												handleCreateEmbeddedBranch();
											}}
										>
											<Plus size={12} />
											<span>
												{branchSearchValue.trim()
													? `创建并检出 "${branchSearchValue.trim()}"`
													: "创建并检出新分支..."}
											</span>
										</button>
									</div>
								)}
							>
								<button
									type="button"
									className={cx(
										styles.composerStatusItem,
										styles.composerStatusItemButton,
									)}
									title="切换分支"
								>
									<GitBranch size={12} />
									<span>{embeddedBranchLabel}</span>
									<ChevronDown size={12} />
								</button>
							</StyledDropdown>
						</div>
					</div>
				) : null}
			</div>
		</div>
	);
}
