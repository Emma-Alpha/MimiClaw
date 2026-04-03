import { useState } from "react";
import { ActionIcon } from "@lobehub/ui";
import { OpenClaw, ClaudeCode } from "@lobehub/icons";
import { Expand, X, FolderOpen } from "lucide-react";
import type { CodeAgentStatus } from "../../../../shared/code-agent";
import type { MiniChatTarget } from "../types";
import { useMiniChatStyles } from "../styles";

type MiniChatHeaderProps = {
	draftTarget: MiniChatTarget;
	codeSending: boolean;
	codeAgentStatus: CodeAgentStatus | null;
	isReady: boolean;
	isError: boolean;
	isConnecting: boolean;
	onOpenFull: () => void;
	onClose: () => void;
	codeWorkspaceRoot: string;
	onRemoveCodeMode: () => void;
	onPickWorkspace: () => void;
};

export function MiniChatHeader({
	draftTarget,
	codeSending,
	codeAgentStatus,
	isReady,
	isError,
	isConnecting,
	onOpenFull,
	onClose,
	codeWorkspaceRoot,
	onRemoveCodeMode,
	onPickWorkspace,
}: MiniChatHeaderProps) {
	const { styles, cx } = useMiniChatStyles();
	const [islandExpanded, setIslandExpanded] = useState(false);
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
									: isError
										? "连接断开"
										: "快捷聊天"}
							</span>
						</div>
					</div>
				) : null}
			</div>

			<div className={styles.headerCenter}>
				{draftTarget === "code" ? (
					<div 
						className={cx("no-drag", styles.dynamicIslandWrapper, islandExpanded && styles.dynamicIslandWrapperExpanded)} 
						onClick={() => setIslandExpanded(!islandExpanded)}
					>
						<div className={styles.dynamicIslandGlow} />
						<div className={styles.dynamicIslandSpecular} />
						<div className={cx(styles.dynamicIsland, islandExpanded && styles.dynamicIslandExpanded)}>
							<div className={styles.islandIcon}>
								<ClaudeCode.Color size={14} />
							</div>

							<div className={styles.islandTextWrapper}>
								<span 
									className={cx(
										styles.islandTextLabel, 
										islandExpanded ? styles.islandTextLabelExpanded : styles.islandTextLabelCollapsed
									)}
								>
									CLI 模式
								</span>
								<span 
									className={cx(
										styles.islandPath,
										islandExpanded ? styles.islandPathExpanded : styles.islandPathCollapsed
									)} 
									title={islandExpanded ? "点击更换工作区" : undefined}
									onClick={(e) => {
										if (islandExpanded) {
											e.stopPropagation();
											onPickWorkspace();
										}
									}}
								>
									{codeWorkspaceRoot || '选择工作区'}
								</span>
							</div>

							<div 
								className={cx(styles.islandAction, islandExpanded && styles.islandActionActive)}
								title={islandExpanded ? "更换工作区" : "展开详情"}
							>
								<FolderOpen size={12} strokeWidth={islandExpanded ? 2.5 : 2} />
							</div>

							{!islandExpanded && (
								<div
									className={styles.islandAction}
									title="退出 CLI 模式"
									onClick={(e) => {
										e.stopPropagation();
										onRemoveCodeMode();
									}}
								>
									<X size={12} />
								</div>
							)}
						</div>
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
