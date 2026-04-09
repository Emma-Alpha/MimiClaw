import { memo, useRef, useState, useEffect, useMemo } from "react";
import { ActionIcon } from "@lobehub/ui";
import { OpenClaw, ClaudeCode } from "@lobehub/icons";
import { Progress, Tooltip } from "antd";
import {
	Expand,
	X,
	RotateCcw,
	Clock,
	Wrench,
	Cpu,
	Search,
	Check,
	ChevronDown,
	Shield,
	ShieldAlert,
} from "lucide-react";
import type {
	CodeAgentStatus,
	CodeAgentPermissionMode,
} from "../../../../shared/code-agent";
import type {
	SessionInitInfo,
	CodeAgentContextWindowUsage,
} from "@/stores/code-agent";
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
	isGenerating: boolean;
	codeAgentStatus: CodeAgentStatus | null;
	sessionInit: SessionInitInfo | null;
	sessionTitle: string | null;
	lastUpdatedAt: number | null;
	contextUsage: CodeAgentContextWindowUsage | null;
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
	permissionMode: CodeAgentPermissionMode;
	onPermissionModeChange: (mode: CodeAgentPermissionMode) => void;
	onNewConversation: () => void;
	onSwitchSession: (key: string) => void;
};

const PERMISSION_MODE_OPTIONS: Array<{
	value: CodeAgentPermissionMode;
	label: string;
}> = [
	{ value: "default", label: "默认权限" },
	{ value: "acceptEdits", label: "接受编辑" },
	{ value: "auto", label: "自动模式" },
	{ value: "plan", label: "规划模式" },
	{ value: "dontAsk", label: "免确认" },
	{ value: "bypassPermissions", label: "完全访问权限" },
];

function getPermissionModeLabel(mode: string | null | undefined): string {
	if (!mode) return "默认权限";
	return (
		PERMISSION_MODE_OPTIONS.find((option) => option.value === mode)?.label ?? mode
	);
}

function shortModel(model: string) {
	return model.replace(/^claude-/i, "").replace(/-\d{8}$/, "");
}

const MAX_CODE_SESSION_TITLE_LENGTH = 40;

function isOpaqueSessionId(value: string): boolean {
	const normalized = value.trim();
	if (!normalized) return true;
	if (/^agent:[^:]+:session-\d+(?::.*)?$/i.test(normalized)) return true;
	if (/^session[-:_][a-z0-9-]{6,}$/i.test(normalized)) return true;
	if (/^[0-9a-f]{24,}$/i.test(normalized)) return true;
	if (
		/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
			normalized,
		)
	)
		return true;
	return false;
}

function isAbsolutePathLike(value: string): boolean {
	const normalized = value.trim();
	if (!normalized) return false;
	if (/^(\/|~\/)/.test(normalized)) return true;
	if (/^[A-Za-z]:[\\/]/.test(normalized)) return true;
	if (/^\\\\/.test(normalized)) return true;
	return false;
}

function getCodeSessionTitle(value: string | null | undefined): string {
	const normalized = typeof value === "string" ? value.trim() : "";
	if (!normalized) return "CLI 会话";
	if (isOpaqueSessionId(normalized) || isAbsolutePathLike(normalized)) {
		return "CLI 会话";
	}
	if (normalized.length <= MAX_CODE_SESSION_TITLE_LENGTH) return normalized;
	return `${normalized.slice(0, MAX_CODE_SESSION_TITLE_LENGTH)}…`;
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

function formatRelativeTimeCompact(ts: number | null, isActive: boolean): string {
	if (isActive) return "当前";
	if (!ts) return "历史";

	const diff = Math.max(0, Date.now() - ts);
	const s = Math.floor(diff / 1000);
	const m = Math.floor(s / 60);
	if (m < 60) return `${Math.max(1, m)} 分`;
	const h = Math.floor(m / 60);
	if (h < 24) return `${h} 小时`;
	return `${Math.floor(h / 24)} 天`;
}

function formatTokenCount(value: number): string {
	if (!Number.isFinite(value)) return "0";
	if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
	if (value >= 1_000) return `${(value / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
	return `${Math.round(value)}`;
}

function inferContextWindowSize(model: string | null | undefined): number {
	if (model && /\[1m\]/i.test(model)) return 1_000_000;
	return 200_000;
}

function MiniChatHeaderImpl({
	draftTarget,
	codeSending,
	isGenerating,
	codeAgentStatus,
	sessionInit,
	sessionTitle,
	lastUpdatedAt,
	contextUsage,
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
	permissionMode,
	onPermissionModeChange,
	onNewConversation,
	onSwitchSession,
}: MiniChatHeaderProps) {
	const { styles, cx } = useMiniChatStyles();
	const [dropdownOpen, setDropdownOpen] = useState(false);
	const [permissionDropdownOpen, setPermissionDropdownOpen] = useState(false);
	const [sessionQuery, setSessionQuery] = useState("");
	const dropdownRef = useRef<HTMLDivElement>(null);
	const iconBtnRef = useRef<HTMLButtonElement>(null);
	const isCodeMode = draftTarget === "code";

	const activeChatSession = useMemo(
		() => chatSessions.find((session) => session.key === currentSessionKey) ?? null,
		[chatSessions, currentSessionKey],
	);

	const showCodeStatus = codeSending || draftTarget === "code";
	const islandTitle = isCodeMode
		? sessionInit
			? shortModel(sessionInit.model)
			: getCodeAgentStateLabel(codeAgentStatus?.state)
		: activeChatSession?.title ?? "当前会话";
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
	const normalizedSessionQuery = sessionQuery.trim().toLowerCase();
	const visibleChatSessions = useMemo(() => {
		if (!normalizedSessionQuery) return chatSessions;
		return chatSessions.filter((session) =>
			session.title.toLowerCase().includes(normalizedSessionQuery),
		);
	}, [chatSessions, normalizedSessionQuery]);
	const contextIndicator = useMemo(() => {
		if (!isCodeMode) return null;

		const fallbackContextWindow = sessionInit?.model
			? inferContextWindowSize(sessionInit.model)
			: null;
		const rawContextWindow = contextUsage?.contextWindowSize ?? fallbackContextWindow;
		if (!rawContextWindow || !Number.isFinite(rawContextWindow)) return null;
		const contextWindowSize = Math.max(1, Math.round(rawContextWindow));

		const usedTokens = Math.max(
			0,
			Math.min(contextWindowSize, Math.round(contextUsage?.usedTokens ?? 0)),
		);
		const remainingTokens = Math.max(0, contextWindowSize - usedTokens);
		const usedPercentage = Math.max(
			0,
			Math.min(
				100,
				Math.round(
					contextUsage?.usedPercentage ?? (usedTokens / contextWindowSize) * 100,
				),
			),
		);
		const remainingPercentage = Math.max(
			0,
			Math.min(100, Math.round(contextUsage?.remainingPercentage ?? 100 - usedPercentage)),
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
			windowSource: contextUsage?.windowSource ?? "estimated",
		};
	}, [contextUsage, isCodeMode, sessionInit]);

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
				setPermissionDropdownOpen(false);
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
								{isConnecting
									? "连接中…"
									: isGenerating
										? "生成中…"
										: isError
											? "连接断开"
											: "快捷聊天"}
							</span>
						</div>
					</div>
				) : null}
			</div>

			<div className={styles.headerCenter}>
				<div className={cx("no-drag", styles.islandContainer)}>
					{contextIndicator ? (
						<div className={styles.islandContextBadgeWrap}>
							<Tooltip
								placement="top"
								mouseEnterDelay={0.12}
								title={
									<div className={styles.islandContextTooltip}>
										<div className={styles.islandContextTooltipTitle}>CLI 上下文</div>
										<div className={styles.islandContextTooltipRow}>
											<span>窗口大小</span>
											<strong>{formatTokenCount(contextIndicator.contextWindowSize)} tokens</strong>
										</div>
										<div className={styles.islandContextTooltipRow}>
											<span>当前占用</span>
											<strong>
												{formatTokenCount(contextIndicator.usedTokens)} tokens (
												{contextIndicator.usedPercentage}%)
											</strong>
										</div>
										<div className={styles.islandContextTooltipRow}>
											<span>剩余可用</span>
											<strong>
												{formatTokenCount(contextIndicator.remainingTokens)} tokens (
												{contextIndicator.remainingPercentage}%)
											</strong>
										</div>
										{contextIndicator.windowSource === "estimated" ? (
											<div className={styles.islandContextTooltipHint}>
												窗口大小为本地估算值（默认 200k 或 [1m] 模型）。
											</div>
										) : null}
									</div>
								}
							>
								<div
									className={styles.islandContextBadge}
									aria-label={`上下文剩余 ${formatTokenCount(contextIndicator.remainingTokens)} tokens`}
								>
									<Progress
										type="circle"
										size={24}
										percent={contextIndicator.usedPercentage}
										strokeColor={contextIndicator.ringColor}
										strokeWidth={14}
										trailColor="rgba(148, 163, 184, 0.24)"
										showInfo={false}
									/>
									<span className={styles.islandContextBadgeText}>
										余 {formatTokenCount(contextIndicator.remainingTokens)}
									</span>
								</div>
							</Tooltip>
						</div>
					) : null}
						<div
							className={cx(
								styles.dynamicIslandWrapper,
								isGenerating && styles.dynamicIslandWrapperGenerating,
							)}
						>
							<div
								className={cx(
									styles.dynamicIslandGlow,
									isGenerating && styles.dynamicIslandGlowGenerating,
								)}
							/>
							<div className={styles.dynamicIslandFrost} />
							<div className={styles.dynamicIslandSpecular} />
						<div
							className={cx(
								styles.dynamicIsland,
								isGenerating && styles.dynamicIslandGenerating,
							)}
						>
							<button
								ref={iconBtnRef}
								type="button"
								className={styles.islandIconBtn}
								title="查看会话信息"
								onClick={() => {
									setPermissionDropdownOpen(false);
									setDropdownOpen((v) => !v);
								}}
							>
								{isCodeMode ? <ClaudeCode.Color size={14} /> : <OpenClaw.Color size={14} />}
							</button>

							<div className={styles.islandTextWrapper}>
								<span
									className={cx(
										styles.islandTextLabel,
										styles.islandTextLabelCollapsed,
									)}
								>
									{islandTitle}
								</span>
							</div>
							{isGenerating ? (
								<span
									className={styles.islandGeneratingBadge}
									role="status"
									aria-label="生成中"
								>
									<span className={styles.islandGeneratingWave}>
										<span className={styles.islandGeneratingDot} />
										<span className={styles.islandGeneratingDot} />
										<span className={styles.islandGeneratingDot} />
									</span>
								</span>
							) : null}

							{isCodeMode ? (
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
							) : null}
						</div>
					</div>

					{dropdownOpen && (
						<div ref={dropdownRef} className={styles.islandDropdown}>
							<div className={styles.islandSessionSearch}>
								<Search className={styles.islandSessionSearchIcon} size={18} />
								<input
									type="text"
									value={sessionQuery}
									onChange={(event) => setSessionQuery(event.target.value)}
									placeholder="搜索最近任务"
									aria-label="搜索最近任务"
									className={styles.islandSessionSearchInput}
								/>
							</div>

							<div className={styles.islandDropdownDivider} />
							<div className={styles.islandSessionList}>
								{visibleChatSessions.length > 0 ? (
									visibleChatSessions.map((session) => {
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
												<span className={styles.islandSessionItemSide}>
													<span className={styles.islandSessionItemMeta}>
														{formatRelativeTimeCompact(session.updatedAt, isActive)}
													</span>
													<span
														className={cx(
															styles.islandSessionItemIndicator,
															isActive && styles.islandSessionItemIndicatorActive,
														)}
													/>
												</span>
											</button>
										);
									})
								) : (
									<div className={styles.islandSessionEmpty}>
										{chatSessions.length === 0 ? "暂无会话" : "未找到匹配会话"}
									</div>
								)}
							</div>

							{isCodeMode && (
								<>
								<div className={styles.islandDropdownDivider} />
								<div className={styles.islandDropdownSection}>
									<div className={styles.islandDropdownTitle}>
										{getCodeSessionTitle(sessionTitle)}
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
											{sessionInit.permissionMode && (
												<span className={styles.islandDropdownBadge}>
													会话: {getPermissionModeLabel(sessionInit.permissionMode)}
												</span>
											)}
										</div>
										<div className={styles.islandDropdownInfoRow}>
											<Wrench size={10} />
											<span>{sessionInit.tools.length} tools</span>
											{sessionInit.mcpServers.length > 0 && (
												<span className={styles.islandDropdownBadge}>
													{sessionInit.mcpServers.length} MCP
												</span>
											)}
										</div>
									</div>
								) : (
									<div className={styles.islandDropdownEmpty}>
										{getCodeAgentStateLabel(codeAgentStatus?.state)}
									</div>
								)}
								<div className={styles.islandPermissionSelector}>
									<button
										type="button"
										className={styles.islandPermissionSelectorTrigger}
										onClick={(event) => {
											event.stopPropagation();
											setPermissionDropdownOpen((open) => !open);
										}}
									>
										<span className={styles.islandPermissionSelectorTriggerLeft}>
											{permissionMode === "bypassPermissions" ? (
												<ShieldAlert
													size={15}
													className={styles.islandPermissionSelectorIcon}
												/>
											) : (
												<Shield
													size={15}
													className={styles.islandPermissionSelectorIcon}
												/>
											)}
											<span className={styles.islandPermissionSelectorTriggerLabel}>
												{getPermissionModeLabel(permissionMode)}
											</span>
										</span>
										<ChevronDown
											size={14}
											className={cx(
												styles.islandPermissionSelectorChevron,
												permissionDropdownOpen &&
													styles.islandPermissionSelectorChevronOpen,
											)}
										/>
									</button>
									{permissionDropdownOpen && (
										<div className={styles.islandPermissionSelectorMenu}>
											{PERMISSION_MODE_OPTIONS.map((option) => {
												const active = option.value === permissionMode;
												const OptionIcon =
													option.value === "bypassPermissions" ? ShieldAlert : Shield;
												return (
													<button
														key={option.value}
														type="button"
														className={cx(
															styles.islandPermissionSelectorOption,
															active && styles.islandPermissionSelectorOptionActive,
														)}
														onClick={(event) => {
															event.stopPropagation();
															onPermissionModeChange(option.value);
															setPermissionDropdownOpen(false);
														}}
													>
														<span className={styles.islandPermissionSelectorOptionLeft}>
															<OptionIcon
																size={15}
																className={styles.islandPermissionSelectorIcon}
															/>
															<span className={styles.islandPermissionSelectorOptionLabel}>
																{option.label}
															</span>
														</span>
														<span
															className={cx(
																styles.islandPermissionSelectorCheck,
																active && styles.islandPermissionSelectorCheckActive,
															)}
														>
															{active ? <Check size={14} strokeWidth={2.4} /> : null}
														</span>
													</button>
												);
											})}
										</div>
									)}
								</div>
								{sessionInit?.permissionMode &&
									sessionInit.permissionMode !== permissionMode && (
										<div className={styles.islandPermissionSelectorHint}>
											当前会话仍为 {getPermissionModeLabel(sessionInit.permissionMode)}，
											新模式将在下次发起时生效。
										</div>
									)}
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

MiniChatHeaderImpl.displayName = "MiniChatHeader";

export const MiniChatHeader = memo(MiniChatHeaderImpl);
