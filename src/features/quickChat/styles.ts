import { createStyles } from "antd-style";
import { CHAT_HEADER_HEIGHT } from "@/lib/titlebar-safe-area";
import {
	CHAT_SESSION_META_FONT_SIZE,
	CHAT_SESSION_TITLE_FONT_SIZE,
} from "@/styles/typography-tokens";

export const useMiniChatStyles = createStyles(
	(
		{ token, css },
		props: { codexHeaderInsetEnd?: number; codexHeaderInsetStart?: number } = {},
	) => ({
		root: css`
			--mini-chat-side-gap: 16px;
			--mini-chat-input-width: min(800px, 100%);
			--mini-chat-content-width: min(800px, calc(100% - (var(--mini-chat-side-gap) * 2)));
			--mini-chat-dock-inline-padding: 12px;
			--mini-chat-surface-bg: color-mix(
				in srgb,
				${token.colorBgContainer} 94%,
				${token.colorFillTertiary}
			);
			--mini-chat-header-bg: color-mix(
				in srgb,
				${token.colorBgContainer} 86%,
				transparent
			);
			--mini-chat-header-title-color: color-mix(
				in srgb,
				${token.colorText} 78%,
				${token.colorTextSecondary}
			);
			height: 100vh;
			width: 100%;
			display: flex;
			flex-direction: column;
			overflow: hidden;
			background:
				radial-gradient(
					circle at top,
					color-mix(in srgb, ${token.colorPrimaryBg} 42%, transparent),
					transparent 56%
				),
				linear-gradient(
					180deg,
					color-mix(in srgb, ${token.colorBgContainer} 96%, ${token.colorFillQuaternary}) 0%,
					var(--mini-chat-surface-bg) 100%
				);
		`,
		rootEmbedded: css`
			--mini-chat-side-gap: 16px;
			--mini-chat-content-width: min(800px, calc(100% - (var(--mini-chat-side-gap) * 2)));
			--mini-chat-dock-inline-padding: 12px;
			height: 100%;
			width: 100%;
			box-sizing: border-box;
			padding-top: 0;
		`,
		header: css`
		height: 48px;
		display: grid;
		grid-template-columns: auto 1fr auto;
		align-items: center;
		gap: 8px;
		padding-inline: 10px;
		-webkit-app-region: drag;
	`,
		headerEmbedded: css`
		height: 40px;
		grid-template-columns: 1fr;
		padding: 4px 12px;
		-webkit-app-region: no-drag;
		pointer-events: none;
		position: relative;
		z-index: 120;
	`,
		headerEmbeddedCodex: css`
		height: ${CHAT_HEADER_HEIGHT}px;
		grid-template-columns: minmax(0, 1fr) auto;
		column-gap: 16px;
		padding-block: 0;
		padding-inline-end: ${props.codexHeaderInsetEnd ?? 12}px;
		padding-inline-start: ${props.codexHeaderInsetStart ?? 12}px;
		transition:
			padding-inline-end 0.28s ease,
			padding-inline-start 0.28s ease;
		pointer-events: auto;
		-webkit-app-region: drag;
		border-bottom: none;
		background: var(--mini-chat-header-bg);
		backdrop-filter: saturate(160%) blur(18px);
		-webkit-backdrop-filter: saturate(160%) blur(18px);
		position: relative;
		overflow: visible;
		z-index: 10;

		&::after {
			content: "";
			position: absolute;
			top: 100%;
			left: 0;
			right: 0;
			height: 32px;
			background: linear-gradient(to bottom, var(--mini-chat-header-bg) 0%, transparent 100%);
			backdrop-filter: blur(12px);
			-webkit-backdrop-filter: blur(12px);
			mask-image: linear-gradient(to bottom, black 0%, transparent 100%);
			-webkit-mask-image: linear-gradient(to bottom, black 0%, transparent 100%);
			pointer-events: none;
		}
	`,
		embeddedTopLeft: css`
		display: flex;
		align-items: center;
		justify-content: flex-start;
		min-width: 0;
		overflow: visible;
		pointer-events: auto;
		gap: 8px;
		font-size: ${CHAT_SESSION_TITLE_FONT_SIZE}px;
		font-weight: 500;
	`,
		embeddedThreadWrap: css`
		position: relative;
		max-width: min(420px, 100%);
		min-width: 0;
	`,
		embeddedThreadBtn: css`
		display: inline-flex;
		align-items: center;
		justify-content: flex-start;
		gap: 6px;
		max-width: 100%;
		min-height: 28px;
		padding: 0;
		border-radius: 0;
		pointer-events: auto;
		cursor: default;
	`,
		embeddedThreadIcon: css`
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	`,
		embeddedThreadLabel: css`
			display: block;
			font-size: ${CHAT_SESSION_TITLE_FONT_SIZE}px;
			font-weight: 480;
			line-height: 1.1;
			color: var(--mini-chat-header-title-color);
			white-space: nowrap;
			text-overflow: ellipsis;
			overflow: hidden;
			min-width: 0;
		`,
		embeddedThreadChevron: css`
		flex-shrink: 0;
		color: ${token.colorTextSecondary};
	`,
		embeddedTopRight: css`
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 8px;
		min-width: 0;
	`,
		embeddedToolbarButton: css`
			display: inline-flex;
			align-items: center;
			justify-content: center;
			width: 20px;
			height: 20px;
			padding: 0;
			border: none;
			border-radius: 999px;
			background: transparent;
			color: ${token.colorTextSecondary};
			cursor: pointer;
			font-size: ${CHAT_SESSION_META_FONT_SIZE}px;
			line-height: 1;
			transition: background 0.18s ease, color 0.18s ease, opacity 0.18s ease;

			&:hover {
				color: ${token.colorText};
				background: color-mix(in srgb, ${token.colorText} 7%, transparent);
			}

			&:disabled {
				cursor: not-allowed;
				color: ${token.colorTextQuaternary};
				background: transparent;
				opacity: 0.78;
			}

			&:disabled:hover {
				color: ${token.colorTextQuaternary};
				background: transparent;
			}

			&:focus-visible {
				outline: none;
				box-shadow: 0 0 0 2px color-mix(in srgb, ${token.colorPrimary} 20%, transparent);
			}
		`,
		embeddedToolbarButtonActive: css`
			color: ${token.colorPrimary};
			background: color-mix(in srgb, ${token.colorPrimaryBg} 72%, transparent);
		`,
		embeddedHeaderStatus: css`
		display: flex;
		align-items: center;
		justify-content: center;
		width: 20px;
		height: 20px;
		border-radius: 999px;
		background: transparent;
		color: ${token.colorTextSecondary};
	`,
		embeddedHeaderStatusIdle: css`
		color: ${token.colorTextSecondary};
	`,
		embeddedHeaderStatusRunning: css`
		color: ${token.colorPrimary};
	`,
		embeddedHeaderStatusError: css`
		color: ${token.colorError};
	`,
		brand: css`
		display: flex;
		align-items: center;
		gap: 10px;
		min-width: 0;
	`,
		brandEmbedded: css`
		display: none;
	`,
		brandLogo: css`
		width: 24px;
		height: 24px;
		border-radius: 999px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: ${token.colorBgElevated};
		box-shadow: ${token.boxShadowSecondary};
	`,
		brandText: css`
		display: flex;
		flex-direction: column;
		min-width: 0;
	`,
		brandTitle: css`
		font-size: 12px;
		font-weight: 700;
		line-height: 1.1;
		color: ${token.colorText};
	`,
		status: css`
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 11px;
		color: ${token.colorTextSecondary};
	`,
		statusDot: css`
		width: 6px;
		height: 6px;
		border-radius: 999px;
		flex-shrink: 0;
	`,
		statusDotReady: css`
		background: ${token.colorSuccess};
	`,
		statusDotError: css`
		background: ${token.colorError};
	`,
		statusDotPending: css`
		background: ${token.colorWarning};
	`,
		statusDotWorking: css`
		background: ${token.colorPrimary};
		box-shadow: 0 0 0 4px ${token.colorPrimaryBg};
	`,
		headerCenter: css`
		display: flex;
		justify-content: center;
		align-items: center;
		min-width: 0;
		overflow: visible;
	`,
		headerCenterEmbedded: css`
		pointer-events: auto;
	`,
		headerActions: css`
		display: flex;
		align-items: center;
		gap: 4px;
		position: relative;
		z-index: 1;
	`,
		actionIcon: css`
		color: ${token.colorTextSecondary} !important;
		transition: transform 0.2s ease;

		&:hover {
			transform: translateY(-1px);
		}
	`,
		dynamicIslandWrapper: css`
		position: relative;
		border-radius: 999px;
		padding: 1px;
		overflow: visible;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: max-width 0.4s cubic-bezier(0.32, 0.72, 0, 1),
			flex 0.4s cubic-bezier(0.32, 0.72, 0, 1), filter 0.3s ease;
		filter: drop-shadow(0 8px 20px rgba(0, 0, 0, 0.16));
		max-width: min(100%, 420px);
		min-width: 40px;
		will-change: max-width, flex;
	`,
		dynamicIslandWrapperGenerating: css`
		filter: drop-shadow(0 8px 22px rgba(0, 0, 0, 0.18));
	`,
		dynamicIslandWrapperExpanded: css`
		flex: 1;
		max-width: 100%;
	`,
		dynamicIslandGlow: css`
		position: absolute;
		inset: 0;
		border-radius: inherit;
		z-index: 0;
		background: linear-gradient(180deg, rgba(35, 35, 37, 0.96), rgba(10, 10, 12, 0.98));
		border: 1px solid rgba(255, 255, 255, 0.06);
		opacity: 1;
	`,
		dynamicIslandGlowGenerating: css`
		border-color: rgba(0, 113, 227, 0.18);
		box-shadow: none;
	`,
		dynamicIslandFrost: css`
		position: absolute;
		inset: 1px;
		border-radius: inherit;
		z-index: 1;
		pointer-events: none;
		background: linear-gradient(
			180deg,
			rgba(255, 255, 255, 0.12),
			rgba(255, 255, 255, 0.02) 36%,
			rgba(255, 255, 255, 0) 100%
		);
		opacity: 0.72;
	`,
		dynamicIslandSpecular: css`
		position: absolute;
		top: 1px;
		left: 18%;
		right: 18%;
		height: 1px;
		background: linear-gradient(
			to right,
			transparent,
			rgba(255, 255, 255, 0.72),
			transparent
		);
		z-index: 3;
		opacity: 0.26;
	`,
		dynamicIsland: css`
		display: flex;
		align-items: center;
		background: rgba(29, 29, 31, 0.82);
		backdrop-filter: saturate(180%) blur(24px);
		border-radius: 999px;
		height: 36px;
		padding: 0 11px 0 6px;
		gap: 8px;
		color: #fff;
		max-width: 100%;
		min-width: 0;
		position: relative;
		z-index: 2;
		transition: background-color 0.3s ease,
			padding 0.4s cubic-bezier(0.32, 0.72, 0, 1);
		flex: 1;
		overflow: hidden;
		justify-content: space-between;

		&:hover {
			background: rgba(23, 23, 25, 0.88);
		}
	`,
		dynamicIslandContextMeter: css`
		position: absolute;
		left: 16px;
		right: 16px;
		bottom: 5px;
		height: 1.5px;
		border-radius: 999px;
		overflow: hidden;
		background: rgba(255, 255, 255, 0.08);
		pointer-events: none;
		z-index: 0;
	`,
		dynamicIslandContextMeterFill: css`
		height: 100%;
		border-radius: inherit;
		transition: width 0.28s ease, background 0.28s ease;
	`,
		dynamicIslandGenerating: css`
		background: rgba(24, 24, 27, 0.9);
		animation: islandSurfacePulse 1.8s ease-in-out infinite;

		@keyframes islandSurfacePulse {
			0%,
			100% {
					box-shadow: inset 0 0 0 1px rgba(0, 113, 227, 0.05),
						0 0 0 0 rgba(0, 113, 227, 0);
			}
			50% {
					box-shadow: inset 0 0 0 1px rgba(0, 113, 227, 0.12),
						0 0 10px 0 rgba(0, 113, 227, 0.08);
			}
		}

		@media (prefers-reduced-motion: reduce) {
			animation: none;
		}
	`,
		dynamicIslandExpanded: css`
		padding: 0 16px;
		background: ${token.colorFillSecondary};
		border-color: ${token.colorBorderSecondary};
	`,
		islandLead: css`
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 22px;
		height: 22px;
		flex-shrink: 0;
		z-index: 1;
	`,
		islandTextWrapper: css`
		display: flex;
		align-items: center;
		position: relative;
		flex: 1;
		min-width: 0;
		z-index: 1;
	`,
		islandTextLabel: css`
			font-family:
				"SF Pro Display",
			"SF Pro Icons",
			"Helvetica Neue",
			Helvetica,
			Arial,
			sans-serif;
		font-weight: 600;
		font-size: ${CHAT_SESSION_TITLE_FONT_SIZE}px;
		line-height: 1;
		letter-spacing: -0.015em;
		color: rgba(255, 255, 255, 0.98);
		white-space: nowrap;
		overflow: hidden;
			text-overflow: ellipsis;
			display: block;
			max-width: 100%;
			min-width: 0;
			font-variant-numeric: tabular-nums;
		`,
		islandGeneratingBadge: css`
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0;
		flex-shrink: 0;
		min-width: 20px;
		padding: 3px 6px;
		border-radius: 999px;
		background: rgba(59, 130, 246, 0.14);
		border: 1px solid rgba(59, 130, 246, 0.3);
		position: relative;
		z-index: 1;
	`,
		islandGeneratingSpinner: css`
		font-family: ${token.fontFamilyCode};
		font-size: 12px;
		line-height: 1;
		color: rgba(191, 219, 254, 0.98);
		flex-shrink: 0;
	`,
		islandPath: css`
		font-family: ${token.fontFamilyCode};
		color: rgba(203, 213, 225, 0.78);
		font-size: 12px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		display: block;
		min-width: 0;
		transition: flex 0.4s cubic-bezier(0.32, 0.72, 0, 1),
			max-width 0.4s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.2s ease,
			transform 0.4s cubic-bezier(0.32, 0.72, 0, 1);
		will-change: flex, max-width, opacity, transform;

		&:hover {
			color: rgba(248, 250, 252, 0.96);
		}
	`,
		islandPathCollapsed: css`
		flex: 0;
		max-width: 0px;
		opacity: 0;
		transform: translateX(10px);
	`,
		islandPathExpanded: css`
		flex: 1;
		min-width: 0;
		opacity: 1;
		transform: translateX(0);
	`,
		islandContainer: css`
			position: relative;
			display: flex;
			align-items: center;
			justify-content: center;
			width: 100%;
			min-width: 0;
			overflow: visible;
		`,
		islandMetric: css`
		display: inline-flex;
		align-items: center;
		justify-content: flex-end;
		flex-shrink: 0;
		min-width: 0;
		padding-left: 4px;
		position: relative;
		z-index: 1;
	`,
		islandMetricValue: css`
		font-family:
			"SF Pro Display",
			"SF Pro Icons",
			"Helvetica Neue",
			Helvetica,
			Arial,
			sans-serif;
		font-size: ${CHAT_SESSION_META_FONT_SIZE}px;
		line-height: 1;
		font-weight: 600;
		letter-spacing: -0.01em;
		color: rgba(255, 255, 255, 0.72);
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	`,
		islandContextTooltip: css`
		display: flex;
		flex-direction: column;
		gap: 4px;
		min-width: 228px;
	`,
		islandContextTooltipTitle: css`
		font-size: 12px;
		font-weight: 700;
	`,
		islandContextTooltipRow: css`
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		font-size: 11px;
		font-variant-numeric: tabular-nums;
	`,
		islandContextTooltipHint: css`
		margin-top: 2px;
		font-size: 10px;
		opacity: 0.78;
		line-height: 1.4;
	`,
		islandIconBtn: css`
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		color: rgba(255, 255, 255, 0.94);
		border-radius: 50%;
		height: 22px;
		width: 22px;
		position: relative;
		z-index: 1;
		background: transparent;
		pointer-events: auto;
		cursor: pointer;
		-webkit-app-region: no-drag;
		transition: opacity 0.2s ease, transform 0.2s ease;
		&:hover {
			opacity: 0.86;
			transform: scale(1.1);
		}
	`,
		islandDropdownSecondaryBtn: css`
		display: inline-flex;
		align-items: center;
		gap: 8px;
		margin-top: 6px;
		padding: 0;
		font-size: 13px;
		font-weight: 500;
		color: ${token.colorTextSecondary};
		text-align: left;
		transition: color 0.15s ease;
		&:hover {
			color: ${token.colorText};
		}
	`,
	islandDropdown: css`
		width: min(94vw, 640px);
		min-width: 320px;
		max-height: calc(100vh - 72px);
		border-radius: 24px;
		border: 1px solid ${token.colorBorderSecondary};
		background: ${token.colorBgElevated};
		box-shadow: ${token.boxShadowSecondary};
		padding: 10px 0;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		animation: dropdownIn 0.18s cubic-bezier(0.32, 0.72, 0, 1);

		@keyframes dropdownIn {
			from {
				opacity: 0;
				transform: translateY(-6px) scale(0.97);
			}
			to {
				opacity: 1;
				transform: translateY(0) scale(1);
			}
		}
	`,
		islandDropdownEmbedded: css`
		width: min(720px, calc(100vw - 300px));
		max-height: calc(100vh - 132px);
	`,
		islandDropdownSection: css`
		padding: 8px 18px 10px;
		display: flex;
		flex-direction: column;
		gap: 6px;
	`,
		islandDropdownTitle: css`
		font-size: 14px;
		font-weight: 600;
		color: ${token.colorText};
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	`,
		islandDropdownMeta: css`
		display: flex;
		align-items: center;
		gap: 4px;
		font-size: 12px;
		color: ${token.colorTextTertiary};
	`,
		islandDropdownInfo: css`
		display: flex;
		flex-direction: column;
		gap: 3px;
		margin-top: 4px;
	`,
		islandDropdownInfoRow: css`
		display: flex;
		align-items: center;
		gap: 5px;
		font-size: 11px;
		color: ${token.colorTextSecondary};
	`,
		islandDropdownBadge: css`
		font-size: 10px;
		font-family: ${token.fontFamilyCode};
		padding: 1px 5px;
		border-radius: 4px;
		background: ${token.colorFillSecondary};
		color: ${token.colorTextSecondary};
		white-space: nowrap;
	`,
		islandDropdownPath: css`
		font-family: ${token.fontFamilyCode};
		font-size: 10px;
		color: ${token.colorTextTertiary};
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		text-align: left;
		padding: 2px 0;
		margin-top: 2px;
		display: block;
		&:hover {
			color: ${token.colorPrimary};
		}
	`,
		islandPermissionSelector: css`
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 6px;
		margin-top: 4px;
	`,
		islandPermissionSelectorTrigger: css`
		display: inline-flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		width: 100%;
		height: 36px;
		padding: 0 10px;
		border-radius: 11px;
		border: 1px solid rgba(15, 23, 42, 0.14);
		background: rgba(255, 255, 255, 0.92);
		color: ${token.colorText};
		transition: border-color 0.16s ease, background 0.16s ease;
		&:hover {
			border-color: rgba(15, 23, 42, 0.22);
			background: rgba(255, 255, 255, 0.96);
		}
	`,
		islandPermissionSelectorTriggerLeft: css`
		display: flex;
		align-items: center;
		gap: 8px;
		min-width: 0;
	`,
		islandPermissionSelectorIcon: css`
		flex-shrink: 0;
		color: rgba(15, 23, 42, 0.68);
	`,
		islandPermissionSelectorTriggerLabel: css`
		font-size: 14px;
		font-weight: 600;
		line-height: 1.1;
		color: ${token.colorText};
		white-space: nowrap;
		text-overflow: ellipsis;
		overflow: hidden;
	`,
		islandPermissionSelectorChevron: css`
		flex-shrink: 0;
		color: rgba(15, 23, 42, 0.52);
		transition: transform 0.16s ease;
	`,
		islandPermissionSelectorChevronOpen: css`
		transform: rotate(180deg);
	`,
		islandPermissionSelectorMenu: css`
		position: static;
		width: 100%;
		max-height: 188px;
		overflow-y: auto;
		padding: 5px;
		border-radius: 12px;
		border: 1px solid rgba(15, 23, 42, 0.1);
		background: rgba(248, 249, 251, 0.96);
		box-shadow: 0 6px 16px rgba(15, 23, 42, 0.1);
		backdrop-filter: blur(12px);
		display: flex;
		flex-direction: column;
		gap: 2px;
	`,
		islandPermissionSelectorOption: css`
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		width: 100%;
		min-height: 40px;
		padding: 0 10px;
		border-radius: 9px;
		text-align: left;
		transition: background 0.14s ease;
		&:hover {
			background: rgba(15, 23, 42, 0.05);
		}
	`,
		islandPermissionSelectorOptionActive: css`
		background: rgba(15, 23, 42, 0.045);
	`,
		islandPermissionSelectorOptionLeft: css`
		display: flex;
		align-items: center;
		gap: 8px;
		min-width: 0;
	`,
		islandPermissionSelectorOptionLabel: css`
		font-size: 13px;
		line-height: 1.25;
		font-weight: 600;
		color: ${token.colorText};
		white-space: nowrap;
		text-overflow: ellipsis;
		overflow: hidden;
	`,
		islandPermissionSelectorCheck: css`
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 16px;
		height: 16px;
		color: transparent;
	`,
		islandPermissionSelectorCheckActive: css`
		color: rgba(15, 23, 42, 0.82);
	`,
		islandPermissionSelectorHint: css`
		font-size: 11px;
		line-height: 1.4;
		color: ${token.colorTextTertiary};
		margin-top: 2px;
	`,
		islandDropdownEmpty: css`
		font-size: 12px;
		color: ${token.colorTextTertiary};
		margin-top: 2px;
	`,
		islandDropdownDivider: css`
		height: 1px;
		background: rgba(15, 23, 42, 0.1);
		margin: 2px 18px;
	`,
		islandSessionSearch: css`
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 8px 18px 10px;
	`,
		islandSessionSearchIcon: css`
		flex-shrink: 0;
		color: ${token.colorTextSecondary};
		opacity: 0.9;
	`,
		islandSessionSearchInput: css`
		width: 100%;
		font-size: ${CHAT_SESSION_TITLE_FONT_SIZE}px;
		font-weight: 400;
		line-height: 1.3;
		background: transparent;
		border: 0;
		outline: 0;
		color: ${token.colorText};
		padding: 4px 0;

		&::placeholder {
			color: ${token.colorTextSecondary};
			opacity: 0.9;
		}
	`,
		islandSessionList: css`
		display: flex;
		flex-direction: column;
		gap: 4px;
		flex: 1 1 auto;
		min-height: 72px;
		max-height: min(360px, calc(100vh - 300px));
		overflow-y: auto;
		padding: 8px;
		background: transparent;
		border-radius: 0;
	`,
		islandSessionItem: css`
		display: flex;
		width: 100%;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		min-height: 40px;
		padding: 8px 12px;
		border-radius: 8px;
		border: 1px solid transparent;
		background: transparent;
		color: #475467;
		font-weight: 400;
		text-align: left;
		transition: background 0.16s ease, color 0.16s ease, border-color 0.16s ease;

		&:hover {
			background: #f3f4f6;
		}
	`,
		islandSessionItemActive: css`
		background: ${token.colorPrimaryBg};
		border-color: ${token.colorPrimaryBorder};
	`,
		islandSessionItemTitle: css`
		flex: 1;
		min-width: 0;
		font-size: ${CHAT_SESSION_TITLE_FONT_SIZE}px;
		font-weight: 400;
		color: #111827;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		line-height: 1.25;
	`,
		islandSessionItemSide: css`
		display: flex;
		align-items: center;
		gap: 10px;
		flex-shrink: 0;
		min-width: 72px;
		justify-content: flex-end;
	`,
		islandSessionItemMeta: css`
		font-size: ${CHAT_SESSION_META_FONT_SIZE}px;
		line-height: 1;
		color: #98a2b3;
		font-weight: 400;
		font-variant-numeric: tabular-nums;
	`,
		islandSessionItemMetaActive: css`
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0 6px;
		height: 18px;
		border-radius: 999px;
		background: ${token.colorPrimaryBg};
		color: ${token.colorPrimaryText};
		font-size: ${CHAT_SESSION_META_FONT_SIZE}px;
		font-weight: 500;
		line-height: 1;
	`,
		islandSessionItemIndicator: css`
		width: 12px;
		height: 12px;
		border-radius: 999px;
		border: 2px solid #d0d5dd;
		flex-shrink: 0;
	`,
		islandSessionItemIndicatorActive: css`
		border-color: ${token.colorPrimary};
		background: ${token.colorPrimary};
	`,
		islandSessionEmpty: css`
		font-size: 14px;
		color: ${token.colorTextSecondary};
		padding: 14px 12px;
	`,
		islandDropdownNewBtn: css`
		display: flex;
		width: calc(100% - 16px);
		margin: 2px 8px 4px;
		align-items: center;
		gap: 8px;
		padding: 8px 12px;
		font-size: ${CHAT_SESSION_TITLE_FONT_SIZE}px;
		font-weight: 400;
		color: ${token.colorTextSecondary};
		border-radius: 8px;
		transition: background 0.15s ease, color 0.15s ease;
		text-align: left;
		&:hover {
			background: #f3f4f6;
			color: ${token.colorText};
		}
	`,
		islandMeta: css`
		display: flex;
		align-items: center;
		gap: 3px;
		margin-left: 2px;
		overflow: hidden;
	`,
		islandBadge: css`
		font-size: 9px;
		font-family: ${token.fontFamilyCode};
		padding: 1px 4px;
		border-radius: 3px;
		background: rgba(255, 255, 255, 0.12);
		color: rgba(255, 255, 255, 0.7);
		white-space: nowrap;
		flex-shrink: 0;
	`,
		islandMetaExpanded: css`
		font-size: 10px;
		color: rgba(255, 255, 255, 0.5);
		font-family: ${token.fontFamilyCode};
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 180px;
	`,
		mentionPicker: css`
		position: absolute;
		left: 0;
		right: 0;
		bottom: calc(100% + 10px);
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding: 8px;
		border-radius: 12px;
		border: 1px solid ${token.colorBorderSecondary};
		background: ${token.colorBgElevated};
		box-shadow: ${token.boxShadowSecondary};
		z-index: 20;
	`,
		mentionOption: css`
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: flex-start;
		padding: 8px 10px;
		border-radius: 10px;
		color: ${token.colorTextSecondary};
		transition: background 0.15s ease, color 0.15s ease;
		&:hover {
			background: ${token.colorFillTertiary};
			color: ${token.colorText};
		}
	`,
		mentionOptionActive: css`
		background: ${token.colorPrimaryBg};
		color: ${token.colorPrimary};
	`,
		mentionOptionMeta: css`
		display: flex;
		align-items: center;
		gap: 8px;
		min-width: 0;
	`,
		mentionOptionIcon: css`
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	`,
		mentionOptionTitle: css`
		font-size: 13px;
		font-weight: 500;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	`,
		messageBodyFrame: css`
		width: 100%;
		min-width: 0;
	`,
		messageBodyContent: css`
		width: 100%;
		min-width: 0;
	`,
		userAvatar: css`
		width: 20px;
		height: 20px;
		border-radius: 999px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font-size: 10px;
		font-weight: 600;
		color: ${token.colorTextSecondary};
		border: 1px solid ${token.colorBorderSecondary};
		background: ${token.colorBgElevated};
	`,
		assistantAvatar: css`
		width: 22px;
		height: 22px;
		border-radius: 999px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border: 1px solid ${token.colorBorderSecondary};
		background: ${token.colorBgElevated};
	`,
		codeAvatar: css`
		width: 22px;
		height: 22px;
		border-radius: 999px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border: 1px solid ${token.colorBorderSecondary};
		background: ${token.colorBgElevated};
	`,
		userMessageText: css`
		color: ${token.colorText};
		white-space: pre-wrap;
		word-break: break-word;
	`,
		systemNotice: css`
		padding: 8px 10px;
		margin: 2px auto;
		font-size: 12px;
		color: ${token.colorTextTertiary};
		background: ${token.colorFillTertiary};
		border-radius: 10px;
	`,
		emptyState: css`
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 24px 16px;
		text-align: center;
	`,
		emptyIcon: css`
		width: 34px;
		height: 34px;
		border-radius: 999px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		background: ${token.colorBgElevated};
		border: 1px solid ${token.colorBorderSecondary};
		margin-bottom: 10px;
	`,
		emptyTitle: css`
		font-size: 14px;
		font-weight: 600;
		color: ${token.colorText};
	`,
		emptyDesc: css`
		margin-top: 6px;
		font-size: 12px;
		line-height: 1.5;
		color: ${token.colorTextSecondary};
	`,
		streamCursor: css`
		display: inline-block;
		width: 2px;
		height: 1em;
		margin-left: 2px;
		vertical-align: text-bottom;
		background: ${token.colorTextTertiary};
		animation: streamBlink 1s steps(1, end) infinite;

		@keyframes streamBlink {
			0%,
			49% {
				opacity: 1;
			}
			50%,
			100% {
				opacity: 0;
			}
		}
	`,
		scrollArea: css`
			flex: 1;
			overflow: hidden;
			min-height: 0;
		`,
		scrollAreaEmbedded: css`
			--mini-chat-side-gap: 16px;
		`,
		scrollAreaInner: css`
			width: 100%;
			height: 100%;
			max-width: calc(var(--mini-chat-content-width) + (var(--mini-chat-side-gap) * 2));
			margin: 0 auto;
			display: flex;
			flex-direction: column;
		`,
		timelineVirtualItem: css`
			width: 100%;
			max-width: calc(var(--mini-chat-content-width) + (var(--mini-chat-side-gap) * 2));
			margin: 0 auto;
			padding-inline: var(--mini-chat-side-gap);
			padding-bottom: 8px;
			box-sizing: border-box;
		`,
		backBottomAnchor: css`
			position: absolute;
			inset: 0;
			width: calc(100% - (var(--mini-chat-dock-inline-padding, 12px) * 2));
			max-width: calc(var(--mini-chat-content-width) + (var(--mini-chat-side-gap) * 2));
			margin: 0 auto;
			overflow: visible;
			pointer-events: none;
			z-index: 8;
		`,
		backBottomButton: css`
			inset-block-end: 24px;
		`,
	threadTerminalPanel: css`
		width: 100%;
		flex-shrink: 0;
		box-sizing: border-box;
	`,
	threadTerminalResizeHandle: css`
		height: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: ns-resize;
		user-select: none;
	`,
	threadTerminalResizeGrip: css`
		width: 40px;
		height: 4px;
		border-radius: 999px;
		background: ${token.colorBorder};
		transition: background 0.16s ease;
	`,
	threadTerminalCard: css`
		border-top: 1px solid ${token.colorBorderSecondary};
		background: ${token.colorBgContainer};
		overflow: hidden;
		display: flex;
		flex-direction: column;
	`,
	threadTerminalHeader: css`
		height: 36px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0;
		padding-right: 6px;
		border-bottom: 1px solid ${token.colorBorderSecondary};
		background: ${token.colorBgContainer};
	`,
	threadTerminalTabs: css`
		flex: 1;
		min-width: 0;
		display: flex;
		align-items: center;
		gap: 0;
		overflow-x: auto;
		padding: 0;

		&::-webkit-scrollbar {
			height: 0;
		}
	`,
	threadTerminalTab: css`
		display: inline-flex;
		align-items: center;
		gap: 4px;
		max-width: 180px;
		padding: 0 4px 0 8px;
		height: 100%;
		border-right: 1px solid ${token.colorBorderSecondary};
		border-radius: 0;
		background: transparent;
		color: ${token.colorTextSecondary};
		flex-shrink: 0;
		transition: background 0.14s ease, color 0.14s ease;
	`,
	threadTerminalTabActive: css`
		background: ${token.colorFillQuaternary};
		color: ${token.colorText};
	`,
	threadTerminalTabButton: css`
		display: inline-flex;
		align-items: center;
		gap: 0;
		min-width: 0;
		flex: 1;
		height: 100%;
		border: none;
		background: transparent;
		padding: 0;
		color: inherit;
		cursor: pointer;
	`,
	threadTerminalTabLabel: css`
		font-size: 12px;
		font-weight: 500;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	`,
	threadTerminalTabClose: css`
		width: 16px;
		height: 16px;
		border: none;
		border-radius: 4px;
		background: transparent;
		color: ${token.colorTextTertiary};
		display: inline-flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		flex-shrink: 0;
		opacity: 0.5;
		transition: opacity 0.14s ease, background 0.14s ease, color 0.14s ease;

		&:hover {
			opacity: 1;
			background: ${token.colorFill};
			color: ${token.colorText};
		}
	`,
	threadTerminalHeaderRight: css`
		display: inline-flex;
		align-items: center;
		gap: 2px;
		min-width: 0;
		padding-left: 8px;
	`,
	threadTerminalHeaderClose: css`
		color: ${token.colorTextTertiary};
	`,
	threadTerminalActionButton: css`
		border: none !important;
		box-shadow: none !important;
		background: transparent !important;
		color: ${token.colorTextTertiary};
		border-radius: 6px;

		&:hover {
			background: ${token.colorFillQuaternary} !important;
			color: ${token.colorText} !important;
		}
	`,
	threadTerminalBody: css`
		position: relative;
		flex: 1;
		min-height: 0;
		display: flex;
		overflow: hidden;
		padding: 0;
		background: ${token.colorBgContainer};
	`,
	threadTerminalEmptyState: css`
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 6px;
		padding: 24px;
		text-align: center;
	`,
	threadTerminalEmptyTitle: css`
		font-size: 13px;
		font-weight: 600;
		color: ${token.colorText};
	`,
	threadTerminalEmptyDescription: css`
		max-width: 320px;
		font-size: 12px;
		line-height: 1.5;
		color: ${token.colorTextTertiary};
	`,
	threadTerminalViewportStack: css`
		position: relative;
		flex: 1;
		min-width: 0;
		min-height: 0;
	`,
	threadTerminalView: css`
		position: absolute;
		inset: 0;
		min-width: 0;
		min-height: 0;
	`,
	threadTerminalViewActive: css`
		opacity: 1;
		pointer-events: auto;
		visibility: visible;
	`,
	threadTerminalViewHidden: css`
		opacity: 0;
		pointer-events: none;
		visibility: hidden;
	`,
	threadTerminalViewFocused: css`
		outline: none;
	`,
	threadTerminalViewport: css`
		width: 100%;
		height: 100%;
		overflow: hidden;
		font-family: ${token.fontFamilyCode};
		font-size: 12px;
		line-height: 1.4;

		.xterm {
			height: 100%;
		}

		.xterm-screen,
		.xterm-viewport {
			width: 100% !important;
		}

		.xterm-viewport {
			overflow-y: auto !important;
			background: transparent !important;
			scrollbar-width: thin;
			scrollbar-color: ${token.colorBorder} transparent;
		}

		.xterm-viewport::-webkit-scrollbar {
			width: 8px;
		}

		.xterm-viewport::-webkit-scrollbar-thumb {
			border-radius: 999px;
			background: ${token.colorBorder};
		}

		.xterm-viewport::-webkit-scrollbar-track {
			background: transparent;
		}

		.xterm-helper-textarea {
			opacity: 0;
		}
	`,
	messageMetaRow: css`
		display: inline-flex;
		align-items: center;
		gap: 6px;
		margin: 0 0 8px 2px;
		min-height: 20px;
	`,
		messageMetaAvatar: css`
		width: 20px;
		height: 20px;
		border-radius: 999px;
		flex-shrink: 0;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		background: ${token.colorBgContainer};
		border: 1px solid ${token.colorBorderSecondary};
	`,
		messageMetaLabel: css`
		font-size: var(--mimi-font-size-sm);
		font-weight: var(--mimi-font-weight-semibold);
		letter-spacing: 0.01em;
		color: ${token.colorTextSecondary};
	`,
		messageMetaDot: css`
		font-size: var(--mimi-font-size-xs);
		color: ${token.colorTextQuaternary};
	`,
		messageMetaTime: css`
		font-size: var(--mimi-font-size-xs);
		color: ${token.colorTextTertiary};
		font-variant-numeric: tabular-nums;
	`,
		messageMetaStreaming: css`
		font-size: var(--mimi-font-size-xs);
		font-weight: var(--mimi-font-weight-medium);
		padding: 2px 7px;
		border-radius: 999px;
		color: ${token.colorPrimary};
		background: ${token.colorPrimaryBg};
	`,
		chatItem: css`
			width: 100%;
			animation: chatSlideIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
			transform-origin: bottom center;
			transition: opacity 0.5s ease-in-out, transform 0.5s ease-in-out;

			@keyframes chatSlideIn {
				0% {
					opacity: 0;
					transform: translateY(12px) scale(0.98);
				}
					100% {
						opacity: 1;
						transform: translateY(0) scale(1);
					}
				}

			& [data-layout] > .lobe-flex > .lobe-flex {
				padding: 8px 12px !important;
				max-width: 100% !important;
			}
		`,
		chatItemUser: css`
			animation: chatSlideIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
			transform-origin: bottom right;
			transition: opacity 0.5s ease-in-out, transform 0.5s ease-in-out;
			width: 100%;

			@media (max-width: 575.98px) {
				/* Use stable structure selectors instead of runtime acss-* hash classes */
				& > .lobe-flex > .lobe-flex > .lobe-flex > .lobe-flex {
					--lobe-flex-width: auto !important;
					width: auto !important;
					max-width: 100% !important;
				}
			}
	`,
		markdownBubble: css`
		font-size: var(--mimi-font-size-base);
		line-height: var(--mimi-line-height-relaxed) !important;
		color: ${token.colorText};
		overflow-wrap: anywhere;
		letter-spacing: 0;

		& p {
			margin: 0 !important;
		}

		& p + p {
			margin-top: 0.9em !important;
		}

		pre {
			margin: 0.75em 0 !important;
			border-radius: ${token.borderRadiusLG}px;
			overflow: hidden;
			border: 1px solid ${token.colorBorderSecondary} !important;
		}

		:not(pre) > code {
			padding: 0.15em 0.4em;
			border-radius: ${token.borderRadiusSM}px;
			background: ${token.colorFillTertiary};
			font-family: ${token.fontFamilyCode};
			font-size: 0.92em;
		}
	`,
		pathTag: css`
		display: inline-flex;
		align-items: center;
		gap: 5px;
		max-width: 220px;
		padding: 3px 8px;
		border-radius: 14px;
		font-size: var(--mimi-font-size-sm);
		border: 1px solid ${token.colorBorderSecondary};
		background: ${token.colorFillTertiary};
		color: ${token.colorText};
	`,
	bottomDock: css`
		width: 100%;
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		margin-top: auto;
	`,
	inputDock: css`
		padding: 10px var(--mini-chat-side-gap) 12px;
		display: flex;
		flex-direction: column;
		gap: 6px;
		position: relative;
		overflow: visible;
		align-items: stretch;
		z-index: 6;
	`,
	inputDockEmbedded: css`
		padding-left: var(--mini-chat-side-gap);
		padding-right: var(--mini-chat-side-gap);
	`,
	todoDock: css`
		max-width: var(--mini-chat-content-width, 800px);
		margin: 0 auto;
		width: 100%;
		position: relative;
		z-index: 2;
	`,
	todoDockInset: css`
		width: calc(100% - 48px);
		max-width: calc(var(--mini-chat-content-width, 800px) - 48px);

		@media (max-width: 640px) {
			width: calc(100% - 26px);
			max-width: calc(var(--mini-chat-content-width, 800px) - 26px);
		}
	`,
	todoDockFloating: css`
		position: absolute;
		left: 50%;
		bottom: calc(100% - 8px);
		transform: translateX(-50%);
		pointer-events: auto;
	`,
	todoDockFused: css`
		margin-bottom: 0;
	`,
	composerStatusRow: css`
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		min-height: 20px;
		padding: 1px 4px 0;
		color: ${token.colorTextSecondary};
		font-size: 11px;
		line-height: 1;
		max-width: var(--mini-chat-content-width, 800px);
		margin: 0 auto;
		width: 100%;
	`,
		composerStatusLeft: css`
		display: inline-flex;
		align-items: center;
		gap: 12px;
		min-width: 0;
	`,
		composerStatusRight: css`
		display: inline-flex;
		align-items: center;
		gap: 12px;
		min-width: 0;
	`,
		composerStatusItem: css`
		display: inline-flex;
		align-items: center;
		gap: 4px;
		min-width: 0;
		white-space: nowrap;
		font-variant-numeric: tabular-nums;
	`,
		composerStatusItemButton: css`
		padding: 0;
		border: 0;
		background: transparent;
		color: inherit;
		cursor: pointer;
	`,
		composerStatusPermission: css`
		color: #dd5a1f;
	`,
		branchDropdownOverlay: css`
		.ant-dropdown-menu {
			display: none;
		}
	`,
		branchDropdownPanel: css`
		width: 300px;
		max-width: min(300px, calc(100vw - 20px));
		border-radius: 14px;
		border: 1px solid ${token.colorBorderSecondary};
		background: ${token.colorBgContainer};
		box-shadow:
			0 14px 30px rgba(15, 23, 42, 0.12),
			0 2px 8px rgba(15, 23, 42, 0.08);
		overflow: hidden;
	`,
		branchDropdownSearchRow: css`
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 0 10px;
		height: 34px;
		border-radius: 8px;
		border: 1px solid ${token.colorBorderSecondary};
		background: ${token.colorBgElevated};
		margin: 8px 8px 2px;
	`,
		branchDropdownSearchIcon: css`
		flex-shrink: 0;
		color: ${token.colorTextQuaternary};
	`,
		branchDropdownSearchInput: css`
		flex: 1;
		min-width: 0;
		border: 0;
		outline: 0;
		background: transparent;
		color: ${token.colorText};
		font-size: 12px;
		line-height: 1.2;
		font-weight: 400;
		padding: 0;

		&::placeholder {
			color: ${token.colorTextQuaternary};
		}
	`,
		branchDropdownSectionLabel: css`
		padding: 6px 12px 4px;
		font-size: 12px;
		line-height: 1.3;
		font-weight: 400;
		color: ${token.colorTextTertiary};
	`,
		branchDropdownMenuWrap: css`
		max-height: 246px;
		overflow-y: auto;
		padding: 0 6px 6px;

		&::-webkit-scrollbar {
			width: 6px;
		}

		&::-webkit-scrollbar-thumb {
			background: ${token.colorBorder};
			border-radius: 999px;
		}

		&::-webkit-scrollbar-track {
			background: transparent;
		}
	`,
		branchDropdownItem: css`
		width: 100%;
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 10px;
		padding: 7px 8px;
		border: 0;
		border-radius: 8px;
		background: transparent;
		text-align: left;
		cursor: pointer;
		transition: background-color 0.14s ease;

		&:hover {
			background: ${token.colorFillTertiary};
		}
	`,
		branchDropdownItemActive: css`
		background: ${token.colorFillQuaternary};
	`,
		branchDropdownItemMain: css`
		display: inline-flex;
		align-items: flex-start;
		gap: 8px;
		min-width: 0;
	`,
		branchDropdownItemIcon: css`
		flex-shrink: 0;
		margin-top: 2px;
		color: ${token.colorTextSecondary};
	`,
		branchDropdownItemTextWrap: css`
		display: inline-flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	`,
		branchDropdownItemName: css`
		font-size: 15px;
		line-height: 1.2;
		font-weight: 400;
		color: ${token.colorText};
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	`,
		branchDropdownItemDetail: css`
		font-size: 12px;
		line-height: 1.3;
		color: ${token.colorTextTertiary};
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	`,
		branchDropdownItemCheck: css`
		flex-shrink: 0;
		margin-top: 2px;
		color: transparent;
	`,
		branchDropdownItemCheckVisible: css`
		color: ${token.colorTextSecondary};
	`,
		branchDropdownEmptyState: css`
		padding: 8px 8px 10px;
		font-size: 12px;
		line-height: 1.3;
		color: ${token.colorTextTertiary};
	`,
		branchDropdownCreateButton: css`
		display: inline-flex;
		align-items: center;
		gap: 8px;
		width: 100%;
		padding: 10px 12px;
		margin-top: 2px;
		border: 0;
		border-top: 1px solid ${token.colorBorderSecondary};
		background: transparent;
		color: ${token.colorText};
		font-size: 13px;
		line-height: 1.2;
		font-weight: 400;
		cursor: pointer;
		border-radius: 0;
		transition: background-color 0.16s ease;

		&:hover {
			background: ${token.colorFillTertiary};
		}
	`,
		elicitationPopup: css`
		position: absolute;
		right: 12px;
		bottom: calc(100% + 10px);
		z-index: 40;
		pointer-events: auto;
		max-width: min(420px, calc(100% - 24px));
		width: 100%;
		display: flex;
		justify-content: flex-end;
		filter: drop-shadow(0 18px 48px rgba(15, 23, 42, 0.16));
		animation: elicitationPopupIn 0.18s ease-out;
		transform-origin: bottom right;

		@keyframes elicitationPopupIn {
			from {
				opacity: 0;
				transform: translateY(8px) scale(0.98);
			}
			to {
				opacity: 1;
				transform: translateY(0) scale(1);
			}
		}
	`,
	}),
);
