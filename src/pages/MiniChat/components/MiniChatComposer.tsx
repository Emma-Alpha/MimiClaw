import type {
	KeyboardEvent as ReactKeyboardEvent,
	MutableRefObject,
} from "react";
import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";

import { Plus, Camera, Paperclip, Mic, ArrowUp, Square, X, Folder, FileText } from "lucide-react";
import { ClaudeCode } from "@lobehub/icons";
import { Dropdown } from "antd";
import type { TextAreaRef } from "antd/es/input/TextArea";
import { ChatInputAreaInner } from "@lobehub/ui/chat";
import { createStyles } from "antd-style";
import { ComposerAttachmentPreview, ImageLightbox } from "@/components/common/composer";
import type { FileAttachment } from "@/components/common/composer-helpers";
import { useVolcengineAsr } from "@/hooks/useVolcengineAsr";
import { useMiniChatStyles } from "../styles";
import type { MentionOption, PathAttachment } from "../types";

type MiniChatComposerProps = {
	input: string;
	onInputChange: (value: string) => void;
	onSend: () => void;
	loading: boolean;
	disabled: boolean;
	sendDisabled: boolean;
	placeholder: string;
	textareaRef: MutableRefObject<TextAreaRef | null>;
	attachments: FileAttachment[];
	onRemoveAttachment: (id: string) => void;
	onUploadFile: () => void;
	onScreenshot: () => void;
	/** Still used by the + file-upload menu; no longer used for voice recording. */
	stageBufferFiles: (files: globalThis.File[]) => Promise<void>;
	showMentionPicker: boolean;
	mentionOptions: MentionOption[];
	activeMentionIndex: number;
	onActiveMentionIndexChange: (value: number) => void;
	onApplyMention: (option: MentionOption) => void;
	onCaretChange: (value: number) => void;
	onKeyDown: (event: ReactKeyboardEvent<HTMLTextAreaElement>) => void;
	onPressEnter: (event: ReactKeyboardEvent<HTMLTextAreaElement>) => void;
	onCompositionStart: () => void;
	onCompositionEnd: () => void;
	onFocusChange: (focused: boolean) => void;
	pathAttachments: PathAttachment[];
	onRemovePathAttachment: (id: string) => void;
	onDropPaths: (paths: PathAttachment[]) => void;
};

const useComposerStyles = createStyles(({ css, token, prefixCls }) => ({
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
		order: 2;

		& > div {
			padding: 0 !important;
			width: 100%;
			display: flex;
			align-items: center;
		}

		& .${prefixCls}-input {
			background: transparent !important;
			border: none !important;
			box-shadow: none !important;
			padding: 0 !important;
			font-size: 14px !important;
			line-height: 20px !important;
			resize: none !important;
			color: ${token.colorText} !important;
			min-height: 20px !important;
			
			&::placeholder {
				color: ${token.colorTextQuaternary} !important;
				font-size: 14px;
			}
		}
	`,
	inputAreaMultiline: css`
		flex: 1;
		align-items: flex-start;
		& > div {
			align-items: flex-start;
		}
		& .${prefixCls}-input {
			line-height: 1.5 !important;
			padding: 4px 0 6px !important;
		}
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
	pathRow: css`
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		padding: 0 12px;
	`,
	pathChip: css`
		display: flex;
		align-items: center;
		gap: 5px;
		padding: 4px 6px 4px 8px;
		border-radius: 14px;
		background: rgba(99, 102, 241, 0.07);
		border: 1px solid rgba(99, 102, 241, 0.2);
		font-size: 12px;
		color: ${token.colorText};
		max-width: 220px;
		cursor: default;
		transition: background 0.15s;

		&:hover {
			background: rgba(99, 102, 241, 0.12);
		}
	`,
	pathChipIcon: css`
		color: #6366f1;
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
		color: rgba(99, 102, 241, 0.45);
		cursor: pointer;
		padding: 0;
		flex-shrink: 0;
		transition: all 0.15s;

		&:hover {
			background: rgba(99, 102, 241, 0.15);
			color: #6366f1;
		}
	`,
	dragOverlay: css`
		position: absolute;
		inset: 0;
		border-radius: 28px;
		background: rgba(99, 102, 241, 0.04);
		border: 2px dashed rgba(99, 102, 241, 0.45);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 10;
		pointer-events: none;
		animation: drag-in 0.15s ease;

		@keyframes drag-in {
			from { opacity: 0; }
			to { opacity: 1; }
		}
	`,
	dragOverlayText: css`
		font-size: 13px;
		color: #6366f1;
		font-weight: 500;
		opacity: 0.85;
	`,
}));

export function MiniChatComposer({
	input,
	onInputChange,
	onSend,
	loading,
	disabled,
	sendDisabled,
	placeholder,
	textareaRef,
	attachments,
	onRemoveAttachment,
	onUploadFile,
	onScreenshot,
	stageBufferFiles: _stageBufferFiles,
	showMentionPicker,
	mentionOptions,
	activeMentionIndex,
	onActiveMentionIndexChange,
	onApplyMention,
	onCaretChange,
	onKeyDown,
	onPressEnter,
	onCompositionStart,
	onCompositionEnd,
	onFocusChange,
	pathAttachments,
	onRemovePathAttachment,
	onDropPaths,
}: MiniChatComposerProps) {
	const { styles: miniChatStyles, cx } = useMiniChatStyles();
	const { styles } = useComposerStyles();
	const [previewImage, setPreviewImage] = useState<{ src: string; fileName: string } | null>(null);

	// ── Volcengine ASR recording ──────────────────────────────────
	const [recordingTime, setRecordingTime] = useState(0);

	const handleTranscriptReady = useCallback((text: string) => {
		onInputChange(text);
		// Defer the send so the state update has a chance to flush first.
		queueMicrotask(() => { onSend(); });
	}, [onInputChange, onSend]);

	const { isRecording, isTranscribing, toggleRecording, cancelRecording, stopAndTranscribe } =
		useVolcengineAsr({ onTranscriptReady: handleTranscriptReady });

	const formatRecordingTime = (seconds: number) => {
		const m = Math.floor(seconds / 60);
		const s = seconds % 60;
		return `${m}:${s.toString().padStart(2, '0')}`;
	};

	useEffect(() => {
		let interval: ReturnType<typeof setInterval>;
		if (isRecording) {
			setRecordingTime(0);
			interval = setInterval(() => {
				setRecordingTime(prev => prev + 1);
			}, 1000);
		}
		return () => {
			if (interval) clearInterval(interval);
		};
	}, [isRecording]);

	// ── Drag-and-drop path attachment ────────────────────────────
	// ── Drag-and-drop: native document-level listeners ───────────
	// Must be document-level (not React synthetic) so Chromium sees the
	// preventDefault() on dragover and routes OS-level file drags here.
	const [isDragOver, setIsDragOver] = useState(false);
	const onDropPathsRef = useRef(onDropPaths);
	useEffect(() => { onDropPathsRef.current = onDropPaths; }, [onDropPaths]);

	useEffect(() => {
		let enterCount = 0;

		const onDragOver = (e: globalThis.DragEvent) => {
			e.preventDefault();
			if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
		};

		const onDragEnter = (e: globalThis.DragEvent) => {
			e.preventDefault();
			const types = Array.from(e.dataTransfer?.types ?? []);
			console.log('[drop-debug] dragenter types:', types, 'enterCount->', enterCount + 1);
			if (!types.includes('Files')) return;
			enterCount += 1;
			if (enterCount === 1) setIsDragOver(true);
		};

		const onDragLeave = () => {
			enterCount -= 1;
			console.log('[drop-debug] dragleave enterCount->', enterCount);
			if (enterCount <= 0) { enterCount = 0; setIsDragOver(false); }
		};

		const onDrop = (e: globalThis.DragEvent) => {
			enterCount = 0;
			setIsDragOver(false);
			console.log('[drop-debug] drop fired');

			const paths: PathAttachment[] = [];

			// ── Method 1: dataTransfer.items + webkitGetAsEntry ──────────
			const items = e.dataTransfer?.items;
			console.log('[drop-debug] items count:', items?.length ?? 0);
			if (items?.length) {
				for (let i = 0; i < items.length; i++) {
					const item = items[i];
					if (!item || item.kind !== 'file') continue;
					const entry = item.webkitGetAsEntry();
					const file = item.getAsFile();
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					const electronPath = file ? (file as any).path as string | undefined : undefined;
					console.log('[drop-debug] item[' + i + ']', {
						kind: item.kind,
						entryName: entry?.name,
						isDirectory: entry?.isDirectory,
						fileName: file?.name,
						fileSize: file?.size,
						fileType: file?.type,
						electronPath,
					});
					if (file && electronPath) {
						paths.push({
							id: crypto.randomUUID(),
							absolutePath: electronPath,
							name: file.name,
							isDirectory: entry?.isDirectory ?? (file.size === 0 && file.type === ''),
						});
					}
				}
			}

			// ── Method 2: text/uri-list ───────────────────────────────────
			if (paths.length === 0 && e.dataTransfer) {
				const uriList = e.dataTransfer.getData('text/uri-list');
				const plain   = e.dataTransfer.getData('text/plain');
				console.log('[drop-debug] uri-list:', JSON.stringify(uriList));
				console.log('[drop-debug] text/plain:', JSON.stringify(plain));
				for (const raw of (uriList || '').split(/\r?\n/)) {
					const uri = raw.trim();
					if (!uri || uri.startsWith('#')) continue;
					try {
						const url = new URL(uri);
						if (url.protocol !== 'file:') continue;
						const absPath = decodeURIComponent(url.pathname);
						const name = absPath.split('/').filter(Boolean).pop() || absPath;
						if (absPath) paths.push({ id: crypto.randomUUID(), absolutePath: absPath, name, isDirectory: false });
					} catch { /* skip */ }
				}
			}

			console.log('[drop-debug] collected paths:', paths);
			if (paths.length > 0) {
				e.preventDefault();
				onDropPathsRef.current(paths);
			} else {
				console.log('[drop-debug] no paths — letting will-navigate handle');
			}
		};

		document.addEventListener('dragover', onDragOver);
		document.addEventListener('dragenter', onDragEnter);
		document.addEventListener('dragleave', onDragLeave);
		document.addEventListener('drop', onDrop);
		return () => {
			document.removeEventListener('dragover', onDragOver);
			document.removeEventListener('dragenter', onDragEnter);
			document.removeEventListener('dragleave', onDragLeave);
			document.removeEventListener('drop', onDrop);
		};
	}, []);

	// Forward pet:recording-command IPC events (e.g. from F2 / Fn key) to the ASR hook.
	const stopAndTranscribeRef = useRef(stopAndTranscribe);
	const cancelRecordingRef = useRef(cancelRecording);
	const toggleRecordingRef = useRef(toggleRecording);
	useEffect(() => { stopAndTranscribeRef.current = stopAndTranscribe; }, [stopAndTranscribe]);
	useEffect(() => { cancelRecordingRef.current = cancelRecording; }, [cancelRecording]);
	useEffect(() => { toggleRecordingRef.current = toggleRecording; }, [toggleRecording]);

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

	const hasInput = input.trim().length > 0 || attachments.length > 0 || pathAttachments.length > 0;
	const lineCount = input.split('\n').length;
	const isMultiline = lineCount > 1 || input.length > 30; // Auto-switch if long or manual newline

	const renderActions = () => {
		if (loading) {
			return (
				<>
					<button
						type="button"
						className={cx(styles.micIconBtn, isRecording && styles.micButtonRecording)}
						onClick={() => { void toggleRecording(); }}
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
						onClick={() => { void toggleRecording(); }}
						title={isRecording ? '停止录音' : '语音输入'}
					>
						<Mic style={{ width: 14, height: 14 }} />
					</button>
					<button
						type="button"
						className={styles.sendButton}
						disabled={sendDisabled}
						onClick={onSend}
						title="发送"
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
				onClick={() => { void toggleRecording(); }}
				title={isRecording ? '停止录音' : '语音输入'}
			>
				<Mic style={{ width: 15, height: 15 }} />
			</button>
		);
	};

	return (
		<>
			<div className={styles.container}>
				{isDragOver && (
					<div className={styles.dragOverlay}>
						<span className={styles.dragOverlayText}>松开以添加文件 / 文件夹路径</span>
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

		{/* Path Attachments Row */}
			{pathAttachments.length > 0 && (
				<div className={styles.pathRow}>
					{pathAttachments.map((pa) => (
						<div key={pa.id} className={styles.pathChip} title={pa.absolutePath}>
							<span className={styles.pathChipIcon}>
								{pa.isDirectory
									? <Folder style={{ width: 12, height: 12 }} />
									: <FileText style={{ width: 12, height: 12 }} />}
							</span>
							<span className={styles.pathChipName}>{pa.name}</span>
							<button
								type="button"
								className={styles.pathChipRemove}
								onClick={() => onRemovePathAttachment(pa.id)}
								title="移除"
							>
								<X style={{ width: 10, height: 10 }} />
							</button>
						</div>
					))}
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
					className={cx(styles.pill, isMultiline && styles.pillMultiline)}
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
							<ChatInputAreaInner
								ref={textareaRef}
								value={input}
								onInput={onInputChange}
								disabled={disabled}
								placeholder={placeholder || (isMultiline ? "输入描述或指令..." : "输入消息...")}
								autoSize={{ minRows: 1, maxRows: 10 }}
								onChange={(event) => {
									onCaretChange(
										event.currentTarget.selectionStart ?? event.currentTarget.value.length,
									);
								}}
								onKeyDown={onKeyDown}
								onPressEnter={onPressEnter}
								onCompositionStart={onCompositionStart}
								onCompositionEnd={onCompositionEnd}
								onFocus={(event) => {
									onFocusChange(true);
									onCaretChange(
										event.currentTarget.selectionStart ?? event.currentTarget.value.length,
									);
								}}
								onBlur={() => {
									onFocusChange(false);
								}}
								onClick={(event) => {
									onCaretChange(
										event.currentTarget.selectionStart ?? event.currentTarget.value.length,
									);
								}}
								onSelect={(event) => {
									onCaretChange(
										event.currentTarget.selectionStart ?? event.currentTarget.value.length,
									);
								}}
							/>
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
