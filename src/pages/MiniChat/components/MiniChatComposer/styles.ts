import { createStyles } from "antd-style";

export const useComposerStyles = createStyles(({ css, token }) => ({
	container: css`
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 8px;
		width: 100%;
		max-width: 800px;
		margin: 0 auto;
	`,
	pill: css`
		display: flex;
		flex-direction: row;
		flex-wrap: wrap; /* Allow wrapping for multiline */
		align-items: center;
		padding: 3px 5px;
		border-radius: 20px;
		background: ${token.colorBgContainer};
		border: 1px solid ${token.colorBorderSecondary};
		transition: border-radius 0.3s cubic-bezier(0.32, 0.72, 0, 1),
					background-color 0.2s ease,
					padding 0.3s cubic-bezier(0.32, 0.72, 0, 1),
					box-shadow 0.2s ease;
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
		position: relative;
		min-height: 40px;
		width: 100%;

		&:focus-within {
			background: ${token.colorBgContainer};
			border-color: ${token.colorBorder};
			box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
		}
	`,
	pillMultiline: css`
		align-items: flex-start;
		border-radius: 12px;
		padding: 6px 5px 5px;
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
	sendButton: css`
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border-radius: 14px;
		border: none;
		background: ${token.colorText};
		color: ${token.colorBgLayout};
		cursor: pointer;
		transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);

		&:hover:not(:disabled) {
			transform: scale(1.05);
			box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
		}

		&:active:not(:disabled) {
			transform: scale(0.95);
		}

		&:disabled {
			opacity: 0.35;
			cursor: not-allowed;
			box-shadow: none;
		}
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
	sendButtonSending: css`
		background: ${token.colorTextSecondary};
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
		gap: 5px;
		padding: 3px 6px 3px 8px;
		margin: 0 3px;
		border-radius: 14px;
		background: ${token.colorFillQuaternary};
		border: 1px solid ${token.colorBorderSecondary};
		font-size: 12px;
		color: ${token.colorText};
		max-width: 220px;
		cursor: default;
		transition: background 0.15s, transform 0.15s ease, opacity 0.15s ease;
		vertical-align: middle;
		animation: chipIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);

		@keyframes chipIn {
			from {
				opacity: 0;
				transform: scale(0.8);
			}
			to {
				opacity: 1;
				transform: scale(1);
			}
		}

		&:hover {
			background: ${token.colorFillTertiary};
		}
	`,
	pathChipIcon: css`
		color: ${token.colorTextTertiary};
		flex-shrink: 0;
	`,
	pathChipName: css`
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		flex: 1;
		min-width: 0;
		color: ${token.colorText};
		font-size: 12px;
		font-weight: 500;
	`,
	pathChipRemove: css`
		display: flex;
		align-items: center;
		justify-content: center;
		width: 20px;
		height: 20px;
		border-radius: 10px;
		border: none;
		background: transparent;
		color: ${token.colorTextQuaternary};
		cursor: pointer;
		padding: 0;
		flex-shrink: 0;
		transition: all 0.15s;

		&:hover {
			background: ${token.colorFillTertiary};
			color: ${token.colorTextSecondary};
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
		background: ${token.colorPrimaryBg};
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
		color: #c47a2a;
		font-weight: 600;
		cursor: default;
		user-select: none;
		margin: 0 2px;
		padding: 0 2px;
	`,
}));
