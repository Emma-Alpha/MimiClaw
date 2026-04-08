import type {
	ClipboardEvent as ReactClipboardEvent,
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
	File,
	Folder,
	Sparkles,
} from "lucide-react";
import { Dropdown } from "antd";
import { ComposerAttachmentPreview, ImageLightbox } from "@/components/common/composer";
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
import { useMiniChatStyles } from "../../styles";
import { useComposerStyles } from "./styles";
import type { MiniChatComposerProps } from "./types";

function extractDroppedPathsFromTransfer(
	dataTransfer: DataTransfer | null,
): UnifiedComposerPath[] {
	return extractUnifiedDroppedPathsFromTransfer(dataTransfer);
}
export function MiniChatComposer({
	input,
	onInputChange,
	onSend,
	loading,
	disabled,
	sendDisabled,
	isClaudeCodeCliMode: _isClaudeCodeCliMode,
	placeholder,
	attachments,
	droppedPaths,
	onRemoveAttachment,
	onPathsChange,
	onUploadFile,
	onUploadFolder,
	onScreenshot,
	stageBufferFiles,
	showMentionPanel,
	showMentionPicker,
	mentionOptions,
	mentionEmptyState,
	activeMentionIndex,
	onActiveMentionIndexChange,
	onApplyMention,
	onPickWorkspace,
	showSlashPicker,
	slashOptions,
	claudeCodeSkills,
	activeSlashIndex,
	onActiveSlashIndexChange,
	onApplySlashOption,
	composerInputRef,
	onSkillChange,
	onRichContentChange,
	onCaretChange,
	onKeyDown,
	onPressEnter,
	modelLabel,
	onCycleModel,
	effortEnabled: _effortEnabled,
	thinkingEnabled: _thinkingEnabled,
	fastModeEnabled: _fastModeEnabled,
	onToggleEffort: _onToggleEffort,
	onToggleThinking: _onToggleThinking,
	onToggleFastMode: _onToggleFastMode,
	onOpenAccountUsage: _onOpenAccountUsage,
	onRewind,
	onClearConversation,
	onCompositionStart,
	onCompositionEnd,
	onFocusChange,
	onDropPaths,
}: MiniChatComposerProps) {
	const { cx } = useMiniChatStyles();
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
	const hasProjectSkills = claudeCodeSkills.project.length > 0;
	const hasGlobalSkills = claudeCodeSkills.global.length > 0;
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

	const prevSkillRef = useRef<string | null | undefined>(undefined);
	const onRichContentChangeRef = useRef(onRichContentChange);
	useEffect(() => {
		onRichContentChangeRef.current = onRichContentChange;
	}, [onRichContentChange]);

	const handleComposerChange = useCallback(
		(next: UnifiedComposerInputValue) => {
			if (next.text !== input) {
				onInputChange(next.text);
			}

			if (next.richContent) {
				onRichContentChangeRef.current?.(next.richContent);
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

			const nextSkill = next.skill ?? null;
			if (prevSkillRef.current !== nextSkill) {
				prevSkillRef.current = nextSkill;
				onSkillChange(nextSkill);
			}
		},
		[droppedPaths, input, onInputChange, onSkillChange],
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
				{showSlashPicker && (
					<div className={styles.claudeSlashPanel}>
						{/* Project Skills */}
						{hasProjectSkills && slashOptions.filter((o) => o.scope === "project").length > 0 && (
							<div className={styles.claudeSlashSection}>
								<div className={styles.claudeSlashSectionTitle}>Project Skills</div>
								{slashOptions
									.filter((o) => o.scope === "project")
									.map((option) => {
										const globalIdx = slashOptions.indexOf(option);
										return (
											<button
												key={option.id}
												type="button"
												className={cx(
													styles.claudeSlashItem,
													styles.claudeSlashItemAction,
													globalIdx === activeSlashIndex && styles.claudeSlashItemStatic,
												)}
												onMouseEnter={() => onActiveSlashIndexChange(globalIdx)}
												onMouseDown={(event) => {
													event.preventDefault();
													onApplySlashOption(option);
												}}
											>
												<Sparkles style={{ width: 14, height: 14, flexShrink: 0, opacity: 0.45, marginTop: 2 }} />
												<div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2, minWidth: 0, overflow: "hidden" }}>
													<span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>{option.command}</span>
													{option.description && (
														<span className={styles.claudeSlashItemHint}>{option.description}</span>
													)}
												</div>
											</button>
										);
									})}
							</div>
						)}

						{/* Global Skills */}
						{hasGlobalSkills && slashOptions.filter((o) => o.scope === "global").length > 0 && (
							<>
								{hasProjectSkills && slashOptions.filter((o) => o.scope === "project").length > 0 && (
									<div className={styles.claudeSlashDivider} />
								)}
								<div className={styles.claudeSlashSection}>
									<div className={styles.claudeSlashSectionTitle}>Global Skills</div>
									{slashOptions
										.filter((o) => o.scope === "global")
										.map((option) => {
											const globalIdx = slashOptions.indexOf(option);
											return (
												<button
													key={option.id}
													type="button"
													className={cx(
														styles.claudeSlashItem,
														styles.claudeSlashItemAction,
														globalIdx === activeSlashIndex && styles.claudeSlashItemStatic,
													)}
													onMouseEnter={() => onActiveSlashIndexChange(globalIdx)}
													onMouseDown={(event) => {
														event.preventDefault();
														onApplySlashOption(option);
													}}
												>
													<Sparkles style={{ width: 14, height: 14, flexShrink: 0, opacity: 0.45, marginTop: 2 }} />
													<div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2, minWidth: 0, overflow: "hidden" }}>
														<span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>{option.command}</span>
														{option.description && (
															<span className={styles.claudeSlashItemHint}>{option.description}</span>
														)}
													</div>
												</button>
											);
										})}
								</div>
							</>
						)}

						{/* Commands */}
						{(hasProjectSkills || hasGlobalSkills) && slashOptions.length > 0 && (
							<div className={styles.claudeSlashDivider} />
						)}
						<div className={styles.claudeSlashSection}>
							<div className={styles.claudeSlashSectionTitle}>Commands</div>
							<button
								type="button"
								className={cx(styles.claudeSlashItem, styles.claudeSlashItemAction)}
								onMouseDown={(e) => e.preventDefault()}
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
								onMouseDown={(e) => e.preventDefault()}
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
								onMouseDown={(e) => e.preventDefault()}
								onClick={onRewind}
							>
								<span>Rewind</span>
							</button>
							<button
								type="button"
								className={cx(styles.claudeSlashItem, styles.claudeSlashItemAction)}
								onMouseDown={(e) => e.preventDefault()}
								onClick={onCycleModel}
							>
								<span>Switch model...</span>
								<span className={styles.claudeSlashItemHint}>{modelLabel}</span>
							</button>
						</div>
					</div>
				)}

				{/* Mention Overlay */}
				{showMentionPanel &&
					(showMentionPicker ? (
						<div className={styles.mentionResultList}>
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
										styles.mentionResultItem,
										index === activeMentionIndex && styles.mentionResultItemActive,
									)}
								>
									<div className={styles.mentionResultMeta}>
										<div className={styles.mentionResultIcon}>
											{option.isDirectory ? <Folder size={16} /> : <File size={16} />}
										</div>
										<div className={styles.mentionResultText}>
											<div className={styles.mentionResultTitle}>{option.label}</div>
											<div className={styles.mentionResultPath}>{option.relativePath}</div>
										</div>
									</div>
									<div className={styles.mentionResultBadge}>
										{option.isDirectory ? "文件夹" : "文件"}
									</div>
								</button>
							))}
						</div>
					) : mentionEmptyState ? (
						<div className={styles.mentionEmptyState}>
							<div className={styles.mentionEmptyStateTitle}>
								{mentionEmptyState.title}
							</div>
							<div className={styles.mentionEmptyStateDescription}>
								{mentionEmptyState.description}
							</div>
							{mentionEmptyState.actionLabel ? (
								<button
									type="button"
									className={styles.mentionEmptyStateAction}
									onMouseDown={(event) => {
										event.preventDefault();
									}}
									onClick={onPickWorkspace}
								>
									{mentionEmptyState.actionLabel}
								</button>
							) : null}
						</div>
					) : null)}

			{/* Recording / Transcribing Pill */}
			{(isRecording || isTranscribing) && (
				<div className={styles.recordingPill}>
					{isTranscribing ? (
						<div className={styles.waveContainer}>
							{[0.2, 0.4, 0.3, 0.5, 0.2].map((d) => (
								<div
									key={`transcribing-${d}`}
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
							{[0.1, 0.4, 0.2, 0.5, 0.3].map((d) => (
								<div key={`recording-${d}`} className={styles.waveBar} style={{ animationDelay: `-${d}s` }} />
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
					layout={isMultiline}
					transition={isMultiline ? { duration: 0.3, ease: [0.32, 0.72, 0, 1] } : undefined}
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
							layout={isMultiline ? "position" : false}
							transition={isMultiline ? { duration: 0.3, ease: [0.32, 0.72, 0, 1] } : undefined}
							className={cx(styles.inputArea, isMultiline && styles.inputAreaMultiline)}
							style={{ flex: 1, minWidth: 0 }}
						>
							<div className={styles.inputTextWrap}>
								<UnifiedComposerInput
									ref={composerInputRef}
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
									skillChipClassName={styles.skillChip}
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
