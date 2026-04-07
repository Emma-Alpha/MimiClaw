import { useRef, useState, useEffect, useMemo } from "react";
import { ActionIcon } from "@lobehub/ui";
import { OpenClaw, ClaudeCode } from "@lobehub/icons";
import { Expand, X, RotateCcw, Clock, Wrench, Cpu } from "lucide-react";
import type { CodeAgentStatus } from "../../../../shared/code-agent";
import type { SessionInitInfo } from "@/stores/code-agent";
import type { MiniChatTarget } from "../types";
import { useMiniChatStyles } from "../styles";
import { getCodeAgentStateLabel } from "../utils";

type ChatSessionOption = {
	key: string;
	title: string;
	updatedAt: number | null;
};

type MiniChatHeaderProps = {
	draftTarget: MiniChatTarget;
	codeSending: boolean;
	codeAgentStatus: CodeAgentStatus | null;
	sessionInit: SessionInitInfo | null;
	sessionTitle: string | null;
	lastUpdatedAt: number | null;
	chatSessions: ChatSessionOption[];
	currentSessionKey: string;
	isReady: boolean;
	isError: boolean;
	isConnecting: boolean;
	onOpenFull: () => void;
	onClose: () => void;
	codeWorkspaceRoot: string;
	onRemoveCodeMode: () => void;
	onPickWorkspace: () => void;
	onNewConversation: () => void;
	onSwitchSession: (key: string) => void;
};

function shortModel(model: string) {
	return model.replace(/^claude-/i, "").replace(/-\d{8}$/, "");
}

function formatRelativeTime(ts: number): string {
	const diff = Date.now() - ts;
	const s = Math.floor(diff / 1000);
	if (s < 60) return "刚刚";
	const m = Math.floor(s / 60);
	if (m < 60) return `${m} 分钟前`;
	const h = Math.floor(m / 60);
	if (h < 24) return `${h} 小时前`;
	return `${Math.floor(h / 24)} 天前`;
}

export function MiniChatHeader({
	draftTarget,
	codeSending,
	codeAgentStatus,
	sessionInit,
	sessionTitle,
	lastUpdatedAt,
	chatSessions,
	currentSessionKey,
	isReady,
	isError,
	isConnecting,
	onOpenFull,
	onClose,
	codeWorkspaceRoot,
	onRemoveCodeMode,
	onPickWorkspace,
	onNewConversation,
	onSwitchSession,
}: MiniChatHeaderProps) {
	const { styles, cx } = useMiniChatStyles();
	const [dropdownOpen, setDropdownOpen] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);
	const iconBtnRef = useRef<HTMLButtonElement>(null);

	const activeChatSession = useMemo(
		() => chatSessions.find((session) => session.key === currentSessionKey) ?? null,
		[chatSessions, currentSessionKey],
	);

	const showCodeStatus = codeSending || draftTarget === "code";
	const statusDotClass = showCodeStatus
		? codeSending
			? styles.statusDotWorking
			: codeAgentStatus?.state === "running"
				? styles.statusDotReady
				: codeAgentStatus?.state === "error"
					? styles.statusDotError
					: styles.statusDotPending
		: isReady
			? styles.statusDotReady
			: isError
				? styles.statusDotError
				: styles.statusDotPending;

	useEffect(() => {
		if (!dropdownOpen) return;
		const handler = (e: MouseEvent) => {
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(e.target as Node) &&
				iconBtnRef.current &&
				!iconBtnRef.current.contains(e.target as Node)
			) {
				setDropdownOpen(false);
			}
		};
		document.addEventListener("mousedown", handler);
		return () => document.removeEventListener("mousedown", handler);
	}, [dropdownOpen]);

	return (
		<div className={cx("drag-region", styles.header)}>
			<div className={styles.brand}>
				<div className={styles.brandLogo}>
					<OpenClaw.Color size={14} />
				</div>
				{draftTarget !== "code" ? (
					<div className={styles.brandText}>
						<span className={styles.brandTitle}>极智</span>
						<div className={styles.status}>
							<span className={cx(styles.statusDot, statusDotClass)} />
							<span>
								{isConnecting ? "连接中…" : isError ? "连接断开" : "快捷聊天"}
							</span>
						</div>
					</div>
				) : null}
			</div>

			<div className={styles.headerCenter}>
				{draftTarget === "code" ? (
					<div className={cx("no-drag", styles.islandContainer)}>
						<div className={styles.dynamicIslandWrapper}>
							<div className={styles.dynamicIslandGlow} />
							<div className={styles.dynamicIslandSpecular} />
							<div className={styles.dynamicIsland}>
								<button
									ref={iconBtnRef}
									type="button"
									className={styles.islandIconBtn}
									title="查看会话信息"
									onClick={() => setDropdownOpen((v) => !v)}
								>
									<ClaudeCode.Color size={14} />
								</button>

								<div className={styles.islandTextWrapper}>
									<span className={cx(styles.islandTextLabel, styles.islandTextLabelCollapsed)}>
										{sessionInit
											? shortModel(sessionInit.model)
											: activeChatSession?.title ?? getCodeAgentStateLabel(codeAgentStatus?.state)}
									</span>
									{sessionInit && (
										<span className={styles.islandMeta}>
											{sessionInit.permissionMode !== "default" && (
												<span className={styles.islandBadge}>{sessionInit.permissionMode}</span>
											)}
											<span className={styles.islandBadge}>{sessionInit.tools.length}t</span>
											{sessionInit.mcpServers.length > 0 && (
												<span className={styles.islandBadge}>{sessionInit.mcpServers.length}mcp</span>
											)}
										</span>
									)}
								</div>

								<button
									type="button"
									className={styles.islandAction}
									title="退出 CLI 模式"
									onClick={(e) => {
										e.stopPropagation();
										onRemoveCodeMode();
									}}
								>
									<X size={12} />
								</button>
							</div>
						</div>

						{dropdownOpen && (
							<div ref={dropdownRef} className={styles.islandDropdown}>
								<div className={styles.islandDropdownSection}>
									<div className={styles.islandDropdownTitle}>
										{sessionTitle ?? activeChatSession?.title ?? "当前会话"}
									</div>
									{lastUpdatedAt && (
										<div className={styles.islandDropdownMeta}>
											<Clock size={10} />
											<span>{formatRelativeTime(lastUpdatedAt)}</span>
										</div>
									)}
									{sessionInit ? (
										<div className={styles.islandDropdownInfo}>
											<div className={styles.islandDropdownInfoRow}>
												<Cpu size={10} />
												<span>{shortModel(sessionInit.model)}</span>
												{sessionInit.permissionMode !== "default" && (
													<span className={styles.islandDropdownBadge}>{sessionInit.permissionMode}</span>
												)}
											</div>
											<div className={styles.islandDropdownInfoRow}>
												<Wrench size={10} />
												<span>{sessionInit.tools.length} tools</span>
												{sessionInit.mcpServers.length > 0 && (
													<span className={styles.islandDropdownBadge}>{sessionInit.mcpServers.length} MCP</span>
												)}
											</div>
											{codeWorkspaceRoot && (
												<button
													type="button"
													className={styles.islandDropdownPath}
													title="点击更换工作区"
													onClick={(e) => {
														e.stopPropagation();
														setDropdownOpen(false);
														onPickWorkspace();
													}}
												>
													{codeWorkspaceRoot}
												</button>
											)}
										</div>
									) : (
										<div className={styles.islandDropdownEmpty}>
											{getCodeAgentStateLabel(codeAgentStatus?.state)}
										</div>
									)}
								</div>

								{chatSessions.length > 0 && (
									<>
										<div className={styles.islandDropdownDivider} />
										<div className={styles.islandDropdownSection}>
											<div className={styles.islandDropdownTitle}>切换会话</div>
											<div className={styles.islandSessionList}>
												{chatSessions.map((session) => {
													const isActive = session.key === currentSessionKey;
													return (
														<button
															key={session.key}
															type="button"
															className={cx(
																styles.islandSessionItem,
																isActive && styles.islandSessionItemActive,
															)}
															onClick={() => {
																setDropdownOpen(false);
																if (!isActive) onSwitchSession(session.key);
															}}
														>
															<span className={styles.islandSessionItemTitle}>{session.title}</span>
															<span className={styles.islandSessionItemMeta}>
																{isActive
																	? "当前会话"
																	: session.updatedAt
																		? formatRelativeTime(session.updatedAt)
																		: "历史会话"}
															</span>
														</button>
													);
												})}
											</div>
										</div>
									</>
								)}

								<div className={styles.islandDropdownDivider} />
								<button
									type="button"
									className={styles.islandDropdownNewBtn}
									onClick={() => {
										setDropdownOpen(false);
										onNewConversation();
									}}
								>
									<RotateCcw size={12} />
									<span>新对话</span>
								</button>
							</div>
						)}
					</div>
				) : null}
			</div>

			<div className={styles.headerActions}>
				<ActionIcon
					className={cx("no-drag", styles.actionIcon)}
					icon={Expand}
					onClick={onOpenFull}
					size={"small"}
					title="打开完整界面"
				/>
				<ActionIcon
					className={cx("no-drag", styles.actionIcon)}
					icon={X}
					onClick={onClose}
					size={"small"}
					title="关闭"
				/>
			</div>
		</div>
	);
}
