import { memo, useState, useEffect, useMemo } from "react";
import { ActionIcon } from "@lobehub/ui";
import { OpenClaw, ClaudeCode } from "@lobehub/icons";
import { Dropdown, Tooltip } from "antd";
import {
	Expand,
	X,
	RotateCcw,
	Clock,
	Wrench,
	Cpu,
	ShieldAlert,
} from "lucide-react";
import { useSettingsStore } from "@/stores/settings";
import type {
	CodeAgentStatus,
	CodeAgentPermissionMode,
} from "../../../../shared/code-agent";
import type {
	SessionInitInfo,
	CodeAgentContextWindowUsage,
} from "@/stores/code-agent";
import { SearchInput } from "@/components/common/SearchInput";
import type { MiniChatTarget } from "../types";
import { useMiniChatStyles } from "../styles";

type ChatSessionOption = {
	key: string;
	title: string;
	updatedAt: number | null;
};

type MiniChatHeaderProps = {
	embedded?: boolean;
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
	showWindowActions?: boolean;
	canExitCodeMode?: boolean;
};

function shortModel(model: string) {
	return model.replace(/^claude-/i, "").replace(/-\d{8}$/, "");
}

const MAX_CODE_SESSION_TITLE_LENGTH = 40;
const HEADER_SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"] as const;

function useHeaderSpinner(active: boolean): string {
	const [frame, setFrame] = useState(0);
	useEffect(() => {
		if (!active) return;
		const timer = setInterval(() => {
			setFrame((prev) => (prev + 1) % HEADER_SPINNER_FRAMES.length);
		}, 80);
		return () => clearInterval(timer);
	}, [active]);
	return HEADER_SPINNER_FRAMES[frame] ?? HEADER_SPINNER_FRAMES[0];
}

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

function getChatThreadLabel(sessionKey: string): string {
	const normalized = sessionKey.trim();
	if (!normalized.startsWith("agent:")) return "Agent main · main";
	const segments = normalized.split(":");
	const agentId = segments[1] || "main";
	const thread = segments.slice(2).join(":") || "main";
	const compactThread = thread.length > 18 ? `${thread.slice(0, 17)}…` : thread;
	return `Agent ${agentId} · ${compactThread}`;
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
	embedded = false,
	draftTarget,
	codeSending,
	isGenerating,
	codeAgentStatus,
	sessionInit,
	sessionTitle,
	contextUsage,
	chatSessions,
	currentSessionKey,
	isReady,
	isError,
	isConnecting,
	onOpenFull,
	onClose,
	onNewConversation,
	onSwitchSession,
	showWindowActions = true,
}: MiniChatHeaderProps) {
	const sidebarCollapsed = useSettingsStore((state) => state.sidebarCollapsed);
	const { styles, cx } = useMiniChatStyles({ isCollapsed: sidebarCollapsed });
	const [dropdownOpen, setDropdownOpen] = useState(false);
	const [sessionQuery, setSessionQuery] = useState("");
	const isCodeMode = draftTarget === "code";
	const runSpinner = useHeaderSpinner(isGenerating);

	const activeChatSession = useMemo(
		() => chatSessions.find((session) => session.key === currentSessionKey) ?? null,
		[chatSessions, currentSessionKey],
	);

	const showCodeStatus = codeSending || draftTarget === "code";
	const selectedCodeSessionTitle = !isCodeMode
		? ""
		: activeChatSession?.title?.trim()
			? activeChatSession.title.trim()
			: sessionTitle?.trim()
				? getCodeSessionTitle(sessionTitle)
				: currentSessionKey?.trim()
					? getCodeSessionTitle(currentSessionKey)
					: "CLI 会话";
	const islandTitle = isCodeMode
		? sessionInit
			? shortModel(sessionInit.model)
			: selectedCodeSessionTitle
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
	const islandLabel = isCodeMode ? islandTitle : islandTitle;
	const islandMetricValue = contextIndicator
		? formatTokenCount(contextIndicator.remainingTokens)
		: null;
	const islandProgressPercent = contextIndicator?.usedPercentage ?? 0;
	const islandProgressTone = contextIndicator?.ringColor ?? "#0071e3";
	const runningThreadLabel = useMemo(() => {
		if (!isGenerating) return "";
		if (isCodeMode) {
			const codeSession = getCodeSessionTitle(sessionTitle || currentSessionKey || "");
			return `CLI · ${codeSession}`;
		}
		return getChatThreadLabel(currentSessionKey);
	}, [isGenerating, isCodeMode, sessionTitle, currentSessionKey]);

	const useCodexHeader = embedded && !showWindowActions;
	const embeddedHeaderTitle = (
		(isCodeMode ? selectedCodeSessionTitle : activeChatSession?.title) || "新线程"
	).trim();
	const embeddedStatusLabel = isGenerating
		? runningThreadLabel || "运行中"
		: isConnecting
			? "连接中…"
			: isError
				? "连接断开"
				: "就绪";
	const EmbeddedStatusIcon = isGenerating
		? Clock
		: isConnecting
			? Cpu
			: isError
				? ShieldAlert
				: Wrench;
	const sessionDropdown = (
		<div
			className={cx(styles.islandDropdown, useCodexHeader && styles.islandDropdownEmbedded)}
		>
			<SearchInput
				value={sessionQuery}
				onValueChange={setSessionQuery}
				placeholder="搜索最近任务"
				aria-label="搜索最近任务"
				iconSize={18}
				className={styles.islandSessionSearch}
				iconClassName={styles.islandSessionSearchIcon}
				inputClassName={styles.islandSessionSearchInput}
			/>

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
										<span
											className={cx(
												styles.islandSessionItemMeta,
												isActive && styles.islandSessionItemMetaActive,
											)}
										>
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
		);
	const sessionDropdownPlacement = useCodexHeader ? "bottomLeft" : "bottom";

	return (
		<div
			className={cx(
				!embedded && "drag-region",
				styles.header,
				embedded && styles.headerEmbedded,
				useCodexHeader && styles.headerEmbeddedCodex,
			)}
		>
			<div className={cx(styles.brand, embedded && styles.brandEmbedded)}>
				<div className={styles.brandLogo}>
					<OpenClaw.Color size={14} />
				</div>
				{!embedded && draftTarget !== "code" ? (
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

				{useCodexHeader ? (
					<>
						<div className={cx("no-drag", styles.embeddedTopLeft)}>
							<div className={styles.embeddedThreadWrap}>
								<div className={styles.embeddedThreadBtn}>
									<span className={styles.embeddedThreadIcon}>
										{isCodeMode ? <ClaudeCode.Color size={12} /> : <OpenClaw.Color size={12} />}
									</span>
									<span className={styles.embeddedThreadLabel}>{embeddedHeaderTitle}</span>
								</div>
							</div>
						</div>
					{!isCodeMode ? (
						<div className={cx("no-drag", styles.embeddedTopRight)}>
							<Tooltip placement="bottom" title={embeddedStatusLabel}>
								<span
									className={cx(
										styles.embeddedHeaderStatus,
										isGenerating
											? styles.embeddedHeaderStatusRunning
											: isError
												? styles.embeddedHeaderStatusError
												: styles.embeddedHeaderStatusIdle,
									)}
									aria-label={embeddedStatusLabel}
								>
									<EmbeddedStatusIcon size={13} />
								</span>
							</Tooltip>
						</div>
					) : null}
				</>
			) : (
				<div className={cx(styles.headerCenter, embedded && styles.headerCenterEmbedded)}>
					<div className={cx("no-drag", styles.islandContainer)}>
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
								{contextIndicator ? (
									<div className={styles.dynamicIslandContextMeter} aria-hidden="true">
										<div
											className={styles.dynamicIslandContextMeterFill}
											style={{
												width: `${islandProgressPercent}%`,
												background: islandProgressTone,
											}}
										/>
									</div>
									) : null}
									<div className={styles.islandLead}>
										<Dropdown
											trigger={["click"]}
											open={dropdownOpen}
											onOpenChange={(open) => setDropdownOpen(open)}
											placement={sessionDropdownPlacement}
											popupRender={() => sessionDropdown}
											arrow={false}
											styles={{ root: { paddingTop: 8 } }}
										>
											<button
												type="button"
												className={styles.islandIconBtn}
												title="查看会话信息"
												onMouseDown={(event) => {
													event.stopPropagation();
												}}
											>
												{isCodeMode ? <ClaudeCode.Color size={14} /> : <OpenClaw.Color size={14} />}
											</button>
										</Dropdown>
									</div>
								<div className={styles.islandTextWrapper}>
									<span className={styles.islandTextLabel}>{islandLabel}</span>
								</div>
								{isGenerating ? (
									<div className={styles.islandGeneratingBadge} role="status" aria-live="polite">
										<span className={styles.islandGeneratingSpinner}>{runSpinner}</span>
										<span className={styles.islandGeneratingText}>
											{runningThreadLabel || "生成中"}
										</span>
									</div>
								) : null}
								{contextIndicator ? (
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
											className={styles.islandMetric}
											aria-label={`上下文剩余 ${formatTokenCount(contextIndicator.remainingTokens)} tokens`}
										>
											<span className={styles.islandMetricValue}>{islandMetricValue}</span>
										</div>
									</Tooltip>
								) : null}
							</div>
						</div>
						</div>
					</div>
				)}

				{showWindowActions ? (
					<div className={cx("no-drag", styles.headerActions)}>
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
				) : null}
			</div>
	);
}

MiniChatHeaderImpl.displayName = "MiniChatHeader";

export const MiniChatHeader = memo(MiniChatHeaderImpl);
