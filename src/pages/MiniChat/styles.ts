import { createStyles } from "antd-style";

export const useMiniChatStyles = createStyles(({ token, css }) => {
	return {
		root: css`
			display: flex;
			height: 100vh;
			width: 100vw;
			flex-direction: column;
			overflow: hidden;
			background:
				radial-gradient(circle at top, rgba(59, 130, 246, 0.08), transparent 36%),
				${token.colorBgLayout};
			color: ${token.colorText};
		`,
		header: css`
			display: flex;
			height: 48px;
			flex-shrink: 0;
			align-items: center;
			gap: 12px;
			border-bottom: 1px solid ${token.colorBorderSecondary};
			background: ${token.colorBgContainer};
			padding: 0 8px 0 14px;
			backdrop-filter: blur(12px);
		`,
		brand: css`
			display: flex;
			align-items: center;
			gap: 10px;
			min-width: 0;
		`,
		brandLogo: css`
			display: flex;
			height: 22px;
			width: 22px;
			align-items: center;
			justify-content: center;
			border-radius: 999px;
			background: ${token.colorPrimaryBg};
			box-shadow: inset 0 0 0 1px ${token.colorPrimaryBorder};

			svg {
				height: 14px;
				width: 14px;
			}
		`,
		brandText: css`
			display: flex;
			align-items: center;
			gap: 8px;
			min-width: 0;
		`,
		brandTitle: css`
			font-size: 13px;
			font-weight: 700;
			color: ${token.colorText};
		`,
		status: css`
			display: inline-flex;
			align-items: center;
			gap: 6px;
			min-width: 0;
			font-size: 12px;
			color: ${token.colorTextSecondary};
		`,
		statusDot: css`
			height: 6px;
			width: 6px;
			flex-shrink: 0;
			border-radius: 999px;
		`,
		statusDotReady: css`
			background: #22c55e;
		`,
		statusDotWorking: css`
			background: #16a34a;
			box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.28);
			animation: workPulse 1.4s infinite;

			@keyframes workPulse {
				0% {
					box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.28);
				}
				70% {
					box-shadow: 0 0 0 6px rgba(22, 163, 74, 0);
				}
				100% {
					box-shadow: 0 0 0 0 rgba(22, 163, 74, 0);
				}
			}
		`,
		statusDotPending: css`
			background: #f59e0b;
			animation: pulse 1.5s infinite;

			@keyframes pulse {
				0%, 100% { opacity: 0.55; }
				50% { opacity: 1; }
			}
		`,
		statusDotError: css`
			background: #ef4444;
		`,
		headerCenter: css`
			display: flex;
			align-items: center;
			justify-content: center;
			gap: 6px;
			flex: 1;
			min-width: 0;
			margin: 0 8px;
		`,
		headerActions: css`
			display: flex;
			align-items: center;
			gap: 4px;
			flex-shrink: 0;
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
						filter 0.3s ease;
			filter: drop-shadow(0 0 12px rgba(124, 58, 237, 0.15));
			max-width: 140px;
			min-width: 40px;
			will-change: max-width;
		`,
		dynamicIslandWrapperExpanded: css`
			max-width: 320px;
		`,
		dynamicIslandGlow: css`
			position: absolute;
			inset: 0;
			border-radius: inherit;
			z-index: 0;
			
			/* Pure shimmering edge - using background-clip trick for a real bold rainbow border */
			background: 
				linear-gradient(#fff, #fff) padding-box,
				conic-gradient(
					from var(--ai-angle),
					#60a5fa, #a78bfa, #f472b6, #fb7185, #fb923c, #fbbf24, #4ade80, #2dd4bf, #60a5fa
				) border-box;
			border: 2px solid transparent;
			animation: aiRotate 4.5s linear infinite;

			@property --ai-angle {
				syntax: '<angle>';
				initial-value: 0deg;
				inherits: false;
			}

			@keyframes aiRotate {
				0% { --ai-angle: 0deg; }
				100% { --ai-angle: 360deg; }
			}
		`,
		dynamicIslandSpecular: css`
			position: absolute;
			top: 0;
			left: 15%;
			right: 15%;
			height: 0.5px;
			background: linear-gradient(to right, transparent, rgba(255, 255, 255, 0.95), transparent);
			z-index: 3;
			opacity: 0.5;
		`,
		dynamicIsland: css`
			display: flex;
			align-items: center;
			/* Crystal glass for light theme */
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
						max-width 0.4s cubic-bezier(0.32, 0.72, 0, 1),
						opacity 0.2s ease,
						transform 0.4s cubic-bezier(0.32, 0.72, 0, 1);
			will-change: flex, max-width, opacity, transform;
		`,
		islandTextLabelCollapsed: css`
			flex: 1;
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
						max-width 0.4s cubic-bezier(0.32, 0.72, 0, 1),
						opacity 0.2s ease,
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
			opacity: 1;
			transform: translateX(0);
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

			/* Override Lobe ChatItem defaults for extreme density */
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
				/* Bubble padding reduction */
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

			/* Force override of LobeUI's Markdown body spacing and ANY native spacing */
			& p, :global(.markdown-body) p {
				margin-top: 0 !important;
				margin-bottom: 2px !important;
				line-height: 1.5 !important;
			}
			& ul, & ol, :global(.markdown-body) ul, :global(.markdown-body) ol {
				padding-left: 14px !important;
				margin-top: 2px !important;
				margin-bottom: 2px !important;
			}
			& li, :global(.markdown-body) li {
				margin-top: 0 !important;
				margin-bottom: 0 !important;
				line-height: 1.5 !important;
			}
			& li > p, :global(.markdown-body) li > p {
				margin-top: 0 !important;
				margin-bottom: 0 !important;
			}
			& pre, :global(.markdown-body) pre {
				margin-top: 6px !important;
				margin-bottom: 6px !important;
				overflow: auto;
				border-radius: 8px !important;
				background: ${token.colorFillQuaternary} !important;
				border: 1px solid ${token.colorBorderSecondary} !important;
				padding: 8px 10px !important;
				box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.02) !important;
			}
			& *:first-child, :global(.markdown-body) *:first-child {
				margin-top: 0 !important;
			}
			& *:last-child, :global(.markdown-body) *:last-child {
				margin-bottom: 0 !important;
			}

			code {
				border-radius: 5px;
				background: ${token.colorFillAlter};
				border: 1px solid ${token.colorBorderSecondary};
				padding: 0.15em 0.4em;
				font-size: 13px;
				font-family: ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace;
				color: ${token.colorText};
				word-break: break-word;
			}

			pre code {
				background: transparent !important;
				border: none !important;
				padding: 0 !important;
				color: inherit !important;
				font-size: 12px;
				word-break: normal;
			}
		`,
		messageBodyFrame: css`
			display: flex;
			flex-direction: column;
			gap: 4px;
			min-width: 0;
		`,
		messageBodyContent: css`
			min-width: 0;
		`,
		messageBodyContentCollapsed: css`
			position: relative;
			max-height: 180px;
			overflow: hidden;
			mask-image: linear-gradient(to bottom, black 50%, transparent 100%);
			-webkit-mask-image: linear-gradient(to bottom, black 50%, transparent 100%);
		`,
		messageToggle: css`
			align-self: center;
			margin-top: -16px;
			z-index: 2;
			border: 1px solid ${token.colorBorderSecondary};
			border-radius: 20px;
			background: ${token.colorBgElevated};
			padding: 4px 14px;
			font-size: 12px;
			font-weight: 500;
			color: ${token.colorTextSecondary};
			cursor: pointer;
			box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
			transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
			backdrop-filter: blur(8px);
			display: inline-flex;
			align-items: center;
			gap: 6px;

			&:hover {
				color: ${token.colorPrimary};
				border-color: ${token.colorPrimaryBorder};
				transform: translateY(-2px);
				box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
			}

			&:active {
				transform: translateY(0);
			}

			&::after {
				content: "";
				display: inline-block;
				width: 5px;
				height: 5px;
				border-right: 1.5px solid currentColor;
				border-bottom: 1.5px solid currentColor;
				transform: rotate(45deg);
				margin-bottom: 2px;
				transition: transform 0.3s ease;
			}
		`,
		messageToggleExpanded: css`
			&::after {
				transform: rotate(-135deg);
				margin-bottom: -4px;
			}
		`,
		userMessageText: css`
			white-space: pre-wrap;
			word-break: break-word;
			overflow-wrap: anywhere;
			font-size: 13px;
			line-height: 1.6;
			color: ${token.colorText};
		`,
		streamCursor: css`
			display: inline-block;
			margin-left: 2px;
			height: 16px;
			width: 8px;
			background: ${token.colorTextSecondary};
			opacity: 0.45;
			animation: blink 1s step-end infinite;

			@keyframes blink {
				50% { opacity: 0; }
			}
		`,
		badgeRow: css`
			display: inline-flex;
			align-items: center;
			gap: 6px;
			border-radius: 999px;
			background: ${token.colorPrimaryBg};
			padding: 4px 10px;
			font-size: 11px;
			font-weight: 600;
			color: ${token.colorPrimary};
			box-shadow: inset 0 0 0 1px ${token.colorPrimaryBorder};
		`,
		codeMetaRow: css`
			display: flex;
			align-items: center;
			gap: 6px;
			max-width: 100%;
			flex-wrap: nowrap;
		`,
		statusBadge: css`
			border-radius: 999px;
			padding: 3px 8px;
			font-size: 11px;
			font-weight: 600;
			line-height: 1;
			white-space: nowrap;
			flex-shrink: 0;
		`,
		statusBadgeSuccess: css`
			background: rgba(34, 197, 94, 0.12);
			color: #15803d;
		`,
		statusBadgeError: css`
			background: rgba(239, 68, 68, 0.12);
			color: #b91c1c;
		`,
		codeSummary: css`
			font-size: 11px;
			color: ${token.colorTextTertiary};
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
			flex: 1;
			min-width: 0;
		`,
		systemNotice: css`
			border-radius: 12px;
			background: ${token.colorFillQuaternary};
			padding: 8px 16px;
			margin: 8px auto;
			font-size: 12px;
			line-height: 1.5;
			color: ${token.colorTextSecondary};
			text-align: center;
			max-width: 80%;
			backdrop-filter: blur(8px);
			border: 1px solid rgba(255, 255, 255, 0.05);
		`,
		emptyState: css`
			display: flex;
			min-height: 100%;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			gap: 16px;
			padding: 32px 12px;
			text-align: center;
			animation: emptyFadeIn 0.8s ease-out;

			@keyframes emptyFadeIn {
				from { opacity: 0; transform: translateY(10px); }
				to { opacity: 1; transform: translateY(0); }
			}
		`,
		emptyIcon: css`
			display: flex;
			height: 64px;
			width: 64px;
			align-items: center;
			justify-content: center;
			border-radius: 20px;
			background: linear-gradient(135deg, ${token.colorBgContainer}, ${token.colorBgElevated});
			box-shadow: 0 16px 32px rgba(0, 0, 0, 0.06), inset 0 1px 1px rgba(255, 255, 255, 0.8);
			border: 1px solid ${token.colorBorderSecondary};
			color: ${token.colorPrimary};

			svg {
				height: 28px;
				width: 28px;
				filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1));
			}
		`,
		emptyTitle: css`
			font-size: 18px;
			font-weight: 700;
			color: ${token.colorText};
			letter-spacing: -0.02em;
		`,
		emptyDesc: css`
			max-width: 280px;
			font-size: 14px;
			line-height: 1.6;
			color: ${token.colorTextSecondary};
		`,
		inputDock: css`
			flex-shrink: 0;
			background: ${token.colorBgLayout};
			padding: 0 10px 10px;
		`,
		mentionPicker: css`
			position: absolute;
			left: 0;
			right: 0;
			bottom: calc(100% + 8px);
			z-index: 20;
			display: flex;
			flex-direction: column;
			gap: 2px;
			border-radius: 12px;
			border: 1px solid ${token.colorBorderSecondary};
			background: ${token.colorBgElevated};
			padding: 6px;
			box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.02);
		`,
		mentionOption: css`
			display: flex;
			width: 100%;
			align-items: center;
			gap: 8px;
			border: none;
			border-radius: 8px;
			background: transparent;
			padding: 6px 8px;
			text-align: left;
			transition: background 0.15s ease;
			cursor: pointer;

			&:hover {
				background: ${token.colorFillTertiary};
			}
		`,
		mentionOptionActive: css`
			background: ${token.colorFillTertiary};
		`,
		mentionOptionMeta: css`
			display: flex;
			align-items: center;
			gap: 8px;
		`,
		mentionOptionIcon: css`
			display: flex;
			height: 24px;
			width: 24px;
			flex-shrink: 0;
			align-items: center;
			justify-content: center;
			border-radius: 6px;
			background: ${token.colorFillQuaternary};

			svg {
				height: 14px;
				width: 14px;
			}
		`,
		mentionOptionTitle: css`
			font-size: 13px;
			font-weight: 500;
			color: ${token.colorText};
		`,
		userAvatar: css`
			display: flex;
			height: 100%;
			width: 100%;
			align-items: center;
			justify-content: center;
			font-size: 12px;
			font-weight: 700;
			color: #fff;
			background: linear-gradient(135deg, #60a5fa, #2563eb);
			border-radius: 50%;
			box-shadow: inset 0 2px 4px rgba(255, 255, 255, 0.3);
		`,
		assistantAvatar: css`
			display: flex;
			height: 100%;
			width: 100%;
			align-items: center;
			justify-content: center;
			background: linear-gradient(135deg, ${token.colorBgContainer}, ${token.colorBgElevated});
			border-radius: 50%;
			border: 1px solid ${token.colorBorderSecondary};
			box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);

			svg {
				height: 18px;
				width: 18px;
			}
		`,
		codeAvatar: css`
			display: flex;
			height: 100%;
			width: 100%;
			align-items: center;
			justify-content: center;
			color: #fff;
			background: linear-gradient(135deg, #fbbf24, #d97706);
			border-radius: 50%;
			box-shadow: inset 0 2px 4px rgba(255, 255, 255, 0.3);
		`,
	};
});
