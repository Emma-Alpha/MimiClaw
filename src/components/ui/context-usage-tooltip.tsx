import { Progress } from "antd";
import { createStyles } from "antd-style";
import { Tooltip } from "@/components/ui/tooltip";

type ContextUsageTooltipProps = {
	usedPercentage: number;
	remainingPercentage: number;
	usedTokensLabel: string;
	remainingTokensLabel?: string;
	totalTokensLabel: string;
	ringColor: string;
	size?: number;
};

const useStyles = createStyles(({ css, token }) => ({
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
		font-weight: 400;
		color: ${token.colorTextSecondary};
		min-width: 164px;
	`,
	title: css`
		text-align: center;
		color: ${token.colorTextTertiary};
		font-weight: 400;
		margin-bottom: 1px;
	`,
	line: css`
		font-weight: 400;
		color: ${token.colorText};
	`,
}));

export function ContextUsageTooltip({
	usedPercentage,
	remainingPercentage,
	usedTokensLabel,
	remainingTokensLabel,
	totalTokensLabel,
	ringColor,
	size = 14,
}: ContextUsageTooltipProps) {
	const { styles } = useStyles();
	const clampedPercent = Math.max(0, Math.min(100, usedPercentage));
	const clampedRemaining = Math.max(
		0,
		Math.min(100, Number.isFinite(remainingPercentage) ? remainingPercentage : 100 - clampedPercent),
	);
	const displayPercent = Number(clampedPercent.toFixed(1));
	const displayRemaining = Number(clampedRemaining.toFixed(1));
	const ringPercent =
		displayPercent > 0 && displayPercent < 1
			? 1
			: displayPercent;
	const percentLabel = Number.isInteger(displayPercent)
		? `${displayPercent}`
		: `${displayPercent.toFixed(1)}`;
	const remainingLabel = Number.isInteger(displayRemaining)
		? `${displayRemaining}`
		: `${displayRemaining.toFixed(1)}`;

	return (
		<Tooltip
			placement="top"
			mouseEnterDelay={0.12}
			arrow={false}
			title={
				<div className={styles.content}>
					<div className={styles.title}>背景信息窗口：</div>
					<div className={styles.line}>
						{percentLabel}% 已用（剩余 {remainingLabel}%）
					</div>
					<div className={styles.line}>
						已用 {usedTokensLabel} 标记，共 {totalTokensLabel}
					</div>
					{remainingTokensLabel ? (
						<div className={styles.line}>
							剩余 {remainingTokensLabel} 标记
						</div>
					) : null}
				</div>
			}
		>
			<span
				className={styles.ring}
				aria-label={`背景信息窗口已用 ${percentLabel}%`}
			>
				<Progress
					type="circle"
					size={size}
					percent={ringPercent}
					showInfo={false}
					strokeColor={ringColor}
				/>
			</span>
		</Tooltip>
	);
}
