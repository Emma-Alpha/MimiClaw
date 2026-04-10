/**
 * Sidebar Component
 * Refined compact navigation for conversation workspaces.
 */
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
	Bot,
	ChevronDown,
	Clock,
	Loader2,
	MessageCircle,
	MessageSquare,
	Mic,
	Blocks,
	Hexagon,
	SquarePen,
	Search,
	Settings as SettingsIcon,
	Terminal,
	Trash2,
	Pin,
} from "lucide-react";
import { useSettingsStore } from "@/stores/settings";
import { useChatStore } from "@/stores/chat";
import { useGatewayStore } from "@/stores/gateway";
import { useAgentsStore } from "@/stores/agents";
import { useJizhiSessionsStore } from "@/stores/jizhi-sessions";
import { useRemoteMessengerStore } from "@/stores/remote-messenger";
import { useVoiceChatSessionsStore } from "@/stores/voice-chat-sessions";
import {
	fetchCodeAgentSessions,
	readStoredCodeAgentWorkspaceRoot,
} from "@/lib/code-agent";
import { SearchInput } from "@/components/common/SearchInput";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useTranslation } from "react-i18next";
import { useLegacySidebarStyles } from "./style";

type FolderKey = "chat" | "cli" | "jizhi" | "xiaojiu" | "voice";

type OpenClawSessionItem = {
	key: string;
	label: string;
	agentName: string;
	updatedAt: number;
};

type CliSessionItem = {
	sessionId: string;
	title: string;
	updatedAt: number;
};

type NamedSessionItem = {
	id: string;
	label: string;
	updatedAt: number;
};

const COLLAPSIBLE_SESSION_LIMIT = 5;

type LegacySidebarStyles = ReturnType<typeof useLegacySidebarStyles>["styles"];
type LegacySidebarCx = ReturnType<typeof useLegacySidebarStyles>["cx"];

function getAgentIdFromSessionKey(sessionKey: string): string {
	if (!sessionKey.startsWith("agent:")) return "main";
	const [, agentId] = sessionKey.split(":");
	return agentId || "main";
}

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

function FolderSection({
	icon,
	label,
	count,
	active,
	expanded,
	onActivate,
	onToggle,
	children,
	styles,
	cx,
}: {
	icon: ReactNode;
	label: string;
	count: number;
	active: boolean;
	expanded: boolean;
	onActivate: () => void;
	onToggle: () => void;
	children?: ReactNode;
	styles: LegacySidebarStyles;
	cx: LegacySidebarCx;
}) {
	return (
		<section className={styles.folderSection}>
			<div
				className={cx(
					styles.folderHeader,
					active && styles.folderHeaderActive,
				)}
			>
				<button
					type="button"
					onClick={(event) => {
						event.stopPropagation();
						onToggle();
					}}
					aria-label={expanded ? "Collapse folder" : "Expand folder"}
					className={styles.folderInlineToggleButton}
					data-folder-toggle="true"
				>
					<span
						data-folder-icon="true"
						className={cx(
							styles.folderIconWrap,
							active && styles.folderIconWrapActive,
						)}
					>
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
						active
							? styles.folderActivateButtonActive
							: styles.folderActivateButtonIdle,
					)}
				>
					<span className={styles.truncate}>{label}</span>
					<span className={styles.folderCount}>{count}</span>
				</button>
			</div>
			{expanded ? (
				<div className={styles.folderChildren}>
					{children}
				</div>
			) : null}
		</section>
	);
}

export function LegacySidebar() {
	const { styles, cx } = useLegacySidebarStyles();
	const sidebarCollapsed = useSettingsStore((state) => state.sidebarCollapsed);
	const sidebarFolderExpanded = useSettingsStore(
		(state) => state.sidebarFolderExpanded,
	);
	const setSidebarFolderExpanded = useSettingsStore(
		(state) => state.setSidebarFolderExpanded,
	);

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

	const agents = useAgentsStore((s) => s.agents);
	const fetchAgents = useAgentsStore((s) => s.fetchAgents);

	const remoteSessions = useRemoteMessengerStore((s) => s.sessions);
	const remoteLastSyncedAt = useRemoteMessengerStore((s) => s.lastSyncedAt);
	const remoteSyncError = useRemoteMessengerStore((s) => s.syncError);
	const remoteActiveSessionId = useRemoteMessengerStore((s) => s.activeSessionId);
	const setRemoteActiveSessionId = useRemoteMessengerStore(
		(s) => s.setActiveSessionId,
	);

	const jizhiSessions = useJizhiSessionsStore((s) => s.sessions);
	const jizhiSyncError = useJizhiSessionsStore((s) => s.syncError);
	const jizhiActiveSessionId = useJizhiSessionsStore((s) => s.activeSessionId);
	const setJizhiActiveSessionId = useJizhiSessionsStore(
		(s) => s.setActiveSessionId,
	);

	const voiceSessions = useVoiceChatSessionsStore((s) => s.sessions);
	const voiceSyncError = useVoiceChatSessionsStore((s) => s.syncError);
	const voiceActiveSessionId = useVoiceChatSessionsStore((s) => s.activeSessionId);
	const setVoiceActiveSessionId = useVoiceChatSessionsStore(
		(s) => s.setActiveSessionId,
	);

	const xiaojiuEnabled = useSettingsStore((s) => s.xiaojiuEnabled);
	const jizhiEnabled = useSettingsStore((s) => s.jizhiEnabled);

	const navigate = useNavigate();
	const location = useLocation();
	const pathname = location.pathname;
	const { t, i18n } = useTranslation(["common"]);

	const [sessionToDelete, setSessionToDelete] = useState<{
		key: string;
		label: string;
	} | null>(null);
	const [cliWorkspaceRoot, setCliWorkspaceRoot] = useState(() =>
		readStoredCodeAgentWorkspaceRoot().trim(),
	);
	const [cliSessions, setCliSessions] = useState<CliSessionItem[]>([]);
	const [cliLoading, setCliLoading] = useState(false);
	const [cliError, setCliError] = useState<string | null>(null);
	const [activeCliSessionId, setActiveCliSessionId] = useState<string | null>(
		null,
	);
	const [searchQuery, setSearchQuery] = useState("");
	const [searchExpanded, setSearchExpanded] = useState(false);
	const [chatSessionsExpanded, setChatSessionsExpanded] = useState(false);
	const [cliSessionsExpanded, setCliSessionsExpanded] = useState(false);
	const [jizhiSessionsExpanded, setJizhiSessionsExpanded] = useState(false);
	const [xiaojiuSessionsExpanded, setXiaojiuSessionsExpanded] = useState(false);
	const [voiceSessionsExpanded, setVoiceSessionsExpanded] = useState(false);
	const searchInputRef = useRef<HTMLInputElement>(null);

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

	useEffect(() => {
		void fetchAgents();
	}, [fetchAgents]);

	useEffect(() => {
		const syncWorkspaceRoot = () => {
			const next = readStoredCodeAgentWorkspaceRoot().trim();
			setCliWorkspaceRoot((current) => (current === next ? current : next));
		};

		syncWorkspaceRoot();
		window.addEventListener("focus", syncWorkspaceRoot);
		const interval = window.setInterval(syncWorkspaceRoot, 5000);

		return () => {
			window.removeEventListener("focus", syncWorkspaceRoot);
			window.clearInterval(interval);
		};
	}, [pathname]);

	useEffect(() => {
		let cancelled = false;

		if (!cliWorkspaceRoot) {
			return;
		}

		void (async () => {
			setCliLoading(true);
			setCliError(null);
			try {
				const sessionsInWorkspace = await fetchCodeAgentSessions(
					cliWorkspaceRoot,
					60,
				);
				if (cancelled) return;
				const sorted = [...sessionsInWorkspace].sort(
					(left, right) => right.updatedAt - left.updatedAt,
				);
				const mapped = sorted.map((session) => ({
					sessionId: session.sessionId,
					title: session.title?.trim() || session.sessionId,
					updatedAt: session.updatedAt,
				}));
				setCliSessions(mapped);
				setActiveCliSessionId((current) => {
					if (current && mapped.some((item) => item.sessionId === current)) {
						return current;
					}
					return mapped[0]?.sessionId ?? null;
				});
			} catch {
				if (cancelled) return;
				setCliSessions([]);
				setCliError(
					t("sidebar.cliSessionsLoadFailed", {
						defaultValue: "CLI 会话加载失败",
					}),
				);
			} finally {
				if (!cancelled) {
					setCliLoading(false);
				}
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [cliWorkspaceRoot, pathname, t]);

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

	const agentNameById = useMemo(
		() =>
			Object.fromEntries((agents ?? []).map((agent) => [agent.id, agent.name])),
		[agents],
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
			.map((session) => {
				const agentId = getAgentIdFromSessionKey(session.key);
				const updatedAt = sessionLastActivity[session.key] ?? session.updatedAt ?? 0;
				return {
					key: session.key,
					label: getSessionLabel(session.key, session.displayName, session.label),
					agentName: agentNameById[agentId] || agentId,
					updatedAt,
				};
			});
	}, [agentNameById, sessionLabels, sessionLastActivity, sessions]);

	const xiaojiuSessionItems = useMemo<NamedSessionItem[]>(() => {
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

	const jizhiSessionItems = useMemo<NamedSessionItem[]>(() => {
		if (!jizhiEnabled) return [];
		return [...jizhiSessions]
			.sort((left, right) => {
				const rightUpdated = right.lastMessageCreatedAt ?? right.updatedAt ?? 0;
				const leftUpdated = left.lastMessageCreatedAt ?? left.updatedAt ?? 0;
				return rightUpdated - leftUpdated;
			})
			.map((session) => ({
				id: session.id,
				label: session.name,
				updatedAt: session.lastMessageCreatedAt ?? session.updatedAt ?? 0,
			}));
	}, [jizhiEnabled, jizhiSessions]);

	const voiceSessionItems = useMemo<NamedSessionItem[]>(() => {
		return [...voiceSessions]
			.sort((left, right) => right.lastActivityAt - left.lastActivityAt)
			.map((session) => ({
				id: session.id,
				label: session.title,
				updatedAt: session.lastActivityAt,
			}));
	}, [voiceSessions]);

	const requestedCliSessionId = useMemo(() => {
		if (!pathname.startsWith("/code-agent/chat")) return null;
		const raw = new URLSearchParams(location.search).get("sessionId");
		const normalized = raw?.trim();
		return normalized || null;
	}, [location.search, pathname]);

	const activeFolder = useMemo<FolderKey | null>(() => {
		if (pathname === "/") return "chat";
		if (pathname.startsWith("/code-agent")) return "cli";
		if (pathname.startsWith("/jizhi-chat")) return "jizhi";
		if (pathname.startsWith("/xiaojiu-chat")) return "xiaojiu";
		if (pathname.startsWith("/voice-chat")) return "voice";
		return null;
	}, [pathname]);

	const cliHasWorkspace = cliWorkspaceRoot.length > 0;
	const visibleCliSessions = useMemo(
		() => (cliHasWorkspace ? cliSessions : []),
		[cliHasWorkspace, cliSessions],
	);
	const visibleCliLoading = cliHasWorkspace ? cliLoading : false;
	const visibleCliError = cliHasWorkspace ? cliError : null;

	const normalizedQuery = searchQuery.trim().toLowerCase();
	const hasSearchQuery = normalizedQuery.length > 0;
	const matchesQuery = useCallback(
		(value: string) => !hasSearchQuery || value.toLowerCase().includes(normalizedQuery),
		[hasSearchQuery, normalizedQuery],
	);

	const filteredOpenClawSessions = useMemo(
		() =>
			openClawSessions.filter(
				(session) => matchesQuery(session.label) || matchesQuery(session.agentName),
			),
		[matchesQuery, openClawSessions],
	);
	const canToggleChatSessions = filteredOpenClawSessions.length > COLLAPSIBLE_SESSION_LIMIT;
	const visibleOpenClawSessions = useMemo(
		() =>
			canToggleChatSessions && !chatSessionsExpanded
				? filteredOpenClawSessions.slice(0, COLLAPSIBLE_SESSION_LIMIT)
				: filteredOpenClawSessions,
		[canToggleChatSessions, chatSessionsExpanded, filteredOpenClawSessions],
	);
	const hasVisibleActiveChatSession = useMemo(
		() =>
			pathname === "/"
			&& filteredOpenClawSessions.some((session) => session.key === currentSessionKey),
		[currentSessionKey, filteredOpenClawSessions, pathname],
	);
	const filteredCliSessions = useMemo(
		() => visibleCliSessions.filter((session) => matchesQuery(session.title)),
		[matchesQuery, visibleCliSessions],
	);
	const canToggleCliSessions = filteredCliSessions.length > COLLAPSIBLE_SESSION_LIMIT;
	const visibleFilteredCliSessions = useMemo(
		() =>
			canToggleCliSessions && !cliSessionsExpanded
				? filteredCliSessions.slice(0, COLLAPSIBLE_SESSION_LIMIT)
				: filteredCliSessions,
		[canToggleCliSessions, cliSessionsExpanded, filteredCliSessions],
	);
	const effectiveActiveCliSessionId = useMemo(
		() => requestedCliSessionId ?? activeCliSessionId ?? visibleCliSessions[0]?.sessionId ?? null,
		[activeCliSessionId, requestedCliSessionId, visibleCliSessions],
	);
	const hasVisibleActiveCliSession = useMemo(
		() =>
			pathname.startsWith("/code-agent/chat")
			&& filteredCliSessions.some(
				(session) => session.sessionId === effectiveActiveCliSessionId,
			),
		[effectiveActiveCliSessionId, filteredCliSessions, pathname],
	);
	const filteredJizhiSessions = useMemo(
		() => jizhiSessionItems.filter((session) => matchesQuery(session.label)),
		[jizhiSessionItems, matchesQuery],
	);
	const canToggleJizhiSessions = filteredJizhiSessions.length > COLLAPSIBLE_SESSION_LIMIT;
	const visibleFilteredJizhiSessions = useMemo(
		() =>
			canToggleJizhiSessions && !jizhiSessionsExpanded
				? filteredJizhiSessions.slice(0, COLLAPSIBLE_SESSION_LIMIT)
				: filteredJizhiSessions,
		[canToggleJizhiSessions, filteredJizhiSessions, jizhiSessionsExpanded],
	);
	const hasVisibleActiveJizhiSession = useMemo(
		() =>
			pathname.startsWith("/jizhi-chat")
			&& filteredJizhiSessions.some((session) => session.id === jizhiActiveSessionId),
		[filteredJizhiSessions, jizhiActiveSessionId, pathname],
	);
	const filteredXiaojiuSessions = useMemo(
		() => xiaojiuSessionItems.filter((session) => matchesQuery(session.label)),
		[matchesQuery, xiaojiuSessionItems],
	);
	const canToggleXiaojiuSessions = filteredXiaojiuSessions.length > COLLAPSIBLE_SESSION_LIMIT;
	const visibleFilteredXiaojiuSessions = useMemo(
		() =>
			canToggleXiaojiuSessions && !xiaojiuSessionsExpanded
				? filteredXiaojiuSessions.slice(0, COLLAPSIBLE_SESSION_LIMIT)
				: filteredXiaojiuSessions,
		[
			canToggleXiaojiuSessions,
			filteredXiaojiuSessions,
			xiaojiuSessionsExpanded,
		],
	);
	const hasVisibleActiveXiaojiuSession = useMemo(
		() =>
			pathname.startsWith("/xiaojiu-chat")
			&& filteredXiaojiuSessions.some((session) => session.id === remoteActiveSessionId),
		[filteredXiaojiuSessions, pathname, remoteActiveSessionId],
	);
	const filteredVoiceSessions = useMemo(
		() => voiceSessionItems.filter((session) => matchesQuery(session.label)),
		[matchesQuery, voiceSessionItems],
	);
	const canToggleVoiceSessions = filteredVoiceSessions.length > COLLAPSIBLE_SESSION_LIMIT;
	const visibleFilteredVoiceSessions = useMemo(
		() =>
			canToggleVoiceSessions && !voiceSessionsExpanded
				? filteredVoiceSessions.slice(0, COLLAPSIBLE_SESSION_LIMIT)
				: filteredVoiceSessions,
		[canToggleVoiceSessions, filteredVoiceSessions, voiceSessionsExpanded],
	);
	const hasVisibleActiveVoiceSession = useMemo(
		() =>
			pathname.startsWith("/voice-chat")
			&& filteredVoiceSessions.some((session) => session.id === voiceActiveSessionId),
		[filteredVoiceSessions, pathname, voiceActiveSessionId],
	);

	const visibleThreadCount =
		filteredOpenClawSessions.length
		+ filteredCliSessions.length
		+ filteredVoiceSessions.length
		+ (jizhiEnabled ? filteredJizhiSessions.length : 0)
		+ (xiaojiuEnabled ? filteredXiaojiuSessions.length : 0);

	const openFolderAndNavigate = useCallback(
		(folder: FolderKey) => {
			setFolderExpanded(folder, true);
		},
		[setFolderExpanded],
	);

	const activateChatFolder = useCallback(() => {
		openFolderAndNavigate("chat");
		const latest = openClawSessions[0];
		if (latest) {
			switchSession(latest.key);
		} else {
			newSession();
		}
		navigate("/");
	}, [navigate, newSession, openClawSessions, openFolderAndNavigate, switchSession]);

	const activateCliFolder = useCallback(() => {
		openFolderAndNavigate("cli");
		const latest = cliSessions[0];
		if (latest) {
			setActiveCliSessionId(latest.sessionId);
			navigate(`/code-agent/chat?sessionId=${encodeURIComponent(latest.sessionId)}`);
			return;
		}
		navigate("/code-agent/chat");
	}, [cliSessions, navigate, openFolderAndNavigate]);

	const activateJizhiFolder = useCallback(() => {
		openFolderAndNavigate("jizhi");
		if (jizhiSessionItems[0]) {
			setJizhiActiveSessionId(jizhiSessionItems[0].id);
		}
		navigate("/jizhi-chat");
	}, [jizhiSessionItems, navigate, openFolderAndNavigate, setJizhiActiveSessionId]);

	const activateXiaojiuFolder = useCallback(() => {
		openFolderAndNavigate("xiaojiu");
		if (xiaojiuSessionItems[0]) {
			setRemoteActiveSessionId(xiaojiuSessionItems[0].id);
		}
		navigate("/xiaojiu-chat");
	}, [
		navigate,
		openFolderAndNavigate,
		setRemoteActiveSessionId,
		xiaojiuSessionItems,
	]);

	const activateVoiceFolder = useCallback(() => {
		openFolderAndNavigate("voice");
		if (voiceSessionItems[0]) {
			setVoiceActiveSessionId(voiceSessionItems[0].id);
		}
		navigate("/voice-chat");
	}, [navigate, openFolderAndNavigate, setVoiceActiveSessionId, voiceSessionItems]);

	const focusSearch = useCallback(() => {
		setSearchExpanded(true);
		window.setTimeout(() => {
			searchInputRef.current?.focus();
		}, 0);
	}, []);

	if (sidebarCollapsed) {
		return null;
	}

	return (
		<aside className={styles.aside}>
			<div className={styles.topSpacer} />
			<div className={styles.topBlock}>
				<div className={styles.actionStack}>
					<button
						type="button"
						onClick={() => {
							newSession();
							navigate("/");
							openFolderAndNavigate("chat");
						}}
						className={styles.primaryAction}
					>
						<SquarePen className={styles.primaryActionIcon} />
						<span className={styles.truncate}>{t("sidebar.newThread", { defaultValue: "新线程" })}</span>
					</button>

					{!searchExpanded && !hasSearchQuery ? (
						<button
							type="button"
							onClick={focusSearch}
							className={styles.primaryAction}
						>
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
							cx(
								styles.navAction,
								isActive ? styles.navActionActive : styles.navActionIdle,
							)
						}
					>
						<Hexagon className={styles.primaryActionIcon} />
						<span className={styles.truncate}>{t("sidebar.skills", { defaultValue: "技能" })}</span>
					</NavLink>

					<NavLink
						to="/agents"
						className={({ isActive }) =>
							cx(
								styles.navAction,
								isActive ? styles.navActionActive : styles.navActionIdle,
							)
						}
					>
						<Blocks className={styles.primaryActionIcon} />
						<span className={styles.truncate}>
							{t("sidebar.pluginsNav", { defaultValue: "Plugins" })}
						</span>
					</NavLink>

					<NavLink
						to="/cron"
						className={({ isActive }) =>
							cx(
								styles.navAction,
								isActive ? styles.navActionActive : styles.navActionIdle,
							)
						}
					>
						<Clock className={styles.primaryActionIcon} />
						<span className={styles.truncate}>
							{t("sidebar.automationNav", { defaultValue: "自动化" })}
						</span>
					</NavLink>
				</div>
			</div>

			<div className={styles.threadsArea}>
				<div className={styles.threadsMeta}>
					<span>
						{t("sidebar.sectionThreads", {
							defaultValue: i18n.language.startsWith("zh") ? "线程" : "Threads",
						})}
					</span>
					{hasSearchQuery ? (
						<button
							type="button"
							onClick={() => setSearchQuery("")}
							className={styles.clearSearchButton}
						>
							{t("actions.clear", { defaultValue: "清空" })}
						</button>
					) : (
						<span className={styles.tinyCount}>{visibleThreadCount}</span>
					)}
				</div>

				<FolderSection
					icon={<MessageSquare className={styles.primaryActionIcon} strokeWidth={2} />}
					label={t("sidebar.folder.chat", { defaultValue: "对话" })}
					count={filteredOpenClawSessions.length}
					active={activeFolder === "chat" && !hasVisibleActiveChatSession}
					expanded={isFolderExpanded("chat")}
					onActivate={activateChatFolder}
					onToggle={() => toggleFolder("chat")}
					styles={styles}
					cx={cx}
				>
					{filteredOpenClawSessions.length === 0 ? (
						<div className={styles.sessionEmpty}>
							{hasSearchQuery
								? t("sidebar.noResults", { defaultValue: "没有匹配结果" })
								: t("sidebar.noConversations", { defaultValue: "暂无会话" })}
						</div>
					) : null}
					{visibleOpenClawSessions.map((session) => {
						const isActive = pathname === "/" && currentSessionKey === session.key;
						const isRunning = isActive && chatSending;
						return (
							<div
								key={session.key}
								className={styles.chatSessionRow}
							>
								<button
									type="button"
									onClick={() => {
										switchSession(session.key);
										navigate("/");
										openFolderAndNavigate("chat");
									}}
									className={cx(
										styles.sessionButton,
										isActive ? styles.sessionButtonActive : styles.sessionButtonIdle,
									)}
								>
									<span
										aria-hidden="true"
										data-subitem-pin="true"
										className={styles.subItemPinWrap}
									>
										<Pin className={styles.subItemPinIcon} />
									</span>
									<div className={styles.sessionMainRow}>
										{isRunning ? (
											<Loader2 className={styles.loader} />
										) : null}
										<div className={styles.sessionTitle}>{session.label}</div>
										<span className={styles.sessionTime}>
											{formatRelativeTime(session.updatedAt, i18n.language)}
										</span>
									</div>
									<div className={styles.sessionSubtitle}>
										{session.agentName}
									</div>
								</button>
								<button
									aria-label="Delete session"
									onClick={(event) => {
										event.stopPropagation();
										setSessionToDelete({
											key: session.key,
											label: session.label,
										});
									}}
									type="button"
									data-session-delete="true"
									className={styles.sessionDeleteButton}
								>
									<Trash2 className={styles.sessionDeleteIcon} />
								</button>
							</div>
						);
					})}
					{canToggleChatSessions ? (
						<button
							type="button"
							onClick={() => setChatSessionsExpanded((current) => !current)}
							className={styles.sessionListToggleButton}
						>
							{chatSessionsExpanded
								? t("sidebar.collapseList", { defaultValue: "折叠显示" })
								: t("sidebar.expandList", { defaultValue: "展开显示" })}
						</button>
					) : null}
				</FolderSection>

				<FolderSection
					icon={<Terminal className={styles.primaryActionIcon} strokeWidth={2} />}
					label={t("sidebar.folder.cli", { defaultValue: "CLI" })}
					count={filteredCliSessions.length}
					active={activeFolder === "cli" && !hasVisibleActiveCliSession}
					expanded={isFolderExpanded("cli")}
					onActivate={activateCliFolder}
					onToggle={() => toggleFolder("cli")}
					styles={styles}
					cx={cx}
				>
					{!cliWorkspaceRoot ? (
						<div className={styles.cliWorkspaceCard}>
							<div className={styles.cliWorkspaceText}>
								{t("sidebar.cliWorkspaceNotConfigured", {
									defaultValue: "未配置 CLI 工作区",
								})}
							</div>
							<button
								type="button"
								onClick={() => navigate("/settings")}
								className={styles.cliWorkspaceButton}
							>
								{t("sidebar.configureWorkspace", { defaultValue: "配置工作区" })}
							</button>
						</div>
					) : null}
					{cliHasWorkspace && visibleCliLoading ? (
						<div className={styles.sessionEmpty}>
							{t("status.loading", { defaultValue: "加载中..." })}
						</div>
					) : null}
					{cliHasWorkspace && visibleCliError ? (
						<div className={styles.warningText}>
							{visibleCliError}
						</div>
					) : null}
					{cliHasWorkspace
					&& !visibleCliLoading
					&& !visibleCliError
					&& filteredCliSessions.length === 0 ? (
						<div className={styles.sessionEmpty}>
							{hasSearchQuery
								? t("sidebar.noResults", { defaultValue: "没有匹配结果" })
								: t("sidebar.noConversations", { defaultValue: "暂无会话" })}
						</div>
					) : null}
					{visibleFilteredCliSessions.map((session) => {
						const isActive =
							pathname.startsWith("/code-agent/chat")
							&& session.sessionId === effectiveActiveCliSessionId;
						return (
							<button
								key={session.sessionId}
								type="button"
								onClick={() => {
									setActiveCliSessionId(session.sessionId);
									navigate(
										`/code-agent/chat?sessionId=${encodeURIComponent(session.sessionId)}`,
									);
									openFolderAndNavigate("cli");
								}}
								className={cx(
									styles.listButton,
									isActive ? styles.listButtonActive : styles.listButtonIdle,
								)}
							>
								<span
									aria-hidden="true"
									data-subitem-pin="true"
									className={styles.subItemPinWrap}
								>
									<Pin className={styles.subItemPinIcon} />
								</span>
								<div className={styles.listButtonRow}>
									<span className={styles.listButtonLabel}>{session.title}</span>
									<span className={styles.sessionTime}>
										{formatRelativeTime(session.updatedAt, i18n.language)}
									</span>
								</div>
							</button>
						);
					})}
					{canToggleCliSessions ? (
						<button
							type="button"
							onClick={() => setCliSessionsExpanded((current) => !current)}
							className={styles.sessionListToggleButton}
						>
							{cliSessionsExpanded
								? t("sidebar.collapseList", { defaultValue: "折叠显示" })
								: t("sidebar.expandList", { defaultValue: "展开显示" })}
						</button>
					) : null}
				</FolderSection>

				{jizhiEnabled ? (
					<FolderSection
						icon={<Bot className={styles.primaryActionIcon} strokeWidth={2} />}
						label={t("sidebar.folder.jizhi", { defaultValue: "极智" })}
						count={filteredJizhiSessions.length}
						active={activeFolder === "jizhi" && !hasVisibleActiveJizhiSession}
						expanded={isFolderExpanded("jizhi")}
						onActivate={activateJizhiFolder}
						onToggle={() => toggleFolder("jizhi")}
						styles={styles}
						cx={cx}
					>
						{jizhiSyncError ? (
							<div className={styles.warningText}>
								{t("sidebar.syncFailed", { defaultValue: "同步失败" })}
							</div>
						) : null}
						{filteredJizhiSessions.length === 0 ? (
							<div className={styles.sessionEmpty}>
								{hasSearchQuery
									? t("sidebar.noResults", { defaultValue: "没有匹配结果" })
									: t("sidebar.noConversations", { defaultValue: "暂无会话" })}
							</div>
						) : null}
						{visibleFilteredJizhiSessions.map((session) => {
							const isActive =
								pathname.startsWith("/jizhi-chat")
								&& jizhiActiveSessionId === session.id;
							return (
								<button
									key={session.id}
									type="button"
									onClick={() => {
										setJizhiActiveSessionId(session.id);
										navigate("/jizhi-chat");
										openFolderAndNavigate("jizhi");
									}}
									className={cx(
										styles.listButton,
										isActive ? styles.listButtonActive : styles.listButtonIdle,
									)}
								>
									<span
										aria-hidden="true"
										data-subitem-pin="true"
										className={styles.subItemPinWrap}
									>
										<Pin className={styles.subItemPinIcon} />
									</span>
									<div className={styles.listButtonRow}>
										<span className={styles.listButtonLabel}>{session.label}</span>
										<span className={styles.sessionTime}>
											{formatRelativeTime(session.updatedAt, i18n.language)}
										</span>
									</div>
								</button>
							);
						})}
						{canToggleJizhiSessions ? (
							<button
								type="button"
								onClick={() => setJizhiSessionsExpanded((current) => !current)}
								className={styles.sessionListToggleButton}
							>
								{jizhiSessionsExpanded
									? t("sidebar.collapseList", { defaultValue: "折叠显示" })
									: t("sidebar.expandList", { defaultValue: "展开显示" })}
							</button>
						) : null}
					</FolderSection>
				) : null}

				{xiaojiuEnabled ? (
					<FolderSection
						icon={<MessageCircle className={styles.primaryActionIcon} strokeWidth={2} />}
						label={t("sidebar.folder.xiaojiu", { defaultValue: "小九" })}
						count={filteredXiaojiuSessions.length}
						active={activeFolder === "xiaojiu" && !hasVisibleActiveXiaojiuSession}
						expanded={isFolderExpanded("xiaojiu")}
						onActivate={activateXiaojiuFolder}
						onToggle={() => toggleFolder("xiaojiu")}
						styles={styles}
						cx={cx}
					>
						{remoteSyncError ? (
							<div className={styles.warningText}>
								{t("sidebar.syncFailed", { defaultValue: "同步失败" })}
							</div>
						) : null}
						{filteredXiaojiuSessions.length === 0 ? (
							<div className={styles.sessionEmpty}>
								{hasSearchQuery
									? t("sidebar.noResults", { defaultValue: "没有匹配结果" })
									: t("sidebar.noConversations", { defaultValue: "暂无会话" })}
							</div>
						) : null}
						{visibleFilteredXiaojiuSessions.map((session) => {
							const isActive =
								pathname.startsWith("/xiaojiu-chat")
								&& remoteActiveSessionId === session.id;
							return (
								<button
									key={session.id}
									type="button"
									onClick={() => {
										setRemoteActiveSessionId(session.id);
										navigate("/xiaojiu-chat");
										openFolderAndNavigate("xiaojiu");
									}}
									className={cx(
										styles.listButton,
										isActive ? styles.listButtonActive : styles.listButtonIdle,
									)}
								>
									<span
										aria-hidden="true"
										data-subitem-pin="true"
										className={styles.subItemPinWrap}
									>
										<Pin className={styles.subItemPinIcon} />
									</span>
									<div className={styles.listButtonRow}>
										<span className={styles.listButtonLabel}>{session.label}</span>
										<span className={styles.sessionTime}>
											{formatRelativeTime(session.updatedAt, i18n.language)}
										</span>
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
					label={t("sidebar.folder.voice", { defaultValue: "语音" })}
					count={filteredVoiceSessions.length}
					active={activeFolder === "voice" && !hasVisibleActiveVoiceSession}
					expanded={isFolderExpanded("voice")}
					onActivate={activateVoiceFolder}
					onToggle={() => toggleFolder("voice")}
					styles={styles}
					cx={cx}
				>
					{voiceSyncError ? (
						<div className={styles.warningText}>
							{t("sidebar.syncFailed", { defaultValue: "同步失败" })}
						</div>
					) : null}
					{filteredVoiceSessions.length === 0 ? (
						<div className={styles.sessionEmpty}>
							{hasSearchQuery
								? t("sidebar.noResults", { defaultValue: "没有匹配结果" })
								: t("sidebar.noConversations", { defaultValue: "暂无会话" })}
						</div>
					) : null}
					{visibleFilteredVoiceSessions.map((session) => {
						const isActive =
							pathname.startsWith("/voice-chat")
							&& voiceActiveSessionId === session.id;
						return (
							<button
								key={session.id}
								type="button"
								onClick={() => {
									setVoiceActiveSessionId(session.id);
									navigate("/voice-chat");
									openFolderAndNavigate("voice");
								}}
								className={cx(
									styles.listButton,
									isActive ? styles.listButtonActive : styles.listButtonIdle,
								)}
							>
								<span
									aria-hidden="true"
									data-subitem-pin="true"
									className={styles.subItemPinWrap}
								>
									<Pin className={styles.subItemPinIcon} />
								</span>
								<div className={styles.listButtonRow}>
									<span className={styles.listButtonLabel}>{session.label}</span>
									<span className={styles.sessionTime}>
										{formatRelativeTime(session.updatedAt, i18n.language)}
									</span>
								</div>
							</button>
						);
					})}
					{canToggleVoiceSessions ? (
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
				
				{/* Spacer ensures the last item clears the footer blur mask cross-browser */}
				<div style={{ height: "2.75rem", flexShrink: 0 }} />
			</div>

			<div className={styles.footer}>
				<NavLink
					to="/settings"
					className={({ isActive }) =>
						cx(
							styles.settingsLink,
							isActive && styles.settingsLinkActive,
						)
					}
				>
					<SettingsIcon className={styles.settingsIcon} strokeWidth={2} />
					<span>{t("sidebar.settings", { defaultValue: "设置" })}</span>
				</NavLink>
			</div>

			<ConfirmDialog
				open={!!sessionToDelete}
				title={t("actions.confirm")}
				message={t("sidebar.deleteSessionConfirm", {
					label: sessionToDelete?.label,
				})}
				confirmLabel={t("actions.delete")}
				cancelLabel={t("actions.cancel")}
				variant="destructive"
				onConfirm={async () => {
					if (!sessionToDelete) return;
					await deleteSession(sessionToDelete.key);
					if (currentSessionKey === sessionToDelete.key) navigate("/");
					setSessionToDelete(null);
				}}
				onCancel={() => setSessionToDelete(null)}
			/>
		</aside>
	);
}
