/**
 * Sidebar Component
 * Workspace-driven left navigation.
 */
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
	Blocks,
	ChevronDown,
	Clock,
	Ellipsis,
	FolderOpen,
	Hexagon,
	Loader2,
	MessageCircle,
	MessageSquare,
	Mic,
	Pin,
	Plus,
	Search,
	Settings as SettingsIcon,
	SquarePen,
	Trash2,
} from "lucide-react";
import { Dropdown, type MenuProps } from "antd";
import { useSettingsStore, type SidebarThreadWorkspace } from "@/stores/settings";
import { useChatStore } from "@/stores/chat";
import { useGatewayStore } from "@/stores/gateway";
import { useRemoteMessengerStore } from "@/stores/remote-messenger";
import { useVoiceChatSessionsStore } from "@/stores/voice-chat-sessions";
import {
	fetchCodeAgentSessions,
	fetchWorkspaceAvailability,
	readStoredCodeAgentWorkspaceRoot,
	writeStoredCodeAgentWorkspaceRoot,
} from "@/lib/code-agent";
import { invokeIpc } from "@/lib/api-client";
import { subscribeHostEvent } from "@/lib/host-events";
import {
	buildWorkspaceId,
	deriveWorkspaceName,
	normalizeWorkspacePath,
} from "@/lib/sidebar-workspace";
import { SearchInput } from "@/components/common/SearchInput";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useTranslation } from "react-i18next";
import { useLegacySidebarStyles } from "./style";

type FolderKey = "thread" | "openclaw" | "realtimeVoice" | "xiaojiu";

type OpenClawSessionItem = {
	key: string;
	label: string;
	updatedAt: number;
};

type CliSessionItem = {
	sessionId: string;
	title: string;
	updatedAt: number;
};

type VoiceSessionItem = {
	id: string;
	label: string;
	updatedAt: number;
};

type XiaojiuSessionItem = {
	id: string;
	label: string;
	updatedAt: number;
};

type WorkspaceAvailability = {
	available: boolean;
	reason?: string;
};

type LegacySidebarStyles = ReturnType<typeof useLegacySidebarStyles>["styles"];
type LegacySidebarCx = ReturnType<typeof useLegacySidebarStyles>["cx"];

const COLLAPSIBLE_SESSION_LIMIT = 5;
const THREAD_WORKSPACE_MIGRATION_KEY = "mimiclaw:thread-workspaces-migrated-v1";

function formatRelativeTime(timestamp: number, language: string): string {
	if (!timestamp || Number.isNaN(timestamp)) {
		return "";
	}
	const elapsedMs = Math.max(0, Date.now() - timestamp);
	const isZh = language.startsWith("zh");
	if (elapsedMs < 60_000) {
		return isZh ? "刚刚" : "now";
	}
	if (elapsedMs < 60 * 60_000) {
		const minutes = Math.floor(elapsedMs / 60_000);
		return isZh ? `${minutes} 分` : `${minutes}m`;
	}
	if (elapsedMs < 24 * 60 * 60_000) {
		const hours = Math.floor(elapsedMs / (60 * 60_000));
		return isZh ? `${hours} 小时` : `${hours}h`;
	}
	const days = Math.floor(elapsedMs / (24 * 60 * 60_000));
	return isZh ? `${days} 天` : `${days}d`;
}

function getWorkspaceSecondaryLabel(workspace: SidebarThreadWorkspace): string {
	const parts = normalizeWorkspacePath(workspace.rootPath).split(/[\\/]+/).filter(Boolean);
	if (parts.length < 2) {
		return "";
	}
	const parent = parts[parts.length - 2] ?? "";
	return parent && parent !== workspace.name ? parent : "";
}

function FolderSection({
	icon,
	label,
	count,
	active,
	expanded,
	onActivate,
	onToggle,
	headerActions,
	alwaysShowHeaderActions = false,
	headerTone = "default",
	children,
	styles,
	cx,
	variant = "default",
}: {
	icon: ReactNode;
	label: string;
	count?: number;
	active: boolean;
	expanded: boolean;
	onActivate: () => void;
	onToggle: () => void;
	headerActions?: ReactNode;
	alwaysShowHeaderActions?: boolean;
	headerTone?: "default" | "secondary";
	children?: ReactNode;
	styles: LegacySidebarStyles;
	cx: LegacySidebarCx;
	variant?: "default" | "threadTop";
}) {
	const isThreadTop = variant === "threadTop";
	const isSecondaryTone = headerTone === "secondary";
	return (
		<section className={cx(styles.folderSection, isThreadTop && styles.threadFolderSection)}>
			<div
				className={cx(
					styles.folderHeader,
					active && (isThreadTop ? styles.threadFolderHeaderActive : styles.folderHeaderActive),
					isThreadTop && styles.threadFolderHeader,
				)}
			>
				<button
					type="button"
					onClick={(event) => {
						event.stopPropagation();
						onToggle();
					}}
					aria-label={expanded ? "Collapse folder" : "Expand folder"}
					className={cx(styles.folderInlineToggleButton, isThreadTop && styles.threadFolderInlineToggleButton)}
				>
					<span data-folder-icon="true" className={cx(styles.folderIconWrap, active && styles.folderIconWrapActive)}>
						{icon}
					</span>
					<ChevronDown
						data-folder-chevron="true"
						className={cx(
							styles.folderChevron,
							styles.folderInlineToggleChevron,
							!expanded && styles.folderChevronCollapsed,
						)}
					/>
				</button>
				<button
					type="button"
					onClick={onActivate}
					className={cx(
						styles.folderActivateButton,
						active ? styles.folderActivateButtonActive : styles.folderActivateButtonIdle,
						isSecondaryTone && styles.folderActivateButtonSecondaryHeading,
						active && isSecondaryTone && styles.folderActivateButtonSecondaryHeadingActive,
						isThreadTop && styles.threadFolderActivateButton,
					)}
				>
					<span className={styles.truncate}>{label}</span>
					{typeof count === "number" ? (
						<span className={cx(styles.folderCount, isThreadTop && styles.threadFolderCount)}>{count}</span>
					) : null}
				</button>
				{headerActions ? (
					<div
						className={cx(
							styles.folderHeaderActions,
							isThreadTop && styles.threadFolderHeaderActions,
							alwaysShowHeaderActions && styles.folderHeaderActionsAlwaysVisible,
						)}
						data-folder-actions="true"
					>
						{headerActions}
					</div>
				) : null}
			</div>
			{expanded ? <div className={cx(styles.folderChildren, isThreadTop && styles.threadFolderChildren)}>{children}</div> : null}
		</section>
	);
}

function ThreadLikeFlatSessionRow({
	label,
	timeLabel,
	active,
	onClick,
	leading,
	leadingVisible = false,
	actions,
	styles,
	cx,
}: {
	label: string;
	timeLabel: string;
	active: boolean;
	onClick: () => void;
	leading?: ReactNode;
	leadingVisible?: boolean;
	actions?: ReactNode;
	styles: LegacySidebarStyles;
	cx: LegacySidebarCx;
}) {
	const hasActions = Boolean(actions);
	return (
		<div className={cx(styles.workspaceRow, styles.threadLikeSessionRow)}>
			<button
				type="button"
				onClick={onClick}
				className={cx(
					styles.threadSessionButton,
					hasActions && styles.threadLikeSessionButtonWithActions,
					active ? styles.listButtonActive : styles.listButtonIdle,
				)}
			>
				{leading ? (
					<span
						aria-hidden="true"
						data-session-lead="true"
						className={cx(styles.threadLikeSessionLead, leadingVisible && styles.threadLikeSessionLeadVisible)}
					>
						{leading}
					</span>
				) : null}
				<div className={styles.listButtonRow}>
					<span className={styles.listButtonLabel}>{label}</span>
					<span className={styles.sessionTime} data-session-time={hasActions ? "true" : undefined}>
						{timeLabel}
					</span>
				</div>
			</button>
			{actions ? (
				<div className={styles.workspaceActions} data-workspace-actions="true">
					{actions}
				</div>
			) : null}
		</div>
	);
}

function buildCodeAgentRoute(workspaceRoot: string, sessionId?: string, newThreadToken?: string): string {
	const params = new URLSearchParams();
	params.set("workspaceRoot", workspaceRoot);
	if (sessionId) {
		params.set("sessionId", sessionId);
	}
	if (newThreadToken) {
		params.set("newThread", newThreadToken);
	}
	return `/code-agent/chat?${params.toString()}`;
}

export function LegacySidebar() {
	const { styles, cx } = useLegacySidebarStyles();
	const sidebarCollapsed = useSettingsStore((state) => state.sidebarCollapsed);
	const sidebarFolderExpanded = useSettingsStore((state) => state.sidebarFolderExpanded);
	const setSidebarFolderExpanded = useSettingsStore((state) => state.setSidebarFolderExpanded);
	const sidebarThreadWorkspaces = useSettingsStore((state) => state.sidebarThreadWorkspaces);
	const sidebarThreadWorkspaceExpanded = useSettingsStore((state) => state.sidebarThreadWorkspaceExpanded);
	const sidebarActiveContext = useSettingsStore((state) => state.sidebarActiveContext);
	const setSidebarThreadWorkspaceExpanded = useSettingsStore((state) => state.setSidebarThreadWorkspaceExpanded);
	const setSidebarActiveContext = useSettingsStore((state) => state.setSidebarActiveContext);
	const upsertSidebarThreadWorkspace = useSettingsStore((state) => state.upsertSidebarThreadWorkspace);
	const renameSidebarThreadWorkspace = useSettingsStore((state) => state.renameSidebarThreadWorkspace);
	const removeSidebarThreadWorkspace = useSettingsStore((state) => state.removeSidebarThreadWorkspace);
	const touchSidebarThreadWorkspace = useSettingsStore((state) => state.touchSidebarThreadWorkspace);

	const sessions = useChatStore((s) => s.sessions);
	const currentSessionKey = useChatStore((s) => s.currentSessionKey);
	const sessionLabels = useChatStore((s) => s.sessionLabels);
	const sessionLastActivity = useChatStore((s) => s.sessionLastActivity);
	const switchSession = useChatStore((s) => s.switchSession);
	const newSession = useChatStore((s) => s.newSession);
	const deleteSession = useChatStore((s) => s.deleteSession);
	const loadSessions = useChatStore((s) => s.loadSessions);
	const loadHistory = useChatStore((s) => s.loadHistory);
	const chatSending = useChatStore((s) => s.sending);

	const gatewayStatus = useGatewayStore((s) => s.status);
	const isGatewayRunning = gatewayStatus.state === "running";

	const remoteSessions = useRemoteMessengerStore((s) => s.sessions);
	const remoteLastSyncedAt = useRemoteMessengerStore((s) => s.lastSyncedAt);
	const remoteSyncError = useRemoteMessengerStore((s) => s.syncError);
	const remoteActiveSessionId = useRemoteMessengerStore((s) => s.activeSessionId);
	const setRemoteActiveSessionId = useRemoteMessengerStore((s) => s.setActiveSessionId);

	const voiceSessions = useVoiceChatSessionsStore((s) => s.sessions);
	const voiceSyncError = useVoiceChatSessionsStore((s) => s.syncError);
	const voiceActiveSessionId = useVoiceChatSessionsStore((s) => s.activeSessionId);
	const setVoiceActiveSessionId = useVoiceChatSessionsStore((s) => s.setActiveSessionId);

	const xiaojiuEnabled = useSettingsStore((s) => s.xiaojiuEnabled);

	const navigate = useNavigate();
	const location = useLocation();
	const pathname = location.pathname;
	const { t, i18n } = useTranslation(["common"]);

	const [sessionToDelete, setSessionToDelete] = useState<{ key: string; label: string } | null>(null);
	const [searchQuery, setSearchQuery] = useState("");
	const [searchExpanded, setSearchExpanded] = useState(false);
	const [openClawSessionsExpanded, setOpenClawSessionsExpanded] = useState(false);
	const [xiaojiuSessionsExpanded, setXiaojiuSessionsExpanded] = useState(false);
	const [voiceSessionsExpanded, setVoiceSessionsExpanded] = useState(false);
	const [workspaceSessionsExpanded, setWorkspaceSessionsExpanded] = useState<Record<string, boolean>>({});
	const [workspaceSessionsById, setWorkspaceSessionsById] = useState<Record<string, CliSessionItem[]>>({});
	const [workspaceLoadingById, setWorkspaceLoadingById] = useState<Record<string, boolean>>({});
	const [workspaceErrorById, setWorkspaceErrorById] = useState<Record<string, string | null>>({});
	const [workspaceAvailabilityById, setWorkspaceAvailabilityById] = useState<Record<string, WorkspaceAvailability>>({});
	const searchInputRef = useRef<HTMLInputElement>(null);
	const didRunMigrationRef = useRef(false);
	const didInitialWorkspaceFetchRef = useRef(false);
	const fetchedWorkspaceIdsRef = useRef<Set<string>>(new Set());

	useEffect(() => {
		if (!isGatewayRunning) return;
		let cancelled = false;
		const hasExistingMessages = useChatStore.getState().messages.length > 0;
		(async () => {
			await loadSessions();
			if (cancelled) return;
			await loadHistory(hasExistingMessages);
		})();
		return () => {
			cancelled = true;
		};
	}, [isGatewayRunning, loadHistory, loadSessions]);

	const isFolderExpanded = useCallback(
		(folder: FolderKey) => sidebarFolderExpanded?.[folder] !== false,
		[sidebarFolderExpanded],
	);

	const setFolderExpanded = useCallback(
		(folder: FolderKey, expanded: boolean) => {
			setSidebarFolderExpanded(folder, expanded);
		},
		[setSidebarFolderExpanded],
	);

	const toggleFolder = useCallback(
		(folder: FolderKey) => {
			setFolderExpanded(folder, !isFolderExpanded(folder));
		},
		[isFolderExpanded, setFolderExpanded],
	);

	const threadWorkspaces = useMemo(
		() => [...sidebarThreadWorkspaces].sort((left, right) => (right.lastUsedAt || 0) - (left.lastUsedAt || 0)),
		[sidebarThreadWorkspaces],
	);

	const workspaceById = useMemo(
		() => Object.fromEntries(threadWorkspaces.map((workspace) => [workspace.id, workspace])),
		[threadWorkspaces],
	);

	const workspaceIdByNormalizedRoot = useMemo(
		() =>
			Object.fromEntries(
				threadWorkspaces.map((workspace) => [normalizeWorkspacePath(workspace.rootPath), workspace.id]),
			),
		[threadWorkspaces],
	);

	const openClawSessions = useMemo<OpenClawSessionItem[]>(() => {
		const getSessionLabel = (
			key: string,
			displayName?: string,
			label?: string,
		): string => sessionLabels[key] ?? label ?? displayName ?? key;

		return [...sessions]
			.sort((left, right) => {
				const rightUpdated = sessionLastActivity[right.key] ?? right.updatedAt ?? 0;
				const leftUpdated = sessionLastActivity[left.key] ?? left.updatedAt ?? 0;
				return rightUpdated - leftUpdated;
			})
			.map((session) => ({
				key: session.key,
				label: getSessionLabel(session.key, session.displayName, session.label),
				updatedAt: sessionLastActivity[session.key] ?? session.updatedAt ?? 0,
			}));
	}, [sessionLabels, sessionLastActivity, sessions]);

	const realtimeVoiceSessions = useMemo<VoiceSessionItem[]>(() => {
		return [...voiceSessions]
			.sort((left, right) => right.lastActivityAt - left.lastActivityAt)
			.map((session) => ({
				id: session.id,
				label: session.title,
				updatedAt: session.lastActivityAt,
			}));
	}, [voiceSessions]);

	const xiaojiuSessionItems = useMemo<XiaojiuSessionItem[]>(() => {
		if (!xiaojiuEnabled) return [];
		const syncBase = remoteLastSyncedAt ?? 0;
		return [...remoteSessions]
			.sort((left, right) => {
				const rightUpdated = right.updatedAt ?? syncBase - right.sortIndex * 1000;
				const leftUpdated = left.updatedAt ?? syncBase - left.sortIndex * 1000;
				return rightUpdated - leftUpdated;
			})
			.map((session) => ({
				id: session.id,
				label: session.name,
				updatedAt: session.updatedAt ?? syncBase - session.sortIndex * 1000,
			}));
	}, [remoteLastSyncedAt, remoteSessions, xiaojiuEnabled]);

	const routeSearchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
	const routeWorkspaceRoot = routeSearchParams.get("workspaceRoot")?.trim() || "";
	const routeSessionId = routeSearchParams.get("sessionId")?.trim() || "";
	const activeThreadWorkspaceIdFromRoute =
		(pathname.startsWith("/code-agent/chat") && routeWorkspaceRoot
			? workspaceIdByNormalizedRoot[normalizeWorkspacePath(routeWorkspaceRoot)]
			: undefined) ?? null;

	const normalizedQuery = searchQuery.trim().toLowerCase();
	const hasSearchQuery = normalizedQuery.length > 0;
	const matchesQuery = useCallback(
		(value: string) => !hasSearchQuery || value.toLowerCase().includes(normalizedQuery),
		[hasSearchQuery, normalizedQuery],
	);

	const filteredOpenClawSessions = useMemo(
		() => openClawSessions.filter((session) => matchesQuery(session.label)),
		[matchesQuery, openClawSessions],
	);
	const filteredRealtimeVoiceSessions = useMemo(
		() => realtimeVoiceSessions.filter((session) => matchesQuery(session.label)),
		[matchesQuery, realtimeVoiceSessions],
	);
	const filteredXiaojiuSessions = useMemo(
		() => xiaojiuSessionItems.filter((session) => matchesQuery(session.label)),
		[matchesQuery, xiaojiuSessionItems],
	);

	const filteredThreadSessionsByWorkspace = useMemo(() => {
		const next: Record<string, CliSessionItem[]> = {};
		for (const workspace of threadWorkspaces) {
			const sessionsInWorkspace = workspaceSessionsById[workspace.id] ?? [];
			next[workspace.id] = sessionsInWorkspace.filter((session) => matchesQuery(session.title));
		}
		return next;
	}, [matchesQuery, threadWorkspaces, workspaceSessionsById]);

	const visibleThreadWorkspaces = useMemo(() => {
		return threadWorkspaces.filter((workspace) => {
			if (!hasSearchQuery) return true;
			if (matchesQuery(workspace.name)) return true;
			const filteredSessions = filteredThreadSessionsByWorkspace[workspace.id] ?? [];
			return filteredSessions.length > 0;
		});
	}, [filteredThreadSessionsByWorkspace, hasSearchQuery, matchesQuery, threadWorkspaces]);

	const refreshWorkspaceSessions = useCallback(
		async (workspace: SidebarThreadWorkspace) => {
			setWorkspaceLoadingById((previous) => ({ ...previous, [workspace.id]: true }));
			setWorkspaceErrorById((previous) => ({ ...previous, [workspace.id]: null }));
			try {
				const availability = await fetchWorkspaceAvailability(workspace.rootPath);
				setWorkspaceAvailabilityById((previous) => ({ ...previous, [workspace.id]: availability }));
				if (!availability.available) {
					setWorkspaceSessionsById((previous) => ({ ...previous, [workspace.id]: [] }));
					setWorkspaceErrorById((previous) => ({
						...previous,
						[workspace.id]: t("sidebar.workspaceUnavailable", { defaultValue: "工作区不可用" }),
					}));
					return;
				}
				const sessionsInWorkspace = await fetchCodeAgentSessions(workspace.rootPath, 60);
				const mapped = [...sessionsInWorkspace]
					.sort((left, right) => right.updatedAt - left.updatedAt)
					.map((session) => ({
						sessionId: session.sessionId,
						title: session.title?.trim() || session.sessionId,
						updatedAt: session.updatedAt,
					}));
				setWorkspaceSessionsById((previous) => ({ ...previous, [workspace.id]: mapped }));
			} catch {
				setWorkspaceSessionsById((previous) => ({ ...previous, [workspace.id]: [] }));
				setWorkspaceErrorById((previous) => ({
					...previous,
					[workspace.id]: t("sidebar.threadSessionsLoadFailed", { defaultValue: "线程会话加载失败" }),
				}));
			} finally {
				setWorkspaceLoadingById((previous) => ({ ...previous, [workspace.id]: false }));
			}
		},
		[t],
	);

	useEffect(() => {
		if (didRunMigrationRef.current) return;
		didRunMigrationRef.current = true;

		const runMigration = async () => {
			try {
				const migrated = window.localStorage.getItem(THREAD_WORKSPACE_MIGRATION_KEY) === "1";
				if (migrated) return;
				const legacyRoot = readStoredCodeAgentWorkspaceRoot().trim();
				if (!legacyRoot) {
					window.localStorage.setItem(THREAD_WORKSPACE_MIGRATION_KEY, "1");
					return;
				}
				const normalizedLegacyRoot = normalizeWorkspacePath(legacyRoot);
				const existing = sidebarThreadWorkspaces.find(
					(workspace) => normalizeWorkspacePath(workspace.rootPath) === normalizedLegacyRoot,
				);
				if (!existing) {
					const workspaceId = await buildWorkspaceId(legacyRoot);
					if (workspaceId) {
						const now = Date.now();
						upsertSidebarThreadWorkspace({
							id: workspaceId,
							rootPath: legacyRoot,
							name: deriveWorkspaceName(legacyRoot) || legacyRoot,
							createdAt: now,
							lastUsedAt: now,
						});
						setSidebarThreadWorkspaceExpanded(workspaceId, true);
					}
				}
				window.localStorage.setItem(THREAD_WORKSPACE_MIGRATION_KEY, "1");
			} catch {
				// Ignore migration failures and keep runtime usable.
			}
		};

		void runMigration();
	}, [
		sidebarThreadWorkspaces,
		setSidebarThreadWorkspaceExpanded,
		upsertSidebarThreadWorkspace,
	]);

	useEffect(() => {
		if (threadWorkspaces.length === 0) return;
		if (!didInitialWorkspaceFetchRef.current) {
			didInitialWorkspaceFetchRef.current = true;
			for (const workspace of threadWorkspaces) {
				fetchedWorkspaceIdsRef.current.add(workspace.id);
				void refreshWorkspaceSessions(workspace);
			}
			return;
		}

		for (const workspace of threadWorkspaces) {
			if (fetchedWorkspaceIdsRef.current.has(workspace.id)) continue;
			fetchedWorkspaceIdsRef.current.add(workspace.id);
			void refreshWorkspaceSessions(workspace);
		}
	}, [refreshWorkspaceSessions, threadWorkspaces]);

	useEffect(() => {
		const refreshWorkspaceFromRunPayload = (payload: unknown) => {
			if (!payload || typeof payload !== "object") return;
			const request = (payload as { request?: unknown }).request;
			if (!request || typeof request !== "object") return;
			const workspaceRoot = (request as { workspaceRoot?: unknown }).workspaceRoot;
			if (typeof workspaceRoot !== "string" || !workspaceRoot.trim()) return;
			const workspaceId = workspaceIdByNormalizedRoot[normalizeWorkspacePath(workspaceRoot)];
			if (!workspaceId) return;
			const workspace = workspaceById[workspaceId];
			if (!workspace) return;
			void refreshWorkspaceSessions(workspace);
		};

		const unsubscribeRunCompleted = subscribeHostEvent("code-agent:run-completed", refreshWorkspaceFromRunPayload);
		const unsubscribeRunFailed = subscribeHostEvent("code-agent:run-failed", refreshWorkspaceFromRunPayload);
		return () => {
			unsubscribeRunCompleted();
			unsubscribeRunFailed();
		};
	}, [refreshWorkspaceSessions, workspaceById, workspaceIdByNormalizedRoot]);

	useEffect(() => {
		if (pathname === "/") {
			setSidebarActiveContext({ kind: "openclaw", workspaceId: null });
			return;
		}
		if (pathname.startsWith("/voice-chat")) {
			setSidebarActiveContext({ kind: "realtimeVoice", workspaceId: null });
			return;
		}
		if (pathname.startsWith("/code-agent/chat") && activeThreadWorkspaceIdFromRoute) {
			setSidebarActiveContext({ kind: "thread", workspaceId: activeThreadWorkspaceIdFromRoute });
		}
	}, [activeThreadWorkspaceIdFromRoute, pathname, setSidebarActiveContext]);

	useEffect(() => {
		const workspaceIdSet = new Set(threadWorkspaces.map((workspace) => workspace.id));
		setWorkspaceSessionsById((previous) =>
			Object.fromEntries(
				Object.entries(previous).filter(([workspaceId]) => workspaceIdSet.has(workspaceId)),
			),
		);
		setWorkspaceLoadingById((previous) =>
			Object.fromEntries(
				Object.entries(previous).filter(([workspaceId]) => workspaceIdSet.has(workspaceId)),
			),
		);
		setWorkspaceErrorById((previous) =>
			Object.fromEntries(
				Object.entries(previous).filter(([workspaceId]) => workspaceIdSet.has(workspaceId)),
			),
		);
		setWorkspaceAvailabilityById((previous) =>
			Object.fromEntries(
				Object.entries(previous).filter(([workspaceId]) => workspaceIdSet.has(workspaceId)),
			),
		);
	}, [threadWorkspaces]);

	const handleAddWorkspace = useCallback(async () => {
		const result = (await invokeIpc("dialog:open", {
			properties: ["openDirectory"],
		})) as { canceled: boolean; filePaths?: string[] };
		if (result.canceled || !result.filePaths?.[0]) return;

		const rootPath = result.filePaths[0].trim();
		if (!rootPath) return;

		const normalizedRoot = normalizeWorkspacePath(rootPath);
		const existing = threadWorkspaces.find(
			(workspace) => normalizeWorkspacePath(workspace.rootPath) === normalizedRoot,
		);
		if (existing) {
			setSidebarThreadWorkspaceExpanded(existing.id, true);
			setSidebarActiveContext({ kind: "thread", workspaceId: existing.id });
			touchSidebarThreadWorkspace(existing.id);
			void refreshWorkspaceSessions(existing);
			return;
		}

		const workspaceId = await buildWorkspaceId(rootPath);
		if (!workspaceId) return;
		const now = Date.now();
		const workspace: SidebarThreadWorkspace = {
			id: workspaceId,
			rootPath,
			name: deriveWorkspaceName(rootPath) || rootPath,
			createdAt: now,
			lastUsedAt: now,
		};
		upsertSidebarThreadWorkspace(workspace);
		setSidebarThreadWorkspaceExpanded(workspace.id, true);
		setSidebarActiveContext({ kind: "thread", workspaceId: workspace.id });
		writeStoredCodeAgentWorkspaceRoot(rootPath);
		void refreshWorkspaceSessions(workspace);
	}, [
		refreshWorkspaceSessions,
		setSidebarActiveContext,
		setSidebarThreadWorkspaceExpanded,
		threadWorkspaces,
		touchSidebarThreadWorkspace,
		upsertSidebarThreadWorkspace,
	]);

	const focusSearch = useCallback(() => {
		setSearchExpanded(true);
		window.setTimeout(() => {
			searchInputRef.current?.focus();
		}, 0);
	}, []);

	const handleOpenClawNewThread = useCallback(() => {
		setSidebarActiveContext({ kind: "openclaw", workspaceId: null });
		setFolderExpanded("openclaw", true);
		newSession();
		navigate("/");
	}, [navigate, newSession, setFolderExpanded, setSidebarActiveContext]);

	const handleRealtimeVoiceNewThread = useCallback(() => {
		setSidebarActiveContext({ kind: "realtimeVoice", workspaceId: null });
		setFolderExpanded("realtimeVoice", true);
		void invokeIpc("voice:openDialog").catch(() => {});
	}, [setFolderExpanded, setSidebarActiveContext]);

	const handleWorkspaceNewThread = useCallback(
		(workspace: SidebarThreadWorkspace) => {
			const availability = workspaceAvailabilityById[workspace.id];
			if (availability && !availability.available) return;
			setSidebarActiveContext({ kind: "thread", workspaceId: workspace.id });
			touchSidebarThreadWorkspace(workspace.id);
			setSidebarThreadWorkspaceExpanded(workspace.id, true);
			writeStoredCodeAgentWorkspaceRoot(workspace.rootPath);
			navigate(buildCodeAgentRoute(workspace.rootPath, undefined, String(Date.now())));
		},
		[
			navigate,
			setSidebarActiveContext,
			setSidebarThreadWorkspaceExpanded,
			touchSidebarThreadWorkspace,
			workspaceAvailabilityById,
		],
	);

	const handleGlobalNewThread = useCallback(() => {
		if (sidebarActiveContext.kind === "realtimeVoice") {
			handleRealtimeVoiceNewThread();
			return;
		}

		if (sidebarActiveContext.kind === "thread") {
			const activeWorkspace =
				(sidebarActiveContext.workspaceId
					? workspaceById[sidebarActiveContext.workspaceId]
					: undefined) ?? threadWorkspaces[0];
			if (activeWorkspace) {
				handleWorkspaceNewThread(activeWorkspace);
				return;
			}
			void handleAddWorkspace();
			return;
		}

		handleOpenClawNewThread();
	}, [
		handleAddWorkspace,
		handleOpenClawNewThread,
		handleRealtimeVoiceNewThread,
		handleWorkspaceNewThread,
		sidebarActiveContext,
		threadWorkspaces,
		workspaceById,
	]);

	const handleWorkspaceRename = useCallback(
		(workspace: SidebarThreadWorkspace) => {
			const nextName = window.prompt(
				t("sidebar.workspace.renamePrompt", { defaultValue: "重命名工作区" }),
				workspace.name,
			);
			if (!nextName) return;
			const trimmed = nextName.trim();
			if (!trimmed || trimmed === workspace.name) return;
			renameSidebarThreadWorkspace(workspace.id, trimmed);
		},
		[renameSidebarThreadWorkspace, t],
	);

	const handleWorkspaceRemove = useCallback(
		(workspace: SidebarThreadWorkspace) => {
			const confirmed = window.confirm(
				t("sidebar.workspace.removeConfirm", {
					defaultValue: `确定从列表移除工作区“${workspace.name}”吗？此操作不会删除本地文件。`,
				}),
			);
			if (!confirmed) return;
			removeSidebarThreadWorkspace(workspace.id);
		},
		[removeSidebarThreadWorkspace, t],
	);

	const handleWorkspaceOpenInFinder = useCallback((workspace: SidebarThreadWorkspace) => {
		void invokeIpc("shell:showItemInFolder", workspace.rootPath).catch(() => {});
	}, []);

	const handleOpenClawSession = useCallback(
		(sessionKey: string) => {
			setSidebarActiveContext({ kind: "openclaw", workspaceId: null });
			switchSession(sessionKey);
			navigate("/");
		},
		[navigate, setSidebarActiveContext, switchSession],
	);

	const handleRealtimeVoiceSession = useCallback(
		(sessionId: string) => {
			setSidebarActiveContext({ kind: "realtimeVoice", workspaceId: null });
			setVoiceActiveSessionId(sessionId);
			navigate("/voice-chat");
		},
		[navigate, setSidebarActiveContext, setVoiceActiveSessionId],
	);

	const handleXiaojiuSession = useCallback(
		(sessionId: string) => {
			setRemoteActiveSessionId(sessionId);
			navigate("/xiaojiu-chat");
		},
		[navigate, setRemoteActiveSessionId],
	);

	const handleThreadSession = useCallback(
		(workspace: SidebarThreadWorkspace, sessionId: string) => {
			setSidebarActiveContext({ kind: "thread", workspaceId: workspace.id });
			touchSidebarThreadWorkspace(workspace.id);
			setSidebarThreadWorkspaceExpanded(workspace.id, true);
			writeStoredCodeAgentWorkspaceRoot(workspace.rootPath);
			navigate(buildCodeAgentRoute(workspace.rootPath, sessionId));
		},
		[navigate, setSidebarActiveContext, setSidebarThreadWorkspaceExpanded, touchSidebarThreadWorkspace],
	);

	const openClawCount = filteredOpenClawSessions.length;
	const xiaojiuCount = filteredXiaojiuSessions.length;
	const realtimeVoiceCount = filteredRealtimeVoiceSessions.length;
	const hasActiveOpenClawSession =
		pathname === "/" && openClawSessions.some((session) => session.key === currentSessionKey);

	const canToggleOpenClawSessions = openClawCount > COLLAPSIBLE_SESSION_LIMIT;
	const visibleOpenClawSessions =
		canToggleOpenClawSessions && !openClawSessionsExpanded
			? filteredOpenClawSessions.slice(0, COLLAPSIBLE_SESSION_LIMIT)
			: filteredOpenClawSessions;

	const canToggleRealtimeVoiceSessions = realtimeVoiceCount > COLLAPSIBLE_SESSION_LIMIT;
	const visibleRealtimeVoiceSessions =
		canToggleRealtimeVoiceSessions && !voiceSessionsExpanded
			? filteredRealtimeVoiceSessions.slice(0, COLLAPSIBLE_SESSION_LIMIT)
			: filteredRealtimeVoiceSessions;

	const canToggleXiaojiuSessions = xiaojiuCount > COLLAPSIBLE_SESSION_LIMIT;
	const visibleXiaojiuSessions =
		canToggleXiaojiuSessions && !xiaojiuSessionsExpanded
			? filteredXiaojiuSessions.slice(0, COLLAPSIBLE_SESSION_LIMIT)
			: filteredXiaojiuSessions;

	const threadHeaderActions = (
		<button
			type="button"
			onClick={(event) => {
				event.stopPropagation();
				void handleAddWorkspace();
			}}
			className={styles.folderHeaderActionButton}
			aria-label={t("sidebar.addWorkspace", { defaultValue: "添加工作区" })}
		>
			<Plus className={styles.primaryActionIcon} />
		</button>
	);

	const openClawHeaderActions = (
		<button
			type="button"
			onClick={(event) => {
				event.stopPropagation();
				handleOpenClawNewThread();
			}}
			className={styles.folderHeaderActionButton}
			aria-label={t("sidebar.newThread", { defaultValue: "新线程" })}
		>
			<Plus className={styles.primaryActionIcon} />
		</button>
	);

	const realtimeVoiceHeaderActions = (
		<button
			type="button"
			onClick={(event) => {
				event.stopPropagation();
				handleRealtimeVoiceNewThread();
			}}
			className={styles.folderHeaderActionButton}
			aria-label={t("sidebar.newThread", { defaultValue: "新线程" })}
		>
			<Plus className={styles.primaryActionIcon} />
		</button>
	);

	if (sidebarCollapsed) {
		return null;
	}

	return (
		<aside className={styles.aside}>
			<div className={styles.topSpacer} />
			<div className={styles.topBlock}>
				<div className={styles.actionStack}>
					<button type="button" onClick={handleGlobalNewThread} className={styles.primaryAction}>
						<SquarePen className={styles.primaryActionIcon} />
						<span className={styles.truncate}>{t("sidebar.newThread", { defaultValue: "新线程" })}</span>
					</button>

					{!searchExpanded && !hasSearchQuery ? (
						<button type="button" onClick={focusSearch} className={styles.primaryAction}>
							<Search className={styles.primaryActionIcon} />
							<span className={styles.truncate}>{t("actions.search", { defaultValue: "Search" })}</span>
						</button>
					) : null}

					{searchExpanded || hasSearchQuery ? (
						<SearchInput
							ref={searchInputRef}
							value={searchQuery}
							onValueChange={setSearchQuery}
							onBlur={() => {
								if (!searchQuery.trim()) {
									setSearchExpanded(false);
								}
							}}
							placeholder="Search"
							iconSize={15}
							className={cx(styles.primaryAction, styles.searchInput)}
							iconClassName={styles.searchInputIcon}
							inputClassName={styles.searchInputField}
						/>
					) : null}

					<NavLink
						to="/skills"
						className={({ isActive }) =>
							cx(styles.navAction, isActive ? styles.navActionActive : styles.navActionIdle)
						}
					>
						<Hexagon className={styles.primaryActionIcon} />
						<span className={styles.truncate}>{t("sidebar.skills", { defaultValue: "技能" })}</span>
					</NavLink>

					<NavLink
						to="/agents"
						className={({ isActive }) =>
							cx(styles.navAction, isActive ? styles.navActionActive : styles.navActionIdle)
						}
					>
						<Blocks className={styles.primaryActionIcon} />
						<span className={styles.truncate}>{t("sidebar.pluginsNav", { defaultValue: "Plugins" })}</span>
					</NavLink>

					<NavLink
						to="/cron"
						className={({ isActive }) =>
							cx(styles.navAction, isActive ? styles.navActionActive : styles.navActionIdle)
						}
					>
						<Clock className={styles.primaryActionIcon} />
						<span className={styles.truncate}>{t("sidebar.automationNav", { defaultValue: "自动化" })}</span>
					</NavLink>
				</div>
			</div>

			<div className={styles.threadsArea}>
				<FolderSection
					icon={<FolderOpen className={styles.primaryActionIcon} strokeWidth={2} />}
					label={t("sidebar.folder.thread", { defaultValue: "线程" })}
					active={false}
					expanded={isFolderExpanded("thread")}
					onActivate={() => {
						toggleFolder("thread");
						const firstWorkspace = threadWorkspaces[0];
						if (firstWorkspace) {
							setSidebarActiveContext({ kind: "thread", workspaceId: firstWorkspace.id });
							void refreshWorkspaceSessions(firstWorkspace);
						}
					}}
					onToggle={() => toggleFolder("thread")}
					headerActions={threadHeaderActions}
					alwaysShowHeaderActions
					headerTone="secondary"
					styles={styles}
					cx={cx}
					variant="threadTop"
				>
					{visibleThreadWorkspaces.length === 0 ? (
						<div className={styles.sessionEmpty}>{t("sidebar.empty.thread", { defaultValue: "无线程" })}</div>
					) : null}
					{visibleThreadWorkspaces.map((workspace) => {
						const expanded = sidebarThreadWorkspaceExpanded?.[workspace.id] !== false;
						const availability = workspaceAvailabilityById[workspace.id] ?? { available: true };
						const secondaryLabel = getWorkspaceSecondaryLabel(workspace);
						const sessionsInWorkspace = filteredThreadSessionsByWorkspace[workspace.id] ?? [];
						const isLoading = workspaceLoadingById[workspace.id] === true;
						const error = workspaceErrorById[workspace.id];
						const canToggleSessions = sessionsInWorkspace.length > COLLAPSIBLE_SESSION_LIMIT;
						const sessionsExpanded = workspaceSessionsExpanded[workspace.id] === true;
						const visibleSessions =
							canToggleSessions && !sessionsExpanded
								? sessionsInWorkspace.slice(0, COLLAPSIBLE_SESSION_LIMIT)
								: sessionsInWorkspace;

						const workspaceMenu: MenuProps = {
							items: [
								{ key: "rename", label: t("sidebar.workspace.rename", { defaultValue: "重命名" }) },
								{ key: "remove", label: t("sidebar.workspace.remove", { defaultValue: "从列表移除" }) },
								{ key: "open", label: t("sidebar.workspace.openInFinder", { defaultValue: "在 Finder 中打开" }) },
							],
							onClick: ({ key }) => {
								if (key === "rename") {
									handleWorkspaceRename(workspace);
									return;
								}
								if (key === "remove") {
									handleWorkspaceRemove(workspace);
									return;
								}
								handleWorkspaceOpenInFinder(workspace);
							},
						};

						return (
							<div
								key={workspace.id}
								className={cx(
									styles.workspaceRow,
									styles.threadWorkspaceRow,
								)}
							>
								<div className={styles.workspaceTopRow}>
									<button
										type="button"
										onClick={() => {
											const nextExpanded = !expanded;
											setSidebarThreadWorkspaceExpanded(workspace.id, nextExpanded);
											setSidebarActiveContext({ kind: "thread", workspaceId: workspace.id });
											touchSidebarThreadWorkspace(workspace.id);
											void refreshWorkspaceSessions(workspace);
										}}
										className={cx(
											styles.workspaceButton,
											styles.threadWorkspaceButton,
											styles.threadWorkspaceButtonIdle,
										)}
									>
										<span className={styles.workspaceFolderWrap}>
											<FolderOpen data-workspace-folder-icon="true" className={styles.workspaceFolderIcon} />
											<ChevronDown
												data-workspace-chevron="true"
												className={cx(
													styles.workspaceChevron,
													!expanded && styles.workspaceChevronCollapsed,
												)}
											/>
										</span>
										<div className={styles.workspaceMain}>
											<span className={styles.workspaceName}>{workspace.name}</span>
											{secondaryLabel ? <span className={styles.workspaceSecondary}>{secondaryLabel}</span> : null}
											{!availability.available ? (
												<span className={styles.workspaceUnavailableTag}>
													{t("sidebar.workspaceUnavailable", { defaultValue: "不可用" })}
												</span>
											) : null}
										</div>
									</button>
									<div className={styles.workspaceActions} data-workspace-actions="true">
										<button
											type="button"
											onClick={(event) => {
												event.stopPropagation();
												handleWorkspaceNewThread(workspace);
											}}
											className={cx(styles.workspaceActionButton, styles.threadWorkspaceActionButton)}
											disabled={!availability.available}
											aria-label={t("sidebar.newThread", { defaultValue: "新线程" })}
										>
											<Plus className={styles.primaryActionIcon} />
										</button>
										<Dropdown menu={workspaceMenu} trigger={["click"]}>
											<button
												type="button"
												onClick={(event) => event.stopPropagation()}
												className={cx(styles.workspaceActionButton, styles.threadWorkspaceActionButton)}
												aria-label={t("sidebar.workspace.more", { defaultValue: "更多" })}
											>
												<Ellipsis className={styles.primaryActionIcon} />
											</button>
										</Dropdown>
									</div>
								</div>

								{expanded ? (
									<div className={cx(styles.workspaceChildren, styles.threadWorkspaceChildren)}>
										{isLoading ? (
											<div className={styles.sessionEmpty}>{t("status.loading", { defaultValue: "加载中..." })}</div>
										) : null}
										{!isLoading && error ? <div className={styles.warningText}>{error}</div> : null}
										{!isLoading && !error && visibleSessions.length === 0 ? (
											<div className={styles.sessionEmpty}>{t("sidebar.empty.thread", { defaultValue: "无线程" })}</div>
										) : null}
										{visibleSessions.map((session) => {
											const isActive =
												pathname.startsWith("/code-agent/chat")
												&& activeThreadWorkspaceIdFromRoute === workspace.id
												&& routeSessionId === session.sessionId;
											return (
												<button
													key={`${workspace.id}:${session.sessionId}`}
													type="button"
													onClick={() => handleThreadSession(workspace, session.sessionId)}
													className={cx(
														styles.threadSessionButton,
														isActive ? styles.listButtonActive : styles.listButtonIdle,
													)}
												>
													<div className={styles.listButtonRow}>
														<span className={styles.listButtonLabel}>{session.title}</span>
														<span className={styles.sessionTime}>{formatRelativeTime(session.updatedAt, i18n.language)}</span>
													</div>
												</button>
											);
										})}
										{canToggleSessions ? (
											<button
												type="button"
												onClick={() =>
													setWorkspaceSessionsExpanded((current) => ({
														...current,
														[workspace.id]: !sessionsExpanded,
													}))
												}
												className={styles.sessionListToggleButton}
											>
												{sessionsExpanded
													? t("sidebar.collapseList", { defaultValue: "折叠显示" })
													: t("sidebar.expandList", { defaultValue: "展开显示" })}
											</button>
										) : null}
									</div>
								) : null}
							</div>
						);
					})}
				</FolderSection>

				<FolderSection
					icon={<MessageSquare className={styles.primaryActionIcon} strokeWidth={2} />}
					label={t("sidebar.folder.openClaw", { defaultValue: "OpenClaw" })}
					active={pathname === "/" && !hasActiveOpenClawSession}
					expanded={isFolderExpanded("openclaw")}
					onActivate={() => {
						toggleFolder("openclaw");
						setSidebarActiveContext({ kind: "openclaw", workspaceId: null });
					}}
					onToggle={() => toggleFolder("openclaw")}
					headerActions={openClawHeaderActions}
					alwaysShowHeaderActions
					headerTone="secondary"
					styles={styles}
					cx={cx}
				>
					{openClawCount === 0 ? (
						<div className={styles.sessionEmpty}>{t("sidebar.empty.openClaw", { defaultValue: "无对话" })}</div>
					) : null}
					{visibleOpenClawSessions.map((session) => {
						const isActive = pathname === "/" && currentSessionKey === session.key;
						const isRunning = isActive && chatSending;
						return (
							<ThreadLikeFlatSessionRow
								key={session.key}
								label={session.label}
								timeLabel={formatRelativeTime(session.updatedAt, i18n.language)}
								active={isActive}
								onClick={() => handleOpenClawSession(session.key)}
								leading={isRunning ? <Loader2 className={styles.loader} /> : <Pin className={styles.subItemPinIcon} />}
								leadingVisible={isRunning}
								actions={(
									<button
										aria-label="Delete session"
										onClick={(event) => {
											event.stopPropagation();
											setSessionToDelete({ key: session.key, label: session.label });
										}}
										type="button"
										className={cx(styles.workspaceActionButton, styles.threadWorkspaceActionButton, styles.threadLikeDeleteActionButton)}
									>
										<Trash2 className={styles.sessionDeleteIcon} />
									</button>
								)}
								styles={styles}
								cx={cx}
							/>
						);
					})}
					{canToggleOpenClawSessions ? (
						<button
							type="button"
							onClick={() => setOpenClawSessionsExpanded((current) => !current)}
							className={styles.sessionListToggleButton}
						>
							{openClawSessionsExpanded
								? t("sidebar.collapseList", { defaultValue: "折叠显示" })
								: t("sidebar.expandList", { defaultValue: "展开显示" })}
						</button>
					) : null}
				</FolderSection>

				{xiaojiuEnabled ? (
					<FolderSection
						icon={<MessageCircle className={styles.primaryActionIcon} strokeWidth={2} />}
						label={t("sidebar.folder.xiaojiu", { defaultValue: "小九" })}
						count={xiaojiuCount}
						active={pathname.startsWith("/xiaojiu-chat")}
						expanded={isFolderExpanded("xiaojiu")}
						onActivate={() => {
							toggleFolder("xiaojiu");
							const first = xiaojiuSessionItems[0];
							if (first) {
								setRemoteActiveSessionId(first.id);
							}
							navigate("/xiaojiu-chat");
						}}
						onToggle={() => toggleFolder("xiaojiu")}
						styles={styles}
						cx={cx}
					>
						{remoteSyncError ? (
							<div className={styles.warningText}>{t("sidebar.syncFailed", { defaultValue: "同步失败" })}</div>
						) : null}
						{xiaojiuCount === 0 ? (
							<div className={styles.sessionEmpty}>{t("sidebar.noConversations", { defaultValue: "暂无会话" })}</div>
						) : null}
						{visibleXiaojiuSessions.map((session) => {
							const isActive = pathname.startsWith("/xiaojiu-chat") && remoteActiveSessionId === session.id;
							return (
								<button
									key={session.id}
									type="button"
									onClick={() => handleXiaojiuSession(session.id)}
									className={cx(styles.listButton, isActive ? styles.listButtonActive : styles.listButtonIdle)}
								>
									<span aria-hidden="true" data-subitem-pin="true" className={styles.subItemPinWrap}>
										<Pin className={styles.subItemPinIcon} />
									</span>
									<div className={styles.listButtonRow}>
										<span className={styles.listButtonLabel}>{session.label}</span>
										<span className={styles.sessionTime}>{formatRelativeTime(session.updatedAt, i18n.language)}</span>
									</div>
								</button>
							);
						})}
						{canToggleXiaojiuSessions ? (
							<button
								type="button"
								onClick={() => setXiaojiuSessionsExpanded((current) => !current)}
								className={styles.sessionListToggleButton}
							>
								{xiaojiuSessionsExpanded
									? t("sidebar.collapseList", { defaultValue: "折叠显示" })
									: t("sidebar.expandList", { defaultValue: "展开显示" })}
							</button>
						) : null}
					</FolderSection>
				) : null}

				<FolderSection
					icon={<Mic className={styles.primaryActionIcon} strokeWidth={2} />}
					label={t("sidebar.folder.realtimeVoice", { defaultValue: "实时语音" })}
					active={pathname.startsWith("/voice-chat")}
					expanded={isFolderExpanded("realtimeVoice")}
					onActivate={() => {
						toggleFolder("realtimeVoice");
						setSidebarActiveContext({ kind: "realtimeVoice", workspaceId: null });
					}}
					onToggle={() => toggleFolder("realtimeVoice")}
					headerActions={realtimeVoiceHeaderActions}
					alwaysShowHeaderActions
					headerTone="secondary"
					styles={styles}
					cx={cx}
				>
					{voiceSyncError ? <div className={styles.warningText}>{t("sidebar.syncFailed", { defaultValue: "同步失败" })}</div> : null}
					{realtimeVoiceCount === 0 ? (
						<div className={styles.sessionEmpty}>{t("sidebar.empty.realtimeVoice", { defaultValue: "无语音会话" })}</div>
					) : null}
					{visibleRealtimeVoiceSessions.map((session) => {
						const isActive = pathname.startsWith("/voice-chat") && voiceActiveSessionId === session.id;
						return (
							<ThreadLikeFlatSessionRow
								key={session.id}
								label={session.label}
								timeLabel={formatRelativeTime(session.updatedAt, i18n.language)}
								active={isActive}
								onClick={() => handleRealtimeVoiceSession(session.id)}
								leading={<Pin className={styles.subItemPinIcon} />}
								styles={styles}
								cx={cx}
							/>
						);
					})}
					{canToggleRealtimeVoiceSessions ? (
						<button
							type="button"
							onClick={() => setVoiceSessionsExpanded((current) => !current)}
							className={styles.sessionListToggleButton}
						>
							{voiceSessionsExpanded
								? t("sidebar.collapseList", { defaultValue: "折叠显示" })
								: t("sidebar.expandList", { defaultValue: "展开显示" })}
						</button>
					) : null}
				</FolderSection>
			</div>

			<div className={styles.footer}>
				<NavLink
					to="/settings"
					className={({ isActive }) =>
						cx(styles.settingsLink, isActive && styles.settingsLinkActive)
					}
				>
					<SettingsIcon className={styles.settingsIcon} />
					<span className={styles.truncate}>{t("sidebar.settings", { defaultValue: "设置" })}</span>
				</NavLink>
			</div>

			<ConfirmDialog
				open={Boolean(sessionToDelete)}
				title={t("actions.delete", { defaultValue: "删除" })}
				message={t("sidebar.deleteSessionConfirm", {
					defaultValue: "确定要删除会话 \"{{label}}\" 吗？",
					label: sessionToDelete?.label || "",
				})}
				confirmLabel={t("actions.delete", { defaultValue: "删除" })}
				cancelLabel={t("actions.cancel", { defaultValue: "取消" })}
				onConfirm={() => {
					if (sessionToDelete) {
						deleteSession(sessionToDelete.key);
					}
					setSessionToDelete(null);
				}}
				onCancel={() => setSessionToDelete(null)}
				variant="destructive"
			/>
		</aside>
	);
}
