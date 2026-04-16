import { createStyles } from "antd-style";

export const useComposerStyles = createStyles(({ css, token }) => ({
	container: css`
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 8px;
		width: 100%;
		max-width: var(--mini-chat-content-width, 800px);
		margin: 0 auto;
		z-index: 1;
	`,
	containerFused: css`
		margin-top: 0;
		z-index: 4;
	`,
	pill: css`
		display: flex;
		flex-direction: row;
		flex-wrap: wrap; /* Allow wrapping for multiline */
		align-items: center;
		padding: 3px 5px;
		border-radius: 20px;
		--mini-chat-ring-color: var(--color-token-border, ${token.colorBorder});
		--mini-chat-ring-color-focus: var(--color-token-border-heavy, var(--color-token-border, ${token.colorBorder}));
		background: ${token.colorBgContainer};
		border: 1px solid transparent;
		transition: border-radius 0.3s cubic-bezier(0.32, 0.72, 0, 1),
						background-color 0.2s ease,
						padding 0.3s cubic-bezier(0.32, 0.72, 0, 1),
						box-shadow 0.2s ease;
		box-shadow: 0 0 0 0.5px var(--mini-chat-ring-color);
		position: relative;
		min-height: 40px;
			box-sizing: border-box;
		width: 100%;

		&:focus-within {
			background: ${token.colorBgContainer};
			border-color: transparent;
			box-shadow:
				0 0 0 0.5px var(--mini-chat-ring-color-focus),
				0 4px 8px -2px rgba(0, 0, 0, 0.1);
		}
	`,
	pillFused: css`
		border-top-left-radius: 18px;
		border-top-right-radius: 18px;
		border-top-color: rgba(17, 24, 39, 0.07);
	`,
	pillMultiline: css`
		align-items: flex-start;
		border-radius: 12px;
		padding: 6px 5px 5px;
	`,
	pillCodex: css`
		flex-direction: column;
		align-items: stretch;
		border-radius: 22px;
		padding: 9px 10px 8px;
		min-height: 96px;
		background: #ffffff;
		border-color: transparent;
		box-shadow: 0 0 0 0.5px var(--mini-chat-ring-color);
	`,
	pillCodexFused: css`
		border-top-left-radius: 18px;
		border-top-right-radius: 18px;
		border-top-color: rgba(17, 24, 39, 0.07);
	`,
	pillTopRow: css`
		display: flex;
		width: 100%;
		gap: 0;
	`,
	pillTopRowCodex: css`
		min-height: 56px;
	`,
	pillDragOver: css`
		border-color: ${token.colorPrimary};
		background: ${token.colorPrimaryBg};
		box-shadow: 0 0 0 2px ${token.colorPrimaryBorder};
	`,
	plusWrapper: css`
		display: flex;
		align-items: center;
		justify-content: center;
		order: 1;
		flex-shrink: 0;
	`,
	plusWrapperMultiline: css`
		order: 2; /* Moves to second row if input is 100% */
		margin-top: 4px;
	`,
	inputArea: css`
		flex: 1;
		min-width: 0;
		padding: 0 6px;
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 6px;
		order: 2;
	`,
	inputTextWrap: css`
		flex: 1 1 120px;
		min-width: 120px;
		display: flex;
		align-items: center;
		width: 100%;
	`,
	inputAreaMultiline: css`
		flex: 1;
		align-items: flex-start;
	`,
	inputAreaCodex: css`
		padding: 0 2px;
		align-items: flex-start;
	`,
	editor: css`
		width: 100%;
		min-height: 20px;
		max-height: 180px;
		overflow: auto;
		cursor: text;
		caret-color: ${token.colorText};
		outline: none;
		background: transparent;
		color: ${token.colorText};
		font-size: 14px;
		line-height: 1.5;
		white-space: pre-wrap;
		word-break: break-word;
	`,
	editorPlaceholder: css`
		color: ${token.colorTextQuaternary};
		pointer-events: none;
		user-select: none;
	`,
	actionsWrapper: css`
		display: flex;
		align-items: center;
		gap: 4px;
		order: 3;
		flex-shrink: 0;
		margin-left: auto; /* Pushes to right in multiline row */
	`,
	actionsWrapperMultiline: css`
		margin-top: 4px;
		gap: 8px;
	`,
	plusButton: css`
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border-radius: 14px;
		border: none;
		background: ${token.colorFillSecondary};
		color: ${token.colorTextSecondary};
		cursor: pointer;
		transition: all 0.2s ease;
		flex-shrink: 0;

		&:hover:not(:disabled) {
			background: ${token.colorFill};
			color: ${token.colorText};
			transform: scale(1.05);
		}

		&:disabled {
			opacity: 0.35;
			cursor: not-allowed;
		}
	`,
	plusButtonCodex: css`
		width: 22px;
		height: 22px;
		border-radius: 12px;
		background: transparent;
		color: rgba(17, 24, 39, 0.42);

		&:hover:not(:disabled) {
			background: rgba(17, 24, 39, 0.06);
			color: rgba(17, 24, 39, 0.68);
			transform: none;
		}
	`,
	sendButton: css`
		&& {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		min-width: 28px;
		height: 28px;
		padding: 0 !important;
		border-radius: 14px;
		border: none !important;
		background: ${token.colorText} !important;
		color: ${token.colorBgLayout} !important;
		cursor: pointer;
		transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
		line-height: 1;
		}

		& .ant-btn-icon {
			display: inline-flex;
			align-items: center;
			justify-content: center;
			margin-inline-end: 0;
			line-height: 0;
		}

		&:hover:not(:disabled) {
			transform: scale(1.05);
			box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
		}

		&:active:not(:disabled) {
			transform: scale(0.95);
		}

		&:disabled {
			opacity: 0.35 !important;
			cursor: not-allowed;
			box-shadow: none !important;
			background: ${token.colorText} !important;
			color: ${token.colorBgLayout} !important;
		}
	`,
	editorCodex: css`
		font-size: 14px;
		line-height: 1.5;
		font-weight: 400;
		padding: 2px 0 0;
		min-height: 44px;
		max-height: 132px;
	`,
	codexModelHintButton: css`
		display: inline-flex;
		align-items: center;
		gap: 8px;
		height: 22px;
		padding: 0 0 0 2px;
		border-radius: 6px;
		border: none;
		background: transparent;
		color: ${token.colorTextTertiary};
		font-size: 12px;
		font-weight: 500;
		white-space: nowrap;
		flex-shrink: 0;
		cursor: pointer;

		&:hover {
			color: ${token.colorTextSecondary};
		}
	`,
	codexModelHintKey: css`
		display: inline-flex;
		align-items: center;
		padding: 0 5px;
		height: 18px;
		border-radius: 5px;
		background: ${token.colorFillQuaternary};
		border: 1px solid ${token.colorBorderSecondary};
		color: ${token.colorTextTertiary};
		font-size: 11px;
		line-height: 1;
		font-variant-numeric: tabular-nums;
	`,
	bottomControlRow: css`
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		overflow: hidden;
		min-height: 26px;
		padding: 0 2px;
	`,
	codexControlRow: css`
		gap: 6px;
		justify-content: flex-start;
		padding-top: 6px;
	`,
	codexControlCenter: css`
		display: inline-flex;
		align-items: center;
		gap: 7px;
		margin-left: 0;
		flex: 1;
		min-width: 0;
	`,
	codexControlCenterInline: css`
		display: inline-flex;
		align-items: center;
		gap: 7px;
		margin-left: 4px;
		flex-shrink: 0;
	`,
	codexControlIconButton: css`
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		border: none;
		border-radius: 12px;
		background: transparent;
		color: ${token.colorTextTertiary};
		cursor: pointer;
		flex-shrink: 0;
		transition: all 0.2s ease;

		&:hover:not(:disabled) {
			background: ${token.colorFillQuaternary};
			color: ${token.colorTextSecondary};
		}

		&:disabled {
			opacity: 0.35;
			cursor: not-allowed;
		}
	`,
	codexControlChip: css`
		display: inline-flex;
		align-items: center;
		gap: 4px;
		height: 24px;
		padding: 0 2px;
		border-radius: 0;
		border: none;
		background: transparent;
		color: rgba(17, 24, 39, 0.62);
		font-size: 12px;
		font-weight: 500;
		white-space: nowrap;
		line-height: 1;

		&:is(button) {
			cursor: pointer;
		}

		&:is(button):hover {
			background: transparent;
			color: rgba(17, 24, 39, 0.78);
		}
	`,
	attachmentMenuLabel: css`
		display: inline-flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		width: 100%;
		min-width: 112px;
	`,
	attachmentMenuShortcut: css`
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0 6px;
		height: 18px;
		border-radius: 5px;
		background: ${token.colorFillQuaternary};
		border: 1px solid ${token.colorBorderSecondary};
		color: ${token.colorTextTertiary};
		font-size: 11px;
		line-height: 1;
		font-variant-numeric: tabular-nums;
	`,
	screenshotTooltipTrigger: css`
		display: inline-flex;
		align-items: center;
	`,
	screenshotTooltipContent: css`
		display: inline-flex;
		align-items: center;
		padding: 6px 10px;
		border-radius: 8px;
		border: 1px solid ${token.colorBorderSecondary};
		background: ${token.colorBgElevated};
		box-shadow: ${token.boxShadowSecondary};
	`,
	screenshotTooltipRow: css`
		display: inline-flex;
		align-items: center;
		gap: 8px;
		color: ${token.colorTextSecondary};
		font-size: 12px;
		font-weight: 500;
		line-height: 1;
	`,
	screenshotTooltipKey: css`
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0 6px;
		height: 18px;
		border-radius: 5px;
		background: ${token.colorFillQuaternary};
		border: 1px solid ${token.colorBorderSecondary};
		color: ${token.colorTextTertiary};
		font-size: 11px;
		line-height: 1;
		font-variant-numeric: tabular-nums;
	`,
	micButton: css`
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border-radius: 14px;
		border: none;
		background: ${token.colorFillSecondary};
		color: ${token.colorTextSecondary};
		cursor: pointer;
		transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);

		&:hover:not(:disabled) {
			color: ${token.colorText};
			background: ${token.colorFill};
			transform: scale(1.05);
		}

		&:disabled {
			opacity: 0.35;
			cursor: not-allowed;
		}
	`,
	micButtonHighlighted: css`
		background: ${token.colorText} !important;
		color: ${token.colorBgContainer} !important;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
		
		&:hover:not(:disabled) {
			background: ${token.colorTextSecondary} !important;
		}
	`,
	micIconBtn: css`
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border-radius: 14px;
		border: none;
		background: transparent;
		color: ${token.colorTextTertiary};
		cursor: pointer;
		transition: all 0.2s ease;

		&:hover:not(:disabled) {
			color: ${token.colorText};
			background: ${token.colorFillTertiary};
		}
	`,
	voiceDialogButton: css`
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border-radius: 14px;
		border: none;
		background: ${token.colorText};
		color: ${token.colorBgLayout};
		cursor: pointer;
		transition: transform 0.2s ease, opacity 0.2s ease, background-color 0.2s ease;
		box-shadow: none;

		&:hover:not(:disabled) {
			transform: scale(1.05);
			background: rgba(17, 24, 39, 0.92);
		}

		&:active:not(:disabled) {
			transform: scale(0.96);
		}

		&:disabled {
			opacity: 0.35;
			cursor: not-allowed;
		}
	`,
	voiceDialogGlyph: css`
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 2px;
		width: 14px;
		height: 14px;
		line-height: 0;
	`,
	voiceDialogBar: css`
		display: block;
		width: 2px;
		border-radius: 999px;
		background: currentColor;

		&:nth-child(1) { height: 7px; opacity: 0.88; }
		&:nth-child(2) { height: 12px; }
		&:nth-child(3) { height: 9px; opacity: 0.92; }
		&:nth-child(4) { height: 6px; opacity: 0.78; }
	`,
	sendButtonSending: css`
		&& {
			background: ${token.colorText} !important;
			color: ${token.colorBgLayout} !important;
		}
	`,
	sendButtonCodex: css`
		&& {
			width: 30px;
			min-width: 30px;
			height: 30px;
			border-radius: 15px;
			box-shadow: 0 2px 4px rgba(0, 0, 0, 0.12);
		}
	`,
	micButtonRecording: css`
		background: rgba(239, 68, 68, 0.12) !important;
		color: #ef4444 !important;
		animation: mic-pulse 1.5s infinite;

		@keyframes mic-pulse {
			0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
			70% { box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
			100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
		}
	`,
	recordingPill: css`
		display: flex;
		align-items: center;
		gap: 12px;
		background: ${token.colorBgElevated};
		padding: 4px 6px 4px 14px;
		border-radius: 24px;
		border: 1px solid ${token.colorBorderSecondary};
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
		animation: pill-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
		min-width: 180px;

		@keyframes pill-in {
			from { opacity: 0; transform: translateY(8px) scale(0.95); }
			to { opacity: 1; transform: translateY(0) scale(1); }
		}
	`,
	waveContainer: css`
		display: flex;
		align-items: center;
		gap: 2.5px;
		height: 18px;
		padding-top: 1px;
	`,
	waveBar: css`
		width: 3px;
		background: ${token.colorPrimary};
		border-radius: 1.5px;
		animation: wave-pulse 1.2s ease-in-out infinite;

		@keyframes wave-pulse {
			0%, 100% { height: 4px; opacity: 0.4; }
			50% { height: 16px; opacity: 1; }
		}
	`,
	recordingTime: css`
		font-size: 13px;
		color: ${token.colorTextSecondary};
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		letter-spacing: 0.5px;
	`,
	recordingLabel: css`
		font-size: 13px;
		color: ${token.colorTextQuaternary};
		flex: 1;
		margin-left: 4px;
	`,
	recordingDiscardBtn: css`
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border-radius: 16px;
		border: none;
		background: ${token.colorFillQuaternary};
		color: ${token.colorTextSecondary};
		cursor: pointer;
		transition: all 0.2s ease;

		&:hover {
			background: rgba(239, 68, 68, 0.1);
			color: #ef4444;
		}
	`,
	attachmentRow: css`
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		padding: 0 12px;
	`,
	pathChip: css`
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 1px 8px 1px 6px;
		margin: 0 2px;
		height: 22px;
		border-radius: 11px;
		background: linear-gradient(180deg, #f7fbff 0%, #eef6ff 100%);
		border: none;
		font-size: 12px;
		color: #3d6fb2;
		line-height: 1;
		max-width: 240px;
		cursor: default;
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
		transition:
			background 0.15s,
			transform 0.15s ease,
			opacity 0.15s ease;
		vertical-align: middle;
		animation: chipFadeIn 0.16s ease-out;

		@keyframes chipFadeIn {
			from {
				opacity: 0;
			}
			to {
				opacity: 1;
			}
		}

		&:hover {
			background: linear-gradient(180deg, #f3f9ff 0%, #e8f2ff 100%);
		}

		&[data-snippet-ref="true"] {
			background: linear-gradient(180deg, #f4f9ff 0%, #e9f3ff 100%);
		}

		&[data-snippet-ref="true"]:hover {
			background: linear-gradient(180deg, #eff7ff 0%, #e2efff 100%);
		}
	`,
	pathChipIcon: css`
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 12px;
		height: 12px;
		line-height: 1;
		border: none;
		background: transparent;
		color: #5e8fca;
		flex-shrink: 0;

		[data-snippet-ref="true"] & {
			color: #6e9bc6;
			background: transparent;
		}
	`,
	pathChipName: css`
		display: inline-flex;
		align-items: center;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		flex: 1;
		min-width: 0;
		color: #356cae;
		font-size: 12px;
		font-weight: 600;
		line-height: 1;
		letter-spacing: 0;
		text-rendering: geometricPrecision;

		[data-snippet-ref="true"] & {
			color: #5f8fc0;
			font-weight: 600;
		}
	`,
	pathChipRemove: css`
		display: flex;
		align-items: center;
		justify-content: center;
		width: 0;
		height: 14px;
		border-radius: 7px;
		border: none;
		background: transparent;
		color: #7ea7db;
		cursor: pointer;
		padding: 0;
		flex-shrink: 0;
		opacity: 0;
		overflow: hidden;
		pointer-events: none;
		transition:
			width 0.14s ease,
			opacity 0.14s ease,
			background-color 0.14s ease,
			color 0.14s ease;

		&:hover {
			background: rgba(130, 170, 225, 0.18);
			color: #4f86ca;
		}

		span[contenteditable="false"]:hover &,
		span[contenteditable="false"]:focus-within & {
			width: 16px;
			opacity: 1;
			pointer-events: auto;
			margin-left: 1px;
		}

		[data-snippet-ref="true"] & {
			width: 0;
			height: 18px;
			opacity: 0;
			transform: scale(0.9);
			padding: 0;
			overflow: hidden;
			pointer-events: none;
			margin-left: -1px;
		}

		[data-snippet-ref="true"]:hover &,
		[data-snippet-ref="true"]:focus-within & {
			width: 18px;
			opacity: 1;
			transform: scale(1);
			pointer-events: auto;
			margin-left: 0;
		}
	`,
	mentionResultList: css`
		display: flex;
		flex-direction: column;
		max-height: 240px;
		overflow-y: auto;
		padding: 4px 0;
		gap: 0;
		border-radius: 8px;
		border: 1px solid ${token.colorBorderSecondary};
		background: ${token.colorBgElevated};
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
	`,
	mentionEmptyState: css`
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 14px;
		border-radius: 14px;
		border: 1px solid ${token.colorBorderSecondary};
		background: ${token.colorBgElevated};
		box-shadow: ${token.boxShadowSecondary};
	`,
	mentionEmptyStateTitle: css`
		font-size: 13px;
		font-weight: 600;
		color: ${token.colorText};
	`,
	mentionEmptyStateDescription: css`
		font-size: 12px;
		line-height: 1.5;
		color: ${token.colorTextSecondary};
	`,
	mentionEmptyStateAction: css`
		align-self: flex-start;
		padding: 0;
		border: none;
		background: transparent;
		color: ${token.colorPrimary};
		font-size: 12px;
		font-weight: 600;
		cursor: pointer;

		&:hover {
			color: ${token.colorPrimaryHover};
		}
	`,
	mentionResultItem: css`
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 4px 10px;
		border: none;
		background: transparent;
		text-align: left;
		cursor: pointer;
		transition: background 0.1s ease;

		&:hover {
			background: ${token.colorFillTertiary};
		}
	`,
	mentionResultItemActive: css`
		background: ${token.colorFillSecondary};
		box-shadow: inset 0 0 0 1px ${token.colorBorderSecondary};

		&:hover {
			background: ${token.colorFillSecondary};
		}
	`,
	mentionResultMeta: css`
		display: flex;
		align-items: center;
		gap: 10px;
		min-width: 0;
		flex: 1;
	`,
	mentionResultIcon: css`
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 20px;
		height: 20px;
		color: ${token.colorTextSecondary};
		flex-shrink: 0;
	`,
	mentionResultText: css`
		display: flex;
		flex-direction: row;
		align-items: center;
		min-width: 0;
		gap: 6px;
	`,
	mentionResultTitle: css`
		font-size: 12px;
		font-weight: 500;
		color: ${token.colorText};
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	`,
	mentionResultPath: css`
		font-size: 11px;
		color: ${token.colorTextTertiary};
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		opacity: 0.8;
	`,
	claudeSlashPanel: css`
		display: flex;
		flex-direction: column;
		max-height: 340px;
		overflow-x: hidden;
		overflow-y: auto;
		border-radius: 14px;
		border: 1px solid ${token.colorBorderSecondary};
		background: ${token.colorBgElevated};
		box-shadow: ${token.boxShadowSecondary};
	`,
	claudeSlashSection: css`
		padding: 6px 0;
	`,
	claudeSlashSectionTitle: css`
		padding: 4px 14px 6px;
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.3px;
		text-transform: uppercase;
		color: ${token.colorTextQuaternary};
	`,
	claudeSlashDivider: css`
		height: 1px;
		background: ${token.colorBorderSecondary};
	`,
	claudeSlashItem: css`
		width: 100%;
		display: flex;
		align-items: flex-start;
		gap: 8px;
		padding: 8px 14px;
		background: transparent;
		border: none;
		text-align: left;
		font-size: 13px;
		line-height: 1.35;
		font-weight: 500;
		color: ${token.colorText};
		overflow: hidden;
	`,
	claudeSlashItemAction: css`
		cursor: pointer;
		transition: background-color 0.12s ease;

		&:hover {
			background: ${token.colorFillTertiary};
		}
	`,
	claudeSlashItemStatic: css`
		background: ${token.colorFillSecondary};
	`,
	claudeSlashItemHint: css`
		font-size: 12px;
		font-weight: 400;
		color: ${token.colorTextTertiary};
		overflow: hidden;
		text-overflow: ellipsis;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
	`,
	skillChip: css`
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 1px 8px 1px 6px;
		margin: 0 2px;
		height: 22px;
		border-radius: 11px;
		border: none;
		background: linear-gradient(180deg, #fbf7ff 0%, #f2eaff 100%);
		color: #7a4ce4;
		font-size: 12px;
		font-weight: 600;
		letter-spacing: 0;
		line-height: 1;
		cursor: default;
		user-select: none;
		vertical-align: middle;
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
		text-rendering: geometricPrecision;
		transition: background 0.15s ease;

		&::before {
			content: "✦";
			display: inline-flex;
			align-items: center;
			justify-content: center;
			width: 14px;
			height: 14px;
			border-radius: 7px;
			background: #ecddff;
			color: #8b5bea;
			font-size: 9px;
			line-height: 1;
			flex-shrink: 0;
		}

		&:hover {
			background: linear-gradient(180deg, #f8f0ff 0%, #efe3ff 100%);
		}
	`,
}));
