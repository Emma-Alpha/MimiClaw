import { Progress, Tooltip } from "antd";
import { createStyles } from "antd-style";

type ContextUsageTooltipProps = {
	usedPercentage: number;
	remainingPercentage: number;
	usedTokensLabel: string;
	totalTokensLabel: string;
	ringColor: string;
	size?: number;
};

const useStyles = createStyles(({ css }) => ({
	ring: css`
		display: inline-flex;
		align-items: center;
		justify-content: center;
		line-height: 0;
		cursor: help;
	`,
	content: css`
		display: flex;
		flex-direction: column;
		gap: 1px;
		font-size: 12px;
		line-height: 1.35;
		color: #3f4349;
		min-width: 164px;
	`,
	title: css`
		text-align: center;
		color: #70757d;
		font-weight: 500;
		margin-bottom: 1px;
	`,
	line: css`
		font-weight: 500;
	`,
}));

export function ContextUsageTooltip({
	usedPercentage,
	remainingPercentage,
	usedTokensLabel,
	totalTokensLabel,
	ringColor,
	size = 14,
}: ContextUsageTooltipProps) {
	const { styles } = useStyles();
	const clampedPercent = Math.max(0, Math.min(100, Math.round(usedPercentage)));

	return (
		<Tooltip
			placement="top"
			mouseEnterDelay={0.12}
			arrow={false}
			overlayInnerStyle={{
				background: "#f2f4f7",
				border: "1px solid #dfe3e8",
				borderRadius: 10,
				padding: "7px 10px",
				boxShadow: "0 4px 12px rgba(15, 23, 42, 0.08)",
				color: "#3f4349",
			}}
			title={
				<div className={styles.content}>
					<div className={styles.title}>背景信息窗口：</div>
					<div className={styles.line}>
						{clampedPercent}% 已用（剩余 {remainingPercentage}%）
					</div>
					<div className={styles.line}>
						已用 {usedTokensLabel} 标记，共 {totalTokensLabel}
					</div>
				</div>
			}
		>
			<span
				className={styles.ring}
				aria-label={`背景信息窗口已用 ${clampedPercent}%`}
			>
				<Progress
					type="circle"
					size={size}
					percent={clampedPercent}
					showInfo={false}
					strokeColor={ringColor}
				/>
			</span>
		</Tooltip>
	);
}
