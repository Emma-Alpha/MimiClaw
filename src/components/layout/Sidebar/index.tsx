/**
 * Sidebar — NavPanel 风格重写
 * 业务逻辑完整保留自 LegacySidebar，渲染层替换为 NavPanel UI 组件。
 */
import { ActionIcon, Flexbox } from "@lobehub/ui";
import { createStyles, cssVar } from "antd-style";
import {
	ArrowDownUp,
	ChevronDown,
	ChevronsDownUp,
	ChevronsUpDown,
	Loader2,
	Ellipsis,
	Plus,
	Puzzle,
	Search,
	Settings as SettingsIcon,
	SquarePen,
	Timer,
} from "lucide-react";
import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	type KeyboardEvent,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Dropdown, type MenuProps } from "antd";
import { useTranslation } from "react-i18next";
import type { CodeAgentRunRecord } from "../../../../shared/code-agent";

import {
	useSettingsStore,
	type SidebarThreadWorkspace,
} from "@/stores/settings";
import { useChatStore } from "@/stores/chat";
import {
	fetchCodeAgentSessions,
	fetchDefaultWorkspaceRoot,
	fetchWorkspaceAvailability,
	getCachedDefaultWorkspaceRoot,
	readStoredCodeAgentWorkspaceRoot,
	writeStoredCodeAgentWorkspaceRoot,
} from "@/lib/code-agent";
import { invokeIpc } from "@/lib/api-client";
import { saveSession } from "@/lib/db";
import { writeMiniChatPendingSession } from "@/lib/mini-chat-session";
import { subscribeHostEvent } from "@/lib/host-events";
import {
	buildWorkspaceId,
	deriveWorkspaceName,
	normalizeWorkspacePath,
} from "@/lib/sidebar-workspace";
import { getSidebarChromeCss } from "@/components/layout/sidebar-chrome";
import {
	CHAT_NAV_ICON_SIZE,
	CHAT_SESSION_META_FONT_SIZE,
	CHAT_SESSION_META_ICON_SIZE,
} from "@/styles/typography-tokens";
import { SidebarUpdateAction } from "@/components/update/SidebarUpdateAction";

import { NavItem, SideBarLayout } from "@/features/NavPanel";
import { SearchInput } from "@/components/common/SearchInput";
import { SettingsSidebar } from "./SettingsSidebar";

// ─── types ────────────────────────────────────────────────────────────────────

type FolderKey = "thread" | "chats";

type CliSessionItem = { sessionId: string; title: string; updatedAt: number };
type WorkspaceAvailability = { available: boolean; reason?: string };
type RunningThreadSessionMap = Record<string, Record<string, true>>;

const COLLAPSIBLE_SESSION_LIMIT = 5;
const THREAD_WORKSPACE_MIGRATION_KEY = "mimiclaw:thread-workspaces-migrated-v1";

// ─── styles ───────────────────────────────────────────────────────────────────

const useStyles = createStyles(({ css, token }) => ({
	aside: css`
    ${getSidebarChromeCss()}

    display: flex;
    width: 100%;
    min-width: 0;
    flex-shrink: 0;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
  `,
	topBar: css`
    container: sidebar-topbar / inline-size;
    height: ${window.electron?.platform === "darwin" ? "40px" : "2.75rem"};
    width: 100%;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 8px;
    padding-inline: 8px;
    padding-inline-start: ${window.electron?.platform === "darwin" ? "116px" : "8px"};
  `,
	footer: css`
    flex-shrink: 0;
    padding: 4px 6px 8px;
  `,
	subItemLevel1: css`
    padding-inline-start: 20px !important;
    min-height: 30px !important;
  `,
	workspaceChildren: css`
    position: relative;
    margin: 2px 0 6px 0;
  `,
	subItemLevel2: css`
    padding-inline-start: 48px !important;
  `,
	timeLabel: css`
    font-size: 12px;
    color: ${cssVar.colorTextSecondary};
    font-weight: 500;
    flex-shrink: 0;
    opacity: 0.9;
  `,
	sessionListToggle: css`
    width: 100%;
    padding: 2px 4px 2px 30px;
    font-size: ${CHAT_SESSION_META_FONT_SIZE}px;
    color: ${cssVar.colorTextTertiary};
    cursor: pointer;
    border-radius: 4px;
    border: none;
    background: none;
    box-shadow: none;
    outline: none;
    text-align: left;
    transition: color 0.14s ease;

    &:hover {
      background: none;
      color: ${cssVar.colorTextSecondary};
    }
  `,
	sessionListToggleNested: css`
    padding-inline-start: 48px;
  `,
	emptyHint: css`
    padding: 4px 8px 4px 30px;
    font-size: 12px;
    color: ${cssVar.colorTextDescription};
  `,
	emptyHintNested: css`
    padding-inline-start: 48px;
  `,
	warningText: css`
    padding: 4px 8px 4px 20px;
    font-size: 11px;
    color: ${token.colorWarning};
  `,
	warningTextNested: css`
    padding-inline-start: 48px;
  `,
	searchWrap: css`
    padding: 2px 8px;
  `,
	unavailableTag: css`
    flex-shrink: 0;
    border-radius: 999px;
    background: ${token.colorWarningBg};
    padding: 1px 6px;
    font-size: 10px;
    color: ${token.colorWarningText};
  `,
	sessionMarker: css`
    position: absolute;
    inset-inline-start: 10px;
    top: 50%;
    transform: translateY(-50%);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 14px;
    height: 14px;
    flex-shrink: 0;
    color: ${cssVar.colorTextDescription};
    opacity: 0.72;
  `,
	sessionMarkerSpinning: css`
    color: ${cssVar.colorText};
    opacity: 1;

    & > svg {
      animation: sidebarSessionSpin 1s linear infinite;
    }

    @keyframes sidebarSessionSpin {
      from {
        transform: rotate(0deg);
      }
      to {
        transform: rotate(360deg);
      }
    }
  `,
	sectionHeader: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 2px 8px 2px 12px;
  `,
	sectionLabel: css`
    font-size: 12px;
    font-weight: 500;
    color: ${cssVar.colorTextTertiary};
    flex: 1;
    min-width: 0;
    user-select: none;
  `,
	sectionActions: css`
    display: flex;
    align-items: center;
    gap: 2px;
    flex-shrink: 0;
  `,
	groupHeader: css`
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 8px 6px 12px;
    cursor: pointer;
    user-select: none;
    border-radius: 10px;
	margin-bottom: 2px;

    &:hover {
      background: color-mix(in oklab, ${cssVar.colorText} 4%, transparent);
    }

    &:hover .group-actions {
      opacity: 1;
    }
  `,
	groupChevron: css`
    flex-shrink: 0;
    color: ${cssVar.colorTextTertiary};
    transition: transform 0.15s ease;
  `,
	groupName: css`
    flex: 1;
    min-width: 0;
    font-size: 12px;
    font-weight: 500;
    color: ${cssVar.colorTextSecondary};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
	groupCount: css`
    flex-shrink: 0;
    font-size: 11px;
    color: ${cssVar.colorTextQuaternary};
  `,
	groupActions: css`
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 4px;
    opacity: 0;
    transition: opacity 0.15s ease;
  `,
	groupActionBtn: css`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border-radius: 4px;
    color: ${cssVar.colorTextTertiary};
    cursor: pointer;
    transition: background 0.15s ease;

    &:hover {
      background: color-mix(in oklab, ${cssVar.colorText} 8%, transparent);
      color: ${cssVar.colorText};
    }
  `,
	flatSessionItem: css`
    position: relative;
    padding-inline-start: 30px !important;
  `,
}));

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatRelativeTime(timestamp: number, language: string): string {
	if (!timestamp || Number.isNaN(timestamp)) return "";
	const elapsedMs = Math.max(0, Date.now() - timestamp);
	const isZh = language.startsWith("zh");
	if (elapsedMs < 60_000) return isZh ? "刚刚" : "now";
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

// ─── component ────────────────────────────────────────────────────────────────

export function Sidebar() {
	const { styles, cx } = useStyles();

	// ── settings store ────────────────────────────────────────────────────────
	const sidebarCollapsed = useSettingsStore((s) => s.sidebarCollapsed);
	const translucentSidebar = useSettingsStore((s) => s.translucentSidebar);
	const sidebarFolderExpanded = useSettingsStore(
		(s) => s.sidebarFolderExpanded,
	);
	const setSidebarFolderExpanded = useSettingsStore(
		(s) => s.setSidebarFolderExpanded,
	);
	const sidebarThreadWorkspaces = useSettingsStore(
		(s) => s.sidebarThreadWorkspaces,
	);
	const sidebarThreadWorkspaceExpanded = useSettingsStore(
		(s) => s.sidebarThreadWorkspaceExpanded,
	);
	const sidebarActiveContext = useSettingsStore((s) => s.sidebarActiveContext);
	const contextMenuMode = useSettingsStore((s) => s.contextMenuMode);
	const setSidebarThreadWorkspaceExpanded = useSettingsStore(
		(s) => s.setSidebarThreadWorkspaceExpanded,
	);
	const setSidebarActiveContext = useSettingsStore(
		(s) => s.setSidebarActiveContext,
	);
	const upsertSidebarThreadWorkspace = useSettingsStore(
		(s) => s.upsertSidebarThreadWorkspace,
	);
	const renameSidebarThreadWorkspace = useSettingsStore(
		(s) => s.renameSidebarThreadWorkspace,
	);
	const removeSidebarThreadWorkspace = useSettingsStore(
		(s) => s.removeSidebarThreadWorkspace,
	);
	const touchSidebarThreadWorkspace = useSettingsStore(
		(s) => s.touchSidebarThreadWorkspace,
	);

	// ── chat store ────────────────────────────────────────────────────────────
	const codeAgentSessionId = useChatStore((s) => s.sessionId);
	const codeAgentSessionState = useChatStore((s) => s.sessionState);

	// ── router ────────────────────────────────────────────────────────────────
	const navigate = useNavigate();
	const location = useLocation();
	const pathname = location.pathname;
	const { t, i18n } = useTranslation(["common", "settings"]);

	// ── local state ───────────────────────────────────────────────────────────
	const [searchQuery, setSearchQuery] = useState("");
	const [searchVisible, setSearchVisible] = useState(false);
	const [workspaceSessionsExpanded, setWorkspaceSessionsExpanded] = useState<
		Record<string, boolean>
	>({});
	const [workspaceSessionsById, setWorkspaceSessionsById] = useState<
		Record<string, CliSessionItem[]>
	>({});
	const [workspaceLoadingById, setWorkspaceLoadingById] = useState<
		Record<string, boolean>
	>({});
	const [workspaceErrorById, setWorkspaceErrorById] = useState<
		Record<string, string | null>
	>({});
	const [workspaceAvailabilityById, setWorkspaceAvailabilityById] = useState<
		Record<string, WorkspaceAvailability>
	>({});
	const [
		runningThreadSessionsByWorkspaceId,
		setRunningThreadSessionsByWorkspaceId,
	] = useState<RunningThreadSessionMap>({});
	const didRunMigrationRef = useRef(false);
	const didInitialWorkspaceFetchRef = useRef(false);
	const fetchedWorkspaceIdsRef = useRef<Set<string>>(new Set());

	// ── projectless (default workspace) sessions ─────────────────────────────
	const [defaultWorkspaceRoot, setDefaultWorkspaceRoot] = useState(getCachedDefaultWorkspaceRoot);
	const [projectlessSessions, setProjectlessSessions] = useState<CliSessionItem[]>([]);
	const [projectlessLoading, setProjectlessLoading] = useState(false);
	const [projectlessSessionsExpanded, setProjectlessSessionsExpanded] = useState(false);
	const [runningProjectlessSessions, setRunningProjectlessSessions] = useState<Record<string, true>>({});

	// ── inline rename state ──────────────────────────────────────────────────
	/** "workspaceId:sessionId" of the session currently being renamed, or null */
	const [renamingSessionKey, setRenamingSessionKey] = useState<string | null>(
		null,
	);
	const renameInputRef = useRef<HTMLInputElement>(null);

	// ── effects ───────────────────────────────────────────────────────────────

	const isFolderExpanded = useCallback(
		(folder: FolderKey) => sidebarFolderExpanded?.[folder] !== false,
		[sidebarFolderExpanded],
	);

	const setFolderExpanded = useCallback(
		(folder: FolderKey, expanded: boolean) =>
			setSidebarFolderExpanded(folder, expanded),
		[setSidebarFolderExpanded],
	);

	const toggleFolder = useCallback(
		(folder: FolderKey) => setFolderExpanded(folder, !isFolderExpanded(folder)),
		[isFolderExpanded, setFolderExpanded],
	);

	const threadWorkspaces = useMemo(
		() =>
			[...sidebarThreadWorkspaces].sort(
				(a, b) => (b.lastUsedAt || 0) - (a.lastUsedAt || 0),
			),
		[sidebarThreadWorkspaces],
	);

	const workspaceById = useMemo(
		() => Object.fromEntries(threadWorkspaces.map((w) => [w.id, w])),
		[threadWorkspaces],
	);

	const workspaceIdByNormalizedRoot = useMemo(
		() =>
			Object.fromEntries(
				threadWorkspaces.map((w) => [normalizeWorkspacePath(w.rootPath), w.id]),
			),
		[threadWorkspaces],
	);

	const routeSearchParams = useMemo(
		() => new URLSearchParams(location.search),
		[location.search],
	);
	const routeWorkspaceRoot =
		routeSearchParams.get("workspaceRoot")?.trim() || "";
	const routeSessionId = routeSearchParams.get("sessionId")?.trim() || "";
	const activeThreadSessionId =
		routeSessionId || codeAgentSessionId?.trim() || "";
	const activeThreadWorkspaceIdFromRoute =
		(pathname.startsWith("/chat/code") && routeWorkspaceRoot
			? workspaceIdByNormalizedRoot[normalizeWorkspacePath(routeWorkspaceRoot)]
			: undefined) ?? null;
	const isThreadSessionGenerating =
		pathname.startsWith("/chat/code") &&
		(codeAgentSessionState === "running" ||
			codeAgentSessionState === "requires_action");

	// Refs so the host-event effect can read current values without
	// re-subscribing on every session navigation.
	const activeThreadSessionIdRef = useRef(activeThreadSessionId);
	activeThreadSessionIdRef.current = activeThreadSessionId;
	const activeThreadWorkspaceIdFromRouteRef = useRef(activeThreadWorkspaceIdFromRoute);
	activeThreadWorkspaceIdFromRouteRef.current = activeThreadWorkspaceIdFromRoute;

	const [sortOrder, setSortOrder] = useState<"recent" | "alpha">("recent");
	const [previouslyExpandedIds, setPreviouslyExpandedIds] = useState<string[]>(
		[],
	);

	const normalizedQuery = searchQuery.trim().toLowerCase();
	const hasSearchQuery = normalizedQuery.length > 0;
	const matchesQuery = useCallback(
		(value: string) =>
			!hasSearchQuery || value.toLowerCase().includes(normalizedQuery),
		[hasSearchQuery, normalizedQuery],
	);

	const filteredThreadSessionsByWorkspace = useMemo(() => {
		const next: Record<string, CliSessionItem[]> = {};
		for (const w of threadWorkspaces) {
			next[w.id] = (workspaceSessionsById[w.id] ?? []).filter((s) =>
				matchesQuery(s.title),
			);
		}
		return next;
	}, [matchesQuery, threadWorkspaces, workspaceSessionsById]);

	const visibleThreadWorkspaces = useMemo(
		() =>
			threadWorkspaces.filter((w) => {
				if (!hasSearchQuery) return true;
				if (matchesQuery(w.name)) return true;
				return (filteredThreadSessionsByWorkspace[w.id] ?? []).length > 0;
			}),
		[
			filteredThreadSessionsByWorkspace,
			hasSearchQuery,
			matchesQuery,
			threadWorkspaces,
		],
	);

	const refreshWorkspaceSessions = useCallback(
		async (workspace: SidebarThreadWorkspace) => {
			setWorkspaceLoadingById((prev) => ({ ...prev, [workspace.id]: true }));
			setWorkspaceErrorById((prev) => ({ ...prev, [workspace.id]: null }));
			try {
				const availability = await fetchWorkspaceAvailability(
					workspace.rootPath,
				);
				setWorkspaceAvailabilityById((prev) => ({
					...prev,
					[workspace.id]: availability,
				}));
				if (!availability.available) {
					setWorkspaceSessionsById((prev) => ({ ...prev, [workspace.id]: [] }));
					setWorkspaceErrorById((prev) => ({
						...prev,
						[workspace.id]: t("sidebar.workspaceUnavailable", {
							defaultValue: "工作区不可用",
						}),
					}));
					return;
				}
				const sessionsInWorkspace = await fetchCodeAgentSessions(
					workspace.rootPath,
					60,
				);
				const mapped = [...sessionsInWorkspace]
					.sort((a, b) => b.updatedAt - a.updatedAt)
					.map((s) => {
						// Apply custom title from localStorage if the user has renamed this session
						const customTitleKey = `mimiclaw:session-title:${workspace.id}:${s.sessionId}`;
						const customTitle = localStorage.getItem(customTitleKey);
						return {
							sessionId: s.sessionId,
							title: customTitle?.trim() || s.title?.trim() || s.sessionId,
							updatedAt: s.updatedAt,
						};
					});
				setWorkspaceSessionsById((prev) => ({
					...prev,
					[workspace.id]: mapped,
				}));
			} catch {
				setWorkspaceSessionsById((prev) => ({ ...prev, [workspace.id]: [] }));
				setWorkspaceErrorById((prev) => ({
					...prev,
					[workspace.id]: t("sidebar.threadSessionsLoadFailed", {
						defaultValue: "工作区会话加载失败",
					}),
				}));
			} finally {
				setWorkspaceLoadingById((prev) => ({ ...prev, [workspace.id]: false }));
			}
		},
		[t],
	);

	const resolveRunSessionTarget = useCallback(
		(payload: CodeAgentRunRecord | unknown) => {
			if (!payload || typeof payload !== "object") return null;
			const request = (payload as { request?: unknown }).request;
			if (!request || typeof request !== "object") return null;

			const workspaceRoot =
				typeof (request as { workspaceRoot?: unknown }).workspaceRoot ===
				"string"
					? (request as { workspaceRoot: string }).workspaceRoot.trim()
					: "";
			if (!workspaceRoot) return null;

			const workspaceId =
				workspaceIdByNormalizedRoot[normalizeWorkspacePath(workspaceRoot)];
			if (!workspaceId) return null;

			let sessionId =
				typeof (request as { sessionId?: unknown }).sessionId === "string"
					? (request as { sessionId: string }).sessionId.trim()
					: "";

			if (!sessionId) {
				const result = (payload as { result?: unknown }).result;
				const metadata =
					result && typeof result === "object"
						? (result as { metadata?: unknown }).metadata
						: null;
				sessionId =
					metadata && typeof metadata === "object"
						? typeof (metadata as { sessionId?: unknown }).sessionId ===
							"string"
							? (metadata as { sessionId: string }).sessionId.trim()
							: ""
						: "";
			}

			if (!sessionId) return null;
			return { sessionId, workspaceId };
		},
		[workspaceIdByNormalizedRoot],
	);

	useEffect(() => {
		if (didRunMigrationRef.current) return;
		didRunMigrationRef.current = true;
		const runMigration = async () => {
			try {
				if (window.localStorage.getItem(THREAD_WORKSPACE_MIGRATION_KEY) === "1")
					return;
				const legacyRoot = readStoredCodeAgentWorkspaceRoot().trim();
				if (!legacyRoot) {
					window.localStorage.setItem(THREAD_WORKSPACE_MIGRATION_KEY, "1");
					return;
				}
				const normalizedLegacyRoot = normalizeWorkspacePath(legacyRoot);
				const existing = sidebarThreadWorkspaces.find(
					(w) => normalizeWorkspacePath(w.rootPath) === normalizedLegacyRoot,
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
				/* ignore */
			}
		};
		void runMigration();
	}, [
		sidebarThreadWorkspaces,
		setSidebarThreadWorkspaceExpanded,
		upsertSidebarThreadWorkspace,
	]);

	// ── Fetch default workspace root + projectless sessions ──────────────────
	const refreshProjectlessSessions = useCallback(async (wsRoot: string) => {
		if (!wsRoot) return;
		setProjectlessLoading(true);
		try {
			const sessions = await fetchCodeAgentSessions(wsRoot, 60);
			const mapped = [...sessions]
				.sort((a, b) => b.updatedAt - a.updatedAt)
				.map((s) => {
					const customTitleKey = `mimiclaw:session-title:__projectless__:${s.sessionId}`;
					const customTitle = localStorage.getItem(customTitleKey);
					return {
						sessionId: s.sessionId,
						title: customTitle?.trim() || s.title?.trim() || s.sessionId,
						updatedAt: s.updatedAt,
					};
				});
			setProjectlessSessions(mapped);
		} catch {
			setProjectlessSessions([]);
		} finally {
			setProjectlessLoading(false);
		}
	}, []);

	useEffect(() => {
		let cancelled = false;
		const init = async () => {
			const root = await fetchDefaultWorkspaceRoot();
			if (cancelled) return;
			if (root) {
				setDefaultWorkspaceRoot(root);
				void refreshProjectlessSessions(root);
			}
		};
		void init();
		return () => { cancelled = true; };
	}, [refreshProjectlessSessions]);

	useEffect(() => {
		if (threadWorkspaces.length === 0) return;
		if (!didInitialWorkspaceFetchRef.current) {
			didInitialWorkspaceFetchRef.current = true;
			for (const w of threadWorkspaces) {
				fetchedWorkspaceIdsRef.current.add(w.id);
				void refreshWorkspaceSessions(w);
			}
			return;
		}
		for (const w of threadWorkspaces) {
			if (fetchedWorkspaceIdsRef.current.has(w.id)) continue;
			fetchedWorkspaceIdsRef.current.add(w.id);
			void refreshWorkspaceSessions(w);
		}
	}, [refreshWorkspaceSessions, threadWorkspaces]);

	useEffect(() => {
		const refreshWorkspaceFromRun = (payload: unknown) => {
			if (!payload || typeof payload !== "object") return;
			const request = (payload as { request?: unknown }).request;
			if (!request || typeof request !== "object") return;
			const workspaceRoot = (request as { workspaceRoot?: unknown })
				.workspaceRoot;
			if (typeof workspaceRoot !== "string" || !workspaceRoot.trim()) return;

			// Refresh projectless sessions if the run matches the default workspace
			if (defaultWorkspaceRoot && normalizeWorkspacePath(workspaceRoot) === normalizeWorkspacePath(defaultWorkspaceRoot)) {
				void refreshProjectlessSessions(defaultWorkspaceRoot);
			}

			const workspaceId =
				workspaceIdByNormalizedRoot[normalizeWorkspacePath(workspaceRoot)];
			if (!workspaceId) return;
			const workspace = workspaceById[workspaceId];
			if (!workspace) return;
			void refreshWorkspaceSessions(workspace);
		};

		const resolveProjectlessSession = (payload: unknown): string | null => {
			if (!defaultWorkspaceRoot || !payload || typeof payload !== "object") return null;
			const request = (payload as { request?: unknown }).request;
			if (!request || typeof request !== "object") return null;
			const wsRoot = (request as { workspaceRoot?: unknown }).workspaceRoot;
			if (typeof wsRoot !== "string") return null;
			if (normalizeWorkspacePath(wsRoot) !== normalizeWorkspacePath(defaultWorkspaceRoot)) return null;
			let sessionId = typeof (request as { sessionId?: unknown }).sessionId === "string"
				? (request as { sessionId: string }).sessionId.trim() : "";
			if (!sessionId) {
				const result = (payload as { result?: unknown }).result;
				const metadata = result && typeof result === "object" ? (result as { metadata?: unknown }).metadata : null;
				sessionId = metadata && typeof metadata === "object" && typeof (metadata as { sessionId?: unknown }).sessionId === "string"
					? (metadata as { sessionId: string }).sessionId.trim() : "";
			}
			return sessionId || null;
		};

		const markThreadSessionRunning = (payload: CodeAgentRunRecord) => {
			// Track projectless session running state
			const plSessionId = resolveProjectlessSession(payload);
			if (plSessionId) {
				setRunningProjectlessSessions((prev) => ({ ...prev, [plSessionId]: true }));
			}

			const target = resolveRunSessionTarget(payload);
			if (!target) return;
			setRunningThreadSessionsByWorkspaceId((prev) => ({
				...prev,
				[target.workspaceId]: {
					...(prev[target.workspaceId] ?? {}),
					[target.sessionId]: true,
				},
			}));
		};

		const clearThreadSessionRunning = (payload: CodeAgentRunRecord) => {
			// Clear projectless session running state
			const plSessionId = resolveProjectlessSession(payload);
			if (plSessionId) {
				setRunningProjectlessSessions((prev) => {
					const { [plSessionId]: _removed, ...rest } = prev;
					return rest;
				});
			}

			const target = resolveRunSessionTarget(payload);
			if (target) {
				// 当完成的会话不是当前激活会话，或窗口不在前台时，发送系统通知
				const isCurrentSession =
					target.sessionId === activeThreadSessionIdRef.current &&
					target.workspaceId === activeThreadWorkspaceIdFromRouteRef.current;
				if (!isCurrentSession || document.hidden) {
					const output = payload.result?.output || "";
					const body =
						output.length > 200 ? `${output.slice(0, 200)}…` : output;
					new Notification("MimiClaw", {
						body: body || "AI 已回答完毕",
					});
				}

				setRunningThreadSessionsByWorkspaceId((prev) => {
					const currentWorkspaceSessions = prev[target.workspaceId];
					if (!currentWorkspaceSessions?.[target.sessionId]) return prev;
					const { [target.sessionId]: _removed, ...remainingSessions } =
						currentWorkspaceSessions;
					if (Object.keys(remainingSessions).length === 0) {
						const { [target.workspaceId]: _workspaceRemoved, ...rest } = prev;
						return rest;
					}
					return {
						...prev,
						[target.workspaceId]: remainingSessions,
					};
				});
			}
			refreshWorkspaceFromRun(payload);
		};

		const unsubscribeRunStarted = subscribeHostEvent<CodeAgentRunRecord>(
			"code-agent:run-started",
			markThreadSessionRunning,
		);
		const unsubscribeRunCompleted = subscribeHostEvent<CodeAgentRunRecord>(
			"code-agent:run-completed",
			clearThreadSessionRunning,
		);
		const unsubscribeRunFailed = subscribeHostEvent<CodeAgentRunRecord>(
			"code-agent:run-failed",
			clearThreadSessionRunning,
		);
		return () => {
			unsubscribeRunStarted();
			unsubscribeRunCompleted();
			unsubscribeRunFailed();
		};
	}, [
		defaultWorkspaceRoot,
		refreshProjectlessSessions,
		refreshWorkspaceSessions,
		resolveRunSessionTarget,
		workspaceById,
		workspaceIdByNormalizedRoot,
	]);

	useEffect(() => {
		if (pathname.startsWith("/chat/code") && activeThreadWorkspaceIdFromRoute) {
			setSidebarActiveContext({
				kind: "thread",
				workspaceId: activeThreadWorkspaceIdFromRoute,
			});
		}
	}, [activeThreadWorkspaceIdFromRoute, pathname, setSidebarActiveContext]);

	useEffect(() => {
		const ids = new Set(threadWorkspaces.map((w) => w.id));
		const clean = <T extends Record<string, unknown>>(obj: T): T =>
			Object.fromEntries(
				Object.entries(obj).filter(([id]) => ids.has(id)),
			) as T;
		setWorkspaceSessionsById(clean);
		setWorkspaceLoadingById(clean);
		setWorkspaceErrorById(clean);
		setWorkspaceAvailabilityById(clean);
		setRunningThreadSessionsByWorkspaceId(clean);
	}, [threadWorkspaces]);

	// ── handlers ─────────────────────────────────────────────────────────────

	const handleAddWorkspace = useCallback(async () => {
		const result = (await invokeIpc("dialog:open", {
			properties: ["openDirectory"],
		})) as {
			canceled: boolean;
			filePaths?: string[];
		};
		if (result.canceled || !result.filePaths?.[0]) return;
		const rootPath = result.filePaths[0].trim();
		if (!rootPath) return;
		const normalizedRoot = normalizeWorkspacePath(rootPath);
		const existing = threadWorkspaces.find(
			(w) => normalizeWorkspacePath(w.rootPath) === normalizedRoot,
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

	const handleWorkspaceNewThread = useCallback(
		(workspace: SidebarThreadWorkspace) => {
			const availability = workspaceAvailabilityById[workspace.id];
			if (availability && !availability.available) return;
			setSidebarActiveContext({ kind: "thread", workspaceId: workspace.id });
			touchSidebarThreadWorkspace(workspace.id);
			setSidebarThreadWorkspaceExpanded(workspace.id, true);
			writeStoredCodeAgentWorkspaceRoot(workspace.rootPath);
			const params = new URLSearchParams();
			params.set("workspaceRoot", workspace.rootPath);
			params.set("newThread", String(Date.now()));
			navigate(`/chat/code?${params.toString()}`);
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
		// Create a projectless conversation using default workspace root
		const wsRoot = defaultWorkspaceRoot;
		if (wsRoot) {
			setSidebarActiveContext({ kind: "chat", workspaceId: null });
			setFolderExpanded("chats", true);
			writeStoredCodeAgentWorkspaceRoot(wsRoot);
			const params = new URLSearchParams();
			params.set("workspaceRoot", wsRoot);
			params.set("newThread", String(Date.now()));
			navigate(`/chat/code?${params.toString()}`);
			return;
		}
		// Fallback: if active workspace exists, use it
		const activeWorkspace =
			(sidebarActiveContext.workspaceId
				? workspaceById[sidebarActiveContext.workspaceId]
				: undefined) ?? threadWorkspaces[0];
		if (activeWorkspace) {
			handleWorkspaceNewThread(activeWorkspace);
			return;
		}
	}, [
		defaultWorkspaceRoot,
		handleWorkspaceNewThread,
		navigate,
		setFolderExpanded,
		setSidebarActiveContext,
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
					defaultValue: `确定从列表移除工作区"${workspace.name}"吗？此操作不会删除本地文件。`,
				}),
			);
			if (!confirmed) return;
			removeSidebarThreadWorkspace(workspace.id);
		},
		[removeSidebarThreadWorkspace, t],
	);

	const handleWorkspaceOpenInFinder = useCallback(
		(workspace: SidebarThreadWorkspace) => {
			void invokeIpc("shell:showItemInFolder", workspace.rootPath).catch(
				() => {},
			);
		},
		[],
	);

	const handleThreadSession = useCallback(
		(workspace: SidebarThreadWorkspace, sessionId: string) => {
			setSidebarActiveContext({ kind: "thread", workspaceId: workspace.id });
			setSidebarThreadWorkspaceExpanded(workspace.id, true);
			writeStoredCodeAgentWorkspaceRoot(workspace.rootPath);
			const params = new URLSearchParams();
			params.set("workspaceRoot", workspace.rootPath);
			params.set("sessionId", sessionId);
			navigate(`/chat/code?${params.toString()}`);
		},
		[
			navigate,
			setSidebarActiveContext,
			setSidebarThreadWorkspaceExpanded,
		],
	);

	const handleSessionRename = useCallback(
		(workspace: SidebarThreadWorkspace, session: CliSessionItem) => {
			setRenamingSessionKey(`${workspace.id}:${session.sessionId}`);
			// Focus the input in next tick after it renders
			requestAnimationFrame(() => {
				renameInputRef.current?.focus();
				renameInputRef.current?.select();
			});
		},
		[],
	);

	const commitSessionRename = useCallback(
		(
			workspace: SidebarThreadWorkspace,
			session: CliSessionItem,
			newTitle: string,
		) => {
			setRenamingSessionKey(null);
			const trimmed = newTitle.trim();
			if (!trimmed || trimmed === session.title) return;
			// Persist custom title to localStorage and IndexedDB, then refresh
			const lsKey = `mimiclaw:session-title:${workspace.id}:${session.sessionId}`;
			localStorage.setItem(lsKey, trimmed);
			void saveSession({
				key: session.sessionId,
				displayName: trimmed,
				updatedAt: Date.now(),
				createdAt: session.updatedAt || Date.now(),
			});
			void refreshWorkspaceSessions(workspace);
		},
		[refreshWorkspaceSessions],
	);

	const handleSessionOpenInFinder = useCallback(
		(workspace: SidebarThreadWorkspace) => {
			void invokeIpc("shell:showItemInFolder", workspace.rootPath).catch(
				() => {},
			);
		},
		[],
	);

	const handleSessionOpenInMiniWindow = useCallback(
		(workspace: SidebarThreadWorkspace, sessionId: string) => {
			writeMiniChatPendingSession({
				workspaceRoot: workspace.rootPath,
				sessionId,
			});
			void invokeIpc("pet:toggleQuickChat").catch(() => {});
		},
		[],
	);

	// ── projectless session handlers ──────────────────────────────────────────

	const handleProjectlessSession = useCallback(
		(sessionId: string) => {
			if (!defaultWorkspaceRoot) return;
			setSidebarActiveContext({ kind: "chat", workspaceId: null });
			setFolderExpanded("chats", true);
			writeStoredCodeAgentWorkspaceRoot(defaultWorkspaceRoot);
			const params = new URLSearchParams();
			params.set("workspaceRoot", defaultWorkspaceRoot);
			params.set("sessionId", sessionId);
			navigate(`/chat/code?${params.toString()}`);
		},
		[defaultWorkspaceRoot, navigate, setFolderExpanded, setSidebarActiveContext],
	);

	const handleProjectlessSessionRename = useCallback(
		(session: CliSessionItem) => {
			setRenamingSessionKey(`__projectless__:${session.sessionId}`);
			requestAnimationFrame(() => {
				renameInputRef.current?.focus();
				renameInputRef.current?.select();
			});
		},
		[],
	);

	const commitProjectlessSessionRename = useCallback(
		(session: CliSessionItem, newTitle: string) => {
			setRenamingSessionKey(null);
			const trimmed = newTitle.trim();
			if (!trimmed || trimmed === session.title) return;
			const lsKey = `mimiclaw:session-title:__projectless__:${session.sessionId}`;
			localStorage.setItem(lsKey, trimmed);
			void saveSession({
				key: session.sessionId,
				displayName: trimmed,
				updatedAt: Date.now(),
				createdAt: session.updatedAt || Date.now(),
			});
			if (defaultWorkspaceRoot) {
				void refreshProjectlessSessions(defaultWorkspaceRoot);
			}
		},
		[defaultWorkspaceRoot, refreshProjectlessSessions],
	);

	const handleProjectlessSessionOpenInMiniWindow = useCallback(
		(sessionId: string) => {
			if (!defaultWorkspaceRoot) return;
			writeMiniChatPendingSession({
				workspaceRoot: defaultWorkspaceRoot,
				sessionId,
			});
			void invokeIpc("pet:toggleQuickChat").catch(() => {});
		},
		[defaultWorkspaceRoot],
	);

	const [projectlessSortOrder, setProjectlessSortOrder] = useState<"recent" | "alpha">("recent");

	const handleToggleProjectlessSortOrder = useCallback(() => {
		setProjectlessSortOrder((prev) => (prev === "recent" ? "alpha" : "recent"));
	}, []);

	const filteredProjectlessSessions = useMemo(() => {
		const filtered = projectlessSessions.filter((s) => matchesQuery(s.title));
		if (projectlessSortOrder === "alpha") {
			return [...filtered].sort((a, b) => a.title.localeCompare(b.title));
		}
		return filtered;
	}, [matchesQuery, projectlessSessions, projectlessSortOrder]);

	const visibleProjectlessSessions = useMemo(() => {
		const canToggle = filteredProjectlessSessions.length > COLLAPSIBLE_SESSION_LIMIT;
		if (canToggle && !projectlessSessionsExpanded) {
			return filteredProjectlessSessions.slice(0, COLLAPSIBLE_SESSION_LIMIT);
		}
		return filteredProjectlessSessions;
	}, [filteredProjectlessSessions, projectlessSessionsExpanded]);

	// ── derived counts ────────────────────────────────────────────────────────

	const sortedVisibleWorkspaces = useMemo(() => {
		if (sortOrder === "alpha") {
			return [...visibleThreadWorkspaces].sort((a, b) =>
				a.name.localeCompare(b.name),
			);
		}
		return visibleThreadWorkspaces;
	}, [sortOrder, visibleThreadWorkspaces]);

	const expandedWorkspaceIds = useMemo(
		() =>
			threadWorkspaces
				.filter((w) => sidebarThreadWorkspaceExpanded?.[w.id] !== false)
				.map((w) => w.id),
		[sidebarThreadWorkspaceExpanded, threadWorkspaces],
	);

	const collapseAllAction = useMemo<
		"collapse-all" | "reopen-previous" | null
	>(() => {
		if (!isFolderExpanded("thread")) return null;
		if (expandedWorkspaceIds.length > 1) return "collapse-all";
		if (expandedWorkspaceIds.length === 0 && previouslyExpandedIds.length > 0)
			return "reopen-previous";
		return null;
	}, [expandedWorkspaceIds, isFolderExpanded, previouslyExpandedIds]);

	const handleCollapseAllToggle = useCallback(() => {
		if (collapseAllAction === "collapse-all") {
			setPreviouslyExpandedIds(expandedWorkspaceIds);
			for (const id of expandedWorkspaceIds) {
				setSidebarThreadWorkspaceExpanded(id, false);
			}
		} else if (collapseAllAction === "reopen-previous") {
			for (const id of previouslyExpandedIds) {
				setSidebarThreadWorkspaceExpanded(id, true);
			}
			setPreviouslyExpandedIds([]);
		}
	}, [
		collapseAllAction,
		expandedWorkspaceIds,
		previouslyExpandedIds,
		setSidebarThreadWorkspaceExpanded,
	]);

	const handleToggleSortOrder = useCallback(() => {
		setSortOrder((prev) => (prev === "recent" ? "alpha" : "recent"));
	}, []);

	if (sidebarCollapsed) return null;

	// ── 设置路由：整个侧边栏切换为设置导航 ──────────────────────────────────
	if (pathname === "/settings") {
		return <SettingsSidebar />;
	}

	// ── render helpers ────────────────────────────────────────────────────────

	/** 悬浮时才出现的时间标签 */
	const TimeLabel = ({ text }: { text: string }) => (
		<span className={styles.timeLabel}>{text}</span>
	);

	// ── render ────────────────────────────────────────────────────────────────

	const headerNode = (
		<Flexbox gap={2} paddingBlock={4}>
			{/* 新对话 */}
			<NavItem
				icon={SquarePen}
				iconSize={CHAT_NAV_ICON_SIZE}
				title={t("sidebar.newThread", { defaultValue: "新对话" })}
				onClick={handleGlobalNewThread}
			/>
			{/* 搜索 */}
			<NavItem
				icon={Search}
				iconSize={CHAT_NAV_ICON_SIZE}
				title={t("actions.search", { defaultValue: "搜索" })}
				active={searchVisible}
				onClick={() => {
					setSearchVisible((prev) => {
						if (prev) setSearchQuery("");
						return !prev;
					});
				}}
			/>
			{searchVisible && (
				<div className={styles.searchWrap}>
					<SearchInput
						value={searchQuery}
						onValueChange={setSearchQuery}
						placeholder={t("actions.search", { defaultValue: "搜索" })}
						clearable
						autoFocus
						onKeyDown={(e) => {
							if (e.key === "Escape") {
								setSearchVisible(false);
								setSearchQuery("");
							}
						}}
					/>
				</div>
			)}
			{/* 插件 */}
			<NavItem
				icon={Puzzle}
				iconSize={CHAT_NAV_ICON_SIZE}
				title={t("sidebar.plugins", { defaultValue: "插件" })}
				active={pathname === "/plugins"}
				onClick={() => navigate("/plugins")}
			/>
			{/* 自动化 */}
			<NavItem
				icon={Timer}
				iconSize={CHAT_NAV_ICON_SIZE}
				title={t("sidebar.cronTasks", { defaultValue: "自动化" })}
				active={pathname === "/cron"}
				onClick={() => navigate("/cron")}
			/>
		</Flexbox>
	);

	const bodyNode = (
		<Flexbox gap={4} paddingBlock={4}>
			{/* ── Section: 对话 (Projectless Chats) ──────────────────────────── */}
			{filteredProjectlessSessions.length > 0 && (
				<>
					<div className={styles.sectionHeader}>
						<button
							type="button"
							className={styles.sectionLabel}
							onClick={() => toggleFolder("chats")}
							style={{
								cursor: "pointer",
								background: "none",
								border: "none",
								padding: 0,
								textAlign: "left",
							}}
						>
							{t("sidebar.folder.chats", { defaultValue: "对话" })}
						</button>
						<div className={styles.sectionActions}>
							<ActionIcon
								icon={ArrowDownUp}
								size={{ blockSize: 22, size: 12 }}
								title={
									projectlessSortOrder === "recent"
										? t("sidebar.sortAlpha", { defaultValue: "按名称排序" })
										: t("sidebar.sortRecent", { defaultValue: "按最近排序" })
								}
								style={{ opacity: 0.75 }}
								onClick={handleToggleProjectlessSortOrder}
							/>
							<ActionIcon
								icon={Plus}
								size={{ blockSize: 22, size: 12 }}
								title={t("sidebar.newThread", { defaultValue: "新对话" })}
								style={{ opacity: 0.75 }}
								onClick={handleGlobalNewThread}
							/>
						</div>
					</div>
				{isFolderExpanded("chats") && (
					<Flexbox gap={2}>
						{projectlessLoading && (
							<div className={styles.emptyHint}>
								{t("status.loading", { defaultValue: "加载中..." })}
							</div>
						)}
						{!projectlessLoading && visibleProjectlessSessions.map((session) => {
							const isActive =
								pathname.startsWith("/chat/code") &&
								!activeThreadWorkspaceIdFromRoute &&
								activeThreadSessionId === session.sessionId;
							const isRunning =
								runningProjectlessSessions[session.sessionId] === true ||
								(isActive && isThreadSessionGenerating);
							const isRenaming =
								renamingSessionKey === `__projectless__:${session.sessionId}`;
							const sessionMenu: MenuProps = {
								items: [
									{
										key: "rename",
										label: t("sidebar.session.rename", { defaultValue: "重命名对话" }),
									},
									{
										key: "openInMiniWindow",
										label: t("sidebar.session.openInMiniWindow", { defaultValue: "在迷你窗口中打开" }),
									},
								],
								onClick: ({ key }) => {
									if (key === "rename") {
										handleProjectlessSessionRename(session);
									} else if (key === "openInMiniWindow") {
										handleProjectlessSessionOpenInMiniWindow(session.sessionId);
									}
								},
							};
							if (isRenaming) {
								return (
									<div
										key={`pl:${session.sessionId}`}
										className={styles.flatSessionItem}
										style={{
											padding: "0 8px",
											height: 30,
											display: "flex",
											alignItems: "center",
										}}
									>
										<input
											ref={renameInputRef}
											defaultValue={session.title}
											style={{
												width: "100%",
												background: "transparent",
												border: "1px solid var(--ant-color-primary)",
												borderRadius: 4,
												padding: "2px 6px",
												fontSize: "inherit",
												color: "inherit",
												outline: "none",
											}}
											onBlur={(e) =>
												commitProjectlessSessionRename(
													session,
													e.currentTarget.value,
												)
											}
											onKeyDown={(
												e: KeyboardEvent<HTMLInputElement>,
											) => {
												if (e.key === "Enter") {
													e.currentTarget.blur();
												} else if (e.key === "Escape") {
													setRenamingSessionKey(null);
												}
											}}
										/>
									</div>
								);
							}
							return (
								<Dropdown
									key={`pl:${session.sessionId}`}
									menu={sessionMenu}
									trigger={["contextMenu"]}
								>
									<div>
										<NavItem
											className={styles.flatSessionItem}
											title={session.title}
											active={isActive}
											extra={
												<TimeLabel
													text={formatRelativeTime(
														session.updatedAt,
														i18n.language,
													)}
												/>
											}
											slots={
												isRunning
													? {
															titlePrefix: (
																<span
																	className={cx(
																		styles.sessionMarker,
																		styles.sessionMarkerSpinning,
																	)}
																>
																	<Loader2
																		size={CHAT_SESSION_META_ICON_SIZE}
																	/>
																</span>
															),
														}
													: undefined
											}
											onClick={() =>
												handleProjectlessSession(session.sessionId)
											}
										/>
									</div>
								</Dropdown>
							);
						})}
						{filteredProjectlessSessions.length > COLLAPSIBLE_SESSION_LIMIT && (
							<button
								type="button"
								className={styles.sessionListToggle}
								onClick={() =>
									setProjectlessSessionsExpanded((prev) => !prev)
								}
							>
								{projectlessSessionsExpanded
									? t("sidebar.collapseList", { defaultValue: "折叠显示" })
									: t("sidebar.expandList", { defaultValue: "展开显示" })}
							</button>
						)}
					</Flexbox>
				)}
				</>
			)}

			{/* ── Section Header: 项目 ─────────────────────────────────────── */}
			<div className={styles.sectionHeader}>
				<button
					type="button"
					className={styles.sectionLabel}
					onClick={() => toggleFolder("thread")}
					style={{
						cursor: "pointer",
						background: "none",
						border: "none",
						padding: 0,
						textAlign: "left",
					}}
				>
					{t("sidebar.folder.thread", { defaultValue: "项目" })}
				</button>
				<div className={styles.sectionActions}>
					{collapseAllAction && (
						<ActionIcon
							icon={
								collapseAllAction === "collapse-all"
									? ChevronsDownUp
									: ChevronsUpDown
							}
							size={{ blockSize: 22, size: 12 }}
							title={
								collapseAllAction === "collapse-all"
									? t("sidebar.collapseAll", { defaultValue: "全部收起" })
									: t("sidebar.reopenPrevious", { defaultValue: "恢复展开" })
							}
							style={{ opacity: 0.75 }}
							onClick={handleCollapseAllToggle}
						/>
					)}
					<ActionIcon
						icon={ArrowDownUp}
						size={{ blockSize: 22, size: 12 }}
						title={
							sortOrder === "recent"
								? t("sidebar.sortAlpha", { defaultValue: "按名称排序" })
								: t("sidebar.sortRecent", { defaultValue: "按最近排序" })
						}
						style={{ opacity: 0.75 }}
						onClick={handleToggleSortOrder}
					/>
					<ActionIcon
						icon={Plus}
						size={{ blockSize: 22, size: 12 }}
						title={t("sidebar.addWorkspace", { defaultValue: "添加工作区" })}
						style={{ opacity: 0.75 }}
						onClick={() => void handleAddWorkspace()}
					/>
				</div>
			</div>

			{/* ── Flat project list ────────────────────────────────────────── */}
			{isFolderExpanded("thread") && (
				<Flexbox gap={2}>
					{sortedVisibleWorkspaces.length === 0 && (
						<div className={styles.emptyHint}>
							{t("sidebar.empty.thread", { defaultValue: "无工作区" })}
						</div>
					)}

					{sortedVisibleWorkspaces.map((workspace) => {
						const expanded =
							sidebarThreadWorkspaceExpanded?.[workspace.id] !== false;
						const availability = workspaceAvailabilityById[workspace.id] ?? {
							available: true,
						};
						const sessionsInWorkspace =
							filteredThreadSessionsByWorkspace[workspace.id] ?? [];
						const isLoading = workspaceLoadingById[workspace.id] === true;
						const error = workspaceErrorById[workspace.id];
						const canToggleSessions =
							sessionsInWorkspace.length > COLLAPSIBLE_SESSION_LIMIT;
						const sessionsExpanded =
							workspaceSessionsExpanded[workspace.id] === true;
						const visibleSessions =
							canToggleSessions && !sessionsExpanded
								? sessionsInWorkspace.slice(0, COLLAPSIBLE_SESSION_LIMIT)
								: sessionsInWorkspace;
						const sessionCount = sessionsInWorkspace.length;

						const workspaceMenu: MenuProps = {
							items: [
								{
									key: "newThread",
									label: t("sidebar.newThread", { defaultValue: "新对话" }),
									disabled: !availability.available,
								},
								{ type: "divider" },
								{
									key: "rename",
									label: t("sidebar.workspace.rename", {
										defaultValue: "重命名",
									}),
								},
								{
									key: "open",
									label: t("sidebar.workspace.openInFinder", {
										defaultValue: "在 Finder 中打开",
									}),
								},
								{ type: "divider" },
								{
									key: "remove",
									label: t("sidebar.workspace.remove", {
										defaultValue: "从列表移除",
									}),
									danger: true,
								},
							],
							onClick: ({ key }) => {
								if (key === "newThread") {
									handleWorkspaceNewThread(workspace);
								} else if (key === "rename") {
									handleWorkspaceRename(workspace);
								} else if (key === "remove") {
									handleWorkspaceRemove(workspace);
								} else if (key === "open") {
									handleWorkspaceOpenInFinder(workspace);
								}
							},
						};
						const workspaceMenuTrigger: Array<"click" | "contextMenu"> = [
							"contextMenu",
						];

						const workspaceMoreMenu: MenuProps = {
							items: [
								{
									key: "rename",
									label: t("sidebar.workspace.rename", {
										defaultValue: "重命名",
									}),
								},
								{
									key: "open",
									label: t("sidebar.workspace.openInFinder", {
										defaultValue: "在 Finder 中打开",
									}),
								},
								{ type: "divider" },
								{
									key: "remove",
									label: t("sidebar.workspace.remove", {
										defaultValue: "从列表移除",
									}),
									danger: true,
								},
							],
							onClick: workspaceMenu.onClick,
						};

						return (
							<div key={workspace.id}>
								{/* ── Group header (same level as sessions) ── */}
								<Dropdown menu={workspaceMenu} trigger={workspaceMenuTrigger}>
									<div
										className={styles.groupHeader}
										onClick={(e) => {
											if (
												(e.target as HTMLElement).closest("[data-popup-open]")
											)
												return;
											const willExpand = !expanded;
											setSidebarThreadWorkspaceExpanded(
												workspace.id,
												willExpand,
											);
											setSidebarActiveContext({
												kind: "thread",
												workspaceId: workspace.id,
											});
											// Only fetch sessions when expanding and data
											// hasn't been loaded yet.
											if (willExpand && !workspaceSessionsById[workspace.id]) {
												void refreshWorkspaceSessions(workspace);
											}
										}}
									>
										<span
											className={styles.groupChevron}
											style={{
												transform: expanded ? "rotate(0deg)" : "rotate(-90deg)",
											}}
										>
											<ChevronDown size={12} />
										</span>
										<span className={styles.groupName}>
											{workspace.name}
											{!availability.available && (
												<span
													className={styles.unavailableTag}
													style={{ marginInlineStart: 4 }}
												>
													{t("sidebar.workspaceUnavailable", {
														defaultValue: "不可用",
													})}
												</span>
											)}
										</span>
										<span className={`${styles.groupActions} group-actions`}>
											<Dropdown menu={workspaceMoreMenu} trigger={["click"]}>
												<span
													className={styles.groupActionBtn}
													onClick={(e) => e.stopPropagation()}
												>
													<Ellipsis size={14} />
												</span>
											</Dropdown>
											{availability.available && (
												<span
													className={styles.groupActionBtn}
													title={t("sidebar.newThread", {
														defaultValue: "新对话",
													})}
													onClick={(e) => {
														e.stopPropagation();
														handleWorkspaceNewThread(workspace);
													}}
												>
													<Plus size={14} />
												</span>
											)}
										</span>
									</div>
								</Dropdown>

								{/* ── Sessions (flat, same indent as group header) ── */}
								{expanded && (
									<Flexbox gap={2}>
										{isLoading && (
											<div className={styles.emptyHint}>
												{t("status.loading", { defaultValue: "加载中..." })}
											</div>
										)}
										{!isLoading && error && (
											<div className={styles.warningText}>{error}</div>
										)}
										{!isLoading && !error && visibleSessions.length === 0 && (
											<div className={styles.emptyHint}>
												{t("sidebar.empty.thread", {
													defaultValue: "无工作区",
												})}
											</div>
										)}
										{visibleSessions.map((session) => {
											const isActive =
												pathname.startsWith("/chat/code") &&
												activeThreadWorkspaceIdFromRoute === workspace.id &&
												activeThreadSessionId === session.sessionId;
											const isRunning =
												runningThreadSessionsByWorkspaceId[workspace.id]?.[
													session.sessionId
												] === true ||
												(isActive && isThreadSessionGenerating);
											const isRenaming =
												renamingSessionKey ===
												`${workspace.id}:${session.sessionId}`;
											const sessionMenu: MenuProps = {
												items: [
													{
														key: "rename",
														label: t("sidebar.session.rename", {
															defaultValue: "重命名对话",
														}),
													},
													{
														key: "openInFinder",
														label: t("sidebar.session.openInFinder", {
															defaultValue: "在访达中打开",
														}),
													},
													{
														key: "openInMiniWindow",
														label: t("sidebar.session.openInMiniWindow", {
															defaultValue: "在迷你窗口中打开",
														}),
													},
												],
												onClick: ({ key }) => {
													if (key === "rename") {
														handleSessionRename(workspace, session);
													} else if (key === "openInFinder") {
														handleSessionOpenInFinder(workspace);
													} else if (key === "openInMiniWindow") {
														handleSessionOpenInMiniWindow(
															workspace,
															session.sessionId,
														);
													}
												},
											};
											if (isRenaming) {
												return (
													<div
														key={`${workspace.id}:${session.sessionId}`}
														className={styles.flatSessionItem}
														style={{
															padding: "0 8px",
															height: 30,
															display: "flex",
															alignItems: "center",
														}}
													>
														<input
															ref={renameInputRef}
															defaultValue={session.title}
															style={{
																width: "100%",
																background: "transparent",
																border: "1px solid var(--ant-color-primary)",
																borderRadius: 4,
																padding: "2px 6px",
																fontSize: "inherit",
																color: "inherit",
																outline: "none",
															}}
															onBlur={(e) =>
																commitSessionRename(
																	workspace,
																	session,
																	e.currentTarget.value,
																)
															}
															onKeyDown={(
																e: KeyboardEvent<HTMLInputElement>,
															) => {
																if (e.key === "Enter") {
																	e.currentTarget.blur();
																} else if (e.key === "Escape") {
																	setRenamingSessionKey(null);
																}
															}}
														/>
													</div>
												);
											}
											return (
												<Dropdown
													key={`${workspace.id}:${session.sessionId}`}
													menu={sessionMenu}
													trigger={["contextMenu"]}
												>
													<div>
														<NavItem
															className={styles.flatSessionItem}
															title={session.title}
															active={isActive}
															extra={
																<TimeLabel
																	text={formatRelativeTime(
																		session.updatedAt,
																		i18n.language,
																	)}
																/>
															}
															slots={
																isRunning
																	? {
																			titlePrefix: (
																				<span
																					className={cx(
																						styles.sessionMarker,
																						styles.sessionMarkerSpinning,
																					)}
																				>
																					<Loader2
																						size={CHAT_SESSION_META_ICON_SIZE}
																					/>
																				</span>
																			),
																		}
																	: undefined
															}
															onClick={() =>
																handleThreadSession(
																	workspace,
																	session.sessionId,
																)
															}
														/>
													</div>
												</Dropdown>
											);
										})}
										{canToggleSessions && (
											<button
												type="button"
												className={styles.sessionListToggle}
												onClick={() =>
													setWorkspaceSessionsExpanded((prev) => ({
														...prev,
														[workspace.id]: !sessionsExpanded,
													}))
												}
											>
												{sessionsExpanded
													? t("sidebar.collapseList", {
															defaultValue: "折叠显示",
														})
													: t("sidebar.expandList", {
															defaultValue: "展开显示",
														})}
											</button>
										)}
									</Flexbox>
								)}
							</div>
						);
					})}
				</Flexbox>
			)}
		</Flexbox>
	);

	return (
		<aside
			className={styles.aside}
			data-translucent-sidebar={translucentSidebar ? "true" : "false"}
		>
			<div className={styles.topBar}>
				<SidebarUpdateAction />
			</div>

			<SideBarLayout header={headerNode} body={bodyNode} />

			{/* 底部：设置 */}
			<div className={styles.footer}>
				<NavItem
					icon={SettingsIcon}
					iconSize={CHAT_NAV_ICON_SIZE}
					title={t("sidebar.settings", { defaultValue: "设置" })}
					active={pathname === "/settings"}
					onClick={() => navigate("/settings")}
				/>
			</div>
		</aside>
	);
}
