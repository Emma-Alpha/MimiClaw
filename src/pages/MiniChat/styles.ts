import { createStyles } from "antd-style";

export const useMiniChatStyles = createStyles(({ token, css }) => ({
	root: css`
		height: 100vh;
		width: 100vw;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		background: transparent;
	`,
	header: css`
		height: 48px;
		display: grid;
		grid-template-columns: auto 1fr auto;
		align-items: center;
		gap: 8px;
		padding: 10px 12px 8px;
		-webkit-app-region: drag;
	`,
	brand: css`
		display: flex;
		align-items: center;
		gap: 10px;
		min-width: 0;
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
	headerActions: css`
		display: flex;
		align-items: center;
		gap: 4px;
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
		padding: 2px;
		overflow: visible;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: max-width 0.4s cubic-bezier(0.32, 0.72, 0, 1),
			flex 0.4s cubic-bezier(0.32, 0.72, 0, 1), filter 0.3s ease;
		filter: drop-shadow(0 8px 18px rgba(2, 6, 23, 0.32));
		max-width: min(100%, 480px);
		min-width: 40px;
		will-change: max-width, flex;
	`,
	dynamicIslandWrapperGenerating: css`
		filter: drop-shadow(0 0 16px rgba(37, 99, 235, 0.34));
		animation: islandBreath 1.8s ease-in-out infinite;

		@keyframes islandBreath {
			0%,
			100% {
				transform: translateY(0) scale(1);
			}
			50% {
				transform: translateY(-0.5px) scale(1.012);
			}
		}

		@media (prefers-reduced-motion: reduce) {
			animation: none;
		}
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
		background:
			linear-gradient(
				180deg,
				rgba(10, 14, 21, 0.92),
				rgba(7, 10, 16, 0.88)
			)
			padding-box,
			linear-gradient(
				145deg,
				rgba(255, 255, 255, 0.3),
				rgba(148, 163, 184, 0.14),
				rgba(15, 23, 42, 0.18)
			)
			border-box;
		border: 1px solid transparent;
		opacity: 1;
	`,
	dynamicIslandGlowGenerating: css`
		background:
			linear-gradient(
				180deg,
				rgba(10, 14, 21, 0.94),
				rgba(8, 12, 19, 0.9)
			)
			padding-box,
			conic-gradient(
				from var(--ai-angle),
				#3b82f6,
				#60a5fa,
				#22d3ee,
				#1d4ed8,
				#3b82f6
			)
			border-box;
		border: 1px solid transparent;
		animation: aiRotate 3.2s linear infinite;
		opacity: 1;
		filter: saturate(1.18) brightness(1.05);

		@property --ai-angle {
			syntax: "<angle>";
			initial-value: 0deg;
			inherits: false;
		}

		@keyframes aiRotate {
			0% {
				--ai-angle: 0deg;
			}
			100% {
				--ai-angle: 360deg;
			}
		}

		@media (prefers-reduced-motion: reduce) {
			animation: none;
		}
	`,
	dynamicIslandFrost: css`
		position: absolute;
		inset: 1px;
		border-radius: inherit;
		z-index: 1;
		pointer-events: none;
		background:
			radial-gradient(
				140% 95% at 18% -20%,
				rgba(255, 255, 255, 0.16),
				rgba(255, 255, 255, 0) 58%
			),
			linear-gradient(
				180deg,
				rgba(255, 255, 255, 0.08),
				rgba(255, 255, 255, 0.01) 45%,
				rgba(255, 255, 255, 0.06) 100%
			);
		opacity: 0.9;
	`,
	dynamicIslandSpecular: css`
		position: absolute;
		top: 0;
		left: 15%;
		right: 15%;
		height: 1px;
		background: linear-gradient(
			to right,
			transparent,
			rgba(255, 255, 255, 0.95),
			transparent
		);
		z-index: 3;
		opacity: 0.38;
	`,
	dynamicIsland: css`
		display: flex;
		align-items: center;
		background: rgba(7, 10, 16, 0.86);
		backdrop-filter: blur(20px) saturate(1.1);
		border-radius: 999px;
		height: 32px;
		padding: 0 12px;
		gap: 8px;
		color: rgba(248, 250, 252, 0.96);
		max-width: 100%;
		min-width: 0;
		position: relative;
		z-index: 2;
		transition: background-color 0.3s ease,
			padding 0.4s cubic-bezier(0.32, 0.72, 0, 1);
		flex: 1;
		overflow: hidden;

		&:hover {
			background: rgba(10, 14, 21, 0.92);
		}
	`,
	dynamicIslandGenerating: css`
		background: rgba(8, 12, 20, 0.92);
		animation: islandSurfacePulse 1.8s ease-in-out infinite;

		@keyframes islandSurfacePulse {
			0%,
			100% {
				box-shadow: inset 0 0 0 0 rgba(59, 130, 246, 0.06),
					0 0 0 0 rgba(37, 99, 235, 0);
			}
			50% {
				box-shadow: inset 0 0 0 1px rgba(59, 130, 246, 0.24),
					0 0 18px 0 rgba(37, 99, 235, 0.24);
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
	islandIcon: css`
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		color: ${token.colorPrimary};
	`,
	islandTextWrapper: css`
		display: flex;
		align-items: center;
		position: relative;
		flex: 1;
		min-width: 0;
	`,
	islandTextLabel: css`
		font-weight: 500;
		font-size: 13px;
		color: rgba(248, 250, 252, 0.95);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		display: block;
		min-width: 0;
		transition: flex 0.4s cubic-bezier(0.32, 0.72, 0, 1),
			max-width 0.4s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.2s ease,
			transform 0.4s cubic-bezier(0.32, 0.72, 0, 1);
		will-change: flex, max-width, opacity, transform;
	`,
	islandTextLabelCollapsed: css`
		flex: 1 1 auto;
		max-width: 100%;
		opacity: 1;
		transform: translateX(0);
	`,
	islandGeneratingBadge: css`
		display: inline-flex;
		align-items: center;
		flex-shrink: 0;
		padding: 2px 7px;
		border-radius: 999px;
		background: rgba(15, 23, 42, 0.46);
		border: 1px solid rgba(148, 163, 184, 0.22);
	`,
	islandGeneratingWave: css`
		display: inline-flex;
		align-items: center;
		gap: 4px;
	`,
	islandGeneratingDot: css`
		width: 6px;
		height: 6px;
		border-radius: 999px;
		background: #2563eb;
		box-shadow: 0 0 8px rgba(37, 99, 235, 0.5);
		animation: islandDotPulse 1.15s ease-in-out infinite;

		&:nth-of-type(2) {
			animation-delay: 0.12s;
		}

		&:nth-of-type(3) {
			animation-delay: 0.24s;
		}

		@keyframes islandDotPulse {
			0%,
			100% {
				opacity: 0.32;
				transform: scale(0.9) translateY(0);
			}
			50% {
				opacity: 1;
				transform: scale(1.15) translateY(-0.5px);
			}
		}

		@media (prefers-reduced-motion: reduce) {
			animation: none;
		}
	`,
	islandTextLabelExpanded: css`
		flex: 0;
		max-width: 0px;
		opacity: 0;
		margin-right: 0;
		transform: translateX(-10px);
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
		overflow: visible;
	`,
	islandContextBadgeWrap: css`
		position: absolute;
		left: 50%;
		top: -6px;
		transform: translate(-50%, -100%);
		z-index: 6;
	`,
	islandContextBadge: css`
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 3px 8px 3px 4px;
		border-radius: 999px;
		border: 1px solid rgba(15, 23, 42, 0.2);
		background: rgba(250, 250, 252, 0.94);
		backdrop-filter: blur(10px);
		box-shadow: 0 7px 20px rgba(15, 23, 42, 0.16);
		color: rgba(15, 23, 42, 0.82);
	`,
	islandContextBadgeText: css`
		font-size: 10px;
		line-height: 1;
		font-weight: 700;
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
		color: rgba(191, 219, 254, 0.98);
		border-radius: 50%;
		height: 22px;
		width: 22px;
		transition: background 0.2s ease, transform 0.2s ease;
		&:hover {
			background: rgba(148, 163, 184, 0.22);
			transform: scale(1.1);
		}
	`,
	islandDropdown: css`
		position: absolute;
		top: calc(100% + 8px);
		left: 50%;
		transform: translateX(-50%);
		z-index: 100;
		width: min(94vw, 640px);
		min-width: 320px;
		max-height: calc(100vh - 72px);
		border-radius: 22px;
		border: 1px solid rgba(15, 23, 42, 0.12);
		background: rgba(245, 245, 247, 0.96);
		backdrop-filter: blur(18px) saturate(1.05);
		box-shadow: 0 18px 44px rgba(15, 23, 42, 0.18), 0 2px 12px rgba(15, 23, 42, 0.12);
		padding: 10px 0;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		animation: dropdownIn 0.18s cubic-bezier(0.32, 0.72, 0, 1);

		@keyframes dropdownIn {
			from {
				opacity: 0;
				transform: translateX(-50%) translateY(-6px) scale(0.97);
			}
			to {
				opacity: 1;
				transform: translateX(-50%) translateY(0) scale(1);
			}
		}
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
		font-size: 16px;
		font-weight: 600;
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
		gap: 2px;
		flex: 1 1 auto;
		min-height: 72px;
		max-height: min(360px, calc(100vh - 300px));
		overflow-y: auto;
		padding: 8px 8px 6px;
	`,
	islandSessionItem: css`
		display: flex;
		width: 100%;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		padding: 10px 12px;
		border-radius: 14px;
		text-align: left;
		transition: background 0.16s ease, color 0.16s ease;

		&:hover {
			background: rgba(15, 23, 42, 0.06);
		}
	`,
	islandSessionItemActive: css`
		background: rgba(15, 23, 42, 0.08);
	`,
	islandSessionItemTitle: css`
		flex: 1;
		min-width: 0;
		font-size: clamp(14px, 1.8vw, 16px);
		font-weight: 500;
		color: ${token.colorText};
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		line-height: 1.25;
	`,
	islandSessionItemSide: css`
		display: flex;
		align-items: center;
		gap: 12px;
		flex-shrink: 0;
		min-width: 72px;
		justify-content: flex-end;
	`,
	islandSessionItemMeta: css`
		font-size: clamp(12px, 1.6vw, 14px);
		line-height: 1;
		color: ${token.colorTextSecondary};
		font-weight: 500;
		font-variant-numeric: tabular-nums;
	`,
	islandSessionItemIndicator: css`
		width: 12px;
		height: 12px;
		border-radius: 999px;
		border: 2px solid rgba(15, 23, 42, 0.22);
		flex-shrink: 0;
	`,
	islandSessionItemIndicatorActive: css`
		border-color: rgba(15, 23, 42, 0.7);
		background: rgba(15, 23, 42, 0.6);
	`,
	islandSessionEmpty: css`
		font-size: 14px;
		color: ${token.colorTextSecondary};
		padding: 14px 12px;
	`,
	islandDropdownNewBtn: css`
		display: flex;
		width: 100%;
		align-items: center;
		gap: 8px;
		padding: 10px 18px;
		font-size: 14px;
		color: ${token.colorTextSecondary};
		border-radius: 0;
		transition: background 0.15s ease, color 0.15s ease;
		text-align: left;
		&:hover {
			background: rgba(15, 23, 42, 0.06);
			color: ${token.colorText};
		}
	`,
	islandAction: css`
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		color: rgba(226, 232, 240, 0.62);
		border-radius: 50%;
		height: 20px;
		width: 20px;
		transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
		&:hover {
			color: rgba(248, 250, 252, 0.96);
			background: rgba(148, 163, 184, 0.2);
			transform: scale(1.1);
		}
	`,
	islandActionActive: css`
		color: ${token.colorPrimary};
		background: ${token.colorPrimaryBg};
		&:hover {
			background: ${token.colorPrimaryBgHover};
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
		width: 22px;
		height: 22px;
		border-radius: 999px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font-size: 11px;
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
		font-size: 13px;
		line-height: 1.5;
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
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 42px 16px 20px;
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
		overflow-y: auto;
		padding: 18px 14px;
	`,
	scrollAreaVirtual: css`
		overflow: hidden;
	`,
	timeline: css`
		display: flex;
		flex-direction: column;
		gap: 8px;
	`,
	timelineRow: css`
		width: 100%;
	`,
	timelineVirtual: css`
		width: 100%;
	`,
	timelineVirtualItem: css`
		width: 100%;
		padding-bottom: 8px;
		box-sizing: border-box;
	`,
	messageMetaRow: css`
		display: inline-flex;
		align-items: center;
		gap: 5px;
		margin: 1px 0 4px 2px;
		min-height: 18px;
	`,
	messageMetaAvatar: css`
		width: 18px;
		height: 18px;
		border-radius: 999px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border: 1px solid rgba(15, 23, 42, 0.12);
		background: rgba(255, 255, 255, 0.92);
		box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
	`,
	messageMetaLabel: css`
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.01em;
		color: rgba(15, 23, 42, 0.78);
	`,
	messageMetaDot: css`
		font-size: 10px;
		color: rgba(15, 23, 42, 0.38);
	`,
	messageMetaTime: css`
		font-size: 11px;
		color: rgba(15, 23, 42, 0.52);
		font-variant-numeric: tabular-nums;
	`,
	messageMetaStreaming: css`
		font-size: 10px;
		font-weight: 500;
		padding: 1px 6px;
		border-radius: 999px;
		color: rgba(37, 99, 235, 0.9);
		background: rgba(37, 99, 235, 0.12);
	`,
	chatItem: css`
		width: 100%;
		animation: chatSlideIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
		transform-origin: bottom center;

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

		:global {
			.lobe-chat-item {
				width: 100%;
				gap: 4px !important;
				padding: 8px 0 4px !important;
			}
			.lobe-chat-item-message {
				margin-left: 0 !important;
				margin-right: 0 !important;
				align-items: flex-start !important;
				gap: 2px !important;
			}
			.lobe-chat-item-message-item {
				padding: 8px 12px !important;
				max-width: 100% !important;
			}
		}
	`,
	markdownBubble: css`
		font-size: 13px;
		line-height: 1.5 !important;
		color: ${token.colorText};
		overflow-wrap: anywhere;
		letter-spacing: 0;

		& p,
		:global(.markdown-body) p {
			margin: 0 !important;
		}
	`,
	inputDock: css`
		padding: 10px 12px 12px;
		display: flex;
		flex-direction: column;
		gap: 10px;
		position: relative;
		overflow: visible;
		align-items: stretch;
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
}));
