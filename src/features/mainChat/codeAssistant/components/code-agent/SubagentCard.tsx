import { createStyles } from "antd-style";
import { Flexbox } from "@lobehub/ui";
import {
	ChevronRight,
	Bot,
	CheckCircle2,
	XCircle,
	StopCircle,
	Terminal,
} from "lucide-react";
import { memo, useState, useMemo } from "react";
import type { ActiveTask, SubagentStatus } from "@/stores/chat";

// ─── Styles (Cursor-inspired) ────────────────────────────────────────────────

const useStyles = createStyles(({ css, token }) => ({
	card: css`
		border: 1px solid ${token.colorBorderSecondary};
		border-radius: 8px;
		background: transparent;
		box-sizing: border-box;
		overflow: hidden;
		transition: border-color 0.15s ease;

		&:hover {
			border-color: ${token.colorBorder};
		}
	`,
	cardCompleted: css`
		opacity: 0.8;
	`,
	cardFailed: css`
		border-color: ${token.colorErrorBorder};
	`,

	// ── Header row ──
	header: css`
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 10px;
		cursor: pointer;
		user-select: none;
		min-height: 36px;
		transition: background 0.12s ease;

		&:hover {
			background: ${token.colorFillQuaternary};
		}
	`,

	// ── Status indicator dot ──
	statusDot: css`
		width: 7px;
		height: 7px;
		border-radius: 50%;
		flex-shrink: 0;
	`,
	dotRunning: css`
		background: ${token.colorPrimary};
		animation: subagentPulse 1.6s ease-in-out infinite;
		@keyframes subagentPulse {
			0%, 100% { opacity: 0.5; transform: scale(0.9); }
			50% { opacity: 1; transform: scale(1.1); }
		}
	`,
	dotCompleted: css`
		background: ${token.colorSuccess};
	`,
	dotFailed: css`
		background: ${token.colorError};
	`,
	dotStopped: css`
		background: ${token.colorTextQuaternary};
	`,

	// ── Title ──
	title: css`
		flex: 1;
		min-width: 0;
		font-size: 13px;
		font-weight: 400;
		line-height: 1.4;
		color: ${token.colorTextSecondary};
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		transition: color 0.12s ease;
	`,
	titleRunning: css`
		color: ${token.colorText};
	`,

	// ── Status badge ──
	statusBadge: css`
		font-size: 11px;
		line-height: 1;
		color: ${token.colorTextTertiary};
		white-space: nowrap;
		flex-shrink: 0;
	`,
	statusIcon: css`
		width: 13px;
		height: 13px;
		flex-shrink: 0;
	`,

	// ── Duration ──
	duration: css`
		font-size: 11px;
		color: ${token.colorTextQuaternary};
		white-space: nowrap;
		flex-shrink: 0;
	`,

	// ── Open hint (appears on hover like Cursor) ──
	openHint: css`
		font-size: 11px;
		font-weight: 400;
		color: ${token.colorTextQuaternary};
		opacity: 0;
		pointer-events: none;
		transition: opacity 0.12s ease, color 0.12s ease;
		white-space: nowrap;
		flex-shrink: 0;
	`,
	openHintVisible: css`
		opacity: 1;
		pointer-events: auto;
	`,

	// ── Chevron ──
	chevron: css`
		width: 12px;
		height: 12px;
		flex-shrink: 0;
		color: ${token.colorTextQuaternary};
		transition: transform 0.18s ease;
	`,
	chevronExpanded: css`
		transform: rotate(90deg);
	`,

	// ── Expandable detail section ──
	detailsGrid: css`
		display: grid;
		grid-template-rows: 0fr;
		opacity: 0;
		transition:
			grid-template-rows 0.2s ease,
			opacity 0.16s ease;
	`,
	detailsGridExpanded: css`
		grid-template-rows: 1fr;
		opacity: 1;
	`,
	detailsOverflow: css`
		overflow: hidden;
	`,
	detailsContent: css`
		padding: 0 10px 10px;
		display: flex;
		flex-direction: column;
		gap: 8px;
	`,

	// ── Progress entries ──
	progressList: css`
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding-left: 15px;
		border-left: 2px solid ${token.colorBorderSecondary};
	`,
	progressEntry: css`
		font-size: 12px;
		line-height: 1.5;
		color: ${token.colorTextTertiary};
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	`,

	// ── Tool tags ──
	toolTagList: css`
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
	`,
	toolTag: css`
		display: inline-flex;
		align-items: center;
		gap: 3px;
		font-size: 11px;
		line-height: 1;
		color: ${token.colorTextTertiary};
		background: ${token.colorFillQuaternary};
		border: 1px solid ${token.colorBorderSecondary};
		border-radius: 4px;
		padding: 2px 6px;
	`,
	toolTagIcon: css`
		width: 9px;
		height: 9px;
		color: ${token.colorTextQuaternary};
	`,

	// ── Summary text ──
	summary: css`
		font-size: 12px;
		line-height: 1.5;
		color: ${token.colorTextSecondary};
		word-break: break-word;
	`,

	// ── Nested subagent list ──
	nestedList: css`
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding-left: 12px;
	`,
	nestedItem: css`
		animation: subagentRollIn 0.18s cubic-bezier(0.215, 0.61, 0.355, 1) both;
		@keyframes subagentRollIn {
			0% {
				filter: blur(2px);
				max-height: 0;
				opacity: 0;
				transform: translateY(0.72em);
			}
			68% {
				filter: blur(0);
				opacity: 1;
			}
		}
	`,
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatElapsed(ms: number): string {
	if (ms < 1000) return `${Math.round(ms)}ms`;
	if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
	return `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`;
}

function getStatusIcon(status: SubagentStatus) {
	switch (status) {
		case "running":
			return null; // use dot instead
		case "completed":
			return CheckCircle2;
		case "failed":
			return XCircle;
		case "stopped":
			return StopCircle;
	}
}

// ─── Component ───────────────────────────────────────────────────────────────

interface SubagentCardProps {
	task: ActiveTask;
	nestedTasks?: ActiveTask[];
}

export const SubagentCard = memo<SubagentCardProps>(({ task, nestedTasks }) => {
	const { styles, cx } = useStyles();
	const [expanded, setExpanded] = useState(false);
	const [hovered, setHovered] = useState(false);

	const isRunning = task.status === "running";
	const isDone = task.status === "completed" || task.status === "failed" || task.status === "stopped";

	const elapsed = useMemo(() => {
		if (!task.startedAt) return null;
		const end = task.completedAt ?? Date.now();
		return end - task.startedAt;
	}, [task.startedAt, task.completedAt]);

	const StatusIconComponent = getStatusIcon(task.status);
	const latestProgress = task.progressEntries.length > 0
		? task.progressEntries[task.progressEntries.length - 1]
		: null;

	const hasDetails =
		task.progressEntries.length > 0
		|| task.toolNames.length > 0
		|| task.summary
		|| (nestedTasks && nestedTasks.length > 0);

	return (
		<div
			className={cx(
				styles.card,
				isDone && task.status !== "failed" && styles.cardCompleted,
				task.status === "failed" && styles.cardFailed,
			)}
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
		>
			{/* ── Header row ── */}
			<button
				type="button"
				className={styles.header}
				onClick={() => hasDetails && setExpanded((v) => !v)}
				aria-expanded={expanded}
			>
				{/* Status dot */}
				<span
					className={cx(
						styles.statusDot,
						isRunning && styles.dotRunning,
						task.status === "completed" && styles.dotCompleted,
						task.status === "failed" && styles.dotFailed,
						task.status === "stopped" && styles.dotStopped,
					)}
				/>

				{/* Agent icon */}
				<Bot size={14} style={{ flexShrink: 0, color: "inherit", opacity: 0.6 }} />

				{/* Title */}
				<span className={cx(styles.title, isRunning && styles.titleRunning)}>
					{task.description || "Subagent task"}
				</span>

				{/* Latest progress preview (only when collapsed & running) */}
				{!expanded && isRunning && latestProgress && (
					<span className={styles.statusBadge}>
						{latestProgress.text.slice(0, 40)}
						{latestProgress.text.length > 40 ? "..." : ""}
					</span>
				)}

				{/* Status icon for completed states */}
				{StatusIconComponent && (
					<StatusIconComponent
						size={13}
						className={styles.statusIcon}
						style={{
							color:
								task.status === "completed" ? "var(--ant-color-success)" :
								task.status === "failed" ? "var(--ant-color-error)" :
								undefined,
						}}
					/>
				)}

				{/* Duration */}
				{elapsed != null && elapsed > 0 && (
					<span className={styles.duration}>{formatElapsed(elapsed)}</span>
				)}

				{/* Open hint (Cursor-style) */}
				{hasDetails && (
					<span className={cx(styles.openHint, hovered && styles.openHintVisible)}>
						{expanded ? "Close" : "Open"}
					</span>
				)}

				{/* Chevron */}
				{hasDetails && (
					<ChevronRight
						className={cx(styles.chevron, expanded && styles.chevronExpanded)}
					/>
				)}
			</button>

			{/* ── Expandable details ── */}
			<div className={cx(styles.detailsGrid, expanded && styles.detailsGridExpanded)}>
				<div className={styles.detailsOverflow}>
					<div className={styles.detailsContent}>
						{/* Summary */}
						{task.summary && (
							<div className={styles.summary}>{task.summary}</div>
						)}

						{/* Tool tags */}
						{task.toolNames.length > 0 && (
							<Flexbox horizontal gap={4} wrap="wrap">
								{task.toolNames.map((name) => (
									<span key={name} className={styles.toolTag}>
										<Terminal className={styles.toolTagIcon} strokeWidth={1.8} />
										{name}
									</span>
								))}
							</Flexbox>
						)}

						{/* Progress entries */}
						{task.progressEntries.length > 0 && (
							<div className={styles.progressList}>
								{task.progressEntries.slice(-8).map((entry, i) => (
									<div key={i} className={styles.progressEntry}>
										{entry.text}
									</div>
								))}
							</div>
						)}

						{/* Nested subagent tasks */}
						{nestedTasks && nestedTasks.length > 0 && (
							<div className={styles.nestedList}>
								{nestedTasks.map((nested) => (
									<div key={nested.taskId} className={styles.nestedItem}>
										<SubagentCard task={nested} />
									</div>
								))}
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
});

SubagentCard.displayName = "SubagentCard";

// ─── Inline card for timeline (replaces TaskStart/TaskEnd) ───────────────────

interface SubagentTimelineCardProps {
	taskId: string;
	description: string;
	parentTaskId?: string;
	/** When present, this is a completed task-end item */
	endStatus?: "completed" | "failed" | "stopped";
	endSummary?: string;
	endDurationMs?: number;
	/** Live task from activeTasks map (for running subagents) */
	activeTask?: ActiveTask;
	/** Nested active tasks under this one */
	nestedTasks?: ActiveTask[];
}

export const SubagentTimelineCard = memo<SubagentTimelineCardProps>(
	({ taskId, description, endStatus, endSummary, endDurationMs, activeTask, nestedTasks }) => {
		// If we have an active task with live data, use it
		if (activeTask) {
			return <SubagentCard task={activeTask} nestedTasks={nestedTasks} />;
		}

		// Build a synthetic ActiveTask from timeline item data
		const syntheticTask: ActiveTask = {
			taskId,
			description,
			status: endStatus ?? "running",
			progressEntries: [],
			toolNames: [],
			startedAt: endDurationMs ? (Date.now() - endDurationMs) : Date.now(),
			completedAt: endStatus ? Date.now() : undefined,
			summary: endSummary,
		};

		return <SubagentCard task={syntheticTask} nestedTasks={nestedTasks} />;
	},
);

SubagentTimelineCard.displayName = "SubagentTimelineCard";
