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
	Monitor,
	Plus,
	Search,
	Shield,
	ShieldAlert,
} from "lucide-react";
import { INSERT_MENTION_COMMAND, type ISlashOption, type IEditor } from "@lobehub/editor";
import { useVolcengineAsr } from "@/hooks/useVolcengineAsr";
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
	restartCodeAgent,
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
import { useChatStore, type StreamingToolUse } from "@/stores/chat";
import { getAllMarketplacePlugins, usePluginsStore } from "@/stores/plugins";
import {
	extractComposerPathsFromTransfer,
	type ComposerPath,
} from "@/lib/unified-composer";
import i18n from "@/i18n";
import type { RawMessage } from "@/stores/chat";
import { useSettingsStore } from "@/stores/settings";

import type {
	CodeAgentStatus,
	CodeAgentPermissionMode,
} from "../../../../shared/code-agent";
import type {
	PetCodeChatSeed,
} from "../../../../shared/pet";
import { CodeChatHeader } from "./components/CodeChatHeader";
import { ConversationView } from "@/features/mainChat/components/ConversationView";
import { ThreadTerminalPanel } from "./components/ThreadTerminalPanel";
import { SidePanel } from "./components/sidePanel";
import { useSidePanelStore } from "@/stores/sidePanel";
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
import { useCodeChatStyles } from "./styles";
import type {
	SlashOption,
	ToolActivityItem,
} from "./types";

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
	isMiniWindow?: boolean;
};

export function CodeChat({ embeddedCodeAssistant = false, isMiniWindow = false }: CodeChatProps) {
	const { styles, cx } = useCodeChatStyles();
	const location = useLocation();
	const platform = window.electron?.platform;
	const initSettings = useSettingsStore((state) => state.init);
	const language = useSettingsStore((state) => state.language);
	const codeAgentConfig = useSettingsStore((state) => state.codeAgent);
	const setCodeAgentConfig = useSettingsStore((state) => state.setCodeAgent);

	const [input, setInput] = useState("");
	const [attachments, setAttachments] = useState<FileAttachment[]>([]);
	const [droppedPaths, setDroppedPaths] = useState<ComposerPath[]>([]);
	const [codeSending, setCodeSending] = useState(false);
	const [codeRunActive, setCodeRunActive] = useState(false);
	// Ref keeps the latest activities accessible in callbacks without dep-array churn
	const codeActivitiesRef = useRef<ToolActivityItem[]>([]);
	// Snapshot taken at run-completed, before the ref is cleared, so
	// runMiniCodeTask can attach it to the completed message even if another
	// run starts before the promise resolves.
	const pendingCompletionActivitiesRef = useRef<ToolActivityItem[]>([]);
	// When true, streaming events (token + sdk-message) are suppressed so that
	// clicking "stop" gives immediate visual feedback even when the sidecar
	// cancel round-trip races with the CLI result message. Reset on run-started.
	const stopRequestedRef = useRef(false);

	// New SDK-message driven store
	const pushSdkMessage = useChatStore((s) => s.pushSdkMessage);
	const pushUserMessage = useChatStore((s) => s.pushUserMessage);
	const resetCodeAgent = useChatStore((s) => s.reset);
	const resetCodeAgentStreaming = useChatStore((s) => s.resetStreaming);
	const codeAgentItems = useChatStore((s) => s.items);
	const codeStreaming = useChatStore((s) => s.streaming);
	const codeAgentPendingPermission = useChatStore(
		(s) => s.pendingPermission,
	);
	const setCodeAgentPendingPermission = useChatStore(
		(s) => s.setPendingPermission,
	);
	const resolveCodeAgentPermission = useChatStore(
		(s) => s.resolvePermission,
	);
	const addSessionAllowedTool = useChatStore((s) => s.addSessionAllowedTool);
	const pendingElicitation = useChatStore((s) => s.pendingElicitation);
	const resolveElicitation = useChatStore((s) => s.resolveElicitation);
	const sessionInit = useChatStore((s) => s.sessionInit);
	const sessionTitle = useChatStore((s) => s.sessionTitle);
	const codeSessionState = useChatStore((s) => s.sessionState);
	const contextUsage = useChatStore((s) => s.contextUsage);
	const setCodeAgentContextUsage = useChatStore((s) => s.setContextUsage);
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
	const [showSidePanel, setShowSidePanel] = useState(false);

	// Auto-open side panel (browser tab) when AI requests it
	useEffect(() => {
		const cleanup = window.electron?.ipcRenderer?.on?.("browser-use:request-open", () => {
			setShowSidePanel(true);
			useSidePanelStore.getState().setActiveTab("browser");
		});
		return typeof cleanup === "function" ? cleanup : undefined;
	}, []);
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
	const allSkillsRef = useRef<ClaudeCodeSkillEntry[]>([]);
	const richContentRef = useRef<import("slate").Descendant[] | undefined>(undefined);

	// --- @ mention (project files) ---
	const [projectMentionEntries, setProjectMentionEntries] = useState<ProjectMentionEntry[]>([]);

	// --- / skills (claude code skills) ---
	const [claudeCodeSkills, setClaudeCodeSkills] = useState<{ global: ClaudeCodeSkillEntry[]; project: ClaudeCodeSkillEntry[] }>({ global: [], project: [] });
	const [_activeSkillTags, setActiveSkillTags] = useState<SlashOption[]>([]);

	// --- STT (voice recording) ---
	const { cancelRecording: cancelSttRecording } = useVolcengineAsr({
		onTranscriptReady: (text) => {
			if (!text.trim()) return;
			chatInputEditorRef.current?.insertTextAtCursor(text);
		},
	});

	const pendingAutoSend = useRef<PetCodeChatSeed | null>(null);
	const floatingTodoRef = useRef<HTMLDivElement | null>(null);
	const [_floatingTodoHeight, setFloatingTodoHeight] = useState(0);
	const [floatingTodoTool, setFloatingTodoTool] = useState<StreamingToolUse | null>(null);
	const [todoPanelArmed, setTodoPanelArmed] = useState(false);
	const [todoRunStartCursor, setTodoRunStartCursor] = useState<number | null>(null);
	const prevCodeSendingRef = useRef(codeSending);
	const prevTodoSessionKeyRef = useRef("");
	const lastHydratedClaudeSessionRef = useRef("");
	const lastRequestedClaudeSessionRef = useRef("");
	const lastRequestedNewThreadTokenRef = useRef("");
	const forceFreshSessionOnNextSubmitRef = useRef(false);
	// Gateway removed — always ready
	const isConnecting = false;
	const isError = false;
	const isReady = true;
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


	const resetCodeTimelineState = useCallback(() => {
		resetCodeAgent();
		codeActivitiesRef.current = [];
		pendingCompletionActivitiesRef.current = [];
	}, [resetCodeAgent]);
	const resetChatSeenState = useCallback(() => {
		// no-op: chat seen timestamps removed with gateway chat
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


	useEffect(() => {
		void initSettings();
	}, [initSettings]);

	useEffect(() => {
		if (language && language !== i18n.language) {
			i18n.changeLanguage(language);
		}
	}, [language]);


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
		stopRequestedRef,
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

		const { applyDroppedPaths } = useCodeChatAttachmentActions({
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
		const mentionMatch = trimmedInput.match(/(^|.)@([^\s@]*)$/);
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

	// Keep allSkillsRef in sync (project-scoped first for priority)
	useEffect(() => {
		allSkillsRef.current = [...claudeCodeSkills.project, ...claudeCodeSkills.global];
	}, [claudeCodeSkills]);

	// Map project mention entries to MentionItem[]
	const fileMentionItems = useMemo<MentionItem[]>(
		() => {
			return projectMentionEntries.map((entry) => {
				const lastSlash = entry.relativePath.lastIndexOf('/');
				const parentDir = lastSlash >= 0
					? entry.relativePath.slice(0, lastSlash)
					: '';
				const Icon = entry.isDirectory ? Folder : FileText;
				return {
					id: entry.absolutePath,
					label: `@${entry.relativePath}`,
					displayLabel: entry.name,
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

	// Map enabled MCP plugins to MentionItem[] so they appear in the @ dropdown.
	// Eagerly fetch installed plugins so they are available without visiting Plugins page first.
	const fetchInstalledPlugins = usePluginsStore((s) => s.fetchInstalledPlugins);
	const fetchMarketplaceSources = usePluginsStore((s) => s.fetchMarketplaceSources);
	const catalogs = usePluginsStore((s) => s.catalogs);
	const enabledPlugins = usePluginsStore((s) => s.enabledPlugins);

	useEffect(() => {
		void fetchInstalledPlugins();
		void fetchMarketplaceSources();
	}, [fetchInstalledPlugins, fetchMarketplaceSources]);

	const pluginMentionItems = useMemo<MentionItem[]>(() => {
		const allPlugins = getAllMarketplacePlugins(catalogs);
		return allPlugins
			.filter((p) => {
				const key = `${p.name}@${p.marketplace}`;
				return (key in enabledPlugins) && p.mcpServerName;
			})
			.map((p) => ({
				id: `mcp:${p.mcpServerName}`,
				label: `@${p.mcpServerName}`,
				displayLabel: p.name,
				description: p.description,
				kind: 'plugin' as const,
				iconUrl: p.icon,
				icon: p.icon ? (
					<img
						alt=""
						src={p.icon}
						style={{ borderRadius: 2, flexShrink: 0, height: 14, objectFit: 'contain', width: 14 }}
					/>
				) : (
					<Monitor
						size={14}
						strokeWidth={1.75}
						style={{ color: 'var(--color-primary)', flexShrink: 0 }}
					/>
				),
			}));
	}, [catalogs, enabledPlugins]);

	const mentionItems = useMemo<MentionItem[]>(
		() => [...pluginMentionItems, ...fileMentionItems],
		[pluginMentionItems, fileMentionItems],
	);

	// Map claudeCodeSkills to ISlashOption[] for the editor slash menu
	const extraSlashItems = useMemo<ISlashOption[]>(() => {
		const toSlashItem = (entry: ClaudeCodeSkillEntry): ISlashOption => ({
			desc: entry.description,
			key: `${entry.scope}:${entry.name}`,
			label: entry.command,
			metadata: { scope: entry.scope, source: entry.source },
			onSelect: (activeEditor: IEditor) => {
				// Insert a skill pill/tag into the editor (strip leading "/" since markdownWriter adds it)
				activeEditor.dispatchCommand(INSERT_MENTION_COMMAND, {
					label: entry.command.replace(/^\//, ''),
					metadata: {
						id: `${entry.scope}:${entry.name}`,
						kind: 'skill',
						description: entry.description,
					},
				});

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
			clearComposer,
			activeSkillsRef,
			allSkillsRef,
			richContentRef,
			pendingCompletionActivitiesRef,
			forceFreshSessionOnNextSubmitRef,
		});

	const handleCodeAssistantSend = useCallback(
		async ({ getMarkdownContent, getMentions }: ChatInputSendPayload) => {
			const content = getMarkdownContent().trim();
			if (!content && attachments.length === 0 && droppedPaths.length === 0) return;
			if (codeSending) return;

			const mentions = getMentions();
			const mcpServerNames = mentions
				.filter((m) => m.metadata?.kind === 'plugin' && typeof m.metadata?.id === 'string')
				.map((m) => (m.metadata!.id as string).replace(/^mcp:/, ''))
				.filter(Boolean);

			// Convert mention metadata to serializable tags for message display
			const mentionTags = mentions
				.filter((m) => m.metadata?.kind)
				.map((m) => ({
					kind: m.metadata!.kind as string,
					label: m.label,
					icon: m.metadata?.icon as string | undefined,
				}));

			await submitPrompt(
				content,
				undefined,
				undefined,
				undefined,
				mcpServerNames.length > 0 ? mcpServerNames : undefined,
				mentionTags.length > 0 ? mentionTags : undefined,
			);
		},
		[attachments.length, codeSending, droppedPaths.length, submitPrompt],
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
		setAttachments,
		setInput: setInputAndEditor,
		setCaretIndex: () => {},
		submitPrompt,
		codeSending,
	});

	useEffect(() => {
		const activity = isCodeTurnInProgress ? "working" : "idle";
		void invokeIpc("pet:setUiActivity", { activity }).catch(() => {});
	}, [isCodeTurnInProgress]);

	const draftTarget = "code" as const;
	const terminalShortcutLabel = platform === "darwin" ? "⌘J" : "Ctrl+J";

	const handleStop = useCallback(async () => {
		// Immediately block new streaming events and clear current text so the
		// user sees visual feedback before the cancel round-trip completes.
		// The flag is reset when the next run starts (code-agent:run-started).
		stopRequestedRef.current = true;
		resetCodeAgentStreaming();
		setCodeSending(false);
		setCodeRunActive(false);
		useChatStore.setState({ sessionState: "idle" });
		try {
			const { cancelled } = await cancelCodeAgentRun();
			if (!cancelled) {
				console.warn("[code-agent] Cancel returned cancelled=false, force-restarting sidecar");
				// The sidecar couldn't cancel (run already settled or abort controller
				// was cleared). Force-restart the entire sidecar process to ensure the
				// CLI child is killed and no stale events leak through.
				await restartCodeAgent().catch((err) => {
					console.error("[code-agent] Force restart failed:", err);
				});
			}
		} catch (error) {
			console.error(error);
			// Even if cancel throws, force-restart as a last resort
			await restartCodeAgent().catch(() => {});
		}
		resetCodeAgentStreaming();
	}, [resetCodeAgentStreaming, setCodeSending, setCodeRunActive]);

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

	// ─── Cmd+Shift+E → toggle side panel ──────────────────────────────────
	useEffect(() => {
		if (!embeddedCodeAssistant || draftTarget !== "code") return;

		const handleKeyDown = (event: globalThis.KeyboardEvent) => {
			if (event.defaultPrevented || event.repeat) return;
			if (!event.shiftKey) return;
			if (event.key.toLowerCase() !== "e") return;

			const hasShortcutModifier = platform === "darwin"
				? event.metaKey
				: event.ctrlKey;
			if (!hasShortcutModifier) return;

			event.preventDefault();
			setShowSidePanel((previous) => !previous);
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [draftTarget, embeddedCodeAssistant, platform]);

	const {
		handleNewConversation,
		handleSwitchSession,
	} = useCodeChatSessionActions({
		activeClaudeSessionId,
		setActiveClaudeSessionId,
		claudeSessions,
		resetCodeTimelineState,
		clearComposer,
		resetChatSeenState,
		lastHydratedClaudeSessionRef,
		setCodeWorkspaceRoot,
		setCodeSending,
		setCodeRunActive,
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
		setCodeSending(false);
		setCodeRunActive(false);
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
		setCodeSending(false);
		setCodeRunActive(false);
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



	// Convert codeAgentItems to RawMessage format for unified rendering
	const codeAgentMessages = useMemo<RawMessage[]>(() => {
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
					_mentionTags: item.mentionTags,
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
						const perf: Record<string, number> = {};
						if (item.tps != null && item.tps > 0) perf.tps = item.tps;
						if (item.ttftMs != null && item.ttftMs > 0) perf.ttft = item.ttftMs;
						if (Object.keys(perf).length > 0) target.performance = perf;
						break;
					}
				}
			}
		}

		return converted;
	}, [codeAgentItems]);

	const disableComposer = isCodeTurnInProgress;
	const headerSessions = claudeSessions;
	const headerSessionKey = activeClaudeSessionId;
	const isHeaderGenerating =
		isCodeTurnInProgress ||
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
		void invokeIpc("pet:openCodeAssistant");
		void invokeIpc("pet:closeQuickChat");
	}, [embeddedCodeAssistant]);

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
	const todoSessionKey = activeClaudeSessionId.trim() || "__code_pending__";

	useEffect(() => {
		const previous = prevTodoSessionKeyRef.current;
		const isPendingToActiveSession =
			previous === "__code_pending__"
			&& todoSessionKey !== "__code_pending__"
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
		if (codeSending && !wasSending) {
			setTodoPanelArmed(true);
			setTodoRunStartCursor(codeAgentItems.length);
			setFloatingTodoTool(null);
			setFloatingTodoHeight(0);
		}
		prevCodeSendingRef.current = codeSending;
	}, [codeAgentItems.length, codeSending]);

	useEffect(() => {
		if (!todoPanelArmed) return;
		if (!latestTodoToolInCurrentRun) return;
		setFloatingTodoTool(latestTodoToolInCurrentRun);
	}, [latestTodoToolInCurrentRun, todoPanelArmed]);

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
					isMiniWindow={isMiniWindow}
					showTerminalToggle={embeddedCodeAssistant && !isMiniWindow && draftTarget === "code"}
					isTerminalVisible={showThreadTerminal}
					isTerminalToggleDisabled={!codeWorkspaceRoot.trim()}
					terminalShortcutLabel={terminalShortcutLabel}
					onToggleTerminal={() => {
						setShowThreadTerminal((previous) => !previous);
					}}
					showSidePanelToggle={embeddedCodeAssistant && !isMiniWindow && draftTarget === "code"}
					isSidePanelVisible={showSidePanel}
					onToggleSidePanel={() => {
						setShowSidePanel((previous) => !previous);
					}}
				/>

			<div className={showSidePanel ? styles.browserUseMainContent : undefined} style={showSidePanel ? undefined : { display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
			<div className={showSidePanel ? styles.browserUseChatColumn : undefined} style={showSidePanel ? undefined : { display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
			<ConversationView
				messages={codeAgentMessages}
				currentSessionKey={activeClaudeSessionId}
				loading={false}
				sending={codeSending}
				error={null}
				showThinking={true}
				streamingMessage={
					(codeStreaming.assistantText || codeStreaming.thinkingText)
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
						: null
				}
				streamingTools={[]}
				pendingFinal={false}
				lastRunWasAborted={false}
				clearError={() => {}}
				skipPetActivity
			/>

			<div className={styles.bottomDock}>
				<div className={cx(styles.inputDock, embeddedCodeAssistant && styles.inputDockEmbedded, isMiniWindow && styles.inputDockMiniWindow)}>
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
				className={styles.chatInputWrapper}
				data-menu-anchor
				onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
				onDrop={(e) => {
					e.preventDefault();
					const paths = extractComposerPathsFromTransfer(e.dataTransfer);
					if (paths.length > 0) applyDroppedPaths(paths);
				}}
			>
			<ChatInput
				agentId={activeClaudeSessionId ?? ''}
				allowExpand={false}
				chatInputEditorRef={chatInputEditorRef}
				disabled={disableComposer || codeSending}
				extraSlashItems={extraSlashItems}
				leftActions={['model', 'thinking', 'fileUpload', 'screenshot', 'tools', 'stt']}
				mentionItems={mentionItems}
				onMarkdownContentChange={(value) => {
					setInput(value);
				}}
				onSend={handleCodeAssistantSend}
				onStop={() => { void handleStop(); }}
				// rightActions={['promptTransform']}
				sending={codeSending}
			/>
			</div>
				{showEmbeddedComposerMeta ? (
					<div className={cx(styles.composerStatusRow, isMiniWindow && styles.composerStatusRowMiniWindow)}>
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
								usedTokens={embeddedContextSummary.usedTokens}
								maxTokens={embeddedContextSummary.contextWindowSize}
								size={isMiniWindow ? 16: "middle"}
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
			{/* end chatColumn */}
			</div>
			{/* Side panel: right side (files, changes, browser, preview) */}
			{embeddedCodeAssistant && draftTarget === "code" && showSidePanel ? (
				<SidePanel
					workspaceRoot={codeWorkspaceRoot}
					onClose={() => {
						setShowSidePanel(false);
					}}
				/>
			) : null}
			{/* end mainContent */}
			</div>
		</div>
	);
}
