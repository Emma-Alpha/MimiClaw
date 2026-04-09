/**
 * Sidebar Component
 * Codex-style conversation workspace grouped by fixed scenario folders.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
	Bot,
	ChevronDown,
	MessageCircle,
	MessageSquare,
	Mic,
	PanelLeftClose,
	Plus,
	Settings as SettingsIcon,
	Terminal,
	Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
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
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useTranslation } from "react-i18next";
import logoPng from "@/assets/logo.png";

type FolderKey = "chat" | "cli" | "jizhi" | "xiaojiu" | "voice";

type OpenClawSessionItem = {
	key: string;
	label: string;
	agentName: string;
};

type CliSessionItem = {
	sessionId: string;
	title: string;
};

type NamedSessionItem = {
	id: string;
	label: string;
};

function getAgentIdFromSessionKey(sessionKey: string): string {
	if (!sessionKey.startsWith("agent:")) return "main";
	const [, agentId] = sessionKey.split(":");
	return agentId || "main";
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
}: {
	icon: React.ReactNode;
	label: string;
	count?: number;
	active: boolean;
	expanded: boolean;
	onActivate: () => void;
	onToggle: () => void;
	children?: React.ReactNode;
}) {
	return (
		<div className="rounded-xl">
			<div className="group/folder relative flex items-center">
				<button
					type="button"
					onClick={onActivate}
					className={cn(
						"flex min-w-0 flex-1 items-center rounded-lg py-2 pl-9 pr-2.5 text-left transition-colors",
						active
							? "bg-black/[0.07] text-foreground dark:bg-white/[0.14]"
							: "hover:bg-black/[0.05] text-foreground/80 dark:hover:bg-white/[0.08]",
					)}
				>
					<span className="truncate text-[14px] font-medium">{label}</span>
					{typeof count === "number" ? (
						<span className="ml-auto shrink-0 rounded-full bg-black/[0.06] px-1.5 py-0.5 text-[11px] font-medium text-foreground/55 dark:bg-white/[0.1]">
							{count}
						</span>
					) : null}
				</button>
				<button
					type="button"
					onClick={(event) => {
						event.stopPropagation();
						onToggle();
					}}
					aria-label={expanded ? "Collapse folder" : "Expand folder"}
					className={cn(
						"absolute left-2 top-1/2 z-[2] flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded text-muted-foreground/85 transition-colors",
						"hover:bg-black/[0.06] dark:hover:bg-white/[0.1]",
					)}
				>
					<span className="relative flex h-4 w-4 items-center justify-center">
						<span className="transition-opacity duration-150 group-hover/folder:opacity-0">
							{icon}
						</span>
						<ChevronDown
							className={cn(
								"absolute h-3.5 w-3.5 opacity-0 transition-all duration-150 group-hover/folder:opacity-100",
								expanded ? "rotate-0" : "-rotate-90",
							)}
						/>
					</span>
				</button>
			</div>
			{expanded ? <div className="ml-7 mt-1 space-y-0.5">{children}</div> : null}
		</div>
	);
}

export function Sidebar() {
	const sidebarCollapsed = useSettingsStore((state) => state.sidebarCollapsed);
	const setSidebarCollapsed = useSettingsStore(
		(state) => state.setSidebarCollapsed,
	);
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
	const { t } = useTranslation(["common"]);

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
				return {
					key: session.key,
					label: getSessionLabel(session.key, session.displayName, session.label),
					agentName: agentNameById[agentId] || agentId,
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
			}));
	}, [jizhiEnabled, jizhiSessions]);

	const voiceSessionItems = useMemo<NamedSessionItem[]>(() => {
		return [...voiceSessions]
			.sort((left, right) => right.lastActivityAt - left.lastActivityAt)
			.map((session) => ({
				id: session.id,
				label: session.title,
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
	const visibleCliSessions = cliHasWorkspace ? cliSessions : [];
	const visibleCliLoading = cliHasWorkspace ? cliLoading : false;
	const visibleCliError = cliHasWorkspace ? cliError : null;

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

	if (sidebarCollapsed) {
		return null;
	}

	return (
		<aside className="flex w-[268px] shrink-0 flex-col border-r border-black/[0.05] bg-[#F4F6FA] pt-6 dark:border-white/[0.08] dark:bg-[#1D1F24]">
			<div className="flex items-center justify-between px-3">
				<div className="flex min-w-0 items-center gap-2 px-1">
					<img
						src={logoPng}
						alt="极智"
						className="h-7 w-7 shrink-0 rounded-xl object-cover"
					/>
					<span className="truncate text-[14px] font-semibold text-foreground/90">
						极智
					</span>
				</div>
				<Button
					variant="ghost"
					size="icon"
					className="no-drag h-8 w-8 shrink-0 text-muted-foreground hover:bg-black/5 dark:hover:bg-white/10"
					onClick={() => setSidebarCollapsed(true)}
				>
					<PanelLeftClose className="h-[18px] w-[18px]" />
				</Button>
			</div>

			<div className="px-2 pt-2">
				<button
					type="button"
					onClick={() => {
						newSession();
						navigate("/");
						openFolderAndNavigate("chat");
					}}
					className={cn(
						"flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[14px] font-medium transition-colors",
						"bg-black/5 text-foreground hover:bg-black/[0.08] dark:bg-white/[0.08] dark:hover:bg-white/[0.12]",
					)}
				>
					<Plus className="h-[17px] w-[17px] shrink-0 text-foreground/80" />
					<span className="truncate">{t("sidebar.newThread", { defaultValue: "新线程" })}</span>
				</button>
			</div>

			<div className="mt-3 min-h-0 flex-1 space-y-1 overflow-y-auto px-2 pb-3">
				<FolderSection
					icon={<MessageSquare className="h-[17px] w-[17px]" strokeWidth={2} />}
					label={t("sidebar.folder.chat", { defaultValue: "对话" })}
					count={openClawSessions.length}
					active={activeFolder === "chat"}
					expanded={isFolderExpanded("chat")}
					onActivate={activateChatFolder}
					onToggle={() => toggleFolder("chat")}
				>
					{openClawSessions.length === 0 ? (
						<div className="rounded-lg px-2 py-1.5 text-[12px] text-muted-foreground/70">
							{t("sidebar.noConversations", { defaultValue: "暂无会话" })}
						</div>
					) : null}
					{openClawSessions.map((session) => {
						const isActive =
							pathname === "/" && currentSessionKey === session.key;
						return (
							<div
								key={session.key}
								className="group relative flex items-center"
							>
								<button
									type="button"
									onClick={() => {
										switchSession(session.key);
										navigate("/");
										openFolderAndNavigate("chat");
									}}
									className={cn(
										"w-full rounded-lg px-2 py-1.5 pr-7 text-left transition-colors",
										isActive
											? "bg-black/[0.07] text-foreground dark:bg-white/[0.14]"
											: "text-foreground/75 hover:bg-black/[0.05] dark:hover:bg-white/[0.08]",
									)}
								>
									<div className="truncate text-[12.5px]">{session.label}</div>
									<div className="truncate text-[10px] text-muted-foreground/70">
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
									className={cn(
										"absolute right-1 flex items-center justify-center rounded p-0.5 transition-opacity",
										"opacity-0 group-hover:opacity-100",
										"text-muted-foreground hover:text-destructive hover:bg-destructive/10",
									)}
								>
									<Trash2 className="h-3.5 w-3.5" />
								</button>
							</div>
						);
					})}
				</FolderSection>

				<FolderSection
					icon={<Terminal className="h-[17px] w-[17px]" strokeWidth={2} />}
					label={t("sidebar.folder.cli", { defaultValue: "CLI" })}
					count={visibleCliSessions.length}
					active={activeFolder === "cli"}
					expanded={isFolderExpanded("cli")}
					onActivate={activateCliFolder}
					onToggle={() => toggleFolder("cli")}
				>
					{!cliWorkspaceRoot ? (
						<div className="space-y-1.5 rounded-lg bg-black/[0.04] p-2 dark:bg-white/[0.06]">
							<div className="text-[12px] leading-4 text-muted-foreground/80">
								{t("sidebar.cliWorkspaceNotConfigured", {
									defaultValue: "未配置 CLI 工作区",
								})}
							</div>
							<button
								type="button"
								onClick={() => navigate("/settings")}
								className="rounded-md bg-black/[0.08] px-2 py-1 text-[11px] font-medium text-foreground/90 transition-colors hover:bg-black/[0.12] dark:bg-white/[0.12] dark:hover:bg-white/[0.16]"
							>
								{t("sidebar.configureWorkspace", { defaultValue: "配置工作区" })}
							</button>
						</div>
					) : null}
					{cliHasWorkspace && visibleCliLoading ? (
						<div className="rounded-lg px-2 py-1.5 text-[12px] text-muted-foreground/70">
							{t("status.loading", { defaultValue: "加载中..." })}
						</div>
					) : null}
					{cliHasWorkspace && visibleCliError ? (
						<div className="rounded-lg px-2 py-1.5 text-[11px] text-amber-700 dark:text-amber-300">
							{visibleCliError}
						</div>
					) : null}
					{cliHasWorkspace
					&& !visibleCliLoading
					&& !visibleCliError
					&& visibleCliSessions.length === 0 ? (
						<div className="rounded-lg px-2 py-1.5 text-[12px] text-muted-foreground/70">
							{t("sidebar.noConversations", { defaultValue: "暂无会话" })}
						</div>
					) : null}
						{visibleCliSessions.map((session) => {
							const effectiveActiveCliSessionId =
								requestedCliSessionId
								?? activeCliSessionId
								?? visibleCliSessions[0]?.sessionId
								?? null;
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
								className={cn(
									"w-full rounded-lg px-2 py-1.5 text-left text-[12.5px] transition-colors",
									isActive
										? "bg-black/[0.07] text-foreground dark:bg-white/[0.14]"
										: "text-foreground/75 hover:bg-black/[0.05] dark:hover:bg-white/[0.08]",
								)}
							>
								<span className="block truncate">{session.title}</span>
							</button>
						);
					})}
				</FolderSection>

				{jizhiEnabled ? (
					<FolderSection
						icon={<Bot className="h-[17px] w-[17px]" strokeWidth={2} />}
						label={t("sidebar.folder.jizhi", { defaultValue: "极智" })}
						count={jizhiSessionItems.length}
						active={activeFolder === "jizhi"}
						expanded={isFolderExpanded("jizhi")}
						onActivate={activateJizhiFolder}
						onToggle={() => toggleFolder("jizhi")}
					>
						{jizhiSyncError ? (
							<div className="rounded-lg px-2 py-1.5 text-[11px] text-amber-700 dark:text-amber-300">
								{t("sidebar.syncFailed", { defaultValue: "同步失败" })}
							</div>
						) : null}
						{jizhiSessionItems.length === 0 ? (
							<div className="rounded-lg px-2 py-1.5 text-[12px] text-muted-foreground/70">
								{t("sidebar.noConversations", { defaultValue: "暂无会话" })}
							</div>
						) : null}
						{jizhiSessionItems.map((session) => {
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
									className={cn(
										"w-full rounded-lg px-2 py-1.5 text-left text-[12.5px] transition-colors",
										isActive
											? "bg-black/[0.07] text-foreground dark:bg-white/[0.14]"
											: "text-foreground/75 hover:bg-black/[0.05] dark:hover:bg-white/[0.08]",
									)}
								>
									<span className="block truncate">{session.label}</span>
								</button>
							);
						})}
					</FolderSection>
				) : null}

				{xiaojiuEnabled ? (
					<FolderSection
						icon={<MessageCircle className="h-[17px] w-[17px]" strokeWidth={2} />}
						label={t("sidebar.folder.xiaojiu", { defaultValue: "小九" })}
						count={xiaojiuSessionItems.length}
						active={activeFolder === "xiaojiu"}
						expanded={isFolderExpanded("xiaojiu")}
						onActivate={activateXiaojiuFolder}
						onToggle={() => toggleFolder("xiaojiu")}
					>
						{remoteSyncError ? (
							<div className="rounded-lg px-2 py-1.5 text-[11px] text-amber-700 dark:text-amber-300">
								{t("sidebar.syncFailed", { defaultValue: "同步失败" })}
							</div>
						) : null}
						{xiaojiuSessionItems.length === 0 ? (
							<div className="rounded-lg px-2 py-1.5 text-[12px] text-muted-foreground/70">
								{t("sidebar.noConversations", { defaultValue: "暂无会话" })}
							</div>
						) : null}
						{xiaojiuSessionItems.map((session) => {
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
									className={cn(
										"w-full rounded-lg px-2 py-1.5 text-left text-[12.5px] transition-colors",
										isActive
											? "bg-black/[0.07] text-foreground dark:bg-white/[0.14]"
											: "text-foreground/75 hover:bg-black/[0.05] dark:hover:bg-white/[0.08]",
									)}
								>
									<span className="block truncate">{session.label}</span>
								</button>
							);
						})}
					</FolderSection>
				) : null}

				<FolderSection
					icon={<Mic className="h-[17px] w-[17px]" strokeWidth={2} />}
					label={t("sidebar.folder.voice", { defaultValue: "语音" })}
					count={voiceSessionItems.length}
					active={activeFolder === "voice"}
					expanded={isFolderExpanded("voice")}
					onActivate={activateVoiceFolder}
					onToggle={() => toggleFolder("voice")}
				>
					{voiceSyncError ? (
						<div className="rounded-lg px-2 py-1.5 text-[11px] text-amber-700 dark:text-amber-300">
							{t("sidebar.syncFailed", { defaultValue: "同步失败" })}
						</div>
					) : null}
					{voiceSessionItems.length === 0 ? (
						<div className="rounded-lg px-2 py-1.5 text-[12px] text-muted-foreground/70">
							{t("sidebar.noConversations", { defaultValue: "暂无会话" })}
						</div>
					) : null}
					{voiceSessionItems.map((session) => {
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
								className={cn(
									"w-full rounded-lg px-2 py-1.5 text-left text-[12.5px] transition-colors",
									isActive
										? "bg-black/[0.07] text-foreground dark:bg-white/[0.14]"
										: "text-foreground/75 hover:bg-black/[0.05] dark:hover:bg-white/[0.08]",
								)}
							>
								<span className="block truncate">{session.label}</span>
							</button>
						);
					})}
				</FolderSection>
			</div>

			<div className="mt-auto border-t border-black/[0.05] p-2 dark:border-white/[0.08]">
				<NavLink
					to="/settings"
					className={({ isActive }) =>
						cn(
							"flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[14px] font-medium transition-colors",
							"hover:bg-black/5 dark:hover:bg-white/5 text-foreground/80",
							isActive && "bg-black/5 dark:bg-white/10 text-foreground",
						)
					}
				>
					{({ isActive }) => (
						<>
							<div
								className={cn(
									"flex shrink-0 items-center justify-center",
									isActive ? "text-foreground" : "text-muted-foreground",
								)}
							>
								<SettingsIcon className="h-[18px] w-[18px]" strokeWidth={2} />
							</div>
							<span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
								{t("sidebar.settings")}
							</span>
						</>
					)}
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
