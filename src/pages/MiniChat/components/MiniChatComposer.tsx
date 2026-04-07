import type {
	ClipboardEvent as ReactClipboardEvent,
	KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";

import {
	Plus,
	Camera,
	FolderOpen,
	Paperclip,
	Mic,
	ArrowUp,
	Square,
	X,
} from "lucide-react";
import { ClaudeCode } from "@lobehub/icons";
import { Dropdown } from "antd";
import { createStyles } from "antd-style";
import { ComposerAttachmentPreview, ImageLightbox } from "@/components/common/composer";
import type { FileAttachment } from "@/components/common/composer-helpers";
import {
	type UnifiedComposerInputValue,
	UnifiedComposerInput,
} from "@/components/common/unified-composer-input";
import { useVolcengineAsr } from "@/hooks/useVolcengineAsr";
import {
	extractDroppedPathsFromTransfer as extractUnifiedDroppedPathsFromTransfer,
	isPathDrag,
	type UnifiedComposerPath,
} from "@/lib/unified-composer";
import { useMiniChatStyles } from "../styles";
import type { MentionOption } from "../types";

type DroppedPathChip = UnifiedComposerPath;

function extractDroppedPathsFromTransfer(
	dataTransfer: DataTransfer | null,
): UnifiedComposerPath[] {
	return extractUnifiedDroppedPathsFromTransfer(dataTransfer);
}

type MiniChatComposerProps = {
	input: string;
	onInputChange: (value: string) => void;
	onSend: () => void;
	loading: boolean;
	disabled: boolean;
	sendDisabled: boolean;
	isClaudeCodeCliMode: boolean;
	placeholder: string;
	attachments: FileAttachment[];
	droppedPaths: DroppedPathChip[];
	onRemoveAttachment: (id: string) => void;
	onPathsChange: (paths: DroppedPathChip[]) => void;
	onUploadFile: () => void;
	onUploadFolder: () => void;
	onScreenshot: () => void;
	/** Still used by the + file-upload menu; no longer used for voice recording. */
	stageBufferFiles: (files: globalThis.File[]) => Promise<void>;
	showMentionPicker: boolean;
	mentionOptions: MentionOption[];
	activeMentionIndex: number;
	onActiveMentionIndexChange: (value: number) => void;
	onApplyMention: (option: MentionOption) => void;
	onCaretChange: (value: number) => void;
	onKeyDown: (event: ReactKeyboardEvent<HTMLElement>) => void;
	onPressEnter: (event: ReactKeyboardEvent<HTMLElement>) => void;
	modelLabel: string;
	onCycleModel: () => void;
	effortEnabled: boolean;
	thinkingEnabled: boolean;
	fastModeEnabled: boolean;
	onToggleEffort: () => void;
	onToggleThinking: () => void;
	onToggleFastMode: () => void;
	onOpenAccountUsage: () => void;
	onRewind: () => void;
	onClearConversation?: () => void;
	onCompositionStart: () => void;
	onCompositionEnd: () => void;
	onFocusChange: (focused: boolean) => void;
	onDropPaths: (paths: DroppedPathChip[]) => void;
};

const useComposerStyles = createStyles(({ css, token }) => ({
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
		border-radius: 14px;
		background: ${token.colorFillQuaternary};
		border: 1px solid ${token.colorBorderSecondary};
		font-size: 12px;
		color: ${token.colorText};
		max-width: 220px;
		cursor: text;
		transition: background 0.15s;
		vertical-align: middle;

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
		width: 16px;
		height: 16px;
		border-radius: 8px;
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
	claudeSlashPanel: css`
		border-radius: 18px;
		border: 1px solid #b9b9b9;
		background: #efefef;
		overflow: hidden;
		box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.65);
	`,
	claudeSlashSection: css`
		padding: 10px 0 8px;
	`,
	claudeSlashSectionTitle: css`
		padding: 0 18px 8px;
		font-size: 16px;
		font-weight: 500;
		letter-spacing: 0.1px;
		color: #9c9c9c;
	`,
	claudeSlashDivider: css`
		height: 1px;
		background: #b9b9b9;
	`,
	claudeSlashItem: css`
		width: 100%;
		min-height: 50px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 0 18px;
		background: transparent;
		border: none;
		text-align: left;
		font-size: 17px;
		line-height: 1.25;
		font-weight: 500;
		color: #444549;
	`,
	claudeSlashItemAction: css`
		cursor: pointer;
		transition: background-color 0.15s ease;

		&:hover {
			background: rgba(17, 24, 39, 0.06);
		}
	`,
	claudeSlashItemStatic: css`
		user-select: none;
	`,
	claudeSlashItemHint: css`
		font-size: 16px;
		font-weight: 500;
		color: #74787f;
		white-space: nowrap;
	`,
	claudeSlashToggle: css`
		position: relative;
		width: 80px;
		height: 32px;
		border-radius: 16px;
		background: #d0d2d7;
		border: 1px solid rgba(0, 0, 0, 0.1);
		transition: background-color 0.18s ease;
		flex-shrink: 0;
	`,
	claudeSlashToggleOn: css`
		background: #0c66cc;
		border-color: #0c66cc;
	`,
	claudeSlashToggleDots: css`
		position: absolute;
		left: 13px;
		top: 0;
		height: 100%;
		display: inline-flex;
		align-items: center;
		gap: 10px;
	`,
	claudeSlashToggleDot: css`
		width: 8px;
		height: 8px;
		border-radius: 999px;
		background: rgba(52, 67, 88, 0.78);
	`,
	claudeSlashToggleKnob: css`
		position: absolute;
		top: 2px;
		left: 2px;
		width: 26px;
		height: 26px;
		border-radius: 999px;
		background: #3b3d42;
		transition: transform 0.2s ease;
	`,
}));

export function MiniChatComposer({
	input,
	onInputChange,
	onSend,
	loading,
	disabled,
	sendDisabled,
	isClaudeCodeCliMode,
	placeholder,
	attachments,
	droppedPaths,
	onRemoveAttachment,
	onPathsChange,
	onUploadFile,
	onUploadFolder,
	onScreenshot,
	stageBufferFiles,
	showMentionPicker,
	mentionOptions,
	activeMentionIndex,
	onActiveMentionIndexChange,
	onApplyMention,
	onCaretChange,
	onKeyDown,
	onPressEnter,
	modelLabel,
	onCycleModel,
	effortEnabled,
	thinkingEnabled,
	fastModeEnabled,
	onToggleEffort,
	onToggleThinking,
	onToggleFastMode,
	onOpenAccountUsage,
	onRewind,
	onClearConversation,
	onCompositionStart,
	onCompositionEnd,
	onFocusChange,
	onDropPaths,
}: MiniChatComposerProps) {
	const { styles: miniChatStyles, cx } = useMiniChatStyles();
	const { styles } = useComposerStyles();
	const [previewImage, setPreviewImage] = useState<{ src: string; fileName: string } | null>(null);

	// ── Volcengine ASR recording ──────────────────────────────────
	const [recordingTime, setRecordingTime] = useState(0);

	const handleTranscriptReady = useCallback((text: string) => {
		const transcript = text.trim();
		if (!transcript) return;
		const current = input.trim();
		if (!current) {
			onInputChange(transcript);
			return;
		}
		onInputChange(`${current}\n${transcript}`);
	}, [input, onInputChange]);

	const { isRecording, isTranscribing, toggleRecording, cancelRecording, stopAndTranscribe } =
		useVolcengineAsr({ onTranscriptReady: handleTranscriptReady });

	const handleToggleRecording = useCallback(async () => {
		if (isTranscribing) return;
		if (!isRecording) {
			setRecordingTime(0);
		}
		await toggleRecording();
	}, [isRecording, isTranscribing, toggleRecording]);

	const formatRecordingTime = (seconds: number) => {
		const m = Math.floor(seconds / 60);
		const s = seconds % 60;
		return `${m}:${s.toString().padStart(2, '0')}`;
	};

	useEffect(() => {
		let interval: ReturnType<typeof setInterval>;
		if (isRecording) {
			interval = setInterval(() => {
				setRecordingTime(prev => prev + 1);
			}, 1000);
		}
		return () => {
			if (interval) clearInterval(interval);
		};
	}, [isRecording]);

	const [isMultiline, setIsMultiline] = useState(false);
	const composerValue = useMemo<UnifiedComposerInputValue>(
		() => ({
			text: input,
			paths: droppedPaths,
		}),
		[input, droppedPaths],
	);
	const showClaudeSlashPanel = useMemo(() => {
		if (!isClaudeCodeCliMode) return false;
		return /^\s*\//.test(input);
	}, [input, isClaudeCodeCliMode]);
	const updateIsMultiline = useCallback((next: boolean) => {
		setIsMultiline((previous) => (previous === next ? previous : next));
	}, []);

	// Keep latest callbacks in refs so document-level drag listeners can stay stable.
	const onPathsChangeRef = useRef(onPathsChange);
	const onDropPathsRef = useRef(onDropPaths);
	useEffect(() => {
		onPathsChangeRef.current = onPathsChange;
	}, [onPathsChange]);
	useEffect(() => {
		onDropPathsRef.current = onDropPaths;
	}, [onDropPaths]);

	const handleComposerChange = useCallback(
		(next: UnifiedComposerInputValue) => {
			if (next.text !== input) {
				onInputChange(next.text);
			}

			const samePaths =
				next.paths.length === droppedPaths.length
				&& next.paths.every((item, index) => {
					const current = droppedPaths[index];
					return (
						current?.absolutePath === item.absolutePath
						&& current?.name === item.name
						&& current?.isDirectory === item.isDirectory
					);
				});
			if (!samePaths) {
				onPathsChangeRef.current(next.paths);
			}
		},
		[droppedPaths, input, onInputChange],
	);

	const handlePaste = useCallback(
		(event: ReactClipboardEvent<HTMLDivElement>) => {
			if (disabled) return;
			const items = event.clipboardData?.items;
			if (!items?.length) return;

			const files: globalThis.File[] = [];
			for (const item of Array.from(items)) {
				if (item.kind !== "file") continue;
				const file = item.getAsFile();
				if (!file) continue;
				files.push(file);
			}

			if (files.length === 0) return;
			event.preventDefault();
			void stageBufferFiles(files);
		},
		[disabled, stageBufferFiles],
	);

	// ── Drag-and-drop path attachment ────────────────────────────
	// ── Drag-and-drop: native document-level listeners ───────────
	// Must be document-level (not React synthetic) so Chromium sees the
	// preventDefault() on dragover and routes OS-level file drags here.
	const [isDragOver, setIsDragOver] = useState(false);

	useEffect(() => {
		let enterCount = 0;

		const onDragOver = (e: globalThis.DragEvent) => {
			if (!isPathDrag(e.dataTransfer ?? null)) return;
			e.preventDefault();
			if (e.dataTransfer) {
				e.dataTransfer.dropEffect = "copy";
			}
		};

		const onDragEnter = (e: globalThis.DragEvent) => {
			if (!isPathDrag(e.dataTransfer ?? null)) return;
			e.preventDefault();
			enterCount += 1;
			if (enterCount === 1) setIsDragOver(true);
		};

		const onDragLeave = (e: globalThis.DragEvent) => {
			if (!isPathDrag(e.dataTransfer ?? null)) return;
			e.preventDefault();
			enterCount -= 1;
			if (enterCount <= 0) {
				enterCount = 0;
				setIsDragOver(false);
			}
		};

		const onDrop = (e: globalThis.DragEvent) => {
			if (!isPathDrag(e.dataTransfer ?? null)) return;
			enterCount = 0;
			setIsDragOver(false);
			if (e.defaultPrevented) return;
			const paths = extractDroppedPathsFromTransfer(e.dataTransfer);
			if (paths.length > 0) {
				e.preventDefault();
				e.stopPropagation();
				onDropPathsRef.current(paths);
			}
			// If no paths were extracted here, do not prevent default:
			// main process `will-navigate` fallback can still intercept file:// drop
			// and forward absolute paths via `mini-chat:paths-dropped`.
		};
		const onDragEnd = () => {
			enterCount = 0;
			setIsDragOver(false);
		};

		document.addEventListener("dragover", onDragOver, true);
		document.addEventListener("dragenter", onDragEnter, true);
		document.addEventListener("dragleave", onDragLeave, true);
		document.addEventListener("drop", onDrop, true);
		document.addEventListener("dragend", onDragEnd, true);
		return () => {
			document.removeEventListener("dragover", onDragOver, true);
			document.removeEventListener("dragenter", onDragEnter, true);
			document.removeEventListener("dragleave", onDragLeave, true);
			document.removeEventListener("drop", onDrop, true);
			document.removeEventListener("dragend", onDragEnd, true);
		};
	}, []);

	// Forward pet:recording-command IPC events (e.g. from F2 / Fn key) to the ASR hook.
	const stopAndTranscribeRef = useRef(stopAndTranscribe);
	const cancelRecordingRef = useRef(cancelRecording);
	const toggleRecordingRef = useRef(handleToggleRecording);
	useEffect(() => { stopAndTranscribeRef.current = stopAndTranscribe; }, [stopAndTranscribe]);
	useEffect(() => { cancelRecordingRef.current = cancelRecording; }, [cancelRecording]);
	useEffect(() => { toggleRecordingRef.current = handleToggleRecording; }, [handleToggleRecording]);

	useEffect(() => {
		const unsubscribe = window.electron.ipcRenderer.on('pet:recording-command', payload => {
			const action =
				payload && typeof payload === 'object' && 'action' in payload
					? (payload as { action?: 'start' | 'cancel' | 'confirm' }).action
					: undefined;
			if (action === 'start') {
				void toggleRecordingRef.current();
				return;
			}
			if (action === 'confirm') {
				void stopAndTranscribeRef.current();
			} else {
				cancelRecordingRef.current();
			}
		});

		return () => { unsubscribe?.(); };
	}, []);

	const hasInput =
		input.trim().length > 0 || attachments.length > 0 || droppedPaths.length > 0;
	const sendingDisabledByRecording = isRecording || isTranscribing;

	const renderActions = () => {
		if (loading) {
			return (
				<>
					<button
						type="button"
						className={cx(styles.micIconBtn, isRecording && styles.micButtonRecording)}
						onClick={() => { void handleToggleRecording(); }}
						disabled={isTranscribing}
						title={isRecording ? '停止录音' : '语音输入'}
					>
						<Mic style={{ width: 14, height: 14 }} />
					</button>
					<button
						type="button"
						className={cx(styles.sendButton, styles.sendButtonSending)}
						disabled={false}
						onClick={onSend}
						title="停止生成"
					>
						<Square style={{ width: 12, height: 12 }} fill="currentColor" />
					</button>
				</>
			);
		}

		if (hasInput) {
			return (
				<>
					<button
						type="button"
						className={cx(styles.micIconBtn, isRecording && styles.micButtonRecording)}
						onClick={() => { void handleToggleRecording(); }}
						disabled={isTranscribing}
						title={isRecording ? '停止录音' : '语音输入'}
					>
						<Mic style={{ width: 14, height: 14 }} />
					</button>
					<button
						type="button"
						className={styles.sendButton}
						disabled={sendDisabled || sendingDisabledByRecording}
						onClick={onSend}
						title={sendingDisabledByRecording ? (isTranscribing ? '正在转写' : '请先停止录音') : '发送'}
					>
						<ArrowUp style={{ width: 15, height: 15 }} />
					</button>
				</>
			);
		}

		return (
			<button
				type="button"
				className={cx(styles.micButton, !isRecording && styles.micButtonHighlighted, isRecording && styles.micButtonRecording)}
				onClick={() => { void handleToggleRecording(); }}
				disabled={isTranscribing}
				title={isRecording ? '停止录音' : '语音输入'}
			>
				<Mic style={{ width: 15, height: 15 }} />
			</button>
		);
	};

	return (
		<>
			<div className={styles.container}>
				{showClaudeSlashPanel && (
					<div className={styles.claudeSlashPanel}>
						<div className={styles.claudeSlashSection}>
							<div className={styles.claudeSlashSectionTitle}>Context</div>
							<button
								type="button"
								className={cx(styles.claudeSlashItem, styles.claudeSlashItemAction)}
								onClick={() => {
									onUploadFile();
									onInputChange("");
								}}
								disabled={disabled}
							>
								<span>Attach file...</span>
							</button>
							<button
								type="button"
								className={cx(styles.claudeSlashItem, styles.claudeSlashItemAction)}
								onClick={() => {
									onUploadFolder();
									onInputChange("");
								}}
								disabled={disabled}
							>
								<span>Mention file from this project...</span>
							</button>
							<button
								type="button"
								className={cx(styles.claudeSlashItem, styles.claudeSlashItemAction)}
								onClick={() => {
									onClearConversation?.();
									onInputChange("");
								}}
							>
								<span>Clear conversation</span>
							</button>
							<button
								type="button"
								className={cx(styles.claudeSlashItem, styles.claudeSlashItemAction)}
								onClick={onRewind}
							>
								<span>Rewind</span>
							</button>
						</div>
						<div className={styles.claudeSlashDivider} />
						<div className={styles.claudeSlashSection}>
							<div className={styles.claudeSlashSectionTitle}>Model</div>
							<button
								type="button"
								className={cx(styles.claudeSlashItem, styles.claudeSlashItemAction)}
								onClick={onCycleModel}
							>
								<span>Switch model...</span>
								<span className={styles.claudeSlashItemHint}>{modelLabel}</span>
							</button>
							<button
								type="button"
								className={cx(styles.claudeSlashItem, styles.claudeSlashItemAction)}
								onClick={onToggleEffort}
							>
								<span>{effortEnabled ? "Effort (High)" : "Effort (Default)"}</span>
								<span
									className={cx(
										styles.claudeSlashToggle,
										effortEnabled && styles.claudeSlashToggleOn,
									)}
								>
									<span className={styles.claudeSlashToggleDots}>
										<span className={styles.claudeSlashToggleDot} />
										<span className={styles.claudeSlashToggleDot} />
									</span>
									<span
										className={styles.claudeSlashToggleKnob}
										style={{
											transform: effortEnabled ? "translateX(48px)" : "translateX(0)",
										}}
									/>
								</span>
							</button>
							<button
								type="button"
								className={cx(styles.claudeSlashItem, styles.claudeSlashItemAction)}
								onClick={onToggleThinking}
							>
								<span>Thinking</span>
								<span
									className={cx(
										styles.claudeSlashToggle,
										thinkingEnabled && styles.claudeSlashToggleOn,
									)}
									style={{ width: 80 }}
								>
									<span
										className={styles.claudeSlashToggleKnob}
										style={{
											transform: thinkingEnabled ? "translateX(48px)" : "translateX(0)",
										}}
									/>
								</span>
							</button>
							<button
								type="button"
								className={cx(styles.claudeSlashItem, styles.claudeSlashItemAction)}
								onClick={onOpenAccountUsage}
							>
								<span>Account &amp; usage...</span>
							</button>
							<button
								type="button"
								className={cx(styles.claudeSlashItem, styles.claudeSlashItemAction)}
								onClick={onToggleFastMode}
							>
								<span>Toggle fast mode (Opus 4.6 only)</span>
								<span className={styles.claudeSlashItemHint}>
									{fastModeEnabled ? "On" : "Off"}
								</span>
							</button>
						</div>
					</div>
				)}

				{/* Mention Overlay */}
				{showMentionPicker && (
					<div className={miniChatStyles.mentionPicker}>
						{mentionOptions.map((option, index) => (
							<button
								key={option.id}
								type="button"
								onMouseEnter={() => {
									onActiveMentionIndexChange(index);
								}}
								onMouseDown={(event) => {
									event.preventDefault();
									onApplyMention(option);
								}}
								className={cx(
									miniChatStyles.mentionOption,
									index === activeMentionIndex && miniChatStyles.mentionOptionActive,
								)}
							>
								<div className={miniChatStyles.mentionOptionMeta}>
									<div className={miniChatStyles.mentionOptionIcon}>
										<ClaudeCode.Color size={16} />
									</div>
									<div className={miniChatStyles.mentionOptionTitle}>
										{option.label}
									</div>
								</div>
							</button>
						))}
					</div>
				)}

			{/* Recording / Transcribing Pill */}
			{(isRecording || isTranscribing) && (
				<div className={styles.recordingPill}>
					{isTranscribing ? (
						<div className={styles.waveContainer}>
							{[0.2, 0.4, 0.3, 0.5, 0.2].map((d, i) => (
								<div 
									key={i} 
									className={styles.waveBar} 
									style={{ 
										animationDelay: `-${d}s`,
										background: 'var(--ant-color-text-quaternary)',
										opacity: 0.5
									}} 
								/>
							))}
						</div>
					) : (
						<div className={styles.waveContainer}>
							{[0.1, 0.4, 0.2, 0.5, 0.3].map((d, i) => (
								<div key={i} className={styles.waveBar} style={{ animationDelay: `-${d}s` }} />
							))}
						</div>
					)}
					
					{isTranscribing ? (
						<span className={styles.recordingLabel}>正在转写…</span>
					) : (
						<>
							<span className={styles.recordingTime}>{formatRecordingTime(recordingTime)}</span>
							<span className={styles.recordingLabel}>正在录音</span>
						</>
					)}
					{isRecording && (
						<button
							type="button"
							className={styles.recordingDiscardBtn}
							onClick={cancelRecording}
							title="取消录音"
						>
							<X style={{ width: 16, height: 16 }} />
						</button>
					)}
				</div>
			)}


		{/* Attachments Row */}
			{attachments.length > 0 && (
				<div className={styles.attachmentRow}>
					{attachments.map((attachment) => (
						<ComposerAttachmentPreview
							key={attachment.id}
							attachment={attachment}
							onRemove={() => onRemoveAttachment(attachment.id)}
							onPreview={(src, fileName) => setPreviewImage({ src, fileName })}
						/>
					))}
				</div>
			)}

			{/* Input Pill */}
			<LayoutGroup id="composer-pill">
				<motion.div 
					layout
					transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
					className={cx(
						styles.pill,
						isMultiline && styles.pillMultiline,
						isDragOver && styles.pillDragOver,
					)}
				>
					{/* Top Area: Inline Actions or just Input */}
					<div 
						style={{ 
							display: 'flex', 
							alignItems: isMultiline ? 'flex-start' : 'center', 
							width: '100%',
							gap: 0 
						}}
					>
						{/* Inline Plus */}
						{!isMultiline && (
							<motion.div 
								layoutId="plus-btn"
								className={styles.plusWrapper}
								style={{ marginRight: 4 }}
								transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
							>
								<Dropdown
									menu={{
										items: [
											{
												key: 'file',
												label: '上传文件',
												icon: <Paperclip className="h-3.5 w-3.5" />,
												onClick: onUploadFile,
												disabled,
											},
											{
												key: 'folder',
												label: '上传文件夹',
												icon: <FolderOpen className="h-3.5 w-3.5" />,
												onClick: onUploadFolder,
												disabled,
											},
											{
												key: 'screenshot',
												label: '截图',
												icon: <Camera className="h-3.5 w-3.5" />,
												onClick: onScreenshot,
												disabled,
											},
										]
									}}
									placement="top"
									trigger={['click']}
									disabled={disabled}
								>
									<button type="button" className={styles.plusButton} disabled={disabled} title="添加附件">
										<Plus style={{ width: 15, height: 15 }} />
									</button>
								</Dropdown>
							</motion.div>
						)}

						{/* Input Area */}
						<motion.div 
							layout="position"
							transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
							className={cx(styles.inputArea, isMultiline && styles.inputAreaMultiline)}
							style={{ flex: 1, minWidth: 0 }}
						>
							<div className={styles.inputTextWrap}>
								<UnifiedComposerInput
									value={composerValue}
									onChange={handleComposerChange}
									placeholder={placeholder || (isMultiline ? "输入描述或指令..." : "输入消息...")}
									disabled={disabled}
									className={styles.editor}
									placeholderClassName={styles.editorPlaceholder}
									pathChipClassName={styles.pathChip}
									pathChipIconClassName={styles.pathChipIcon}
									pathChipNameClassName={styles.pathChipName}
									pathChipRemoveClassName={styles.pathChipRemove}
									onFocusChange={onFocusChange}
									onCompositionStart={onCompositionStart}
									onCompositionEnd={onCompositionEnd}
									onKeyDown={onKeyDown}
									onPressEnter={onPressEnter}
									onCaretChange={onCaretChange}
									onPaste={handlePaste}
									onVisualMultilineChange={updateIsMultiline}
								/>
							</div>
						</motion.div>

						{/* Inline Send */}
						{!isMultiline && (
							<motion.div 
								layoutId="actions-area"
								className={styles.actionsWrapper}
								style={{ marginLeft: 4 }}
								transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
							>
								<AnimatePresence mode="wait">
									<motion.div
										key={loading ? 'loading' : hasInput ? 'send' : 'empty'}
										initial={{ opacity: 0 }}
										animate={{ opacity: 1 }}
										exit={{ opacity: 0 }}
										transition={{ duration: 0.15 }}
										style={{ display: 'flex', alignItems: 'center' }}
									>
										{renderActions()}
									</motion.div>
								</AnimatePresence>
							</motion.div>
						)}
					</div>

					{/* Bottom Area: Only for Multiline */}
					<AnimatePresence>
						{isMultiline && (
							<motion.div 
								initial={{ opacity: 0, height: 0, marginTop: 0 }}
								animate={{ opacity: 1, height: 'auto', marginTop: 8 }}
								exit={{ opacity: 0, height: 0, marginTop: 0 }}
								transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
								style={{ 
									display: 'flex', 
									alignItems: 'center', 
									justifyContent: 'space-between', 
									width: '100%',
									overflow: 'hidden',
									padding: '0 4px 2px'
								}}
							>
								<motion.div layoutId="plus-btn" transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}>
									<Dropdown
										menu={{
											items: [
												{
													key: 'file',
													label: '上传文件',
													icon: <Paperclip className="h-3.5 w-3.5" />,
													onClick: onUploadFile,
													disabled,
												},
												{
													key: 'folder',
													label: '上传文件夹',
													icon: <FolderOpen className="h-3.5 w-3.5" />,
													onClick: onUploadFolder,
													disabled,
												},
												{
													key: 'screenshot',
													label: '截图',
													icon: <Camera className="h-3.5 w-3.5" />,
													onClick: onScreenshot,
													disabled,
												},
											]
										}}
										placement="top"
										trigger={['click']}
										disabled={disabled}
									>
										<button type="button" className={styles.plusButton} disabled={disabled} title="添加附件">
											<Plus style={{ width: 15, height: 15 }} />
										</button>
									</Dropdown>
								</motion.div>
								<motion.div layoutId="actions-area" transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}>
									<AnimatePresence mode="wait">
										<motion.div
											key={loading ? 'loading' : hasInput ? 'send' : 'mic'}
											initial={{ opacity: 0 }}
											animate={{ opacity: 1 }}
											exit={{ opacity: 0 }}
											transition={{ duration: 0.15 }}
											style={{ display: 'flex', gap: 8, alignItems: 'center' }}
										>
											{renderActions()}
										</motion.div>
									</AnimatePresence>
								</motion.div>
							</motion.div>
						)}
					</AnimatePresence>
				</motion.div>
			</LayoutGroup>

			</div>

			{previewImage && (
				<ImageLightbox
					src={previewImage.src}
					fileName={previewImage.fileName}
					onClose={() => setPreviewImage(null)}
				/>
			)}
		</>
	);
}
