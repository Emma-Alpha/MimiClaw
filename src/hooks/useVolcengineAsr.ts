import { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { invokeIpc } from '@/lib/api-client';
import { mixToMono, resampleLinear, float32ToPcm16Bytes } from '@/lib/volcengine-speech';

interface UseVolcengineAsrOptions {
	/**
	 * Called when ASR finishes and returns a non-empty transcript.
	 * The consumer is responsible for putting the text into the input and sending.
	 */
	onTranscriptReady: (text: string) => void;
	/** Called with partial/streaming transcript text during recording. */
	onPartialTranscript?: (text: string) => void;
	onError?: (message: string) => void;
}

interface UseVolcengineAsrReturn {
	isRecording: boolean;
	isTranscribing: boolean;
	toggleRecording: () => Promise<void>;
	cancelRecording: () => void;
	stopAndTranscribe: () => Promise<void>;
}

/**
 * Reusable hook for Volcengine streaming ASR recording.
 * Mirrors the audio pipeline used in PetFloating (F2 flow) but without
 * opening any extra window — it just calls `onTranscriptReady` with the final text.
 */
export function useVolcengineAsr({
	onTranscriptReady,
	onPartialTranscript,
	onError,
}: UseVolcengineAsrOptions): UseVolcengineAsrReturn {
	const [isRecording, setIsRecording] = useState(false);
	const [isTranscribing, setIsTranscribing] = useState(false);

	const asrSessionIdRef = useRef<string | null>(null);
	const isRecordingRef = useRef(false);
	const isStartingRef = useRef(false);
	const isFinalizingRef = useRef(false);

	const streamRef = useRef<MediaStream | null>(null);
	const audioContextRef = useRef<AudioContext | null>(null);
	const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
	const processorNodeRef = useRef<ScriptProcessorNode | null>(null);
	const silenceNodeRef = useRef<GainNode | null>(null);
	const sampleRateRef = useRef<number>(48_000);
	const pendingSamplesRef = useRef<number[]>([]);

	const syncActivity = useCallback((activity: 'idle' | 'recording' | 'transcribing') => {
		void invokeIpc('pet:setInputActivity', { activity }).catch(() => {});
	}, []);

	const teardownAudioPipeline = useCallback(() => {
		const processor = processorNodeRef.current;
		if (processor) {
			processor.onaudioprocess = null;
			processor.disconnect();
		}
		processorNodeRef.current = null;
		sourceNodeRef.current?.disconnect();
		sourceNodeRef.current = null;
		silenceNodeRef.current?.disconnect();
		silenceNodeRef.current = null;
		streamRef.current?.getTracks().forEach(track => { track.stop(); });
		streamRef.current = null;
		if (audioContextRef.current) {
			void audioContextRef.current.close().catch(() => {});
		}
		audioContextRef.current = null;
		pendingSamplesRef.current = [];
	}, []);

	const consumePendingSamples = useCallback(() => {
		const samples = pendingSamplesRef.current;
		if (samples.length === 0) return new Uint8Array(0);
		const resampled = resampleLinear(Float32Array.from(samples), sampleRateRef.current, 16_000);
		pendingSamplesRef.current = [];
		return float32ToPcm16Bytes(resampled);
	}, []);

	const cancelRecording = useCallback(() => {
		const sessionId = asrSessionIdRef.current;
		asrSessionIdRef.current = null;
		isRecordingRef.current = false;
		isStartingRef.current = false;
		isFinalizingRef.current = false;
		teardownAudioPipeline();
		setIsRecording(false);
		setIsTranscribing(false);
		syncActivity('idle');
		if (sessionId) {
			void invokeIpc('pet:asrSessionCancel', { sessionId }).catch(() => {});
		}
	}, [teardownAudioPipeline, syncActivity]);

	const stopAndTranscribe = useCallback(async () => {
		if (isFinalizingRef.current) return;
		isFinalizingRef.current = true;

		const sessionId = asrSessionIdRef.current;
		const finalChunk = consumePendingSamples();
		asrSessionIdRef.current = null;
		teardownAudioPipeline();
		isRecordingRef.current = false;
		isStartingRef.current = false;
		setIsRecording(false);
		setIsTranscribing(true);
		syncActivity('transcribing');

		if (!sessionId) {
			isFinalizingRef.current = false;
			setIsTranscribing(false);
			syncActivity('idle');
			toast.error('语音识别会话未启动');
			return;
		}

		try {
			const result = await invokeIpc<{ success: boolean; text?: string }>(
				'pet:asrSessionFinish',
				{ sessionId, audioChunk: finalChunk },
			);
			const text = (result.text ?? '').trim();
			if (!text) throw new Error('语音识别返回了空文本');
			onTranscriptReady(text);
		} catch (error) {
			console.error('[useVolcengineAsr] transcription failed', error);
			const msg = '语音转写失败，请检查火山 ASR 配置';
			toast.error(msg);
			onError?.(msg);
		} finally {
			isFinalizingRef.current = false;
			setIsTranscribing(false);
			syncActivity('idle');
		}
	}, [consumePendingSamples, teardownAudioPipeline, syncActivity, onTranscriptReady, onError]);

	const startRecording = useCallback(async () => {
		if (isRecordingRef.current || isStartingRef.current) return;
		isStartingRef.current = true;
		pendingSamplesRef.current = [];

		try {
			const stream = await navigator.mediaDevices.getUserMedia({
				audio: {
					channelCount: 1,
					echoCancellation: true,
					noiseSuppression: true,
					autoGainControl: true,
				},
			});

			const startResult = await invokeIpc<{ success: boolean; sessionId: string }>('pet:asrSessionStart');
			const sessionId = startResult.sessionId;

			const AudioContextCtor = window.AudioContext;
			if (!AudioContextCtor) throw new Error('AudioContext is unavailable');

			const audioContext = new AudioContextCtor();
			await audioContext.resume().catch(() => {});
			sampleRateRef.current = audioContext.sampleRate;

			const sourceNode = audioContext.createMediaStreamSource(stream);
			const processorNode = audioContext.createScriptProcessor(4096, 1, 1);
			const silenceNode = audioContext.createGain();
			silenceNode.gain.value = 0;

			processorNode.onaudioprocess = (event) => {
				if (!isRecordingRef.current) return;

				const inputBuffer = event.inputBuffer;
				const channelData: Float32Array[] = [];
				for (let i = 0; i < inputBuffer.numberOfChannels; i += 1) {
					channelData.push(inputBuffer.getChannelData(i));
				}

				const mono = mixToMono(channelData);
				for (let i = 0; i < mono.length; i += 1) {
					pendingSamplesRef.current.push(mono[i] ?? 0);
				}

				const chunkSize = Math.max(1, Math.round(sampleRateRef.current * 0.2));
				while (pendingSamplesRef.current.length >= chunkSize) {
					const inputChunk = pendingSamplesRef.current.splice(0, chunkSize);
					const resampled = resampleLinear(
						Float32Array.from(inputChunk),
						sampleRateRef.current,
						16_000,
					);
					const pcmBytes = float32ToPcm16Bytes(resampled);
					void invokeIpc('pet:asrSessionChunk', { sessionId, audioChunk: pcmBytes }).catch((err) => {
						console.error('[useVolcengineAsr] chunk push failed', err);
					});
				}
			};

			sourceNode.connect(processorNode);
			processorNode.connect(silenceNode);
			silenceNode.connect(audioContext.destination);

			streamRef.current = stream;
			audioContextRef.current = audioContext;
			sourceNodeRef.current = sourceNode;
			processorNodeRef.current = processorNode;
			silenceNodeRef.current = silenceNode;
			asrSessionIdRef.current = sessionId;

			isStartingRef.current = false;
			isRecordingRef.current = true;
			setIsRecording(true);
			syncActivity('recording');
		} catch (error) {
			console.error('[useVolcengineAsr] start recording failed', error);
			isStartingRef.current = false;
			isRecordingRef.current = false;
			const sessionId = asrSessionIdRef.current;
			asrSessionIdRef.current = null;
			teardownAudioPipeline();
			syncActivity('idle');
			if (sessionId) {
				void invokeIpc('pet:asrSessionCancel', { sessionId }).catch(() => {});
			}
			toast.error('无法启动语音识别，请先在设置里配置火山引擎 ASR');
		}
	}, [syncActivity, teardownAudioPipeline]);

	const toggleRecording = useCallback(async () => {
		if (isRecordingRef.current) {
			await stopAndTranscribe();
		} else {
			await startRecording();
		}
	}, [stopAndTranscribe, startRecording]);

	// Listen for partial/final ASR events from the main process so the
	// consumer can display real-time streaming transcription.
	const onPartialTranscriptRef = useRef(onPartialTranscript);
	useEffect(() => { onPartialTranscriptRef.current = onPartialTranscript; }, [onPartialTranscript]);

	useEffect(() => {
		if (!window.electron?.ipcRenderer) return;
		const unsubscribe = window.electron.ipcRenderer.on('pet:asr-event', (payload) => {
			const event = payload as { sessionId?: string; type?: string; text?: string } | undefined;
			if (!event || event.sessionId !== asrSessionIdRef.current) return;
			if ((event.type === 'partial' || event.type === 'final') && event.text) {
				onPartialTranscriptRef.current?.(event.text.trim());
			}
		});
		return () => { unsubscribe?.(); };
	}, []);

	useEffect(() => {
		return () => {
			if (asrSessionIdRef.current) {
				void invokeIpc('pet:asrSessionCancel', { sessionId: asrSessionIdRef.current }).catch(() => {});
				asrSessionIdRef.current = null;
			}
			teardownAudioPipeline();
			syncActivity('idle');
		};
	}, [teardownAudioPipeline, syncActivity]);

	return { isRecording, isTranscribing, toggleRecording, cancelRecording, stopAndTranscribe };
}
