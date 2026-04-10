import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Phone, X, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { invokeIpc } from '@/lib/api-client';
import {
  appendVoiceChatMessage,
  fetchVoiceChatConfig,
  finalizeVoiceChatSession,
} from '@/lib/voice-chat';
import { cn } from '@/lib/utils';
import { PET_ANIMATION_SOURCES } from '@/lib/pet-floating';
import { float32ToPcm16Bytes, mixToMono, resampleLinear } from '@/lib/volcengine-speech';
import type { VoiceChatConfigState } from '../../shared/voice-chat';

type VoiceStage = 'idle' | 'connecting' | 'listening' | 'thinking' | 'speaking' | 'error';
type VoiceErrorKind = 'auth' | 'mic' | 'network' | 'server';

type VoiceRealtimeEvent = {
  sessionId: string;
  type: string;
  [key: string]: unknown;
};

type PlaybackNodeRecord = {
  node: AudioBufferSourceNode;
  gain: GainNode;
};

const TARGET_SAMPLE_RATE = 24_000;
const VAD_THRESHOLD = 0.015;
const BARGE_IN_THRESHOLD = 0.03;
const BARGE_IN_CONSECUTIVE_FRAMES = 3;
const VAD_HANGOVER_MS = 650;
const SPEECH_MIN_MS = 260;
const INPUT_BAR_COUNT = 14;
const CONFIG_LOAD_TIMEOUT_MS = 4_000;

function decodePcm16Base64(base64: string): Float32Array {
  const binary = atob(base64);
  const view = new DataView(new ArrayBuffer(binary.length));
  for (let index = 0; index < binary.length; index += 1) {
    view.setUint8(index, binary.charCodeAt(index));
  }

  const sampleCount = binary.length / 2;
  const samples = new Float32Array(sampleCount);
  for (let index = 0; index < sampleCount; index += 1) {
    samples[index] = view.getInt16(index * 2, true) / 0x7fff;
  }
  return samples;
}

function formatErrorTitle(kind: VoiceErrorKind): string {
  switch (kind) {
    case 'auth':
      return '鉴权失败';
    case 'mic':
      return '麦克风权限';
    case 'network':
      return '网络异常';
    default:
      return '服务端错误';
  }
}

function classifyVoiceStartError(error: unknown): {
  kind: VoiceErrorKind;
  message: string;
} {
  const fallbackMessage = error instanceof Error ? error.message : String(error);

  if (error instanceof DOMException) {
    switch (error.name) {
      case 'NotAllowedError':
      case 'PermissionDeniedError':
        return {
          kind: 'mic',
          message: '麦克风权限被拒绝，请在系统设置中允许此应用访问麦克风后重试。',
        };
      case 'NotFoundError':
        return {
          kind: 'mic',
          message: '未检测到可用麦克风设备，请连接麦克风后重试。',
        };
      case 'NotReadableError':
      case 'TrackStartError':
        return {
          kind: 'mic',
          message: '麦克风当前不可用，可能正被其他应用占用。',
        };
      case 'SecurityError':
      case 'OverconstrainedError':
        return {
          kind: 'mic',
          message: fallbackMessage,
        };
      default:
        break;
    }
  }

  if (
    /401|403|unauthor|forbidden|access key|access token|app key|app id|auth|token/i.test(
      fallbackMessage
    )
  ) {
    return { kind: 'auth', message: fallbackMessage };
  }

  if (/network|socket|websocket|timed out|timeout|closed before/i.test(fallbackMessage)) {
    return { kind: 'network', message: fallbackMessage };
  }

  return { kind: 'server', message: fallbackMessage };
}

function getStageCopy(stage: VoiceStage): string {
  switch (stage) {
    case 'connecting':
      return '正在建立语音连接…';
    case 'listening':
      return '聆听中，直接说话就好';
    case 'thinking':
      return '正在思考回复';
    case 'speaking':
      return '小黑猫正在说话';
    case 'error':
      return '连接出现问题';
    default:
      return '准备开始语音对话';
  }
}

function VoiceBars({ analyser }: { analyser: AnalyserNode | null }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    const dpr = window.devicePixelRatio || 1;
    const width = 180;
    const height = 52;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);

    const frequencyData = new Uint8Array(analyser?.frequencyBinCount ?? 256);
    const smoothed = new Float32Array(INPUT_BAR_COUNT);
    let frameId = 0;

    const draw = () => {
      frameId = window.requestAnimationFrame(draw);
      context.clearRect(0, 0, width, height);

      if (analyser) {
        analyser.getByteFrequencyData(frequencyData);
      }

      const gap = 5;
      const barWidth = 6;
      const totalWidth = INPUT_BAR_COUNT * barWidth + (INPUT_BAR_COUNT - 1) * gap;
      const startX = (width - totalWidth) / 2;
      const centerY = height / 2;
      const bucketSize = Math.max(1, Math.floor(frequencyData.length / INPUT_BAR_COUNT));

      for (let index = 0; index < INPUT_BAR_COUNT; index += 1) {
        const sourceValue = analyser
          ? frequencyData[Math.min(index * bucketSize, frequencyData.length - 1)] / 255
          : (Math.sin(Date.now() / 180 + index * 0.7) + 1) / 2;
        smoothed[index] = smoothed[index] + (sourceValue - smoothed[index]) * 0.24;
        const level = smoothed[index];
        const barHeight = Math.max(6, level * 34 + 6);
        const x = startX + index * (barWidth + gap);
        const y = centerY - barHeight / 2;

        context.fillStyle = `rgba(255,255,255,${0.22 + level * 0.7})`;
        context.beginPath();
        context.roundRect(x, y, barWidth, barHeight, barWidth / 2);
        context.fill();
      }
    };

    draw();
    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [analyser]);

  return <canvas ref={canvasRef} className="h-[52px] w-[180px]" />;
}

export function VoiceDialog() {
  const [config, setConfig] = useState<VoiceChatConfigState | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [stage, setStage] = useState<VoiceStage>('idle');
  const [micMuted, setMicMuted] = useState(false);
  const [speakerMuted, setSpeakerMuted] = useState(false);
  const [userLiveText, setUserLiveText] = useState('');
  const [assistantLiveText, setAssistantLiveText] = useState('');
  const [userStableText, setUserStableText] = useState('');
  const [assistantStableText, setAssistantStableText] = useState('');
  const [errorInfo, setErrorInfo] = useState<{ kind: VoiceErrorKind; message: string } | null>(
    null
  );
  const [realtimeSessionId, setRealtimeSessionId] = useState<string | null>(null);
  const [historySessionId, setHistorySessionId] = useState<string | null>(null);
  const [currentRoundId, setCurrentRoundId] = useState<string | null>(null);
  const [recordingAnalyser, setRecordingAnalyser] = useState<AnalyserNode | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserNodeRef = useRef<AnalyserNode | null>(null);
  const processorNodeRef = useRef<ScriptProcessorNode | null>(null);
  const outputGainRef = useRef<GainNode | null>(null);
  const playbackTimeRef = useRef(0);
  const playbackNodesRef = useRef<PlaybackNodeRecord[]>([]);
  const speechDetectedAtRef = useRef<number | null>(null);
  const lastVoiceAtRef = useRef<number | null>(null);
  const turnActiveRef = useRef(false);
  const preRollChunksRef = useRef<Uint8Array[]>([]);
  const aiSpeakingRef = useRef(false);
  const assistantResponseActiveRef = useRef(false);
  const suppressAssistantOutputRef = useRef(false);
  const consecutiveSpeechFramesRef = useRef(0);
  const unmountedRef = useRef(false);
  const realtimeSessionIdRef = useRef<string | null>(null);
  const historySessionIdRef = useRef<string | null>(null);
  const assistantLiveTextRef = useRef('');
  const currentRoundIdRef = useRef<string | null>(null);

  const displayAnimation = useMemo(() => {
    if (stage === 'listening') return 'listening';
    if (stage === 'thinking') return 'task-loop';
    if (stage === 'speaking') return 'task-loop';
    return 'static';
  }, [stage]);

  const stopPlayback = useCallback(() => {
    for (const entry of playbackNodesRef.current) {
      try {
        entry.node.stop();
      } catch {
        // ignore stopped nodes
      }
      entry.node.disconnect();
      entry.gain.disconnect();
    }
    playbackNodesRef.current = [];
    playbackTimeRef.current = audioContextRef.current?.currentTime ?? 0;
    aiSpeakingRef.current = false;
  }, []);

  const teardownAudio = useCallback(() => {
    stopPlayback();
    processorNodeRef.current?.disconnect();
    analyserNodeRef.current?.disconnect();
    sourceNodeRef.current?.disconnect();
    outputGainRef.current?.disconnect();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    sourceNodeRef.current = null;
    analyserNodeRef.current = null;
    processorNodeRef.current = null;
    outputGainRef.current = null;
    setRecordingAnalyser(null);
    if (audioContextRef.current) {
      void audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  }, [stopPlayback]);

  const setDialogState = useCallback((nextState: 'idle' | 'connecting' | 'connected') => {
    void invokeIpc('voice:setDialogState', { state: nextState }).catch(() => {});
  }, []);

  const handleError = useCallback(
    (kind: VoiceErrorKind, message: string) => {
      assistantResponseActiveRef.current = false;
      suppressAssistantOutputRef.current = false;
      setErrorInfo({ kind, message });
      setStage('error');
      setDialogState('idle');
    },
    [setDialogState]
  );

  const persistHistoryMessage = useCallback(
    async (
      role: 'user' | 'assistant',
      text: string,
      options?: { interrupted?: boolean; groupId?: string }
    ) => {
      const sessionId = historySessionId;
      const groupId = options?.groupId ?? currentRoundId;
      if (!sessionId || !groupId || !text.trim()) return;
      await appendVoiceChatMessage({
        sessionId,
        groupId,
        role,
        text: text.trim(),
        interrupted: options?.interrupted,
      });
    },
    [currentRoundId, historySessionId]
  );

  const finishTurn = useCallback(async () => {
    const sessionId = realtimeSessionIdRef.current;
    if (!sessionId || !turnActiveRef.current) return;
    turnActiveRef.current = false;
    speechDetectedAtRef.current = null;
    lastVoiceAtRef.current = null;
    preRollChunksRef.current = [];
    consecutiveSpeechFramesRef.current = 0;
    assistantResponseActiveRef.current = true;
    suppressAssistantOutputRef.current = false;
    setStage('thinking');
    try {
      await invokeIpc('voice:commitTurn', { realtimeSessionId: sessionId });
    } catch (error) {
      assistantResponseActiveRef.current = false;
      handleError('server', error instanceof Error ? error.message : String(error));
    }
  }, [handleError]);

  const interruptAssistant = useCallback(async () => {
    const sessionId = realtimeSessionIdRef.current;
    const canInterrupt = assistantResponseActiveRef.current
      || aiSpeakingRef.current;
    if (!sessionId || !canInterrupt) return;
    assistantResponseActiveRef.current = false;
    suppressAssistantOutputRef.current = true;
    consecutiveSpeechFramesRef.current = 0;
    stopPlayback();
    const interruptedText = assistantLiveTextRef.current.trim();
    const historySessionId = historySessionIdRef.current;
    const currentRoundId = currentRoundIdRef.current;
    if (interruptedText && historySessionId && currentRoundId) {
      setAssistantStableText(interruptedText);
      await persistHistoryMessage('assistant', interruptedText, {
        interrupted: true,
        groupId: currentRoundId,
      });
    }
    setAssistantLiveText('');
    setStage('listening');
    try {
      await invokeIpc('voice:cancelResponse', { realtimeSessionId: sessionId });
    } catch {
      // ignore cancel failures during interruption
    }
  }, [
    persistHistoryMessage,
    stopPlayback,
  ]);

  const scheduleAudioDelta = useCallback(
    (base64: string) => {
      const context = audioContextRef.current;
      if (!context) return;

      const pcm = decodePcm16Base64(base64);
      if (pcm.length === 0) return;

      const buffer = context.createBuffer(1, pcm.length, TARGET_SAMPLE_RATE);
      buffer.copyToChannel(Float32Array.from(pcm), 0);

      const sourceNode = context.createBufferSource();
      const gainNode = context.createGain();
      gainNode.gain.value = speakerMuted ? 0 : 1;

      sourceNode.buffer = buffer;
      sourceNode.connect(gainNode);
      gainNode.connect(context.destination);

      const startAt = Math.max(
        context.currentTime + 0.02,
        playbackTimeRef.current || context.currentTime + 0.02
      );
      sourceNode.start(startAt);
      playbackTimeRef.current = startAt + buffer.duration;
      aiSpeakingRef.current = true;

      sourceNode.onended = () => {
        playbackNodesRef.current = playbackNodesRef.current.filter(
          (entry) => entry.node !== sourceNode
        );
        if (playbackNodesRef.current.length === 0) {
          aiSpeakingRef.current = false;
        }
      };

      playbackNodesRef.current.push({ node: sourceNode, gain: gainNode });
    },
    [speakerMuted]
  );

  const cleanupSessionHandles = useCallback(
    async (
      nextRealtimeSessionId: string | null,
      nextHistorySessionId: string | null,
      status: 'completed' | 'failed'
    ) => {
      if (nextRealtimeSessionId) {
        await invokeIpc('voice:endSession', { realtimeSessionId: nextRealtimeSessionId }).catch(
          () => {}
        );
      }
      if (nextHistorySessionId) {
        await finalizeVoiceChatSession({
          sessionId: nextHistorySessionId,
          status,
        }).catch(() => {});
      }
    },
    []
  );

  const startAudioPipeline = useCallback(
    async (activeRealtimeSessionId: string) => {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const AudioContextCtor = window.AudioContext;
      if (!AudioContextCtor) {
        throw new Error('AudioContext is unavailable');
      }

      const audioContext = new AudioContextCtor();
      await audioContext.resume().catch(() => {});
      const sourceNode = audioContext.createMediaStreamSource(stream);
      const analyserNode = audioContext.createAnalyser();
      analyserNode.fftSize = 256;
      const processorNode = audioContext.createScriptProcessor(2048, 1, 1);
      const outputGain = audioContext.createGain();
      outputGain.gain.value = speakerMuted ? 0 : 1;
      const silenceGain = audioContext.createGain();
      silenceGain.gain.value = 0;

      sourceNode.connect(analyserNode);
      analyserNode.connect(processorNode);
      processorNode.connect(silenceGain);
      silenceGain.connect(audioContext.destination);

      processorNode.onaudioprocess = (event) => {
        const sessionId = realtimeSessionIdRef.current ?? activeRealtimeSessionId;
        if (!sessionId || micMuted) return;

        const mono = mixToMono(
          Array.from({ length: event.inputBuffer.numberOfChannels }, (_, index) =>
            event.inputBuffer.getChannelData(index)
          )
        );
        const resampled = resampleLinear(mono, audioContext.sampleRate, TARGET_SAMPLE_RATE);
        const pcmBytes = float32ToPcm16Bytes(resampled);

        let energy = 0;
        for (let index = 0; index < mono.length; index += 1) {
          energy += Math.abs(mono[index] ?? 0);
        }
        const averageEnergy = mono.length > 0 ? energy / mono.length : 0;
        const now = Date.now();
        const assistantActive = assistantResponseActiveRef.current || aiSpeakingRef.current;
        const speechThreshold = assistantActive ? BARGE_IN_THRESHOLD : VAD_THRESHOLD;
        const isSpeechFrame = averageEnergy >= speechThreshold;

        if (!turnActiveRef.current) {
          preRollChunksRef.current.push(pcmBytes);
          if (preRollChunksRef.current.length > 4) {
            preRollChunksRef.current.shift();
          }
        }

        if (isSpeechFrame) {
          consecutiveSpeechFramesRef.current += 1;
          lastVoiceAtRef.current = now;
          const speechReady = assistantActive
            ? consecutiveSpeechFramesRef.current >= BARGE_IN_CONSECUTIVE_FRAMES
            : true;
          if (!turnActiveRef.current && speechReady) {
            turnActiveRef.current = true;
            speechDetectedAtRef.current = now;
            const nextRoundId = crypto.randomUUID();
            setCurrentRoundId(nextRoundId);
            setUserLiveText('');
            setAssistantLiveText('');
            setStage('listening');
            void interruptAssistant();
            for (const chunk of preRollChunksRef.current) {
              void invokeIpc('voice:appendAudio', {
                realtimeSessionId: sessionId,
                audioChunk: chunk,
              }).catch(() => {});
            }
            preRollChunksRef.current = [];
          }
        } else {
          consecutiveSpeechFramesRef.current = 0;
        }

        if (turnActiveRef.current) {
          void invokeIpc('voice:appendAudio', {
            realtimeSessionId: sessionId,
            audioChunk: pcmBytes,
          }).catch((error) => {
            handleError('network', error instanceof Error ? error.message : String(error));
          });
        }

        if (
          turnActiveRef.current &&
          speechDetectedAtRef.current &&
          lastVoiceAtRef.current &&
          now - lastVoiceAtRef.current >= VAD_HANGOVER_MS &&
          now - speechDetectedAtRef.current >= SPEECH_MIN_MS
        ) {
          void finishTurn();
        }
      };

      streamRef.current = stream;
      audioContextRef.current = audioContext;
      sourceNodeRef.current = sourceNode;
      analyserNodeRef.current = analyserNode;
      processorNodeRef.current = processorNode;
      outputGainRef.current = outputGain;
      setRecordingAnalyser(analyserNode);
    },
    [finishTurn, handleError, interruptAssistant, micMuted, speakerMuted]
  );

  const handleHangup = useCallback(
    async (status: 'completed' | 'failed' = 'completed') => {
      const nextRealtimeSessionId = realtimeSessionIdRef.current;
      const nextHistorySessionId = historySessionIdRef.current;
      await cleanupSessionHandles(nextRealtimeSessionId, nextHistorySessionId, status);

      assistantResponseActiveRef.current = false;
      suppressAssistantOutputRef.current = false;
      consecutiveSpeechFramesRef.current = 0;
      realtimeSessionIdRef.current = null;
      historySessionIdRef.current = null;
      assistantLiveTextRef.current = '';
      currentRoundIdRef.current = null;
      setRealtimeSessionId(null);
      setHistorySessionId(null);
      setCurrentRoundId(null);
      setUserLiveText('');
      setAssistantLiveText('');
      setDialogState('idle');
      setStage('idle');
      teardownAudio();
    },
    [cleanupSessionHandles, setDialogState, teardownAudio]
  );

  const handleStart = useCallback(async () => {
    setErrorInfo(null);
    assistantResponseActiveRef.current = false;
    suppressAssistantOutputRef.current = false;
    consecutiveSpeechFramesRef.current = 0;
    setStage('connecting');
    setDialogState('connecting');

    let nextRealtimeSessionId: string | null = null;
    let nextHistorySessionId: string | null = null;

    try {
      const result = await invokeIpc<{
        success: boolean;
        realtimeSessionId: string;
        historySessionId: string;
      }>('voice:sessionStart');
      nextRealtimeSessionId = result.realtimeSessionId;
      nextHistorySessionId = result.historySessionId;
      realtimeSessionIdRef.current = result.realtimeSessionId;
      historySessionIdRef.current = result.historySessionId;
      assistantLiveTextRef.current = '';
      currentRoundIdRef.current = null;
      setRealtimeSessionId(result.realtimeSessionId);
      setHistorySessionId(result.historySessionId);
      await startAudioPipeline(result.realtimeSessionId);
      setDialogState('connected');
      setStage('listening');
    } catch (error) {
      await cleanupSessionHandles(nextRealtimeSessionId, nextHistorySessionId, 'failed');
      realtimeSessionIdRef.current = null;
      historySessionIdRef.current = null;
      consecutiveSpeechFramesRef.current = 0;
      assistantLiveTextRef.current = '';
      currentRoundIdRef.current = null;
      setRealtimeSessionId(null);
      setHistorySessionId(null);
      setCurrentRoundId(null);
      teardownAudio();
      const { kind, message } = classifyVoiceStartError(error);
      handleError(kind, message);
    }
  }, [cleanupSessionHandles, handleError, setDialogState, startAudioPipeline, teardownAudio]);

  const handleRetry = useCallback(() => {
    void handleHangup('failed').finally(() => {
      void handleStart();
    });
  }, [handleHangup, handleStart]);

  useEffect(() => {
    unmountedRef.current = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadingConfig(true);
    const timeoutId = window.setTimeout(() => {
      if (unmountedRef.current) return;
      toast.error('读取语音配置超时，请稍后重试。');
      setConfig(null);
      setLoadingConfig(false);
    }, CONFIG_LOAD_TIMEOUT_MS);

    void fetchVoiceChatConfig()
      .then((nextConfig) => {
        if (unmountedRef.current) return;
        window.clearTimeout(timeoutId);
        setConfig(nextConfig);
        setLoadingConfig(false);
      })
      .catch((error) => {
        if (unmountedRef.current) return;
        window.clearTimeout(timeoutId);
        setConfig(null);
        toast.error(error instanceof Error ? error.message : String(error));
        setLoadingConfig(false);
      });

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    return () => {
      unmountedRef.current = true;
      void handleHangup('completed');
    };
  }, [handleHangup]);

  useEffect(() => {
    assistantLiveTextRef.current = assistantLiveText;
  }, [assistantLiveText]);

  useEffect(() => {
    currentRoundIdRef.current = currentRoundId;
  }, [currentRoundId]);

  useEffect(() => {
    if (outputGainRef.current) {
      outputGainRef.current.gain.value = speakerMuted ? 0 : 1;
    }

    playbackNodesRef.current.forEach((entry) => {
      entry.gain.gain.value = speakerMuted ? 0 : 1;
    });
  }, [speakerMuted]);

  useEffect(() => {
    const unsubscribe = window.electron.ipcRenderer.on('voice:realtime-event', (payload) => {
      const event = payload as VoiceRealtimeEvent;
      if (event.sessionId !== realtimeSessionId) return;

      if (event.type === 'voice.connection.error') {
        handleError(
          (event.kind as VoiceErrorKind) ?? 'server',
          String(event.message ?? '未知错误')
        );
        return;
      }

      if (event.type === 'voice.interrupt') {
        assistantResponseActiveRef.current = false;
        suppressAssistantOutputRef.current = true;
        consecutiveSpeechFramesRef.current = 0;
        assistantLiveTextRef.current = '';
        stopPlayback();
        setAssistantLiveText('');
        setStage('listening');
        return;
      }

      if (event.type === 'voice.turn.end') {
        setStage('thinking');
        void finishTurn();
        return;
      }

      if (event.type === 'response.audio.delta' && typeof event.delta === 'string') {
        if (suppressAssistantOutputRef.current) return;
        assistantResponseActiveRef.current = true;
        setStage('speaking');
        scheduleAudioDelta(event.delta);
        return;
      }

      if (event.type === 'response.audio_transcript.delta' && typeof event.delta === 'string') {
        if (suppressAssistantOutputRef.current) return;
        assistantResponseActiveRef.current = true;
        assistantLiveTextRef.current = `${assistantLiveTextRef.current}${event.delta}`;
        setAssistantLiveText((previous) => `${previous}${event.delta}`);
        return;
      }

      if (event.type === 'response.audio_transcript.done' && typeof event.transcript === 'string') {
        assistantResponseActiveRef.current = false;
        if (suppressAssistantOutputRef.current) {
          suppressAssistantOutputRef.current = false;
          assistantLiveTextRef.current = '';
          setAssistantLiveText('');
          return;
        }
        const transcript = event.transcript.trim();
        assistantLiveTextRef.current = '';
        setAssistantLiveText('');
        setAssistantStableText(transcript);
        if (transcript) {
          void persistHistoryMessage('assistant', transcript, {
            interrupted: false,
          });
        }
        setStage('listening');
        return;
      }

      if (
        event.type === 'conversation.item.input_audio_transcription.delta' &&
        typeof event.transcript === 'string'
      ) {
        setUserLiveText(event.transcript);
        return;
      }

      if (
        event.type === 'conversation.item.input_audio_transcription.completed' &&
        typeof event.transcript === 'string'
      ) {
        const transcript = event.transcript.trim();
        setUserLiveText('');
        setUserStableText(transcript);
        if (transcript) {
          void persistHistoryMessage('user', transcript);
        }
        return;
      }

      if (event.type === 'conversation.item.input_audio_transcription.failed') {
        handleError('server', String(event.error ?? '语音转写失败'));
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [finishTurn, handleError, persistHistoryMessage, realtimeSessionId, scheduleAudioDelta, stopPlayback]);

  const canStart = config?.configured && stage !== 'connecting' && !realtimeSessionId;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#EDEDED] text-[#111111] dark:bg-[#111111] dark:text-[#E5E5E5]">
      <div
        className="flex items-center justify-between px-4 pb-2 pt-4 bg-[#EDEDED] dark:bg-[#111111] z-10"
        style={{ WebkitAppRegion: 'drag' } as CSSProperties}
      >
        <div className="flex-1 flex justify-center">
          <h1 className="text-[14px] font-medium text-[#111111] dark:text-[#E5E5E5]">语音通话</h1>
        </div>
        <button
          type="button"
          className="absolute right-4 flex h-8 w-8 items-center justify-center rounded-full text-[#111111] dark:text-[#E5E5E5] opacity-60 hover:opacity-100 transition-opacity"
          style={{ WebkitAppRegion: 'no-drag' } as CSSProperties}
          onClick={() => {
            void handleHangup('completed').finally(() => {
              void invokeIpc('voice:closeDialog');
            });
          }}
          aria-label="关闭语音窗"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex flex-1 flex-col px-4 pb-8 relative">
        <div className="flex flex-1 flex-col items-center min-h-0 px-2 pb-[100px] pt-2">
          <div className="relative flex flex-col items-center w-full max-w-[340px] min-h-0 flex-1">
            {/* 动态波纹背景 - 说话时显示 */}
            {stage === 'speaking' || stage === 'listening' ? (
              <div className="absolute left-1/2 top-[60px] flex -translate-x-1/2 items-center justify-center">
                <motion.div
                  className="absolute h-[180px] w-[180px] rounded-full bg-emerald-500/10 dark:bg-emerald-500/20"
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 0.2, 0.5],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                />
                <motion.div
                  className="absolute h-[220px] w-[220px] rounded-full bg-emerald-500/5 dark:bg-emerald-500/10"
                  animate={{
                    scale: [1, 1.3, 1],
                    opacity: [0.3, 0.1, 0.3],
                  }}
                  transition={{
                    duration: 2.5,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: 0.2,
                  }}
                />
              </div>
            ) : null}

            {/* 头像区域 */}
            <div className="relative z-10 flex h-[120px] w-[120px] items-center justify-center rounded-full bg-white dark:bg-[#1C1C1E] shadow-lg overflow-hidden border-2 border-emerald-500/20">
              <video
                key={displayAnimation}
                className="h-[100px] w-[100px] object-contain"
                src={PET_ANIMATION_SOURCES[displayAnimation]}
                autoPlay
                loop
                muted
                playsInline
              />
            </div>

            <div className="mt-6 min-h-[30px] text-center">
              <span className="text-[14px] text-[#111111]/60 dark:text-[#E5E5E5]/60 tracking-wider">
                {stage === 'connecting' ? '连接中...' : getStageCopy(stage)}
              </span>
            </div>

            <div className="mt-3 w-full flex-1 min-h-0">
              <div className="mx-auto flex h-full max-h-[160px] w-full max-w-[280px] items-start justify-center overflow-y-auto px-2 text-center">
                <div className="my-auto w-full break-words">
              {assistantLiveText || assistantStableText ? (
                    <div className="text-[14px] font-medium leading-relaxed text-[#111111] dark:text-[#E5E5E5]">
                  {assistantLiveText || assistantStableText}
                </div>
              ) : userLiveText || userStableText ? (
                    <div className="text-[14px] leading-relaxed text-[#111111]/70 dark:text-[#E5E5E5]/70">
                  {userLiveText || userStableText}
                </div>
              ) : null}
                </div>
              </div>
            </div>

            {/* 语音波形图 */}
            <div className="mt-4 flex h-[40px] shrink-0 items-center justify-center opacity-80">
              <VoiceBars analyser={recordingAnalyser} />
            </div>
          </div>
        </div>

        {errorInfo ? (
          <div className="absolute top-4 left-4 right-4 z-50 rounded-xl bg-white dark:bg-[#1C1C1E] p-4 shadow-lg border border-red-500/20">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-[#111111] dark:text-[#E5E5E5]">
                  {formatErrorTitle(errorInfo.kind)}
                </p>
                <p className="mt-1 text-[13px] leading-5 text-[#111111]/60 dark:text-[#E5E5E5]/60">
                  {errorInfo.message}
                </p>
                <div className="mt-3 flex gap-3">
                  <button
                    type="button"
                    className="flex-1 rounded-lg bg-[#07C160] py-2 text-[14px] font-medium text-white transition hover:bg-[#06AD56]"
                    onClick={() => void handleRetry()}
                  >
                    重试
                  </button>
                  <button
                    type="button"
                    className="flex-1 rounded-lg bg-[#F2F2F2] dark:bg-[#2C2C2E] py-2 text-[14px] font-medium text-[#111111] dark:text-[#E5E5E5] transition hover:bg-[#E5E5E5] dark:hover:bg-[#3A3A3C]"
                    onClick={() => {
                      void invokeIpc('pet:openMainWindow');
                      void invokeIpc('voice:closeDialog');
                    }}
                  >
                    设置
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* 底部控制栏 */}
        <div className="absolute bottom-8 left-0 right-0 flex items-center justify-center gap-6 px-4">
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              className={cn(
                'flex h-[56px] w-[56px] items-center justify-center rounded-full transition-all duration-300',
                micMuted
                  ? 'bg-white dark:bg-[#2C2C2E] text-[#111111] dark:text-[#E5E5E5] shadow-sm'
                  : 'bg-[#07C160] bg-opacity-10 text-[#07C160] hover:bg-opacity-20'
              )}
              onClick={() => setMicMuted((value) => !value)}
            >
              {micMuted ? <MicOff className="h-6 w-6 opacity-80" /> : <Mic className="h-6 w-6" />}
            </button>
            <span className="text-[12px] text-[#111111]/50 dark:text-[#E5E5E5]/50">
              {micMuted ? '麦克风已关' : '静音'}
            </span>
          </div>

          <div className="flex flex-col items-center gap-2">
            {!realtimeSessionId ? (
              <button
                type="button"
                disabled={!canStart || loadingConfig}
                className={cn(
                  'flex h-[64px] w-[64px] items-center justify-center rounded-full text-white shadow-md transition-transform hover:scale-105 active:scale-95',
                  loadingConfig || !config?.configured ? 'bg-[#07C160]/50' : 'bg-[#07C160]'
                )}
                onClick={() => void handleStart()}
              >
                <Phone className="h-7 w-7 fill-current" />
              </button>
            ) : (
              <button
                type="button"
                className="flex h-[64px] w-[64px] items-center justify-center rounded-full bg-[#FA5151] text-white shadow-md transition-transform hover:scale-105 active:scale-95"
                onClick={() => void handleHangup('completed')}
              >
                <Phone className="h-7 w-7 fill-current rotate-[135deg]" />
              </button>
            )}
            <span className="text-[12px] text-[#111111]/50 dark:text-[#E5E5E5]/50">
              {!realtimeSessionId
                ? loadingConfig
                  ? '加载中...'
                  : config?.configured
                    ? '开始通话'
                    : '去配置'
                : '挂断'}
            </span>
          </div>

          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              className={cn(
                'flex h-[56px] w-[56px] items-center justify-center rounded-full transition-all duration-300',
                speakerMuted
                  ? 'bg-white dark:bg-[#2C2C2E] text-[#111111] dark:text-[#E5E5E5] shadow-sm'
                  : 'bg-[#07C160] bg-opacity-10 text-[#07C160] hover:bg-opacity-20'
              )}
              onClick={() => setSpeakerMuted((value) => !value)}
            >
              {speakerMuted ? (
                <VolumeX className="h-6 w-6 opacity-80" />
              ) : (
                <Volume2 className="h-6 w-6" />
              )}
            </button>
            <span className="text-[12px] text-[#111111]/50 dark:text-[#E5E5E5]/50">
              {speakerMuted ? '扬声器已关' : '免提'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
