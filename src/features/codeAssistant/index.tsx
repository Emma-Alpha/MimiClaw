import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { useLocation } from "react-router-dom";
import type { MenuProps } from "antd";
import {
	Check,
	ChevronDown,
	FileText,
	Folder,
	GitBranch,
	Plus,
	Search,
	Shield,
	ShieldAlert,
} from "lucide-react";
import type { ISlashOption } from "@lobehub/editor";
import { ActionIcon, Tag } from "@lobehub/ui";
import { Camera, Mic, MicOff, Paperclip } from "lucide-react";
import { useVolcengineAsr } from "@/hooks/useVolcengineAsr";
import { labPreferSelectors } from "@/stores/settings";
import type {
	FileAttachment,
} from "@/features/mainChat/lib/composer-helpers";
import { ChatInput } from "@/features/mainChat/ChatInput";
import type { ChatInputEditorApi, ChatInputSendPayload, MentionItem } from "@/features/mainChat/ChatInput/types";
import { ContextUsageTooltip } from "@/components/ui/context-usage-tooltip";
import { StyledDropdown } from "@/components/ui/styled-dropdown";
import {
	cancelCodeAgentRun,
	fetchClaudeCodeSkills,
	fetchCodeAgentStatus,
	fetchLatestCodeAgentRun,
	fetchProjectMentionEntries,
	fetchWorkspaceGitBranch,
	inferCodeAgentWorkspaceRoot,
	readStoredCodeAgentWorkspaceRoot,
	writeStoredCodeAgentWorkspaceRoot,
	type ClaudeCodeSkillEntry,
	type ProjectMentionEntry,
} from "@/lib/code-agent";
import { invokeIpc } from "@/lib/api-client";
import { useCodeAgentStore, type StreamingToolUse } from "@/stores/code-agent";
import {
	extractComposerPathsFromTransfer,
	type ComposerPath,
} from "@/lib/unified-composer";
import i18n from "@/i18n";
import { useChatStore, type RawMessage } from "@/stores/chat";
import { useGatewayStore } from "@/stores/gateway";
import { useSettingsStore } from "@/stores/settings";
import { useSkillsStore } from "@/stores/skills";
import { toast } from "sonner";
import type {
	CodeAgentStatus,
	CodeAgentPermissionMode,
} from "../../../shared/code-agent";
import type {
	PetCodeChatSeed,
} from "../../../shared/pet";
import { CodeChatHeader } from "./components/CodeChatHeader";
import { ConversationView } from "@/features/mainChat/components/ConversationView";
import { ThreadTerminalPanel } from "./components/ThreadTerminalPanel";
import { ElicitationForm } from "./components/code-agent/ElicitationForm";
import { PermissionDispatcher } from "./components/code-agent/permissions/PermissionDispatcher";
import { TodoListCard } from "./components/code-agent/TodoListCard";
import { useCodeChatAttachmentActions } from "./hooks/useCodeChatAttachmentActions";
import { useCodeChatCodeAgentControls } from "./hooks/useCodeChatCodeAgentControls";
import { useCodeChatClaudeSessions } from "./hooks/useCodeChatClaudeSessions";
import { useCodeChatCodeAgentEvents } from "./hooks/useCodeChatCodeAgentEvents";
import { useCodeChatSeedAndAutoSend } from "./hooks/useCodeChatSeedAndAutoSend";
import { useCodeChatSessionActions } from "./hooks/useCodeChatSessionActions";
import { useCodeChatSubmissionActions } from "./hooks/useCodeChatSubmissionActions";
import { getChatSessionTitle } from "./session-title";
import { useCodeChatStyles } from "./styles";
import type {
	CodeChatTarget,
	SlashOption,
	TimelineItem,
	ToolActivityItem,
} from "./types";
import {
	extractText,
	isVisibleMessage,
	normalizeTimestampMs,
	parseSubmissionIntent,
} from "./utils";

const CODE_CHAT_RUNTIME_TIMESTAMP = Date.now();

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

function isEditableTarget(target: EventTarget | null): boolean {
	if (!(target instanceof HTMLElement)) return false;
	if (target.isContentEditable) return true;
	const tagName = target.tagName;
	if (tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT") {
		return true;
	}
	return target.getAttribute("role") === "textbox";
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

type CodeChatProps = {
	embeddedCodeAssistant?: boolean;
};

export function CodeChat({ embeddedCodeAssistant = false }: CodeChatProps) {
	const { styles, cx } = useCodeChatStyles();
	const location = useLocation();
	const platform = window.electron?.platform;
	const initSettings = useSettingsStore((state) => state.init);
	const language = useSettingsStore((state) => state.language);
	const codeAgentConfig = useSettingsStore((state) => state.codeAgent);
	const setCodeAgentConfig = useSettingsStore((state) => state.setCodeAgent);
	const isSttEnabled = useSettingsStore(labPreferSelectors.enabled('stt'));
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
	const abortRun = useChatStore((state) => state.abortRun);

	const [input, setInput] = useState("");
	const [attachments, setAttachments] = useState<FileAttachment[]>([]);
	const [droppedPaths, setDroppedPaths] = useState<ComposerPath[]>([]);
	const [selectedMode, setSelectedMode] = useState<CodeChatTarget | null>(null);
	const [persistentMode, setPersistentMode] = useState<CodeChatTarget | null>(
		embeddedCodeAssistant ? "code" : null,
	);
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
	const [showThreadTerminal, setShowThreadTerminal] = useState(false);
	const branchSearchInputRef = useRef<HTMLInputElement>(null);
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
	const chatInputEditorRef = useRef<ChatInputEditorApi | null>(null);
	const activeSkillsRef = useRef<SlashOption[]>([]);
	const richContentRef = useRef<import("slate").Descendant[] | undefined>(undefined);

	// --- @ mention (project files) ---
	const [projectMentionEntries, setProjectMentionEntries] = useState<ProjectMentionEntry[]>([]);

	// --- / skills (claude code skills) ---
	const [claudeCodeSkills, setClaudeCodeSkills] = useState<{ global: ClaudeCodeSkillEntry[]; project: ClaudeCodeSkillEntry[] }>({ global: [], project: [] });
	const [activeSkillTags, setActiveSkillTags] = useState<SlashOption[]>([]);

	// --- STT (voice recording) ---
	const { cancelRecording: cancelSttRecording, isRecording: isSttRecording, isTranscribing: isSttTranscribing, toggleRecording: toggleSttRecording } = useVolcengineAsr({
		onTranscriptReady: (text) => {
			if (!text.trim()) return;
			chatInputEditorRef.current?.insertTextAtCursor(text);
		},
	});

	const pendingAutoSend = useRef<PetCodeChatSeed | null>(null);
	const floatingTodoRef = useRef<HTMLDivElement | null>(null);
	const [chatSeenAt, setChatSeenAt] = useState<Map<string, number>>(() => new Map());
	const [floatingTodoHeight, setFloatingTodoHeight] = useState(0);
	const [floatingTodoTool, setFloatingTodoTool] = useState<StreamingToolUse | null>(null);
	const [todoPanelArmed, setTodoPanelArmed] = useState(false);
	const [todoRunStartCursor, setTodoRunStartCursor] = useState<number | null>(null);
	const chatSeenCounterRef = useRef(0);
	const prevCodeSendingRef = useRef(codeSending);
	const prevTodoSessionKeyRef = useRef("");
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


	const {
		claudeSessions,
		activeClaudeSessionId,
		setActiveClaudeSessionId,
		loadClaudeSessions,
		hydrateClaudeSessionHistory,
	} = useCodeChatClaudeSessions({
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

	// biome-ignore lint/correctness/useExhaustiveDependencies: intentional trigger on workspace change
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

	// Guard: when the user requested a fresh session (+ button), block any
	// sdk-message events that arrive from other running sessions (e.g. cron jobs)
	// until the user actually submits a message and a new session is created.
	const guardedPushSdkMessage = useCallback(
		(payload: unknown) => {
			if (forceFreshSessionOnNextSubmitRef.current) return;
			pushSdkMessage(payload);
		},
		[pushSdkMessage],
	);

	useCodeChatCodeAgentEvents({
		pushSdkMessage: guardedPushSdkMessage,
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
		setActiveSkillTags([]);
		chatInputEditorRef.current?.clearContent();
		cancelSttRecording();
	}, [cancelSttRecording]);

	const setInputAndEditor = useCallback((value: import("react").SetStateAction<string>) => {
		if (typeof value === 'function') {
			setInput((current) => {
				const next = value(current);
				requestAnimationFrame(() => {
					chatInputEditorRef.current?.setMarkdownContent(next);
				});
				return next;
			});
		} else {
			setInput(value);
			requestAnimationFrame(() => {
				chatInputEditorRef.current?.setMarkdownContent(value);
			});
		}
	}, []);

		const { applyDroppedPaths, handleUploadFile, handleScreenshot } = useCodeChatAttachmentActions({
		setAttachments,
		setDroppedPaths,
	});

	// Preload project mention entries once the workspace root is known.
	// This MUST happen before the user types "@", because @lobehub/editor only
	// registers the "@" mention plugin when `mentionOption.items.length > 0`.
	// If the list is empty when "@" is first typed, the dropdown will not open —
	// even after items arrive asynchronously (e.g. while typing "@src").
	useEffect(() => {
		if (!codeWorkspaceRoot) {
			setProjectMentionEntries([]);
			return;
		}
		let cancelled = false;
		fetchProjectMentionEntries(codeWorkspaceRoot)
			.then((entries) => {
				if (!cancelled) setProjectMentionEntries(entries);
			})
			.catch((err) => {
				console.error('[CodeAssistant] preload mentions error:', err);
			});
		return () => {
			cancelled = true;
		};
	}, [codeWorkspaceRoot]);

	// Refine the mention list as the user types "@query". When no "@" is being
	// typed, keep the previously-loaded list intact so the plugin stays active
	// and the dropdown can reopen immediately on the next "@".
	useEffect(() => {
		if (!codeWorkspaceRoot) return;

		const trimmedInput = input.trimEnd();
		const mentionMatch = trimmedInput.match(/(^|\s)@([^\s@]*)$/);
		if (!mentionMatch) return;

		const query = (mentionMatch[2] ?? '').replace(/\\/g, '/');

		const timeoutId = setTimeout(() => {
			fetchProjectMentionEntries(codeWorkspaceRoot, query || undefined)
				.then((entries) => {
					setProjectMentionEntries(entries);
				})
				.catch((err) => {
					console.error('[CodeAssistant] search error:', err);
				});
		}, 150);

		return () => clearTimeout(timeoutId);
	}, [codeWorkspaceRoot, input]);

	// Fetch claude code skills whenever workspace root changes
	useEffect(() => {
		if (!codeWorkspaceRoot) {
			setClaudeCodeSkills({ global: [], project: [] });
			return;
		}
		fetchClaudeCodeSkills(codeWorkspaceRoot)
			.then((result) => setClaudeCodeSkills(result))
			.catch(() => {});
	}, [codeWorkspaceRoot]);

	// Map project mention entries to MentionItem[]
	const mentionItems = useMemo<MentionItem[]>(
		() => {
			return projectMentionEntries.map((entry) => {
				const lastSlash = entry.relativePath.lastIndexOf('/');
				const parentDir = lastSlash >= 0
					? entry.relativePath.slice(0, lastSlash)
					: '';
				const Icon = entry.isDirectory ? Folder : FileText;
				return {
					id: entry.absolutePath,
					// Inserted mention text: full relative path keeps every
					// entry unique (avoids duplicate "@src" pills) and makes
					// it clear which file/folder was referenced.
					label: `@${entry.relativePath}`,
					// Dropdown row label: short name for easy scanning. The
					// fuse.js client-side filter also uses this string.
					displayLabel: entry.name,
					// Description participates in fuse matching; also useful
					// for other consumers that want secondary metadata.
					description: entry.relativePath,
					kind: entry.isDirectory ? 'folder' : 'file',
					icon: (
						<Icon
							size={14}
							strokeWidth={1.75}
							style={{
								color: entry.isDirectory
									? 'var(--color-primary)'
									: 'var(--color-text-secondary)',
								flexShrink: 0,
							}}
						/>
					),
					extra: (
						<span
							style={{
								color: 'var(--color-text-tertiary)',
								fontSize: 12,
								marginLeft: 12,
								overflow: 'hidden',
								textOverflow: 'ellipsis',
								whiteSpace: 'nowrap',
								maxWidth: 220,
								direction: 'rtl',
								textAlign: 'left',
							}}
							title={entry.relativePath}
						>
							{parentDir || (entry.isDirectory ? '/' : '.')}
						</span>
					),
				};
			});
		},
		[projectMentionEntries],
	);

	// Map claudeCodeSkills to ISlashOption[] for the editor slash menu
	const extraSlashItems = useMemo<ISlashOption[]>(() => {
		const toSlashItem = (entry: ClaudeCodeSkillEntry): ISlashOption => ({
			desc: entry.description,
			key: `${entry.scope}:${entry.name}`,
			label: entry.command,
			onSelect: () => {
				const skill: SlashOption = {
					id: `${entry.scope}:${entry.name}`,
					command: entry.command,
					title: entry.name,
					description: entry.description,
					keywords: [entry.name.toLowerCase()],
					scope: entry.scope,
					source: entry.source,
					skillContent: entry.skillContent,
				};
				activeSkillsRef.current = [...activeSkillsRef.current, skill];
				setActiveSkillTags((prev) => [...prev, skill]);
			},
		});
		return [
			...claudeCodeSkills.project.map(toSlashItem),
			...claudeCodeSkills.global.map(toSlashItem),
		];
	}, [claudeCodeSkills]);

	useCodeChatCodeAgentControls({
		codeAgentConfig,
		setCodeAgentConfig,
	});
	const { submitPrompt } =
		useCodeChatSubmissionActions({
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

	const handleCodeAssistantSend = useCallback(
		async ({ getMarkdownContent }: ChatInputSendPayload) => {
			const content = getMarkdownContent().trim();
			if (!content && attachments.length === 0 && droppedPaths.length === 0) return;
			if (sending || codeSending) return;
			await submitPrompt(content);
			// clearComposer (called inside submitPrompt) also calls chatInputEditorRef.current?.clearContent()
		},
		[attachments.length, codeSending, droppedPaths.length, sending, submitPrompt],
	);

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

	useCodeChatSeedAndAutoSend({
		pendingAutoSendRef: pendingAutoSend,
		setPersistentMode,
		setSelectedMode,
		setAttachments,
		setInput: setInputAndEditor,
		setCaretIndex: () => {},
		submitPrompt,
		sending,
		codeSending,
		isReady,
	});

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
	const terminalShortcutLabel = platform === "darwin" ? "⌘J" : "Ctrl+J";

	const handleStop = useCallback(async () => {
		try {
			if (draftTarget === "code") {
				await cancelCodeAgentRun();
				return;
			}

			await abortRun();
		} catch (error) {
			console.error(error);
			toast.error("停止生成失败");
		}
	}, [abortRun, draftTarget]);

	useEffect(() => {
		if (!embeddedCodeAssistant || draftTarget !== "code") return;

		const handleKeyDown = (event: globalThis.KeyboardEvent) => {
			if (event.defaultPrevented || event.repeat) return;
			if (event.altKey || event.shiftKey) return;
			if (event.key.toLowerCase() !== "j") return;

			const hasShortcutModifier = platform === "darwin"
				? event.metaKey
				: event.ctrlKey;
			if (!hasShortcutModifier) return;
			if (isEditableTarget(event.target)) return;

			event.preventDefault();
			setShowThreadTerminal((previous) => !previous);
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [draftTarget, embeddedCodeAssistant, platform]);

	const {
		handleNewConversation,
		handleSwitchSession,
	} = useCodeChatSessionActions({
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

	// biome-ignore lint/correctness/useExhaustiveDependencies: forceFreshSessionOnNextSubmitRef is a ref, intentional
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
		void invokeIpc("pet:closeQuickChat");
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



	const visibleMessages = useMemo(
		() => messages.filter(isVisibleMessage),
		[messages],
	);

	// Convert codeAgentItems to RawMessage format for unified rendering
	const codeAgentMessages = useMemo<RawMessage[]>(() => {
		if (draftTarget !== "code") return [];

		const converted: RawMessage[] = [];

		for (const item of codeAgentItems) {
			if (item.kind === "user") {
				const ts = item.createdAt
					? (item.createdAt < 1e12 ? item.createdAt : item.createdAt / 1000)
					: Date.now() / 1000;
				converted.push({
					id: item.id,
					role: "user",
					content: item.text,
					timestamp: ts,
					_attachedFiles: [],
				});
			} else if (item.kind === "assistant-text") {
				const ts = item.createdAt
					? (item.createdAt < 1e12 ? item.createdAt : item.createdAt / 1000)
					: Date.now() / 1000;
				converted.push({
					id: item.id,
					role: "assistant",
					content: item.text,
					timestamp: ts,
				});
			} else if (item.kind === "thinking") {
				// Include thinking as part of assistant message
				converted.push({
					id: item.id,
					role: "assistant",
					content: [
						{
							type: "thinking" as const,
							thinking: item.data.text,
						},
					],
					timestamp: Date.now() / 1000,
				});
			} else if (item.kind === "tool-use") {
				// Include tool use in assistant message
				converted.push({
					id: item.id,
					role: "assistant",
					content: [
						{
							type: "tool_use" as const,
							id: item.tool.toolUseId,
							name: item.tool.toolName,
							input: item.tool.rawInput,
						},
					],
					timestamp: Date.now() / 1000,
				});
			} else if (item.kind === "assistant-usage") {
				// Attach usage metadata to the most recent assistant message
				// so ConversationView → NewAssistantMessage → Usage can display it
				for (let i = converted.length - 1; i >= 0; i--) {
					if (converted[i].role === "assistant") {
						const target = converted[i] as unknown as Record<string, unknown>;
						target.usage = {
							input_tokens: item.usage.inputTokens,
							output_tokens: item.usage.outputTokens,
							cache_read_input_tokens: item.usage.cacheReadTokens,
							cache_creation_input_tokens: item.usage.cacheWriteTokens,
						};
						if (item.model) target.model = item.model;
						if (item.durationMs) target.elapsed = item.durationMs;
						break;
					}
				}
			}
		}

		return converted;
	}, [codeAgentItems, draftTarget]);

	// Merge messages based on current mode
	const unifiedMessages = useMemo(() => {
		return draftTarget === "code" ? codeAgentMessages : visibleMessages;
	}, [draftTarget, codeAgentMessages, visibleMessages]);

	useEffect(() => {
		setChatSeenAt((previous) => {
			let changed = false;
			const next = new Map(previous);
			for (const [index, message] of visibleMessages.entries()) {
				const key = getTimelineMessageKey(message, index);
				if (next.has(key)) continue;
				const normalizedTimestamp = normalizeTimestampMs(message.timestamp);
				const fallbackTimestamp =
					CODE_CHAT_RUNTIME_TIMESTAMP + chatSeenCounterRef.current;
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
		void invokeIpc("pet:closeQuickChat");
	}, [draftTarget, embeddedCodeAssistant]);

	const timelineItems = useMemo<TimelineItem[]>(() => {
		const chatItems = visibleMessages.map((message: RawMessage, index) => {
			const key = getTimelineMessageKey(message, index);
			return {
				kind: "chat" as const,
				key,
				sortAt: chatSeenAt.get(key) ?? CODE_CHAT_RUNTIME_TIMESTAMP,
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
				<CodeChatHeader
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
					showTerminalToggle={embeddedCodeAssistant && draftTarget === "code"}
					isTerminalVisible={showThreadTerminal}
					isTerminalToggleDisabled={!codeWorkspaceRoot.trim()}
					terminalShortcutLabel={terminalShortcutLabel}
					onToggleTerminal={() => {
						setShowThreadTerminal((previous) => !previous);
					}}
				/>

			<ConversationView
				messages={unifiedMessages}
				currentSessionKey={draftTarget === "code" ? activeClaudeSessionId : currentSessionKey}
				loading={false}
				sending={sending || codeSending}
				error={null}
				showThinking={true}
				streamingMessage={
					draftTarget === "code" && (codeStreaming.assistantText || codeStreaming.thinkingText)
						? {
							role: "assistant" as const,
							content: [
								...(codeStreaming.thinkingText
									? [{ type: "thinking" as const, thinking: codeStreaming.thinkingText }]
									: []),
								...(codeStreaming.assistantText
									? [{ type: "text" as const, text: codeStreaming.assistantText }]
									: []),
							],
						}
						: streamingMessage
				}
				streamingTools={streamingTools}
				pendingFinal={pendingFinal}
				lastRunWasAborted={false}
				clearError={() => {}}
			/>

			<div className={styles.bottomDock}>
				<div className={cx(styles.inputDock, embeddedCodeAssistant && styles.inputDockEmbedded)}>
					{/* New SDK-driven permission dispatcher (tool-specific UI) */}
					{codeAgentPendingPermission && (
						<div className={styles.permissionDock}>
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
						</div>
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
			{/* Drag-drop wrapper: dropping files/folders adds them as path tags */}
			{/* biome-ignore lint/a11y/noStaticElementInteractions: drag-drop zone, no keyboard equivalent needed */}
			<div
				onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
				onDrop={(e) => {
					e.preventDefault();
					const paths = extractComposerPathsFromTransfer(e.dataTransfer);
					if (paths.length > 0) applyDroppedPaths(paths);
				}}
			>
			<ChatInput
				agentId={currentSessionKey ?? ''}
				allowExpand={false}
				chatInputEditorRef={chatInputEditorRef}
				disabled={disableComposer || sending || codeSending}
				extraRightContent={isSttEnabled ? (
					<ActionIcon
						active={isSttRecording}
						icon={isSttRecording || isSttTranscribing ? MicOff : Mic}
						loading={isSttTranscribing}
						size={{ blockSize: 28, size: 14 }}
						title={isSttRecording ? '停止录音' : '语音输入'}
						onClick={() => { void toggleSttRecording(); }}
					/>
				) : undefined}
				extraSlashItems={extraSlashItems}
				leftActions={[]}
				leftContent={
					<div style={{ alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: 2, padding: '0 2px' }}>
						<ActionIcon
							icon={Paperclip}
							size={{ blockSize: 28, size: 14 }}
							title="上传文件"
							onClick={() => { void handleUploadFile(); }}
						/>
						{platform === 'darwin' && (
							<ActionIcon
								icon={Camera}
								size={{ blockSize: 28, size: 14 }}
								title="截图"
								onClick={() => { void handleScreenshot(); }}
							/>
						)}
						{(activeSkillTags.length > 0 || droppedPaths.length > 0) && (
							<div style={{ alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: 4, marginLeft: 4 }}>
								{activeSkillTags.map((skill) => (
									<Tag
										closable
										key={skill.id}
										onClose={() => {
											activeSkillsRef.current = activeSkillsRef.current.filter((s) => s.id !== skill.id);
											setActiveSkillTags((prev) => prev.filter((s) => s.id !== skill.id));
										}}
									>
										{skill.command}
									</Tag>
								))}
								{droppedPaths.map((p) => (
									<Tag
										closable
										key={p.absolutePath}
										onClose={() => setDroppedPaths((prev) => prev.filter((d) => d.absolutePath !== p.absolutePath))}
									>
										{p.name}
									</Tag>
								))}
							</div>
						)}
					</div>
				}
				mentionItems={mentionItems}
				onMarkdownContentChange={(value) => {
					setInput(value);
				}}
				onSend={handleCodeAssistantSend}
				onStop={() => { void handleStop(); }}
				rightActions={[]}
				runtimeLeftLabel={draftTarget === 'code' ? embeddedPermissionLabel : undefined}
				runtimeRightLabel={draftTarget === 'code' ? embeddedBranchLabel : undefined}
				sending={sending || codeSending}
			/>
			</div>
				{showEmbeddedComposerMeta ? (
					<div className={styles.composerStatusRow}>
						<div className={styles.composerStatusLeft}>
							
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
								// biome-ignore lint/a11y/useKeyWithClickEvents: dropdown panel stops propagation
								// biome-ignore lint/a11y/noStaticElementInteractions: dropdown panel stops propagation
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
				{embeddedCodeAssistant && draftTarget === "code" && showThreadTerminal ? (
					<ThreadTerminalPanel
						key={codeWorkspaceRoot || "thread-terminal"}
						branchLabel={embeddedBranchLabel}
						workspaceRoot={codeWorkspaceRoot}
						onClose={() => {
							setShowThreadTerminal(false);
						}}
					/>
				) : null}
		</div>
		</div>
	);
}
