import { memo, useState, useEffect, useMemo } from "react";
import { ActionIcon } from "@lobehub/ui";
import { OpenClaw, ClaudeCode } from "@lobehub/icons";
import { Dropdown } from "antd";
import { SidebarToggleButton } from "@/components/layout/SidebarToggleButton";
import { useChatHeaderInsets } from "@/lib/titlebar-safe-area";
import {
	Expand,
	X,
	RotateCcw,
	Clock,
	Wrench,
	Cpu,
	ShieldAlert,
	SquareTerminal,
} from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";
import { useSettingsStore } from "@/stores/settings";
import type { CodeAgentStatus } from "../../../../../shared/code-agent";
import type {
	SessionInitInfo,
	CodeAgentContextWindowUsage,
} from "@/stores/chat";
import { SearchInput } from "@/components/common/SearchInput";
import {
	CHAT_NAV_ICON_SIZE,
	CHAT_SESSION_HEADER_ICON_SIZE,
	CHAT_SESSION_META_ICON_SIZE,
} from "@/styles/typography-tokens";
import type { CodeChatTarget } from "../types";
import { useCodeChatStyles } from "../styles";
import { useTranslation } from "react-i18next";
import {
	buildCodeChatHeaderViewModel,
	type HeaderStatusKind,
} from "./CodeChatHeader.view-model";

type ChatSessionOption = {
	key: string;
	title: string;
	updatedAt: number | null;
};

type CodeChatHeaderProps = {
	embedded?: boolean;
	draftTarget: CodeChatTarget;
	codeSending: boolean;
	isGenerating: boolean;
	codeAgentStatus: CodeAgentStatus | null;
	sessionInit: SessionInitInfo | null;
	sessionTitle: string | null;
	contextUsage: CodeAgentContextWindowUsage | null;
	chatSessions: ChatSessionOption[];
	currentSessionKey: string;
	isReady: boolean;
	isError: boolean;
	isConnecting: boolean;
	onOpenFull: () => void;
	onClose: () => void;
	onNewConversation: () => void;
	onSwitchSession: (key: string) => void;
	showWindowActions?: boolean;
	showTerminalToggle?: boolean;
	isTerminalVisible?: boolean;
	isTerminalToggleDisabled?: boolean;
	terminalShortcutLabel?: string;
	onToggleTerminal?: () => void;
};
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

function truncateHeaderText(value: string, maxLength = 20): string {
	const normalized = value.trim();
	if (!normalized) return "";
	if (normalized.length <= maxLength) return normalized;
	return `${normalized.slice(0, maxLength)}…`;
}

function CodeChatHeaderImpl({
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
	showTerminalToggle = false,
	isTerminalVisible = false,
	isTerminalToggleDisabled = false,
	terminalShortcutLabel = "",
	onToggleTerminal,
}: CodeChatHeaderProps) {
	const { t } = useTranslation("common");
	const sidebarCollapsed = useSettingsStore((state) => state.sidebarCollapsed);
	const setSidebarCollapsed = useSettingsStore((state) => state.setSidebarCollapsed);
	const headerInsets = useChatHeaderInsets(sidebarCollapsed, {
		sidebarToggleLocation: sidebarCollapsed ? "inline" : "global",
	});
	const { styles, cx } = useCodeChatStyles({
		codexHeaderInsetEnd: headerInsets.end,
		codexHeaderInsetStart: headerInsets.start,
	});
	const [dropdownOpen, setDropdownOpen] = useState(false);
	const [sessionQuery, setSessionQuery] = useState("");
	const isCodeMode = draftTarget === "code";

	const activeChatSession = useMemo(
		() => chatSessions.find((session) => session.key === currentSessionKey) ?? null,
		[chatSessions, currentSessionKey],
	);
	const viewModel = useMemo(
		() =>
			buildCodeChatHeaderViewModel({
				draftTarget,
				codeSending,
				isGenerating,
				isReady,
				isError,
				isConnecting,
				codeAgentStatus,
				sessionInit,
				sessionTitle,
				currentSessionKey,
				activeSessionTitle: activeChatSession?.title ?? null,
				contextUsage,
			}),
		[
			draftTarget,
			codeSending,
			isGenerating,
			isReady,
			isError,
			isConnecting,
			codeAgentStatus,
			sessionInit,
			sessionTitle,
			currentSessionKey,
			activeChatSession?.title,
			contextUsage,
		],
	);
	const statusDotByKind: Record<HeaderStatusKind, string> = {
		error: styles.statusDotError,
		connecting: styles.statusDotPending,
		generating: styles.statusDotWorking,
		ready: styles.statusDotReady,
	};
	const statusDotClass = statusDotByKind[viewModel.status.kind];
	const islandLabel = viewModel.islandLabel;
	const islandModelLabel = viewModel.islandModelLabel;
	const contextIndicator = viewModel.contextIndicator;
	const islandLabelDisplay = truncateHeaderText(islandLabel, 20);
	const isGeneratingNow = viewModel.status.kind === "generating";
	const runSpinner = useHeaderSpinner(isGeneratingNow);
	const normalizedSessionQuery = sessionQuery.trim().toLowerCase();
	const visibleChatSessions = useMemo(() => {
		if (!normalizedSessionQuery) return chatSessions;
		return chatSessions.filter((session) =>
			session.title.toLowerCase().includes(normalizedSessionQuery),
		);
	}, [chatSessions, normalizedSessionQuery]);
	const islandMetricValue = contextIndicator
		? formatTokenCount(contextIndicator.remainingTokens)
		: null;

	const useCodexHeader = embedded && !showWindowActions;
	const embeddedHeaderTitle = viewModel.headerTitle || "新对话";
	const embeddedHeaderTitleDisplay = truncateHeaderText(embeddedHeaderTitle, 20) || "新对话";
	const embeddedStatusLabel = viewModel.status.label;
	const sidebarToggleAriaLabel = sidebarCollapsed
		? t("sidebar.expandSidebar", { defaultValue: "展开侧边栏" })
		: t("sidebar.collapseSidebar", { defaultValue: "收起侧边栏" });
	const terminalToggleTitle = isTerminalToggleDisabled
		? "先选择工作目录"
		: terminalShortcutLabel
			? `切换终端 ${terminalShortcutLabel}`
			: "切换终端";
	const EmbeddedStatusIcon =
		viewModel.status.kind === "generating"
			? Clock
			: viewModel.status.kind === "connecting"
				? Cpu
				: viewModel.status.kind === "error"
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
				iconSize={CHAT_NAV_ICON_SIZE}
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
				<RotateCcw size={CHAT_SESSION_META_ICON_SIZE} />
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
				{draftTarget !== "code" && <div className={styles.brandLogo}>
					<OpenClaw.Color size={CHAT_SESSION_HEADER_ICON_SIZE} />
				</div>}
					{!embedded && draftTarget !== "code" ? (
						<div className={styles.brandText}>
							<span className={styles.brandTitle}>极智</span>
							<div className={styles.status}>
								<span className={cx(styles.statusDot, statusDotClass)} />
								<span>{viewModel.status.brandLabel}</span>
							</div>
						</div>
						) : null}
				</div>

			{useCodexHeader ? (
				<>
					<div className={styles.embeddedTopLeft}>
						{sidebarCollapsed ? (
							<SidebarToggleButton
								ariaLabel={sidebarToggleAriaLabel}
								onToggle={() => setSidebarCollapsed(false)}
								sidebarCollapsed={sidebarCollapsed}
							/>
						) : null}
						<div className={styles.embeddedThreadWrap}>
							<div className={styles.embeddedThreadBtn}>
								<span className={styles.embeddedThreadIcon}>
									{isCodeMode ? (
										<ClaudeCode.Color size={CHAT_SESSION_HEADER_ICON_SIZE} />
									) : (
										<OpenClaw.Color size={CHAT_SESSION_HEADER_ICON_SIZE} />
									)}
								</span>
								<span className={styles.embeddedThreadLabel} title={embeddedHeaderTitle}>
									{embeddedHeaderTitleDisplay}
								</span>
							</div>
						</div>
					</div>
					<div className={cx("no-drag", styles.embeddedTopRight)}>
						{showTerminalToggle ? (
							<Tooltip placement="bottom" title={terminalToggleTitle}>
								<span className={styles.tooltipTrigger}>
									<ActionIcon
										aria-label={terminalToggleTitle}
										aria-pressed={isTerminalToggleDisabled ? undefined : isTerminalVisible}
										className={cx(
											styles.embeddedToolbarButton,
											isTerminalVisible && styles.embeddedToolbarButtonActive,
										)}
										disabled={isTerminalToggleDisabled}
										icon={SquareTerminal}
										onClick={(event) => {
											event.stopPropagation();
											onToggleTerminal?.();
										}}
										size="small"
									/>
								</span>
							</Tooltip>
						) : null}
						{!isCodeMode ? (
							<Tooltip placement="bottom" title={embeddedStatusLabel}>
								<span
									className={cx(
										styles.embeddedHeaderStatus,
										viewModel.status.kind === "generating"
											? styles.embeddedHeaderStatusRunning
											: viewModel.status.kind === "error"
												? styles.embeddedHeaderStatusError
												: styles.embeddedHeaderStatusIdle,
									)}
									aria-label={embeddedStatusLabel}
								>
									<EmbeddedStatusIcon size={CHAT_SESSION_META_ICON_SIZE + 1} />
								</span>
							</Tooltip>
						) : null}
					</div>
				</>
			) : (
				<div className={cx(styles.headerCenter, embedded && styles.headerCenterEmbedded)}>
					<div className={styles.islandContainer}>
							<div
								className={cx(
									styles.dynamicIslandWrapper,
									isGeneratingNow && styles.dynamicIslandWrapperGenerating,
								)}
							>
								<div
									className={cx(
										styles.dynamicIslandGlow,
										isGeneratingNow && styles.dynamicIslandGlowGenerating,
									)}
								/>
								<div className={styles.dynamicIslandFrost} />
								<div className={styles.dynamicIslandSpecular} />
								<div
									className={cx(
										styles.dynamicIsland,
										isGeneratingNow && styles.dynamicIslandGenerating,
									)}
								>
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
												{isCodeMode ? (
													<ClaudeCode.Color size={CHAT_SESSION_HEADER_ICON_SIZE} />
												) : (
													<OpenClaw.Color size={CHAT_SESSION_HEADER_ICON_SIZE} />
												)}
											</button>
											</Dropdown>
										</div>
									<div className={styles.islandTextWrapper} >
										<span
											className={styles.islandTextLabel}
											title={isCodeMode && islandModelLabel
												? `${islandLabel}\n模型：${islandModelLabel}`
												: islandLabel}
										>
											{islandLabelDisplay}
										</span>
									</div>
									{isGeneratingNow ? (
										<div
											className={styles.islandGeneratingBadge}
											role="status"
											aria-live="polite"
											aria-label={viewModel.status.label}
										>
											<span className={styles.islandGeneratingSpinner} aria-hidden="true">{runSpinner}</span>
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
											className={cx("no-drag", styles.islandMetric)}
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

CodeChatHeaderImpl.displayName = "CodeChatHeader";

export const CodeChatHeader = memo(CodeChatHeaderImpl);
