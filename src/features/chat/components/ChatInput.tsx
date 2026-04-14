import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import {
	AtSign,
	Camera,
	Mic,
	Square,
	Paperclip,
} from "lucide-react";
import { createStyles } from "antd-style";
import {
	ComposerBase,
	ComposerChip,
	ComposerIconButton,
} from "./composer";
import { type FileAttachment, readFileAsBase64 } from "../lib/composer-helpers";
import { hostApiFetch } from "@/lib/host-api";
import { invokeIpc } from "@/lib/api-client";
import {
	extractDroppedPathsFromTransfer,
	mergeUnifiedComposerPaths,
	toOpenClawSubmission,
	type UnifiedComposerPath,
} from "@/lib/unified-composer";
import { useGatewayStore } from "@/stores/gateway";
import { useSettingsStore } from "@/stores/settings";
import { useAgentsStore } from "@/stores/agents";
import { useChatStore } from "@/stores/chat";
import type { AgentSummary } from "@/types/agent";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

// ── Styles ───────────────────────────────────────────────────────

const useStyles = createStyles(({ token, css }) => ({
	wrapper: css`
    box-sizing: border-box;
    width: 100%;
    max-width: var(--chat-window-content-width, 800px);
    margin: 0 auto;
    padding: 8px 12px 12px;
    flex-shrink: 0;
    position: relative;
    z-index: 6;
    overflow: visible;
    display: flex;
    flex-direction: column;
    gap: 8px;
  `,
	recordingPill: css`
    display: flex;
    align-items: center;
    gap: 8px;
    background: rgba(239, 68, 68, 0.08);
    padding: 4px 12px 4px 16px;
    border-radius: 24px;
    border: 1px solid rgba(239, 68, 68, 0.15);
    animation: pill-slide-in 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    backdrop-filter: blur(8px);

    @keyframes pill-slide-in {
      0% { opacity: 0; transform: translateX(-10px) scale(0.95); }
      100% { opacity: 1; transform: translateX(0) scale(1); }
    }
  `,
	recordingTime: css`
	    font-size: var(--mimi-font-size-md);
	    color: #ef4444;
	    font-weight: var(--mimi-font-weight-semibold);
	    font-variant-numeric: tabular-nums;
	    min-width: 36px;
	  `,
	waveContainer: css`
    display: flex;
    align-items: center;
    gap: 2px;
    height: 16px;
  `,
	waveBar: css`
    width: 3px;
    border-radius: 2px;
    background: #ef4444;
    animation: waveAnim 1s ease-in-out infinite;
    min-height: 4px;

    @keyframes waveAnim {
      0%, 100% { height: 4px; opacity: 0.7; }
      50% { height: 14px; opacity: 1; }
    }
  `,
	agentPickerDropdown: css`
    position: absolute;
    left: 0;
    bottom: calc(100% + 6px);
    z-index: 100;
    width: 280px;
    overflow: hidden;
    border-radius: ${token.borderRadiusLG}px;
    border: 1px solid ${token.colorBorderSecondary};
    background: ${token.colorBgContainer};
    padding: 6px;
    box-shadow: ${token.boxShadowSecondary};
  `,
	agentPickerLabel: css`
	    padding: 6px 12px 4px;
	    font-size: var(--mimi-font-size-xs);
	    font-weight: var(--mimi-font-weight-medium);
	    color: ${token.colorTextQuaternary};
	  `,
	agentPickerList: css`
    max-height: 240px;
    overflow-y: auto;
  `,
	agentPickerItem: css`
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    width: 100%;
    border-radius: ${token.borderRadius}px;
    padding: 7px 12px;
    cursor: pointer;
    border: none;
    background: none;
    text-align: left;
    transition: background 0.15s;

    &:hover { background: ${token.colorFillSecondary}; }
  `,
	agentPickerItemActive: css`
    background: ${token.colorPrimaryBg};
  `,
	footer: css`
	    display: flex;
	    align-items: center;
	    justify-content: space-between;
	    gap: 8px;
	    min-height: 20px;
	    font-size: var(--mimi-font-size-xs);
	    color: ${token.colorTextQuaternary};
	    padding: 4px 8px 0;
	  `,
	footerStatus: css`
	    display: inline-flex;
	    align-items: center;
	    gap: 6px;
	    min-width: 0;
	    flex: 1;
	    overflow: hidden;
	  `,
	footerStatusText: css`
	    min-width: 0;
	    overflow: hidden;
	    text-overflow: ellipsis;
	    white-space: nowrap;
	  `,
	footerAction: css`
	    flex-shrink: 0;
	  `,
	statusDot: css`
    display: inline-block;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  `,
	statusDotActive: css`
    background: #22c55e;
    opacity: 0.8;
  `,
	statusDotInactive: css`
    background: #ef4444;
    opacity: 0.8;
  `,
}));

// ── Types ────────────────────────────────────────────────────────

interface ChatInputProps {
	onSend: (
		text: string,
		attachments?: FileAttachment[],
		targetAgentId?: string | null,
	) => void;
	onStop?: () => void;
	disabled?: boolean;
	sending?: boolean;
}

// ── Component ────────────────────────────────────────────────────

export function ChatInput({
	onSend,
	onStop,
	disabled = false,
	sending = false,
}: ChatInputProps) {
	const { t } = useTranslation("chat");
	const { styles, cx } = useStyles();

	const [input, setInput] = useState("");
	const [attachments, setAttachments] = useState<FileAttachment[]>([]);
	const [droppedPaths, setDroppedPaths] = useState<UnifiedComposerPath[]>([]);
	const [targetAgentId, setTargetAgentId] = useState<string | null>(null);
	const [pickerOpen, setPickerOpen] = useState(false);
	const [dragOver, setDragOver] = useState(false);

	// Recording state
	const [isRecording, setIsRecording] = useState(false);
	const [recordingTime, setRecordingTime] = useState(0);
	const mediaRecorderRef = useRef<MediaRecorder | null>(null);
	const audioChunksRef = useRef<Blob[]>([]);
	const isRecordingRef = useRef(false);
	const isStartingRecordingRef = useRef(false);
	const recordingStopModeRef = useRef<"stage" | "send" | "discard">("stage");
	const pendingExternalRecordingActionRef = useRef<"confirm" | "cancel" | null>(null);
	const applyRecordingCommandRef = useRef<((action: "confirm" | "cancel") => void) | null>(null);
	const pendingRecordingSendRef = useRef(false);

	const pickerRef = useRef<HTMLDivElement>(null);

	const gatewayStatus = useGatewayStore((s) => s.status);
	const remoteGatewayUrl = useSettingsStore((s) => s.remoteGatewayUrl);
	const agents = useAgentsStore((s) => s.agents);
	const currentAgentId = useChatStore((s) => s.currentAgentId);

	const currentAgentName = useMemo(
		() =>
			(agents ?? []).find((a) => a.id === currentAgentId)?.name ??
			currentAgentId,
		[agents, currentAgentId],
	);
	const mentionableAgents = useMemo(
		() => (agents ?? []).filter((a) => a.id !== currentAgentId),
		[agents, currentAgentId],
	);
	const selectedTarget = useMemo(
		() => (agents ?? []).find((a) => a.id === targetAgentId) ?? null,
		[agents, targetAgentId],
	);
	const showAgentPicker = mentionableAgents.length > 0;

	useEffect(() => {
		if (!targetAgentId) return;
		if (targetAgentId === currentAgentId) {
			setTargetAgentId(null);
			setPickerOpen(false);
			return;
		}
		if (!(agents ?? []).some((a) => a.id === targetAgentId)) {
			setTargetAgentId(null);
			setPickerOpen(false);
		}
	}, [agents, currentAgentId, targetAgentId]);

	useEffect(() => {
		if (!pickerOpen) return;
		const onDown = (e: MouseEvent) => {
			if (!pickerRef.current?.contains(e.target as Node)) setPickerOpen(false);
		};
		document.addEventListener("mousedown", onDown);
		return () => document.removeEventListener("mousedown", onDown);
	}, [pickerOpen]);

	// ── File staging ──────────────────────────────────────────────

	const pickFiles = useCallback(async () => {
		try {
			const result = (await invokeIpc("dialog:open", {
				properties: ["openFile", "multiSelections"],
			})) as { canceled: boolean; filePaths?: string[] };
			if (result.canceled || !result.filePaths?.length) return;

			const tempIds: string[] = [];
			for (const fp of result.filePaths) {
				const tempId = crypto.randomUUID();
				tempIds.push(tempId);
				const fileName = fp.split(/[\\/]/).pop() || "file";
				setAttachments((prev) => [
					...prev,
					{
						id: tempId,
						fileName,
						mimeType: "",
						fileSize: 0,
						stagedPath: "",
						preview: null,
						status: "staging",
					},
				]);
			}

			const staged = await hostApiFetch<
				Array<{
					id: string;
					fileName: string;
					mimeType: string;
					fileSize: number;
					stagedPath: string;
					preview: string | null;
				}>
			>("/api/files/stage-paths", {
				method: "POST",
				body: JSON.stringify({ filePaths: result.filePaths }),
			});

			setAttachments((prev) => {
				let updated = [...prev];
				for (let i = 0; i < tempIds.length; i++) {
					const data = staged[i];
					updated = updated.map((a) =>
						a.id === tempIds[i]
							? data
								? { ...data, status: "ready" as const }
								: { ...a, status: "error" as const, error: "Staging failed" }
							: a,
					);
				}
				return updated;
			});
		} catch (err) {
			setAttachments((prev) =>
				prev.map((a) =>
					a.status === "staging"
						? { ...a, status: "error" as const, error: String(err) }
						: a,
				),
			);
		}
	}, []);

	const stageBufferFiles = useCallback(async (files: globalThis.File[]) => {
		for (const file of files) {
			const tempId = crypto.randomUUID();
			setAttachments((prev) => [
				...prev,
				{
					id: tempId,
					fileName: file.name,
					mimeType: file.type || "application/octet-stream",
					fileSize: file.size,
					stagedPath: "",
					preview: null,
					status: "staging",
				},
			]);
			try {
				const base64 = await readFileAsBase64(file);
				const staged = await hostApiFetch<{
					id: string;
					fileName: string;
					mimeType: string;
					fileSize: number;
					stagedPath: string;
					preview: string | null;
				}>("/api/files/stage-buffer", {
					method: "POST",
					body: JSON.stringify({
						base64,
						fileName: file.name,
						mimeType: file.type || "application/octet-stream",
					}),
				});
				setAttachments((prev) =>
					prev.map((a) =>
						a.id === tempId ? { ...staged, status: "ready" as const } : a,
					),
				);
			} catch (err) {
				setAttachments((prev) =>
					prev.map((a) =>
						a.id === tempId
							? { ...a, status: "error" as const, error: String(err) }
							: a,
					),
				);
			}
		}
	}, []);

	// ── Audio Recording ──────────────────────────────────────────────

	const syncPetInputActivity = useCallback((activity: "idle" | "recording" | "transcribing") => {
		void invokeIpc("pet:setInputActivity", { activity }).catch(() => {});
	}, []);
	const toggleRecordingRef = useRef<(() => Promise<void>) | null>(null);

	const formatTime = (seconds: number) => {
		const m = Math.floor(seconds / 60);
		const s = seconds % 60;
		return `${m}:${s.toString().padStart(2, "0")}`;
	};

	// Use a separate effect for the timer to ensure it updates correctly
	useEffect(() => {
		let interval: NodeJS.Timeout;
		if (isRecording) {
			interval = setInterval(() => {
				setRecordingTime((prev) => prev + 1);
			}, 1000);
		}
		return () => {
			if (interval) clearInterval(interval);
		};
	}, [isRecording]);

	useEffect(() => {
		isRecordingRef.current = isRecording;
	}, [isRecording]);

	useEffect(() => {
		applyRecordingCommandRef.current = (action) => {
			if (!isRecordingRef.current) {
				if (isStartingRecordingRef.current) {
					pendingExternalRecordingActionRef.current = action;
				}
				return;
			}

			recordingStopModeRef.current = action === "confirm" ? "send" : "discard";
			mediaRecorderRef.current?.stop();
			setIsRecording(false);
			syncPetInputActivity(action === "confirm" ? "transcribing" : "idle");
		};
	}, [syncPetInputActivity]);

	const toggleRecording = useCallback(async () => {
		if (isRecording) {
			isStartingRecordingRef.current = false;
			pendingExternalRecordingActionRef.current = null;
			recordingStopModeRef.current = "stage";
			if (mediaRecorderRef.current) {
				mediaRecorderRef.current.stop();
			}
			setIsRecording(false);
			syncPetInputActivity("idle");
		} else {
			isStartingRecordingRef.current = true;
			try {
				const stream = await navigator.mediaDevices.getUserMedia({
					audio: true,
				});
				const mediaRecorder = new MediaRecorder(stream);
				mediaRecorderRef.current = mediaRecorder;
				audioChunksRef.current = [];
				recordingStopModeRef.current = "stage";

				mediaRecorder.ondataavailable = (e) => {
					if (e.data.size > 0) audioChunksRef.current.push(e.data);
				};

				mediaRecorder.onstop = async () => {
					const stopMode = recordingStopModeRef.current;
					recordingStopModeRef.current = "stage";
					setIsRecording(false);
					setRecordingTime(0);
					mediaRecorderRef.current = null;
					if (stopMode !== "send") {
						syncPetInputActivity("idle");
					}
					try {
						if (stopMode === "discard") {
							audioChunksRef.current = [];
							return;
						}

						const audioBlob = new Blob(audioChunksRef.current, {
							type: "audio/webm",
						});
						const file = new File(
							[audioBlob],
							`Voice_${new Date().toISOString().replace(/[:.]/g, "-")}.webm`,
							{ type: "audio/webm" },
						);
						await stageBufferFiles([file]);
						if (stopMode === "send") {
							pendingRecordingSendRef.current = true;
						}
						if (stopMode !== "send") {
							syncPetInputActivity("idle");
						}
					} catch (error) {
						syncPetInputActivity("idle");
						throw error;
					} finally {
						audioChunksRef.current = [];
						stream.getTracks().forEach((track) => {
							track.stop();
						});
					}
				};

				setRecordingTime(0);
				setIsRecording(true);
				mediaRecorder.start();
				isStartingRecordingRef.current = false;
				syncPetInputActivity("recording");
				const pendingAction = pendingExternalRecordingActionRef.current;
				if (pendingAction) {
					pendingExternalRecordingActionRef.current = null;
					queueMicrotask(() => {
						applyRecordingCommandRef.current?.(pendingAction);
					});
				}
			} catch (err) {
				isStartingRecordingRef.current = false;
				pendingExternalRecordingActionRef.current = null;
				syncPetInputActivity("idle");
				toast.error(t("composer.recordingFailed", "录音失败: ") + String(err));
			}
		}
	}, [isRecording, stageBufferFiles, syncPetInputActivity, t]);

	useEffect(() => {
		toggleRecordingRef.current = toggleRecording;
	}, [toggleRecording]);

	useEffect(() => {
		const unsubscribe = window.electron.ipcRenderer.on(
			"pet:recording-command",
			(payload) => {
				const action =
					payload && typeof payload === "object" && "action" in payload
						? (payload as { action?: "start" | "cancel" | "confirm" }).action
						: undefined;
				if (action === "start") {
					if (!isRecordingRef.current && !isStartingRecordingRef.current) {
						pendingExternalRecordingActionRef.current = null;
						void toggleRecordingRef.current?.();
					}
					return;
				}
				applyRecordingCommandRef.current?.(action === "confirm" ? "confirm" : "cancel");
			},
		);

		return () => {
			if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
				mediaRecorderRef.current.stop();
			}
			syncPetInputActivity("idle");
			unsubscribe?.();
		};
	}, [syncPetInputActivity]);

	const captureScreenshot = useCallback(async () => {
		let tempId: string | null = null;
		try {
			const screenshot = await window.electron.captureScreenshot();

			const nextTempId = crypto.randomUUID();
			tempId = nextTempId;
			setAttachments((prev) => [
				...prev,
				{
					id: nextTempId,
					fileName: screenshot.fileName,
					mimeType: screenshot.mimeType,
					fileSize: screenshot.fileSize,
					stagedPath: "",
					preview: screenshot.preview,
					status: "staging",
				},
			]);

			const staged = await hostApiFetch<{
				id: string;
				fileName: string;
				mimeType: string;
				fileSize: number;
				stagedPath: string;
				preview: string | null;
			}>("/api/files/stage-buffer", {
				method: "POST",
				body: JSON.stringify({
					base64: screenshot.base64,
					fileName: screenshot.fileName,
					mimeType: screenshot.mimeType,
				}),
			});

			setAttachments((prev) =>
				prev.map((attachment) =>
					attachment.id === nextTempId
						? { ...staged, status: "ready" as const }
						: attachment,
				),
			);
		} catch (err) {
			if (
				typeof err === "string" &&
				err.includes("timed out or was cancelled")
			) {
				return;
			}
			if (
				err instanceof Error &&
				err.message.includes("timed out or was cancelled")
			) {
				return;
			}
			if (tempId) {
				setAttachments((prev) =>
					prev.map((attachment) =>
						attachment.id === tempId
							? { ...attachment, status: "error" as const, error: String(err) }
							: attachment,
					),
				);
			}
			toast.error(err instanceof Error ? err.message : String(err));
		}
	}, []);

	useEffect(() => {
		const pending = window.sessionStorage.getItem("mimiclaw:capture-screenshot");
		if (pending === "1") {
			window.sessionStorage.removeItem("mimiclaw:capture-screenshot");
			void captureScreenshot();
		}

		const unsubscribe = window.electron.ipcRenderer.on(
			"screenshot:capture",
			() => {
				void captureScreenshot();
			},
		);

		return () => {
			if (typeof unsubscribe === "function") {
				unsubscribe();
			}
		};
	}, [captureScreenshot]);

	const removeAttachment = useCallback((id: string) => {
		setAttachments((prev) => prev.filter((a) => a.id !== id));
	}, []);

	const allReady =
		attachments.length === 0 || attachments.every((a) => a.status === "ready");
	const hasFailedAttachments = attachments.some((a) => a.status === "error");
	const canSend =
		(input.trim() || attachments.length > 0 || droppedPaths.length > 0) &&
		allReady &&
		!disabled &&
		!sending;

	const handleSend = useCallback(() => {
		if (!canSend) return;
		const readyAttachments = attachments.filter((a) => a.status === "ready");
		const submission = toOpenClawSubmission({
			text: input,
			attachments: readyAttachments,
			paths: droppedPaths,
		});
		setInput("");
		setAttachments([]);
		setDroppedPaths([]);
		onSend(
			submission.prompt,
			submission.attachments.length > 0 ? submission.attachments : undefined,
			targetAgentId,
		);
		setTargetAgentId(null);
		setPickerOpen(false);
	}, [input, attachments, canSend, droppedPaths, onSend, targetAgentId]);

	const handleStop = useCallback(() => {
		if (sending && onStop) onStop();
	}, [sending, onStop]);

	useEffect(() => {
		if (!pendingRecordingSendRef.current) return;
		if (isRecording) return;
		if (hasFailedAttachments) {
			pendingRecordingSendRef.current = false;
			syncPetInputActivity("idle");
			return;
		}
		if (!canSend) return;
		pendingRecordingSendRef.current = false;
		handleSend();
	}, [canSend, handleSend, hasFailedAttachments, isRecording, syncPetInputActivity]);

	const handlePaste = useCallback(
		(e: React.ClipboardEvent) => {
			const items = e.clipboardData?.items;
			if (!items) return;
			const files: globalThis.File[] = [];
			for (const item of Array.from(items)) {
				if (item.kind === "file") {
					const f = item.getAsFile();
					if (f) files.push(f);
				}
			}
			if (files.length > 0) {
				e.preventDefault();
				stageBufferFiles(files);
			}
		},
		[stageBufferFiles],
	);

	const handleDragOver = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setDragOver(true);
	}, []);
	const handleDragLeave = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setDragOver(false);
	}, []);
	const handleDrop = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();
			e.stopPropagation();
			setDragOver(false);
			const dropped = extractDroppedPathsFromTransfer(e.dataTransfer ?? null);
			if (dropped.length > 0) {
				setDroppedPaths((current) => mergeUnifiedComposerPaths(current, dropped));
				return;
			}
			if (e.dataTransfer?.files?.length) {
				stageBufferFiles(Array.from(e.dataTransfer.files));
			}
		},
		[stageBufferFiles],
	);

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: drag-and-drop
		<div
			className={styles.wrapper}
			onDragOver={handleDragOver}
			onDragLeave={handleDragLeave}
			onDrop={handleDrop}
		>
			<ComposerBase
				variant="desktop"
				value={input}
				onInput={setInput}
				paths={droppedPaths}
				onPathsChange={setDroppedPaths}
				onSend={handleSend}
				onStop={handleStop}
				loading={sending}
				disabled={disabled}
				sendDisabled={!canSend}
				placeholder={
					disabled
						? t("composer.gatewayDisconnectedPlaceholder")
						: t("composer.placeholder", "给大模型发送消息...")
				}
				textareaProps={{ onPaste: handlePaste }}
				attachments={attachments}
				onRemoveAttachment={removeAttachment}
				dragOver={dragOver}
				leftActions={(
					<>
						{selectedTarget ? (
							<ComposerChip
								variant="desktop"
								icon={<AtSign style={{ width: 12, height: 12 }} />}
								onRemove={() => setTargetAgentId(null)}
								removableTitle={t("composer.clearTarget")}
								title={t("composer.clearTarget")}
							>
								{t("composer.targetChip", { agent: selectedTarget.name })}
							</ComposerChip>
						) : null}

						<ComposerIconButton
							variant="desktop"
							icon={<Paperclip style={{ width: 16, height: 16 }} />}
							onClick={() => {
								void pickFiles();
							}}
							disabled={disabled || sending}
							title={t("composer.attachFiles")}
						/>

						<ComposerIconButton
							variant="desktop"
							icon={<Camera style={{ width: 16, height: 16 }} />}
							onClick={() => {
								void captureScreenshot();
							}}
							disabled={disabled || sending}
							title={t("composer.captureScreenshot")}
						/>

						{showAgentPicker ? (
							<div ref={pickerRef} style={{ position: "relative" }}>
								<ComposerIconButton
									variant="desktop"
									icon={<AtSign style={{ width: 16, height: 16 }} />}
									onClick={() => setPickerOpen((open) => !open)}
									disabled={disabled || sending}
									title={t("composer.pickAgent")}
									active={pickerOpen || !!selectedTarget}
								/>
								{pickerOpen ? (
									<div className={styles.agentPickerDropdown}>
										<div className={styles.agentPickerLabel}>
											{t("composer.agentPickerTitle", {
												currentAgent: currentAgentName,
											})}
										</div>
										<div className={styles.agentPickerList}>
											{mentionableAgents.map((agent) => (
												<AgentPickerItem
													key={agent.id}
													agent={agent}
													selected={agent.id === targetAgentId}
													onSelect={() => {
														setTargetAgentId(agent.id);
														setPickerOpen(false);
													}}
												/>
											))}
										</div>
									</div>
								) : null}
							</div>
						) : null}
					</>
				)}
				rightActions={
						isRecording ? (
						<div className={styles.recordingPill}>
							<div className={styles.waveContainer}>
								{[0.1, 0.4, 0.2, 0.5, 0.3].map((d) => (
									<div key={d} className={styles.waveBar} style={{ animationDelay: `-${d}s` }} />
								))}
							</div>
							<span className={styles.recordingTime}>
								{formatTime(recordingTime)}
							</span>
							<button
								type="button"
								onClick={toggleRecording}
								title={t("composer.stopRecording", "停止录音")}
								style={{
									display: "inline-flex",
									alignItems: "center",
									justifyContent: "center",
									width: 26,
									height: 26,
									border: "none",
									borderRadius: "999px",
									background: "rgba(239,68,68,0.12)",
									color: "#ef4444",
									cursor: "pointer",
									padding: 0,
								}}
							>
								<Square style={{ width: 13, height: 13 }} />
							</button>
						</div>
					) : (
						<ComposerIconButton
							variant="desktop"
							icon={<Mic style={{ width: 16, height: 16 }} />}
							onClick={toggleRecording}
							disabled={disabled || sending}
							title={t("composer.startRecording", "开始录音")}
						/>
					)
				}
				sendTexts={{
					send: t("composer.send"),
					stop: t("composer.stop"),
					warp: "Shift + Enter",
				}}
			/>

			{/* Footer status */}
			<div className={styles.footer}>
				<div className={styles.footerStatus}>
					<span
						className={cx(
							styles.statusDot,
							gatewayStatus.state === "running"
								? styles.statusDotActive
								: styles.statusDotInactive,
						)}
					/>
					<span className={styles.footerStatusText}>
						{remoteGatewayUrl?.trim()
							? `🌐 ${gatewayStatus.state === "running" ? t("composer.gatewayConnected") : gatewayStatus.state} (${t("composer.remoteMode", "远程")}) | ${remoteGatewayUrl.trim()}`
							: t("composer.gatewayStatus", {
									state:
										gatewayStatus.state === "running"
											? t("composer.gatewayConnected")
											: gatewayStatus.state,
									port: gatewayStatus.port,
									pid: gatewayStatus.pid ? `| pid: ${gatewayStatus.pid}` : "",
								})}
					</span>
				</div>
				{hasFailedAttachments && (
					<button
						type="button"
						className={styles.footerAction}
						style={{
							fontSize: "var(--mimi-font-size-xs)",
							cursor: "pointer",
							textDecoration: "underline",
							background: "none",
							border: "none",
							padding: 0,
							color: "inherit",
						}}
						onClick={() => {
							setAttachments((prev) =>
								prev.filter((a) => a.status !== "error"),
							);
							void pickFiles();
						}}
					>
						{t("composer.retryFailedAttachments")}
					</button>
				)}
			</div>
		</div>
	);
}

// ── Agent Picker Item ────────────────────────────────────────────

function AgentPickerItem({
	agent,
	selected,
	onSelect,
}: {
	agent: AgentSummary;
	selected: boolean;
	onSelect: () => void;
}) {
	const { styles, cx } = useStyles();
	return (
		<button
			type="button"
			onClick={onSelect}
			className={cx(
				styles.agentPickerItem,
				selected && styles.agentPickerItemActive,
			)}
		>
			<span
				style={{
					fontSize: "var(--mimi-font-size-md)",
					fontWeight: "var(--mimi-font-weight-medium)",
				}}
			>
				{agent.name}
			</span>
			<span style={{ fontSize: "var(--mimi-font-size-xs)", opacity: 0.5 }}>
				{agent.modelDisplay}
			</span>
		</button>
	);
}
