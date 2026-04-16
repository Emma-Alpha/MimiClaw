import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	type MouseEvent,
} from "react";
import { useTranslation } from "react-i18next";
import { useStyles } from "./PetFloating.styles";
import { toast } from "sonner";
import {
	DEFAULT_PET_ANIMATION,
	PET_IDLE_ANIMATIONS,
	PET_LOOPING_ANIMATIONS,
	PET_ANIMATION_SOURCES,
	PET_ANIMATIONS,
	type PetAnimation,
} from "@/lib/pet-floating";
import { invokeIpc } from "@/lib/api-client";
import {
	float32ToPcm16Bytes,
	mixToMono,
	resampleLinear,
	type PetAsrEventPayload,
} from "@/lib/volcengine-speech";
import { useSettingsStore } from "@/stores/settings";
import type {
	PetRecordingCommandPayload,
	PetRuntimeState,
} from "../../shared/pet";
import { rollPetCompanion } from "../../shared/pet-companion";

const FALLBACK_RUNTIME_STATE: PetRuntimeState = {
	animation: DEFAULT_PET_ANIMATION,
	activity: "idle",
	showTerminal: false,
	terminalLines: [],
	updatedAt: 0,
};

/** Pixels the mouse must travel before a press-and-release is treated as a drag. */
const DRAG_THRESHOLD_PX = 6;
/** Minimum ms between IPC window-move calls (~60 fps). */
const MOVE_THROTTLE_MS = 16;
/** Minimum ms between two toggleMiniChat calls to prevent double-click ghost windows. */
const TOGGLE_DEBOUNCE_MS = 400;

function PetThinkingBubble({ label, styles }: { label: string; styles: Record<string, string> }) {
	return (
		<div
			className={styles.thinkingBubble}
			style={{
				background: "rgba(10, 10, 10, 0.94)",
				transformOrigin: "center bottom",
				animation: "pet-claw-wave-in 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
			}}
		>
			<span className={styles.thinkingBubbleText}>{label}</span>
			<div
				className={styles.thinkingBubbleShimmer}
				style={{
					background:
						"linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 45%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.06) 55%, transparent 100%)",
					backgroundSize: "200% 100%",
					animation: "pet-claw-shimmer 1.8s ease-in-out infinite",
				}}
			/>
		</div>
	);
}

function PetVoiceWaveformCanvas({
	analyser,
	barCount = 12,
}: {
	analyser: AnalyserNode | null;
	barCount?: number;
}) {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const frameRef = useRef<number | null>(null);
	const smoothedRef = useRef<Float32Array | null>(null);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const rect = canvas.getBoundingClientRect();
		const dpr = window.devicePixelRatio || 1;
		canvas.width = rect.width * dpr;
		canvas.height = rect.height * dpr;

		const context = canvas.getContext("2d");
		if (!context) return;
		context.setTransform(dpr, 0, 0, dpr, 0, 0);

		const width = rect.width;
		const height = rect.height;
		const centerY = height / 2;
		const barWidth = 2.5;
		const gap = 2.5;
		const totalWidth = barCount * barWidth + (barCount - 1) * gap;
		const startX = (width - totalWidth) / 2;
		const frequencyBinCount = analyser?.frequencyBinCount ?? 256;
		const frequencyData = new Uint8Array(frequencyBinCount);

		if (!smoothedRef.current || smoothedRef.current.length !== barCount) {
			smoothedRef.current = new Float32Array(barCount);
		}

		const draw = () => {
			frameRef.current = window.requestAnimationFrame(draw);
			context.clearRect(0, 0, width, height);

			if (analyser) {
				analyser.getByteFrequencyData(frequencyData);
			}

			const bucketSize = Math.max(1, Math.floor(frequencyBinCount / barCount));
			for (let index = 0; index < barCount; index += 1) {
				const rawLevel = analyser
					? frequencyData[Math.min(index * bucketSize, frequencyData.length - 1)] / 255
					: (Math.sin(Date.now() / 180 + index * 0.9) + 1) / 2;
				const smoothed = smoothedRef.current?.[index] ?? 0;
				const nextLevel = smoothed + (rawLevel - smoothed) * 0.22;
				if (smoothedRef.current) smoothedRef.current[index] = nextLevel;

				const maxHalfHeight = centerY * 0.95;
				const barHeight = Math.max(2, nextLevel * maxHalfHeight + 2);
				const x = startX + index * (barWidth + gap);
				const opacity = 0.35 + nextLevel * 0.6;
				const gradient = context.createLinearGradient(x, centerY - barHeight, x, centerY + barHeight);
				gradient.addColorStop(0, `rgba(255, 255, 255, ${opacity * 0.5})`);
				gradient.addColorStop(0.5, `rgba(255, 255, 255, ${opacity})`);
				gradient.addColorStop(1, `rgba(255, 255, 255, ${opacity * 0.5})`);
				context.shadowColor = `rgba(255, 255, 255, ${nextLevel * 0.15})`;
				context.shadowBlur = 3 + nextLevel * 4;
				context.fillStyle = gradient;
				context.beginPath();
				context.roundRect(x, centerY - barHeight, barWidth, barHeight * 2, barWidth / 2);
				context.fill();
			}

			context.shadowColor = "transparent";
			context.shadowBlur = 0;
		};

		draw();
		return () => {
			if (frameRef.current != null) {
				window.cancelAnimationFrame(frameRef.current);
				frameRef.current = null;
			}
		};
	}, [analyser, barCount]);

	return <canvas ref={canvasRef} style={{ display: 'block', height: 24, width: 56, flexShrink: 0 }} />;
}

function PetRecordingBubble({
	analyser,
	transcript,
	label,
	onCancel,
	onConfirm,
	onMouseEnter,
	onMouseLeave,
	styles,
}: {
	analyser: AnalyserNode | null;
	transcript: string;
	label: string;
	onCancel: () => void;
	onConfirm: () => void;
	onMouseEnter: () => void;
	onMouseLeave: () => void;
	styles: Record<string, string>;
}) {
	return (
		<div
			className={styles.recordingBubble}
			style={{
				background: "rgba(10, 10, 10, 0.94)",
				transformOrigin: "center bottom",
				animation: "pet-claw-wave-in 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
			}}
			onMouseDown={(event) => {
				event.stopPropagation();
			}}
			onClick={(event) => {
				event.stopPropagation();
			}}
			onMouseEnter={onMouseEnter}
			onMouseLeave={onMouseLeave}
		>
			<button
				type="button"
				className={styles.recordingCancelBtn}
				style={{ background: "rgba(255, 255, 255, 0.22)" }}
				onClick={onCancel}
				aria-label="取消录音"
			>
				<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round">
					<path d="M18 6L6 18M6 6l12 12" />
				</svg>
			</button>
			<div className={styles.recordingInner}>
				<PetVoiceWaveformCanvas analyser={analyser} />
				<span className={styles.recordingTranscript}>
					{transcript || label}
				</span>
			</div>
			<button
				type="button"
				className={styles.recordingConfirmBtn}
				onClick={onConfirm}
				aria-label="结束录音并发送"
			>
				<svg
					width="15"
					height="15"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2.8"
					strokeLinecap="round"
					strokeLinejoin="round"
				>
					<path d="M20 6L9 17l-5-5" />
				</svg>
			</button>
		</div>
	);
}

export function PetFloating() {
	const { styles } = useStyles();
	const { i18n } = useTranslation("settings");
	const videoRef = useRef<HTMLVideoElement | null>(null);
	const initSettings = useSettingsStore((state) => state.init);
	const petAnimation = useSettingsStore((state) => state.petAnimation);
	const petCompanion = useSettingsStore((state) => state.petCompanion);
	const petCompanionSeed = useSettingsStore((state) => state.petCompanionSeed);
	const machineId = useSettingsStore((state) => state.machineId);
	const setPetCompanion = useSettingsStore((state) => state.setPetCompanion);
	const [runtimeState, setRuntimeState] = useState<PetRuntimeState>(
		FALLBACK_RUNTIME_STATE,
	);
	const [recordingAnalyser, setRecordingAnalyser] = useState<AnalyserNode | null>(null);
	const [liveTranscript, setLiveTranscript] = useState("");
	const [hasPlayedIntro, setHasPlayedIntro] = useState(false);
	const [settingsReady, setSettingsReady] = useState(false);
	const recordingStreamRef = useRef<MediaStream | null>(null);
	const recordingAudioContextRef = useRef<AudioContext | null>(null);
	const recordingSourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
	const recordingProcessorNodeRef = useRef<ScriptProcessorNode | null>(null);
	const recordingSilenceNodeRef = useRef<GainNode | null>(null);
	const recordingSampleRateRef = useRef(48_000);
	const pendingInputSamplesRef = useRef<number[]>([]);
	const asrSessionIdRef = useRef<string | null>(null);
	const isFinalizingRecordingRef = useRef(false);
	const isRecordingRef = useRef(false);
	const isStartingRecordingRef = useRef(false);
	const pendingRecordingActionRef = useRef<"confirm" | "cancel" | null>(null);

	const lastToggleAt = useRef(0);
	const isDragging = useRef(false);

	const currentAnimation = useMemo<PetAnimation>(() => {
		const preferredIdleAnimation = PET_IDLE_ANIMATIONS.includes(
			petAnimation as (typeof PET_IDLE_ANIMATIONS)[number],
		)
			? petAnimation
			: DEFAULT_PET_ANIMATION;
		const preferred =
			runtimeState.activity === "idle"
				? preferredIdleAnimation
				: runtimeState.animation;
		return PET_ANIMATIONS.includes(preferred)
			? preferred
			: DEFAULT_PET_ANIMATION;
	}, [petAnimation, runtimeState.activity, runtimeState.animation]);

	const displayAnimation = hasPlayedIntro ? currentAnimation : "begin";
	const shouldLoop = PET_LOOPING_ANIMATIONS.includes(
		displayAnimation as (typeof PET_LOOPING_ANIMATIONS)[number],
	);
	const statusOverlay = useMemo(() => {
		if (runtimeState.activity === "recording") {
			return {
				variant: "recording" as const,
				label: i18n.resolvedLanguage?.startsWith("zh")
					? "语音录入中"
					: i18n.resolvedLanguage?.startsWith("ja")
						? "音声入力中"
						: "Voice Input",
			};
		}

		if (runtimeState.activity === "transcribing") {
			return {
				variant: "thinking" as const,
				label: liveTranscript || "Thinking",
			};
		}

		return null;
	}, [i18n.resolvedLanguage, liveTranscript, runtimeState.activity]);

	const teardownRecordingAudioPipeline = useCallback(() => {
		const processor = recordingProcessorNodeRef.current;
		if (processor) {
			processor.onaudioprocess = null;
			processor.disconnect();
		}
		recordingProcessorNodeRef.current = null;
		recordingSourceNodeRef.current?.disconnect();
		recordingSourceNodeRef.current = null;
		recordingSilenceNodeRef.current?.disconnect();
		recordingSilenceNodeRef.current = null;
		recordingStreamRef.current?.getTracks().forEach((track) => {
			track.stop();
		});
		recordingStreamRef.current = null;
		if (recordingAudioContextRef.current) {
			void recordingAudioContextRef.current.close().catch(() => {});
		}
		recordingAudioContextRef.current = null;
		pendingInputSamplesRef.current = [];
		setRecordingAnalyser(null);
	}, []);

	const cleanupRecordingPreview = useCallback(() => {
		isRecordingRef.current = false;
		isStartingRecordingRef.current = false;
		isFinalizingRecordingRef.current = false;
		pendingRecordingActionRef.current = null;
		teardownRecordingAudioPipeline();
	}, [teardownRecordingAudioPipeline]);

	const syncPetInputActivity = useCallback((activity: "idle" | "recording" | "transcribing") => {
		void invokeIpc("pet:setInputActivity", { activity }).catch(() => {});
	}, []);

	const consumePendingAudioChunk = useCallback(() => {
		const pendingSamples = pendingInputSamplesRef.current;
		if (pendingSamples.length === 0) {
			return new Uint8Array(0);
		}

		const resampled = resampleLinear(
			Float32Array.from(pendingSamples),
			recordingSampleRateRef.current,
			16_000,
		);
		pendingInputSamplesRef.current = [];
		return float32ToPcm16Bytes(resampled);
	}, []);

	const cancelCurrentRecording = useCallback(() => {
		const sessionId = asrSessionIdRef.current;
		asrSessionIdRef.current = null;
		cleanupRecordingPreview();
		setLiveTranscript("");
		syncPetInputActivity("idle");
		if (sessionId) {
			void invokeIpc("pet:asrSessionCancel", { sessionId }).catch(() => {});
		}
	}, [cleanupRecordingPreview, syncPetInputActivity]);

	const finalizeCurrentRecording = useCallback(async () => {
		if (isFinalizingRecordingRef.current) return;
		isFinalizingRecordingRef.current = true;

		const sessionId = asrSessionIdRef.current;
		const finalAudioChunk = consumePendingAudioChunk();
		asrSessionIdRef.current = null;
		teardownRecordingAudioPipeline();
		isRecordingRef.current = false;
		isStartingRecordingRef.current = false;
		pendingRecordingActionRef.current = null;

		if (!sessionId) {
			isFinalizingRecordingRef.current = false;
			syncPetInputActivity("idle");
			toast.error(
				i18n.resolvedLanguage?.startsWith("zh")
					? "语音识别会话未启动"
					: i18n.resolvedLanguage?.startsWith("ja")
						? "音声認識セッションが開始されていません"
						: "Speech session was not started.",
			);
			return;
		}

		try {
			const result = await invokeIpc<{ success: boolean; text?: string }>(
				"pet:asrSessionFinish",
				{
					sessionId,
					audioChunk: finalAudioChunk,
				},
			);
			const transcriptText = (result.text || "").trim();

			if (!transcriptText) {
				throw new Error("Speech transcription returned empty text");
			}

			await invokeIpc("pet:openQuickChatWithPayload", {
				text: transcriptText,
				autoSend: true,
			});
			setLiveTranscript("");
		} catch (error) {
			console.error("[pet-floating] Failed to finalize voice recording", error);
			toast.error(
				i18n.resolvedLanguage?.startsWith("zh")
					? "语音转写失败，请检查火山 ASR 配置"
					: i18n.resolvedLanguage?.startsWith("ja")
						? "音声文字起こしに失敗しました。Volcengine ASR 設定を確認してください"
						: "Speech transcription failed. Please check the Volcengine ASR settings.",
			);
		} finally {
			isFinalizingRecordingRef.current = false;
			syncPetInputActivity("idle");
		}
	}, [consumePendingAudioChunk, i18n.resolvedLanguage, syncPetInputActivity, teardownRecordingAudioPipeline]);

	const applyRecordingCommand = useCallback((action: "confirm" | "cancel") => {
		if (!isRecordingRef.current) {
			if (isStartingRecordingRef.current) {
				pendingRecordingActionRef.current = action;
			}
			return;
		}

		if (action === "confirm") {
			syncPetInputActivity("transcribing");
			void finalizeCurrentRecording();
			return;
		}

		cancelCurrentRecording();
	}, [cancelCurrentRecording, finalizeCurrentRecording, syncPetInputActivity]);

	const startPetRecording = useCallback(async () => {
		if (isRecordingRef.current || isStartingRecordingRef.current) return;

		isStartingRecordingRef.current = true;
		pendingRecordingActionRef.current = null;
		setLiveTranscript("");
		pendingInputSamplesRef.current = [];

		try {
			const stream = await navigator.mediaDevices.getUserMedia({
				audio: {
					channelCount: 1,
					echoCancellation: true,
					noiseSuppression: true,
					autoGainControl: true,
				},
			});
			const startResult = await invokeIpc<{ success: boolean; sessionId: string }>("pet:asrSessionStart");
			const sessionId = startResult.sessionId;
			const AudioContextCtor = window.AudioContext;
			let audioContext: AudioContext | null = null;
			let analyser: AnalyserNode | null = null;
			let sourceNode: MediaStreamAudioSourceNode | null = null;
			let processorNode: ScriptProcessorNode | null = null;
			let silenceNode: GainNode | null = null;

			if (!AudioContextCtor) {
				throw new Error("AudioContext is unavailable");
			}

			audioContext = new AudioContextCtor();
			await audioContext.resume().catch(() => {});
			sourceNode = audioContext.createMediaStreamSource(stream);
			analyser = audioContext.createAnalyser();
			analyser.fftSize = 256;
			sourceNode.connect(analyser);
			processorNode = audioContext.createScriptProcessor(4096, 1, 1);
			silenceNode = audioContext.createGain();
			silenceNode.gain.value = 0;
			recordingSampleRateRef.current = audioContext.sampleRate;

			processorNode.onaudioprocess = (event) => {
				if (!isRecordingRef.current) return;

				const inputBuffer = event.inputBuffer;
				const channelData: Float32Array[] = [];
				for (let channelIndex = 0; channelIndex < inputBuffer.numberOfChannels; channelIndex += 1) {
					channelData.push(inputBuffer.getChannelData(channelIndex));
				}

				const monoSamples = mixToMono(channelData);
				for (let index = 0; index < monoSamples.length; index += 1) {
					pendingInputSamplesRef.current.push(monoSamples[index] ?? 0);
				}

				const chunkSize = Math.max(1, Math.round(recordingSampleRateRef.current * 0.2));
				while (pendingInputSamplesRef.current.length >= chunkSize) {
					const inputChunk = pendingInputSamplesRef.current.splice(0, chunkSize);
					const resampledChunk = resampleLinear(
						Float32Array.from(inputChunk),
						recordingSampleRateRef.current,
						16_000,
					);
					const pcmBytes = float32ToPcm16Bytes(resampledChunk);
					void invokeIpc("pet:asrSessionChunk", {
						sessionId,
						audioChunk: pcmBytes,
					}).catch((error) => {
						console.error("[pet-floating] Failed to push realtime ASR chunk", error);
					});
				}
			};

			sourceNode.connect(processorNode);
			processorNode.connect(silenceNode);
			silenceNode.connect(audioContext.destination);

			recordingStreamRef.current = stream;
			recordingAudioContextRef.current = audioContext;
			recordingSourceNodeRef.current = sourceNode;
			recordingProcessorNodeRef.current = processorNode;
			recordingSilenceNodeRef.current = silenceNode;
			asrSessionIdRef.current = sessionId;
			setRecordingAnalyser(analyser);
			isStartingRecordingRef.current = false;
			isRecordingRef.current = true;
			syncPetInputActivity("recording");

			const pendingAction = pendingRecordingActionRef.current;
			if (pendingAction) {
				pendingRecordingActionRef.current = null;
				queueMicrotask(() => {
					applyRecordingCommand(pendingAction);
				});
			}
		} catch (error) {
			console.error("[pet-floating] Failed to start voice recording", error);
			isStartingRecordingRef.current = false;
			isRecordingRef.current = false;
			pendingRecordingActionRef.current = null;
			const sessionId = asrSessionIdRef.current;
			asrSessionIdRef.current = null;
			syncPetInputActivity("idle");
			cleanupRecordingPreview();
			if (sessionId) {
				void invokeIpc("pet:asrSessionCancel", { sessionId }).catch(() => {});
			}
			toast.error(
				i18n.resolvedLanguage?.startsWith("zh")
					? "无法启动语音识别，请先在设置里配置火山引擎 ASR"
					: i18n.resolvedLanguage?.startsWith("ja")
						? "音声認識を開始できません。先に設定で Volcengine ASR を構成してください"
						: "Unable to start speech recognition. Please configure Volcengine ASR in Settings first.",
			);
		}
	}, [applyRecordingCommand, cleanupRecordingPreview, i18n.resolvedLanguage, syncPetInputActivity]);

	// ── Settings & runtime state sync ────────────────────────────

	useEffect(() => {
		void initSettings().finally(() => {
			setSettingsReady(true);
		});
	}, [initSettings]);

	useEffect(() => {
		const syncFromStorage = (event: StorageEvent) => {
			if (event.key === "mimiclaw-settings") void initSettings();
		};
		window.addEventListener("storage", syncFromStorage);
		return () => window.removeEventListener("storage", syncFromStorage);
	}, [initSettings]);

	useEffect(() => {
		const htmlStyle = document.documentElement.style;
		const bodyStyle = document.body.style;
		const rootStyle = document.getElementById("root")?.style;
		const prev = {
			htmlBg: htmlStyle.background,
			bodyBg: bodyStyle.background,
			rootBg: rootStyle?.background ?? "",
			bodyOverflow: bodyStyle.overflow,
			bodyMargin: bodyStyle.margin,
		};
		htmlStyle.background = "transparent";
		bodyStyle.background = "transparent";
		bodyStyle.overflow = "hidden";
		bodyStyle.margin = "0";
		if (rootStyle) rootStyle.background = "transparent";
		return () => {
			htmlStyle.background = prev.htmlBg;
			bodyStyle.background = prev.bodyBg;
			bodyStyle.overflow = prev.bodyOverflow;
			bodyStyle.margin = prev.bodyMargin;
			if (rootStyle) rootStyle.background = prev.rootBg;
		};
	}, []);

	useEffect(() => {
		void invokeIpc<PetRuntimeState>("pet:getRuntimeState")
			.then((state) => {
				if (state && typeof state === "object") setRuntimeState(state);
			})
			.catch(() => {});
	}, []);

	useEffect(() => {
		const unsubscribe = window.electron.ipcRenderer.on(
			"pet:settings-updated",
			() => { void initSettings(); },
		);
		return () => { unsubscribe?.(); };
	}, [initSettings]);

	useEffect(() => {
		const unsubscribe = window.electron.ipcRenderer.on(
			"pet:runtime-state",
			(payload) => {
				if (payload && typeof payload === "object") {
					setRuntimeState(payload as PetRuntimeState);
				}
			},
		);
		return () => { unsubscribe?.(); };
	}, []);

	useEffect(() => {
		const unsubscribe = window.electron.ipcRenderer.on(
			"pet:asr-event",
			(payload) => {
				const event = payload as PetAsrEventPayload | undefined;
				if (!event || event.sessionId !== asrSessionIdRef.current) {
					return;
				}

				if (event.type === "partial" || event.type === "final") {
					setLiveTranscript((event.text || "").trim());
					return;
				}

				if (event.type === "error") {
					console.error("[pet-floating] Realtime ASR error", event.message);
					asrSessionIdRef.current = null;
					cleanupRecordingPreview();
					setLiveTranscript("");
					syncPetInputActivity("idle");
					toast.error(
						i18n.resolvedLanguage?.startsWith("zh")
							? `语音识别失败：${event.message || "请检查火山 ASR 配置"}`
							: i18n.resolvedLanguage?.startsWith("ja")
								? `音声認識に失敗しました: ${event.message || "Volcengine ASR 設定を確認してください"}`
								: `Speech recognition failed: ${event.message || "Please check the Volcengine ASR settings."}`,
					);
				}
			},
		);
		return () => { unsubscribe?.(); };
	}, [cleanupRecordingPreview, i18n.resolvedLanguage, syncPetInputActivity]);

	useEffect(() => {
		const unsubscribe = window.electron.ipcRenderer.on(
			"pet:recording-command",
			(payload) => {
				const action = (
					payload as PetRecordingCommandPayload | undefined
				)?.action;
				if (action === "start") {
					void startPetRecording();
					return;
				}
				applyRecordingCommand(action === "confirm" ? "confirm" : "cancel");
			},
		);

		return () => {
			unsubscribe?.();
			if (asrSessionIdRef.current) {
				void invokeIpc("pet:asrSessionCancel", { sessionId: asrSessionIdRef.current }).catch(() => {});
				asrSessionIdRef.current = null;
			}
			cleanupRecordingPreview();
			syncPetInputActivity("idle");
		};
	}, [applyRecordingCommand, cleanupRecordingPreview, startPetRecording, syncPetInputActivity]);

	useEffect(() => {
		if (!settingsReady || petCompanion) return;

		const seed = petCompanionSeed.trim()
			|| (machineId.trim()
				? `machine:${machineId.trim()}`
				: `local:${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`}`);

		setPetCompanion(rollPetCompanion(seed), seed);
	}, [machineId, petCompanion, petCompanionSeed, setPetCompanion, settingsReady]);

	// ── Mouse pass-through setup ──────────────────────────────────
	// By default the entire window ignores mouse events (they fall through to
	// whatever is behind). When the cursor enters the pet's video area we
	// temporarily capture events so drag/click works. `forward: true` ensures
	// the renderer still receives forwarded events in pass-through mode so
	// onMouseEnter/onMouseLeave fire correctly.

	useEffect(() => {
		void invokeIpc("pet:setIgnoreMouseEvents", true, { forward: true });
		return () => {
			// Restore normal behaviour when the component unmounts
			if (asrSessionIdRef.current) {
				void invokeIpc("pet:asrSessionCancel", { sessionId: asrSessionIdRef.current }).catch(() => {});
				asrSessionIdRef.current = null;
			}
			cleanupRecordingPreview();
			void invokeIpc("pet:setIgnoreMouseEvents", false);
		};
	}, [cleanupRecordingPreview]);

	// ── Drag & click handlers (attached to document during drag) ─

	const handleVideoMouseDown = useCallback((e: MouseEvent<HTMLDivElement>) => {
		if (e.button !== 0) return;

		const startScreenX = e.screenX;
		const startScreenY = e.screenY;
		const startWinX = window.screenX;
		const startWinY = window.screenY;
		let lastMoveAt = 0;
		isDragging.current = false;

		const onMove = (ev: globalThis.MouseEvent) => {
			const dx = ev.screenX - startScreenX;
			const dy = ev.screenY - startScreenY;

			if (!isDragging.current && Math.sqrt(dx * dx + dy * dy) >= DRAG_THRESHOLD_PX) {
				isDragging.current = true;
			}

			if (isDragging.current) {
				const now = Date.now();
				if (now - lastMoveAt >= MOVE_THROTTLE_MS) {
					lastMoveAt = now;
					void invokeIpc("pet:move", {
						x: startWinX + dx,
						y: startWinY + dy,
					});
				}
			}
		};

		const onUp = () => {
			document.removeEventListener("mousemove", onMove);
			document.removeEventListener("mouseup", onUp);

			if (!isDragging.current) {
				const now = Date.now();
				if (now - lastToggleAt.current >= TOGGLE_DEBOUNCE_MS) {
					lastToggleAt.current = now;
					void invokeIpc("pet:toggleQuickChat");
				}
			}
			isDragging.current = false;
		};

		document.addEventListener("mousemove", onMove);
		document.addEventListener("mouseup", onUp);
	}, []);

	const handleVideoMouseEnter = useCallback(() => {
		void invokeIpc("pet:setIgnoreMouseEvents", false);
	}, []);

	const handleVideoMouseLeave = useCallback(() => {
		// Don't pass through while dragging — the drag tracks the mouse globally
		if (!isDragging.current) {
			void invokeIpc("pet:setIgnoreMouseEvents", true, { forward: true });
		}
	}, []);

	return (
		<div className={styles.root}>
			<style>{`
				@keyframes pet-claw-shimmer {
					0% { background-position: 100% 0; }
					100% { background-position: -100% 0; }
				}

				@keyframes pet-claw-wave-in {
					0% { opacity: 0; transform: translateX(-50%) scale(0.55) translateY(6px); }
					100% { opacity: 1; transform: translateX(-50%) scale(0.65) translateY(0); }
				}
			`}</style>
			{/* Interactive area: only the pet character itself captures mouse events */}
			<div
				role="button"
				tabIndex={0}
				className={styles.interactiveArea}
				onMouseEnter={handleVideoMouseEnter}
				onMouseLeave={handleVideoMouseLeave}
				onMouseDown={handleVideoMouseDown}
				onContextMenu={(event: MouseEvent<HTMLDivElement>) => {
					event.preventDefault();
					void invokeIpc("pet:showContextMenu", {
						x: event.clientX,
						y: event.clientY,
						language: i18n.resolvedLanguage || i18n.language,
					});
				}}
				onKeyDown={(event) => {
					if (event.key === "Enter" || event.key === " ") {
						event.preventDefault();
						void invokeIpc("pet:toggleQuickChat");
					}
				}}
			>
				{statusOverlay?.variant === "thinking" ? (
					<PetThinkingBubble label={statusOverlay.label} styles={styles} />
				) : null}
				{statusOverlay?.variant === "recording" ? (
					<PetRecordingBubble
						analyser={recordingAnalyser}
						transcript={liveTranscript}
						label={statusOverlay.label}
						onMouseEnter={handleVideoMouseEnter}
						onMouseLeave={handleVideoMouseLeave}
						onCancel={() => {
							void invokeIpc("pet:recordingCommand", { action: "cancel" });
						}}
						onConfirm={() => {
							void invokeIpc("pet:recordingCommand", { action: "confirm" });
						}}
						styles={styles}
					/>
				) : null}
				<video
					key={displayAnimation}
					ref={videoRef}
					className={styles.petVideo}
					style={{ clipPath: "inset(2px)" }}
					src={PET_ANIMATION_SOURCES[displayAnimation]}
					autoPlay
					loop={shouldLoop}
					muted
					playsInline
					onLoadedData={(e) => {
						const video = e.currentTarget;
						video.currentTime = 0;
						void video.play().catch(() => {});
					}}
					onEnded={() => {
						if (!hasPlayedIntro && displayAnimation === "begin") {
							setHasPlayedIntro(true);
						}
					}}
				/>
			</div>
		</div>
	);
}
