import { Center, Flexbox, Popover, Tooltip } from "@lobehub/ui";
import { TokenTag } from "@lobehub/ui/chat";
import { Divider } from "antd";
import { cssVar } from "antd-style";
import { memo } from "react";

type ContextUsageTooltipProps = {
	usedTokens: number;
	maxTokens: number;
};

const formatToken = (value: number): string => {
	if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
	if (value >= 1_000) return `${(value / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
	return `${Math.round(value)}`;
};

interface TokenProgressItem {
	color: string;
	id: string;
	title: string;
	value: number;
}

const TokenProgress = memo<{
	data: TokenProgressItem[];
	showTotal?: string;
}>(({ data, showTotal }) => {
	const total = data.reduce((acc, item) => acc + item.value, 0);
	return (
		<Flexbox gap={8} style={{ position: "relative" }} width="100%">
			<Flexbox
				horizontal
				height={6}
				width="100%"
				style={{
					background: total === 0 ? cssVar.colorFill : undefined,
					borderRadius: 3,
					overflow: "hidden",
					position: "relative",
				}}
			>
				{data.map((item) => (
					<Flexbox
						height="100%"
						key={item.id}
						style={{ background: item.color, flex: item.value }}
					/>
				))}
			</Flexbox>
			<Flexbox>
				{data.map((item) => (
					<Flexbox
						horizontal
						align="center"
						gap={4}
						justify="space-between"
						key={item.id}
					>
						<Flexbox horizontal align="center" gap={4}>
							<div
								style={{
									background: item.color,
									borderRadius: "50%",
									flex: "none",
									height: 6,
									width: 6,
								}}
							/>
							<div style={{ color: cssVar.colorTextSecondary }}>
								{item.title}
							</div>
						</Flexbox>
						<div style={{ fontWeight: 500 }}>{formatToken(item.value)}</div>
					</Flexbox>
				))}
				{showTotal && (
					<>
						<Divider style={{ marginBlock: 8 }} />
						<Flexbox
							horizontal
							align="center"
							gap={4}
							justify="space-between"
						>
							<div style={{ color: cssVar.colorTextSecondary }}>
								{showTotal}
							</div>
							<div style={{ fontWeight: 500 }}>{formatToken(total)}</div>
						</Flexbox>
					</>
				)}
			</Flexbox>
		</Flexbox>
	);
});

export const ContextUsageTooltip = memo<ContextUsageTooltipProps>(
	({ usedTokens, maxTokens }) => {
		const remaining = Math.max(0, maxTokens - usedTokens);

		const content = (
			<Flexbox gap={12} style={{ minWidth: 200 }}>
				<Flexbox horizontal align="center" gap={4} justify="space-between" width="100%">
					<div style={{ color: cssVar.colorTextDescription }}>上下文明细</div>
					<Tooltip
						styles={{ root: { maxWidth: "unset", pointerEvents: "none" } }}
						title={`${maxTokens.toLocaleString()} tokens`}
					>
						<Center
							height={20}
							paddingInline={4}
							style={{
								background: cssVar.colorFillTertiary,
								borderRadius: 4,
								color: cssVar.colorTextSecondary,
								fontFamily: cssVar.fontFamilyCode,
								fontSize: 11,
							}}
						>
							TOKEN
						</Center>
					</Tooltip>
				</Flexbox>
				<TokenProgress
					showTotal="总计"
					data={[
						{
							color: cssVar.colorSuccess,
							id: "used",
							title: "已用",
							value: usedTokens,
						},
						{
							color: cssVar.colorFill,
							id: "rest",
							title: "剩余",
							value: remaining,
						},
					]}
				/>
			</Flexbox>
		);

		return (
			<Popover
				placement="top"
				content={content}
			>
				<TokenTag
					maxValue={maxTokens}
					mode="used"
					value={usedTokens}
					text={{
						overload: "超出",
						remained: "剩余",
						used: "已用",
					}}
				/>
			</Popover>
		);
	},
);
