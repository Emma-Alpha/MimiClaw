import type {
	ClipboardEvent as ReactClipboardEvent,
	ReactNode,
} from "react";
import {
	useState,
	useCallback,
	useRef,
	useEffect,
	useMemo,
} from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";

import {
	Plus,
	Camera,
	FolderOpen,
	Paperclip,
	Mic,
	Send,
	Square,
	X,
	File,
	Folder,
	Sparkles,
	ChevronDown,
} from "lucide-react";
import { Button, type MenuProps } from "antd";
import { ComposerAttachmentPreview, ImageLightbox } from "@/features/mainChat/components/composer";
import { StyledDropdown } from "@/components/common/StyledDropdown";
import { Tooltip } from "@/components/ui/tooltip";
import { invokeIpc } from "@/lib/api-client";
import {
	CHAT_ACTION_ICON_SIZE,
	CHAT_CHIP_ICON_SIZE,
	CHAT_PRIMARY_ACTION_ICON_SIZE,
	CHAT_STOP_ICON_SIZE,
} from "@/styles/typography-tokens";
import {
	type UnifiedComposerInputValue,
	UnifiedComposerInput,
} from "@/features/mainChat/components/unified-composer-input";
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

function QuickActionTooltip({
	children,
	title,
}: {
	children: ReactNode;
	title?: ReactNode;
}) {
	if (!title) return <>{children}</>;

	return (
		<Tooltip mouseEnterDelay={0.2} placement="top" title={title}>
			<span
				style={{
					alignItems: "center",
					display: "inline-flex",
				}}
			>
				{children}
			</span>
		</Tooltip>
	);
}

export function MiniChatComposer({
	fusedWithTodo = false,
	input,
	onInputChange,
	onSend,
	loading,
	disabled,
	sendDisabled,
	isClaudeCodeCliMode,
	isMiniChatMode,
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
	onSkillsChange,
	onRichContentChange,
	onCaretChange,
	onKeyDown,
	onPressEnter,
	modelOptions,
	modelValue,
	modelLabel,
	onSelectModel,
	onCycleModel,
	effortEnabled,
	thinkingEnabled: _thinkingEnabled,
	fastModeEnabled: _fastModeEnabled,
	onToggleEffort,
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
	const handleOpenVoiceDialog = useCallback(() => {
		void invokeIpc("voice:openDialog").catch(() => {});
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

	const prevSkillsRef = useRef<string[]>([]);
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

			const nextSkills = next.skills ?? [];
			const prev = prevSkillsRef.current;
			const sameSkills =
				nextSkills.length === prev.length
				&& nextSkills.every((cmd, i) => cmd === prev[i]);
			if (!sameSkills) {
				prevSkillsRef.current = nextSkills;
				onSkillsChange(nextSkills);
			}
		},
		[droppedPaths, input, onInputChange, onSkillsChange],
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
			// and forward absolute paths via `quick-chat:paths-dropped`.
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

	const mentionItemNodesRef = useRef<Array<HTMLButtonElement | null>>([]);
	const mentionListRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!showMentionPicker) return;
		const mentionList = mentionListRef.current;
		const activeItem = mentionItemNodesRef.current[activeMentionIndex];
		if (!mentionList || !activeItem) return;

		const itemTop = activeItem.offsetTop;
		const itemBottom = itemTop + activeItem.offsetHeight;
		const visibleTop = mentionList.scrollTop;
		const visibleBottom = visibleTop + mentionList.clientHeight;

		if (itemTop < visibleTop) {
			mentionList.scrollTop = itemTop;
			return;
		}

		if (itemBottom > visibleBottom) {
			mentionList.scrollTop = itemBottom - mentionList.clientHeight;
		}
	}, [activeMentionIndex, showMentionPicker]);

	const hasInput =
		input.trim().length > 0 || attachments.length > 0 || droppedPaths.length > 0;
	const sendingDisabledByRecording = isRecording || isTranscribing;
	const useCodexExpandedLayout = isClaudeCodeCliMode && !isMiniChatMode;
	const showBottomControls = isMultiline || useCodexExpandedLayout;
	const effortLabel = effortEnabled ? "超高" : "标准";
	const modelShortcut = "⌘M";
	const useFullComposerControls = !isMiniChatMode;
	const screenshotShortcutLabel = useMemo(
		() => (/(Mac|iPhone|iPad|iPod)/i.test(window.navigator.platform) ? "⌘⇧S" : "Ctrl+Shift+S"),
		[],
	);
	const defaultModelMenuKey = "__default_model";
	const standardEffortMenuKey = "effort_standard";
	const highEffortMenuKey = "effort_high";
	const topRowAlign = useCodexExpandedLayout
		? "flex-start"
		: isMultiline
			? "flex-start"
			: "center";

	const attachmentMenuItems: NonNullable<MenuProps["items"]> = [
		{
			key: "file",
			label: "上传文件",
			icon: <Paperclip style={{ width: CHAT_CHIP_ICON_SIZE, height: CHAT_CHIP_ICON_SIZE }} />,
			onClick: onUploadFile,
			disabled,
		},
		{
			key: "folder",
			label: "上传文件夹",
			icon: <FolderOpen style={{ width: CHAT_CHIP_ICON_SIZE, height: CHAT_CHIP_ICON_SIZE }} />,
			onClick: onUploadFolder,
			disabled,
		},
		{
			key: "screenshot",
			label: (
				<span className={styles.attachmentMenuLabel}>
					<span>截图</span>
					<span className={styles.attachmentMenuShortcut}>{screenshotShortcutLabel}</span>
				</span>
			),
			icon: <Camera style={{ width: 14, height: 14 }} />,
			onClick: onScreenshot,
			disabled,
		},
	];

	const modelMenuItems = useMemo<NonNullable<MenuProps["items"]>>(
		() =>
			modelOptions.map((option) => ({
				key: option.key || defaultModelMenuKey,
				label: option.label,
			})),
		[defaultModelMenuKey, modelOptions],
	);

	const modelDropdownMenu = useMemo<MenuProps>(
		() => ({
			items: [
				{
					type: "group",
					label: "选择模型",
					children: modelMenuItems,
				},
			],
			selectable: true,
			selectedKeys: [modelValue || defaultModelMenuKey],
			onClick: ({ key }) => {
				onSelectModel(key === defaultModelMenuKey ? "" : String(key));
			},
		}),
		[defaultModelMenuKey, modelMenuItems, modelValue, onSelectModel],
	);

	const effortDropdownMenu = useMemo<MenuProps>(
		() => ({
			items: [
				{
					type: "group",
					label: "思考模式",
					children: [
						{ key: standardEffortMenuKey, label: "标准" },
						{ key: highEffortMenuKey, label: "超高" },
					],
				},
			],
			selectable: true,
			selectedKeys: [effortEnabled ? highEffortMenuKey : standardEffortMenuKey],
			onClick: ({ key }) => {
				const nextEffortEnabled = key === highEffortMenuKey;
				if (nextEffortEnabled === effortEnabled) return;
				onToggleEffort();
			},
		}),
		[effortEnabled, highEffortMenuKey, onToggleEffort, standardEffortMenuKey],
	);

	const renderModelControl = () => (
		<QuickActionTooltip title={`切换模型 (${modelShortcut})`}>
			<StyledDropdown
				menu={modelDropdownMenu}
				placement="topLeft"
				trigger={["click"]}
			>
				<button
					type="button"
					className={styles.codexControlChip}
					aria-label={`切换模型 (${modelShortcut})`}
				>
					<span>{modelLabel}</span>
					<ChevronDown size={12} />
				</button>
			</StyledDropdown>
		</QuickActionTooltip>
	);

	const renderEffortControl = () => (
		<QuickActionTooltip title="切换思考强度">
			<StyledDropdown
				menu={effortDropdownMenu}
				placement="topLeft"
				trigger={["click"]}
			>
				<button
					type="button"
					className={styles.codexControlChip}
					aria-label="切换思考强度"
				>
					<span>{effortLabel}</span>
					<ChevronDown size={12} />
				</button>
			</StyledDropdown>
		</QuickActionTooltip>
	);

	const renderPlusButton = () => (
		<QuickActionTooltip title="添加附件">
			<StyledDropdown
				menu={{ items: attachmentMenuItems }}
				placement="top"
				trigger={["click"]}
				disabled={disabled}
				variant="default"
			>
				<button
					type="button"
					className={cx(
						styles.plusButton,
						useCodexExpandedLayout && styles.plusButtonCodex,
					)}
					disabled={disabled}
					aria-label="添加附件"
				>
					<Plus style={{ width: CHAT_ACTION_ICON_SIZE, height: CHAT_ACTION_ICON_SIZE }} />
				</button>
			</StyledDropdown>
		</QuickActionTooltip>
	);

	const renderActions = () => {
		const baseSendButtonClassName = cx(
			styles.sendButton,
			useCodexExpandedLayout && styles.sendButtonCodex,
		);
		const loadingSendButtonClassName = cx(
			baseSendButtonClassName,
			styles.sendButtonSending,
		);
		const shouldShowVoiceDialogAction =
			isMiniChatMode
			&& !loading
			&& !hasInput
			&& !isRecording
			&& !isTranscribing;

		if (shouldShowVoiceDialogAction) {
			return (
				<QuickActionTooltip title="语音对话">
					<button
						type="button"
						className={styles.voiceDialogButton}
						onClick={handleOpenVoiceDialog}
						disabled={disabled}
						aria-label="语音对话"
					>
						<span className={styles.voiceDialogGlyph} aria-hidden="true">
							<span className={styles.voiceDialogBar} />
							<span className={styles.voiceDialogBar} />
							<span className={styles.voiceDialogBar} />
							<span className={styles.voiceDialogBar} />
						</span>
					</button>
				</QuickActionTooltip>
			);
		}

		if (isClaudeCodeCliMode) {
			const micAction = (
				<QuickActionTooltip title={isRecording ? "停止录音" : "语音输入"}>
					<button
						type="button"
						className={cx(styles.micIconBtn, isRecording && styles.micButtonRecording)}
						onClick={() => {
							void handleToggleRecording();
						}}
						disabled={isTranscribing}
						aria-label={isRecording ? "停止录音" : "语音输入"}
					>
						<Mic style={{ width: CHAT_ACTION_ICON_SIZE, height: CHAT_ACTION_ICON_SIZE }} />
					</button>
				</QuickActionTooltip>
			);

			if (loading) {
				return (
					<>
						{micAction}
						<QuickActionTooltip title="停止生成">
							<button
								type="button"
								className={loadingSendButtonClassName}
								disabled={false}
								onClick={onSend}
								aria-label="停止生成"
							>
								<Square style={{ width: CHAT_STOP_ICON_SIZE, height: CHAT_STOP_ICON_SIZE }} fill="currentColor" />
							</button>
						</QuickActionTooltip>
					</>
				);
			}
				return (
					<>
						{micAction}
						<QuickActionTooltip title={sendingDisabledByRecording ? (isTranscribing ? "正在转写" : "请先停止录音") : "发送"}>
							<Button
								htmlType="button"
								className={baseSendButtonClassName}
								disabled={sendDisabled || sendingDisabledByRecording}
								onClick={onSend}
								aria-label={sendingDisabledByRecording ? (isTranscribing ? "正在转写" : "请先停止录音") : "发送"}
								icon={<Send style={{ width: CHAT_PRIMARY_ACTION_ICON_SIZE, height: CHAT_PRIMARY_ACTION_ICON_SIZE, transform: "translateX(-0.4px) translateY(0.35px)" }} />}
							/>
						</QuickActionTooltip>
					</>
				);
			}

		if (loading) {
			return (
				<>
					<QuickActionTooltip title={isRecording ? '停止录音' : '语音输入'}>
						<button
							type="button"
							className={cx(styles.micIconBtn, isRecording && styles.micButtonRecording)}
							onClick={() => { void handleToggleRecording(); }}
							disabled={isTranscribing}
							aria-label={isRecording ? '停止录音' : '语音输入'}
						>
							<Mic style={{ width: CHAT_ACTION_ICON_SIZE, height: CHAT_ACTION_ICON_SIZE }} />
						</button>
					</QuickActionTooltip>
					<QuickActionTooltip title="停止生成">
						<Button
							htmlType="button"
							className={loadingSendButtonClassName}
							disabled={false}
							onClick={onSend}
							aria-label="停止生成"
							icon={<Square style={{ width: CHAT_STOP_ICON_SIZE, height: CHAT_STOP_ICON_SIZE }} fill="currentColor" />}
						/>
					</QuickActionTooltip>
				</>
			);
		}

		if (hasInput) {
			return (
				<>
					<QuickActionTooltip title={isRecording ? '停止录音' : '语音输入'}>
						<button
							type="button"
							className={cx(styles.micIconBtn, isRecording && styles.micButtonRecording)}
							onClick={() => { void handleToggleRecording(); }}
							disabled={isTranscribing}
							aria-label={isRecording ? '停止录音' : '语音输入'}
						>
							<Mic style={{ width: CHAT_ACTION_ICON_SIZE, height: CHAT_ACTION_ICON_SIZE }} />
						</button>
					</QuickActionTooltip>
					<QuickActionTooltip title={sendingDisabledByRecording ? (isTranscribing ? '正在转写' : '请先停止录音') : '发送'}>
						<Button
							htmlType="button"
							className={baseSendButtonClassName}
							disabled={sendDisabled || sendingDisabledByRecording}
							onClick={onSend}
							aria-label={sendingDisabledByRecording ? (isTranscribing ? '正在转写' : '请先停止录音') : '发送'}
							icon={<Send style={{ width: CHAT_PRIMARY_ACTION_ICON_SIZE, height: CHAT_PRIMARY_ACTION_ICON_SIZE, transform: "translateX(-0.4px) translateY(0.35px)" }} />}
						/>
					</QuickActionTooltip>
				</>
			);
		}

		return (
			<QuickActionTooltip title={isRecording ? '停止录音' : '语音输入'}>
				<button
					type="button"
					className={cx(styles.micButton, !isRecording && styles.micButtonHighlighted, isRecording && styles.micButtonRecording)}
					onClick={() => { void handleToggleRecording(); }}
					disabled={isTranscribing}
					aria-label={isRecording ? '停止录音' : '语音输入'}
				>
					<Mic style={{ width: CHAT_ACTION_ICON_SIZE, height: CHAT_ACTION_ICON_SIZE }} />
				</button>
			</QuickActionTooltip>
		);
	};

	return (
		<>
			<div className={cx(styles.container, fusedWithTodo && styles.containerFused)}>
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
						<div ref={mentionListRef} className={styles.mentionResultList}>
							{mentionOptions.map((option, index) => (
								<button
									key={option.id}
									ref={(node) => {
										mentionItemNodesRef.current[index] = node;
									}}
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
						<QuickActionTooltip title="取消录音">
							<button
								type="button"
								className={styles.recordingDiscardBtn}
								onClick={cancelRecording}
								aria-label="取消录音"
							>
								<X style={{ width: 16, height: 16 }} />
							</button>
						</QuickActionTooltip>
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
						fusedWithTodo && styles.pillFused,
						isMultiline && !useCodexExpandedLayout && styles.pillMultiline,
						useCodexExpandedLayout && styles.pillCodex,
						fusedWithTodo && useCodexExpandedLayout && styles.pillCodexFused,
						isDragOver && styles.pillDragOver,
					)}
				>
					<div
						className={cx(
							styles.pillTopRow,
							useCodexExpandedLayout && styles.pillTopRowCodex,
						)}
						style={{ alignItems: topRowAlign }}
					>
						{!showBottomControls && (
							<motion.div
								layoutId="plus-btn"
								className={styles.plusWrapper}
								style={{ marginRight: 2 }}
								transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
							>
								{renderPlusButton()}
							</motion.div>
						)}

						<motion.div
							layout={isMultiline ? "position" : false}
							transition={isMultiline ? { duration: 0.3, ease: [0.32, 0.72, 0, 1] } : undefined}
							className={cx(
								styles.inputArea,
								isMultiline && styles.inputAreaMultiline,
								useCodexExpandedLayout && styles.inputAreaCodex,
							)}
							style={{ flex: 1, minWidth: 0 }}
						>
							<div className={styles.inputTextWrap}>
								<UnifiedComposerInput
									ref={composerInputRef}
									value={composerValue}
									onChange={handleComposerChange}
									placeholder={placeholder || (isMultiline ? "输入描述或指令..." : "输入消息...")}
									disabled={disabled}
									className={cx(styles.editor, useCodexExpandedLayout && styles.editorCodex)}
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

							{!showBottomControls && isClaudeCodeCliMode && useFullComposerControls ? (
								<div className={styles.codexControlCenterInline}>
									{renderModelControl()}
									{renderEffortControl()}
								</div>
							) : null}

							{!showBottomControls && (
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

					<AnimatePresence>
						{showBottomControls && (
								<motion.div
									initial={{ opacity: 0, height: 0, marginTop: 0 }}
									animate={{ opacity: 1, height: "auto", marginTop: 5 }}
									exit={{ opacity: 0, height: 0, marginTop: 0 }}
									transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
								className={cx(
									styles.bottomControlRow,
									isClaudeCodeCliMode && styles.codexControlRow,
								)}
							>
									<motion.div layoutId="plus-btn" transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}>
										{renderPlusButton()}
									</motion.div>
									{isClaudeCodeCliMode ? (
										<div className={styles.codexControlCenter}>
											{renderModelControl()}
											{renderEffortControl()}
										</div>
									) : null}
								<motion.div layoutId="actions-area" transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}>
									<AnimatePresence mode="wait">
										<motion.div
											key={loading ? "loading" : hasInput || isClaudeCodeCliMode ? "send" : "mic"}
											initial={{ opacity: 0 }}
											animate={{ opacity: 1 }}
											exit={{ opacity: 0 }}
											transition={{ duration: 0.15 }}
											style={{ display: "flex", gap: 8, alignItems: "center" }}
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
