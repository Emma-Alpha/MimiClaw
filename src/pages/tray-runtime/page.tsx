import { useEffect, useMemo, useState } from "react";
import { createStyles } from "antd-style";
import { Bot, ChevronRight, Code2, Cpu, RefreshCcw, ShieldAlert, X } from "lucide-react";
import { invokeIpc } from "@/lib/api-client";

type TrayRuntimeThread = {
	id: string;
	source: "gateway" | "code";
	runId?: string;
	sessionKey?: string;
	sessionId?: string;
	agentId?: string;
	detail: string;
	startedAt: number;
	updatedAt: number;
	stale: boolean;
};

type TrayRuntimeState = {
	gatewayState: "stopped" | "starting" | "running" | "error" | "reconnecting";
	activeCount: number;
	threads: TrayRuntimeThread[];
	updatedAt: number;
};

const PRESSURE_THREAD_CAP = 8;
const MAX_VISIBLE_THREADS = 5;

const useStyles = createStyles(({ css }) => ({
	root: css`
		height: 100vh;
		width: 100vw;
		padding: 8px;
		background: transparent;
		font-family:
			"SF Pro Display",
			"PingFang SC",
			"Hiragino Sans GB",
			"Microsoft YaHei",
			sans-serif;
	`,
	panel: css`
		height: 100%;
		border-radius: 26px;
		border: 1px solid rgba(131, 142, 215, 0.28);
		background:
			radial-gradient(140% 110% at 0% 0%, rgba(97, 115, 255, 0.3), transparent 48%),
			radial-gradient(120% 100% at 100% 100%, rgba(50, 93, 214, 0.28), transparent 42%),
			linear-gradient(180deg, #282d68 0%, #25295f 45%, #232858 100%);
		box-shadow:
			0 30px 70px rgba(10, 13, 44, 0.62),
			inset 0 1px 0 rgba(255, 255, 255, 0.18);
		padding: 14px 14px 12px;
		color: #eef3ff;
		display: flex;
		flex-direction: column;
		gap: 10px;
	`,
	header: css`
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 2px 4px 0;
	`,
	titleWrap: css`
		display: flex;
		align-items: center;
		gap: 8px;
	`,
	title: css`
		font-size: 14px;
		font-weight: 700;
		letter-spacing: 0.01em;
	`,
	subtitleRow: css`
		margin-top: 2px;
		display: flex;
		align-items: center;
		gap: 8px;
	`,
	subtitle: css`
		font-size: 12px;
		color: rgba(219, 230, 255, 0.72);
	`,
	statusBadge: css`
		padding: 1px 7px;
		border-radius: 999px;
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	`,
	closeBtn: css`
		height: 28px;
		width: 28px;
		border-radius: 9px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		color: rgba(240, 244, 255, 0.9);
		background: rgba(255, 255, 255, 0.08);
		border: 1px solid rgba(255, 255, 255, 0.16);
		transition: background 0.2s ease;
		&:hover {
			background: rgba(255, 255, 255, 0.16);
		}
	`,
	alertBar: css`
		border-radius: 12px;
		padding: 8px 10px;
		font-size: 12px;
		color: #ffe2e2;
		background: rgba(255, 77, 79, 0.2);
		border: 1px solid rgba(255, 77, 79, 0.35);
	`,
	topGrid: css`
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 10px;
	`,
	card: css`
		border-radius: 16px;
		background: rgba(37, 42, 99, 0.74);
		border: 1px solid rgba(140, 151, 230, 0.18);
		padding: 10px;
		box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
	`,
	ringWrap: css`
		display: flex;
		align-items: center;
		justify-content: center;
	`,
	ring: css`
		position: relative;
		width: 126px;
		height: 126px;
		border-radius: 999px;
	`,
	ringInner: css`
		position: absolute;
		inset: 13px;
		border-radius: 999px;
		background: linear-gradient(180deg, rgba(38, 43, 101, 0.95), rgba(35, 40, 90, 0.98));
		display: flex;
		align-items: center;
		justify-content: center;
		flex-direction: column;
	`,
	ringValue: css`
		font-size: 14px;
		line-height: 1;
		font-weight: 700;
		font-family: "DIN Alternate", "SF Mono", "Roboto Mono", monospace;
		letter-spacing: -0.02em;
	`,
	ringLabel: css`
		margin-top: 4px;
		font-size: 12px;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: rgba(221, 230, 255, 0.78);
	`,
	legend: css`
		border-radius: 15px;
		background: rgba(35, 41, 95, 0.8);
		border: 1px solid rgba(141, 151, 232, 0.15);
		padding: 10px 12px;
		display: flex;
		flex-direction: column;
		gap: 7px;
	`,
	legendRow: css`
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
	`,
	legendLeft: css`
		display: inline-flex;
		align-items: center;
		gap: 8px;
		min-width: 0;
	`,
	dot: css`
		width: 10px;
		height: 10px;
		border-radius: 999px;
		flex-shrink: 0;
	`,
	legendLabel: css`
		font-size: 12px;
		color: rgba(230, 237, 255, 0.9);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	`,
	legendValue: css`
		font-size: 12px;
		font-weight: 700;
		color: #f5f8ff;
		font-family: "SF Mono", "Roboto Mono", monospace;
	`,
	threadCard: css`
		flex: 1;
		min-height: 0;
		border-radius: 16px;
		background: rgba(34, 39, 91, 0.82);
		border: 1px solid rgba(141, 151, 232, 0.16);
		padding: 10px 10px 8px;
		display: flex;
		flex-direction: column;
		gap: 8px;
	`,
	sectionHead: css`
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
	`,
	sectionTitle: css`
		font-size: 14px;
		font-weight: 700;
		color: #4cb1ff;
	`,
	sectionMeta: css`
		font-size: 11px;
		color: rgba(229, 236, 255, 0.75);
		font-family: "SF Mono", "Roboto Mono", monospace;
	`,
	threadList: css`
		display: flex;
		flex-direction: column;
		gap: 6px;
		overflow: auto;
	`,
	threadRow: css`
		width: 100%;
		padding: 8px 8px;
		border-radius: 11px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.07);
		transition: background 0.18s ease, transform 0.18s ease;
		&:hover {
			background: rgba(255, 255, 255, 0.09);
			transform: translateY(-1px);
		}
	`,
	threadMain: css`
		display: flex;
		align-items: center;
		gap: 8px;
		min-width: 0;
	`,
	threadNameWrap: css`
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
	`,
	threadName: css`
		font-size: 13px;
		font-weight: 700;
		color: #f6f8ff;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	`,
	threadDesc: css`
		font-size: 11px;
		color: rgba(224, 233, 255, 0.75);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	`,
	threadState: css`
		font-size: 11px;
		font-weight: 700;
		color: #9fd6ff;
		white-space: nowrap;
	`,
	threadEmpty: css`
		font-size: 13px;
		color: rgba(218, 228, 255, 0.68);
		padding: 6px 2px 8px;
	`,
	overflowHint: css`
		font-size: 12px;
		color: rgba(215, 225, 255, 0.82);
		padding: 2px 2px 0;
	`,
	healthCard: css`
		border-radius: 14px;
		background: rgba(34, 39, 89, 0.9);
		border: 1px solid rgba(139, 149, 227, 0.2);
		padding: 10px 12px 12px;
		display: flex;
		flex-direction: column;
		gap: 8px;
	`,
	healthRow: css`
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
	`,
	healthLabel: css`
		font-size: 13px;
		font-weight: 700;
		color: #42abff;
	`,
	healthValue: css`
		font-size: 14px;
		font-weight: 700;
		font-family: "DIN Alternate", "SF Mono", "Roboto Mono", monospace;
		color: #f6f9ff;
	`,
	progressTrack: css`
		position: relative;
		height: 14px;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid rgba(255, 255, 255, 0.14);
		overflow: hidden;
	`,
	progressFill: css`
		position: absolute;
		inset: 0 auto 0 0;
		border-radius: inherit;
		transition: width 0.28s ease;
	`,
}));

const FALLBACK_STATE: TrayRuntimeState = {
	gatewayState: "stopped",
	activeCount: 0,
	threads: [],
	updatedAt: 0,
};

function clampPercent(value: number): number {
	if (!Number.isFinite(value)) return 0;
	return Math.max(0, Math.min(100, Math.round(value)));
}

function formatRelative(ms: number): string {
	const seconds = Math.max(1, Math.floor(ms / 1000));
	if (seconds < 60) return `${seconds}s`;
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return `${minutes}m`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h`;
	const days = Math.floor(hours / 24);
	return `${days}d`;
}

function getThreadName(thread: TrayRuntimeThread): string {
	if (thread.source === "code") {
		return thread.sessionId ? `CLI ${thread.sessionId}` : "CLI 会话";
	}
	return thread.agentId ? `Agent ${thread.agentId}` : "Agent 会话";
}

function gatewayStateText(state: TrayRuntimeState["gatewayState"]): string {
	if (state === "running") return "网关运行中";
	if (state === "starting") return "网关启动中";
	if (state === "reconnecting") return "网关重连中";
	if (state === "error") return "网关异常";
	return "网关已停止";
}

function gatewayBadgeColors(state: TrayRuntimeState["gatewayState"]): { bg: string; color: string } {
	if (state === "running") return { bg: "rgba(46, 192, 110, 0.22)", color: "#8ff7b6" };
	if (state === "starting") return { bg: "rgba(245, 195, 68, 0.22)", color: "#ffe28f" };
	if (state === "reconnecting") return { bg: "rgba(245, 195, 68, 0.22)", color: "#ffe28f" };
	if (state === "error") return { bg: "rgba(255, 77, 79, 0.24)", color: "#ffd0d1" };
	return { bg: "rgba(151, 166, 191, 0.24)", color: "#c8d2e6" };
}

function pressureTone(pressure: number, isError: boolean): { label: string; color: string } {
	if (isError) return { label: "异常", color: "#ff4d4f" };
	if (pressure >= 70) return { label: "紧张", color: "#ff4d4f" };
	if (pressure >= 40) return { label: "关注", color: "#f5c344" };
	return { label: "正常", color: "#2f87ff" };
}

function ringBackground(percent: number, color: string): string {
	const normalized = clampPercent(percent);
	const deg = Math.round(normalized * 3.6);
	return `conic-gradient(from -90deg, ${color} 0deg ${deg}deg, rgba(173, 184, 237, 0.3) ${deg}deg 360deg)`;
}

function healthGradient(health: number): string {
	if (health >= 70) return "linear-gradient(90deg, #21a2ff, #4cd1ff)";
	if (health >= 40) return "linear-gradient(90deg, #f5c344, #ffd76f)";
	return "linear-gradient(90deg, #ff5a5d, #ff8284)";
}

export default function TrayRuntime() {
	const { styles } = useStyles();
	const [state, setState] = useState<TrayRuntimeState>(FALLBACK_STATE);
	const [nowTs, setNowTs] = useState<number>(() => Date.now());

	useEffect(() => {
		void invokeIpc<TrayRuntimeState>("tray-runtime:getState")
			.then((payload) => {
				setState(payload);
				setNowTs(Date.now());
			})
			.catch(() => {});

		const unsubscribe = window.electron.ipcRenderer.on("tray-runtime:state", (payload) => {
			setState(payload as TrayRuntimeState);
			setNowTs(Date.now());
		});

		const poll = window.setInterval(() => {
			void invokeIpc<TrayRuntimeState>("tray-runtime:getState")
				.then((payload) => {
					setState(payload);
					setNowTs(Date.now());
				})
				.catch(() => {});
		}, 1500);

		return () => {
			window.clearInterval(poll);
			unsubscribe?.();
		};
	}, []);

	const metrics = useMemo(() => {
		const activeThreads = state.threads.filter((thread) => !thread.stale);
		const staleThreads = state.threads.filter((thread) => thread.stale);
		const orderedThreads = [...activeThreads, ...staleThreads];
		const visibleThreads = orderedThreads.slice(0, MAX_VISIBLE_THREADS);
		const hiddenThreadCount = Math.max(0, orderedThreads.length - visibleThreads.length);
		const activeCount = activeThreads.length;
		const staleCount = staleThreads.length;
		const codeCount = activeThreads.filter((thread) => thread.source === "code").length;
		const gatewayCount = activeThreads.filter((thread) => thread.source === "gateway").length;
		const pressure = clampPercent((activeCount / PRESSURE_THREAD_CAP) * 100);
		const activity = clampPercent((activeCount / PRESSURE_THREAD_CAP) * 100);
		const isGatewayError = state.gatewayState === "error";
		const tone = pressureTone(pressure, isGatewayError);
		const health = clampPercent(
			100 - staleCount * 24 - (isGatewayError ? 35 : 0) - Math.max(0, activeCount - 3) * 10,
		);

		return {
			activeCount,
			staleCount,
			codeCount,
			gatewayCount,
			pressure,
			pressureLabel: isGatewayError ? "ERR" : `${pressure}%`,
			activity,
			health,
			tone,
			isGatewayError,
			visibleThreads,
			hiddenThreadCount,
		};
	}, [state]);

	const pressureRing = useMemo(() => {
		if (metrics.isGatewayError) {
			return ringBackground(100, "#ff4d4f");
		}
		return ringBackground(metrics.pressure, metrics.tone.color);
	}, [metrics.isGatewayError, metrics.pressure, metrics.tone.color]);

	const activityRing = useMemo(() => {
		return ringBackground(metrics.activity, "#2f87ff");
	}, [metrics.activity]);

	const legendRows = [
		{ label: "活跃会话", value: `${metrics.activeCount}`, color: "#2f87ff" },
		{ label: "CLI 会话", value: `${metrics.codeCount}`, color: "#4ea5ff" },
		{ label: "Agent 会话", value: `${metrics.gatewayCount}`, color: "#72b9ff" },
		{ label: "待恢复会话", value: `${metrics.staleCount}`, color: "#f5c344" },
		{ label: "空闲槽位", value: `${Math.max(0, PRESSURE_THREAD_CAP - metrics.activeCount)}`, color: "#818ab8" },
	];

	const badgeColors = gatewayBadgeColors(state.gatewayState);

	return (
		<div className={styles.root}>
			<div className={styles.panel}>
				<div className={styles.header}>
					<div className={styles.titleWrap}>
						<Cpu size={16} />
						<div>
							<div className={styles.title}>会话活跃度压力值</div>
							<div className={styles.subtitleRow}>
								<div className={styles.subtitle}>{gatewayStateText(state.gatewayState)}</div>
								<span
									className={styles.statusBadge}
									style={{ background: badgeColors.bg, color: badgeColors.color }}
								>
									{metrics.tone.label}
								</span>
							</div>
						</div>
					</div>
					<button
						type="button"
						className={styles.closeBtn}
						onClick={() => {
							window.close();
						}}
					>
						<X size={14} />
					</button>
				</div>

				{metrics.isGatewayError ? (
					<div className={styles.alertBar}>网关状态异常，当前压力值以 ERR 呈现，恢复后将自动回到百分比。</div>
				) : null}

				<div className={styles.topGrid}>
					<div className={styles.card}>
						<div className={styles.ringWrap}>
							<div className={styles.ring} style={{ background: pressureRing }}>
								<div className={styles.ringInner}>
									<div className={styles.ringValue}>{metrics.pressureLabel}</div>
									<div className={styles.ringLabel}>Pressure</div>
								</div>
							</div>
						</div>
					</div>
					<div className={styles.card}>
						<div className={styles.ringWrap}>
							<div className={styles.ring} style={{ background: activityRing }}>
								<div className={styles.ringInner}>
									<div className={styles.ringValue}>{metrics.activity}%</div>
									<div className={styles.ringLabel}>活跃占比</div>
								</div>
							</div>
						</div>
					</div>
				</div>

				<div className={styles.legend}>
					{legendRows.map((row) => (
						<div key={row.label} className={styles.legendRow}>
							<div className={styles.legendLeft}>
								<span className={styles.dot} style={{ background: row.color }} />
								<span className={styles.legendLabel}>{row.label}</span>
							</div>
							<span className={styles.legendValue}>{row.value}</span>
						</div>
					))}
				</div>

				<div className={styles.threadCard}>
					<div className={styles.sectionHead}>
						<div className={styles.sectionTitle}>最近活跃会话</div>
						<div className={styles.sectionMeta}>最多显示 {MAX_VISIBLE_THREADS} 条</div>
					</div>
					<div className={styles.threadList}>
						{metrics.visibleThreads.length === 0 ? (
							<div className={styles.threadEmpty}>暂无运行中的会话</div>
						) : (
							metrics.visibleThreads.map((thread) => (
								<button
									type="button"
									key={thread.id}
									className={styles.threadRow}
									onClick={() => {
										void invokeIpc<{ success: boolean }>("tray-runtime:openThread", thread.id);
									}}
								>
									<div className={styles.threadMain}>
										{thread.source === "code" ? <Code2 size={14} /> : <Bot size={14} />}
										<div className={styles.threadNameWrap}>
											<div className={styles.threadName}>{getThreadName(thread)}</div>
											<div className={styles.threadDesc}>{thread.detail || "处理中"}</div>
										</div>
									</div>
									<div className={styles.threadMain}>
										{thread.stale ? <ShieldAlert size={12} /> : <RefreshCcw size={12} />}
										<span className={styles.threadState}>
											{thread.stale ? "待恢复" : formatRelative(nowTs - thread.updatedAt)}
										</span>
										<ChevronRight size={12} />
									</div>
								</button>
							))
						)}
						{metrics.hiddenThreadCount > 0 ? (
							<div className={styles.overflowHint}>还有 {metrics.hiddenThreadCount} 条会话，请打开主窗口查看。</div>
						) : null}
					</div>
				</div>

				<div className={styles.healthCard}>
					<div className={styles.healthRow}>
						<span className={styles.healthLabel}>会话可用度</span>
						<span className={styles.healthValue}>{metrics.health}%</span>
					</div>
					<div className={styles.progressTrack}>
						<div
							className={styles.progressFill}
							style={{
								width: `${metrics.health}%`,
								background: healthGradient(metrics.health),
								boxShadow: `0 0 12px ${metrics.health >= 40 ? "rgba(37, 168, 255, 0.5)" : "rgba(255, 90, 93, 0.42)"}`,
							}}
						/>
					</div>
				</div>
			</div>
		</div>
	);
}
