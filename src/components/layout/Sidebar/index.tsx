/**
 * Sidebar — NavPanel 风格重写
 * 业务逻辑完整保留自 LegacySidebar，渲染层替换为 NavPanel UI 组件。
 */
import { ActionIcon, Flexbox, Text } from "@lobehub/ui";
import { createStyles, cssVar } from "antd-style";
import {
	ChevronDown,
	ChevronRight,
	Ellipsis,
	FolderOpen,
	Loader2,
	Plus,
	Settings as SettingsIcon,
	SquarePen,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { getSidebarChromeCss } from "@/components/layout/sidebar-chrome";
import {
	CHAT_NAV_ICON_SIZE,
	CHAT_SESSION_META_FONT_SIZE,
	CHAT_SESSION_META_ICON_SIZE,
} from "@/styles/typography-tokens";
import { SidebarUpdateAction } from "@/components/update/SidebarUpdateAction";

import { NavItem, SideBarLayout } from "@/features/NavPanel";
import { SettingsSidebar } from "./SettingsSidebar";

// ─── types ────────────────────────────────────────────────────────────────────

type FolderKey = "thread";

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
    padding: 4px 8px 8px;
  `,
	subItemLevel1: css`
    padding-inline-start: 20px !important;
    min-height: 32px !important;
  `,
	workspaceChildren: css`
    position: relative;
    margin: 2px 0 6px 28px;
    padding-inline-start: 12px;
  `,
	subItemLevel2: css`
    padding-inline-start: 10px !important;
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
    padding: 2px 4px 2px 20px;
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
    padding-inline-start: 10px;
  `,
	emptyHint: css`
    padding: 4px 8px 4px 20px;
    font-size: 12px;
    color: ${cssVar.colorTextQuaternary};
  `,
	emptyHintNested: css`
    padding: 4px 8px 4px 10px;
  `,
	warningText: css`
    padding: 4px 8px 4px 20px;
    font-size: 11px;
    color: ${token.colorWarning};
  `,
	warningTextNested: css`
    padding: 4px 8px 4px 10px;
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
	const [searchQuery] = useState("");
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
	const [runningThreadSessionsByWorkspaceId, setRunningThreadSessionsByWorkspaceId] =
		useState<RunningThreadSessionMap>({});
	const didRunMigrationRef = useRef(false);
	const didInitialWorkspaceFetchRef = useRef(false);
	const fetchedWorkspaceIdsRef = useRef<Set<string>>(new Set());

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
		pathname.startsWith("/chat/code")
		&& (
			codeAgentSessionState === "running"
			|| codeAgentSessionState === "requires_action"
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
					.map((s) => ({
						sessionId: s.sessionId,
						title: s.title?.trim() || s.sessionId,
						updatedAt: s.updatedAt,
					}));
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
				typeof (request as { workspaceRoot?: unknown }).workspaceRoot === "string"
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
						? typeof (metadata as { sessionId?: unknown }).sessionId === "string"
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
			const workspaceId =
				workspaceIdByNormalizedRoot[normalizeWorkspacePath(workspaceRoot)];
			if (!workspaceId) return;
			const workspace = workspaceById[workspaceId];
			if (!workspace) return;
			void refreshWorkspaceSessions(workspace);
		};

		const markThreadSessionRunning = (payload: CodeAgentRunRecord) => {
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
			const target = resolveRunSessionTarget(payload);
			if (target) {
				setRunningThreadSessionsByWorkspaceId((prev) => {
					const currentWorkspaceSessions = prev[target.workspaceId];
					if (!currentWorkspaceSessions?.[target.sessionId]) return prev;
					const {
						[target.sessionId]: _removed,
						...remainingSessions
					} = currentWorkspaceSessions;
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
		// 只处理 thread 工作区的情况
		const activeWorkspace =
			(sidebarActiveContext.workspaceId
				? workspaceById[sidebarActiveContext.workspaceId]
				: undefined) ?? threadWorkspaces[0];
		if (activeWorkspace) {
			handleWorkspaceNewThread(activeWorkspace);
			return;
		}
		// 如果没有工作区，提示添加工作区
		void handleAddWorkspace();
	}, [
		handleAddWorkspace,
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
			touchSidebarThreadWorkspace(workspace.id);
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
			touchSidebarThreadWorkspace,
		],
	);

	// ── derived counts ────────────────────────────────────────────────────────

	const getWorkspaceSecondaryLabel = (workspace: SidebarThreadWorkspace) => {
		const sessions = filteredThreadSessionsByWorkspace[workspace.id] ?? [];
		if (sessions.length === 0) return "";
		return String(sessions.length);
	};

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
		<Flexbox gap={2} paddingInline={8} paddingBlock={4}>
			{/* 新对话 */}
			<NavItem
				icon={SquarePen}
				iconSize={CHAT_NAV_ICON_SIZE}
				title={t("sidebar.newThread", { defaultValue: "新对话" })}
				onClick={handleGlobalNewThread}
			/>

		</Flexbox>
	);

	const bodyNode = (
		<Flexbox gap={2} paddingInline={8} paddingBlock={4}>
			{/* ── Thread 工作区 ────────────────────────────────────────────── */}
			<NavItem
				icon={FolderOpen}
				iconSize={CHAT_NAV_ICON_SIZE}
				iconHover={isFolderExpanded("thread") ? ChevronDown : ChevronRight}
				title={t("sidebar.folder.thread", { defaultValue: "工作区" })}
				active={false}
				actions={
					<ActionIcon
						icon={Plus}
						size={{ blockSize: 20, size: 12 }}
						title={t("sidebar.addWorkspace", { defaultValue: "添加工作区" })}
						onClick={(e) => {
							e.stopPropagation();
							void handleAddWorkspace();
						}}
					/>
				}
				onClick={() => {
					toggleFolder("thread");
					const first = threadWorkspaces[0];
					if (first) {
						setSidebarActiveContext({ kind: "thread", workspaceId: first.id });
						void refreshWorkspaceSessions(first);
					}
				}}
			/>

			{isFolderExpanded("thread") && (
				<>
					{visibleThreadWorkspaces.length === 0 && (
						<div className={styles.emptyHint}>
							{t("sidebar.empty.thread", { defaultValue: "无工作区" })}
						</div>
					)}

					{visibleThreadWorkspaces.map((workspace) => {
						const expanded =
							sidebarThreadWorkspaceExpanded?.[workspace.id] !== false;
						const availability = workspaceAvailabilityById[workspace.id] ?? {
							available: true,
						};
						const secondaryLabel = getWorkspaceSecondaryLabel(workspace);
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

						const workspaceMenu: MenuProps = {
							items: [
								{
									key: "rename",
									label: t("sidebar.workspace.rename", {
										defaultValue: "重命名",
									}),
								},
								{
									key: "remove",
									label: t("sidebar.workspace.remove", {
										defaultValue: "从列表移除",
									}),
								},
								{
									key: "open",
									label: t("sidebar.workspace.openInFinder", {
										defaultValue: "在 Finder 中打开",
									}),
								},
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
						const workspaceMenuTrigger: Array<"click" | "contextMenu"> =
							contextMenuMode === "default"
								? ["click", "contextMenu"]
								: ["click"];

						return (
							<div key={workspace.id}>
								<NavItem
									className={styles.subItemLevel1}
									icon={FolderOpen}
									iconSize={CHAT_NAV_ICON_SIZE}
									iconHover={expanded ? ChevronDown : ChevronRight}
									title={
										<Flexbox
											horizontal
											align="center"
											gap={4}
											style={{ overflow: "hidden" }}
										>
											<Text ellipsis style={{ flex: 1 }}>
												{workspace.name}
											</Text>
											{secondaryLabel && (
												<Text
													type="secondary"
													style={{
														fontSize: CHAT_SESSION_META_FONT_SIZE,
														flexShrink: 0,
													}}
												>
													{secondaryLabel}
												</Text>
											)}
											{!availability.available && (
												<span className={styles.unavailableTag}>
													{t("sidebar.workspaceUnavailable", {
														defaultValue: "不可用",
													})}
												</span>
											)}
										</Flexbox>
									}
									actions={
										<Flexbox horizontal gap={2}>
											<ActionIcon
												icon={Plus}
												size={{ blockSize: 20, size: 12 }}
												disabled={!availability.available}
												title={t("sidebar.newThread", {
													defaultValue: "新对话",
												})}
												onClick={(e) => {
													e.stopPropagation();
													handleWorkspaceNewThread(workspace);
												}}
											/>
											<Dropdown menu={workspaceMenu} trigger={workspaceMenuTrigger}>
												<ActionIcon
													icon={Ellipsis}
													size={{ blockSize: 20, size: 12 }}
													title={t("sidebar.workspace.more", {
														defaultValue: "更多",
													})}
													onClick={(e) => e.stopPropagation()}
												/>
											</Dropdown>
										</Flexbox>
									}
									onClick={() => {
										setSidebarThreadWorkspaceExpanded(workspace.id, !expanded);
										setSidebarActiveContext({
											kind: "thread",
											workspaceId: workspace.id,
										});
										touchSidebarThreadWorkspace(workspace.id);
										void refreshWorkspaceSessions(workspace);
									}}
								/>

								{expanded && (
									<div className={styles.workspaceChildren}>
										{isLoading && (
											<div className={cx(styles.emptyHint, styles.emptyHintNested)}>
												{t("status.loading", { defaultValue: "加载中..." })}
											</div>
										)}
										{!isLoading && error && (
											<div className={cx(styles.warningText, styles.warningTextNested)}>
												{error}
											</div>
										)}
										{!isLoading && !error && visibleSessions.length === 0 && (
											<div className={cx(styles.emptyHint, styles.emptyHintNested)}>
												{t("sidebar.empty.thread", { defaultValue: "无工作区" })}
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
												] === true
												|| (isActive && isThreadSessionGenerating);
											return (
												<NavItem
													key={`${workspace.id}:${session.sessionId}`}
													className={styles.subItemLevel2}
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
														handleThreadSession(workspace, session.sessionId)
													}
												/>
											);
										})}
										{canToggleSessions && (
											<button
												type="button"
												className={cx(
													styles.sessionListToggle,
													styles.sessionListToggleNested,
												)}
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
									</div>
								)}
							</div>
						);
					})}
				</>
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
