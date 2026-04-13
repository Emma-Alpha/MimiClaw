import { Progress, Tooltip, theme } from "antd";
import { createStyles } from "antd-style";

type ContextUsageTooltipProps = {
	usedPercentage: number;
	remainingPercentage: number;
	usedTokensLabel: string;
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
	totalTokensLabel,
	ringColor,
	size = 14,
}: ContextUsageTooltipProps) {
	const { styles } = useStyles();
	const { token } = theme.useToken();
	const clampedPercent = Math.max(0, Math.min(100, Math.round(usedPercentage)));

	return (
		<Tooltip
			placement="top"
			mouseEnterDelay={0.12}
			arrow={false}
			styles={{
				container: {
					background: token.colorBgContainer,
					border: `1px solid ${token.colorBorderSecondary}`,
					borderRadius: 12,
					padding: "7px 10px",
					boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08), 0 2px 6px rgba(15, 23, 42, 0.05)",
					color: token.colorTextSecondary,
				},
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
