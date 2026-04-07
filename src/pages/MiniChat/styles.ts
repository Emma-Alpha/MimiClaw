import { createStyles } from "antd-style";

export const useMiniChatStyles = createStyles(({ token, css }) => ({
	root: css`
		height: 100vh;
		width: 100vw;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		background: transparent;
		user-select: none;
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
		filter: drop-shadow(0 0 12px rgba(124, 58, 237, 0.15));
		max-width: 240px;
		min-width: 40px;
		will-change: max-width, flex;
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
		background: linear-gradient(#fff, #fff) padding-box,
			conic-gradient(
				from var(--ai-angle),
				#60a5fa,
				#a78bfa,
				#f472b6,
				#fb7185,
				#fb923c,
				#fbbf24,
				#4ade80,
				#2dd4bf,
				#60a5fa
			) border-box;
		border: 2px solid transparent;
		animation: aiRotate 4.5s linear infinite;

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
	`,
	dynamicIslandSpecular: css`
		position: absolute;
		top: 0;
		left: 15%;
		right: 15%;
		height: 0.5px;
		background: linear-gradient(
			to right,
			transparent,
			rgba(255, 255, 255, 0.95),
			transparent
		);
		z-index: 3;
		opacity: 0.5;
	`,
	dynamicIsland: css`
		display: flex;
		align-items: center;
		background: rgba(255, 255, 255, 0.55);
		backdrop-filter: blur(25px) saturate(1.8);
		border-radius: 999px;
		height: 32px;
		padding: 0 12px;
		gap: 8px;
		color: ${token.colorText};
		max-width: 100%;
		min-width: 0;
		position: relative;
		z-index: 2;
		transition: background-color 0.3s ease,
			padding 0.4s cubic-bezier(0.32, 0.72, 0, 1);
		flex: 1;
		overflow: hidden;

		&:hover {
			background: rgba(255, 255, 255, 0.75);
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
		color: ${token.colorText};
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
		flex: 0 1 auto;
		max-width: 160px;
		opacity: 1;
		transform: translateX(0);
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
		color: ${token.colorTextSecondary};
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
			color: ${token.colorText};
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
	islandIconBtn: css`
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		color: ${token.colorPrimary};
		border-radius: 50%;
		height: 22px;
		width: 22px;
		transition: background 0.2s ease, transform 0.2s ease;
		&:hover {
			background: ${token.colorFill};
			transform: scale(1.1);
		}
	`,
	islandDropdown: css`
		position: absolute;
		top: calc(100% + 8px);
		left: 50%;
		transform: translateX(-50%);
		z-index: 100;
		min-width: 280px;
		max-width: 340px;
		border-radius: 12px;
		border: 1px solid ${token.colorBorderSecondary};
		background: ${token.colorBgElevated};
		box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.02);
		padding: 8px 0;
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
		padding: 8px 12px 10px;
		display: flex;
		flex-direction: column;
		gap: 4px;
	`,
	islandDropdownTitle: css`
		font-size: 13px;
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
		font-size: 11px;
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
	islandDropdownEmpty: css`
		font-size: 12px;
		color: ${token.colorTextTertiary};
		margin-top: 2px;
	`,
	islandDropdownDivider: css`
		height: 1px;
		background: ${token.colorBorderSecondary};
		margin: 0 8px;
	`,
	islandSessionList: css`
		display: flex;
		flex-direction: column;
		gap: 4px;
		max-height: 180px;
		overflow-y: auto;
		margin-top: 6px;
	`,
	islandSessionItem: css`
		display: flex;
		width: 100%;
		flex-direction: column;
		align-items: flex-start;
		gap: 2px;
		padding: 8px 10px;
		border-radius: 8px;
		text-align: left;
		transition: background 0.15s ease, color 0.15s ease;

		&:hover {
			background: ${token.colorFillTertiary};
		}
	`,
	islandSessionItemActive: css`
		background: ${token.colorPrimaryBg};
	`,
	islandSessionItemTitle: css`
		width: 100%;
		font-size: 12px;
		font-weight: 500;
		color: ${token.colorText};
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	`,
	islandSessionItemMeta: css`
		font-size: 11px;
		color: ${token.colorTextTertiary};
	`,
	islandDropdownNewBtn: css`
		display: flex;
		width: 100%;
		align-items: center;
		gap: 8px;
		padding: 8px 12px;
		font-size: 13px;
		color: ${token.colorTextSecondary};
		border-radius: 0;
		transition: background 0.15s ease, color 0.15s ease;
		text-align: left;
		&:hover {
			background: ${token.colorFillTertiary};
			color: ${token.colorText};
		}
	`,
	islandAction: css`
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		color: ${token.colorTextTertiary};
		border-radius: 50%;
		height: 20px;
		width: 20px;
		transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
		&:hover {
			color: ${token.colorText};
			background: ${token.colorFill};
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
	scrollArea: css`
		flex: 1;
		overflow-y: auto;
		padding: 18px 14px;
	`,
	timeline: css`
		display: flex;
		flex-direction: column;
		gap: 8px;
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
			}
			.lobe-chat-item-message {
				margin-left: 0 !important;
				margin-right: 0 !important;
				align-items: flex-start !important;
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
		gap: 8px;
	`,
}));
