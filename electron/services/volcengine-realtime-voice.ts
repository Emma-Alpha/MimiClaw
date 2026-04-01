import WebSocket from 'ws';
import { gunzipSync } from 'node:zlib';
import { randomUUID } from 'node:crypto';
import { logger } from '../utils/logger';
import {
  DEFAULT_VOICE_CHAT_ENDPOINT,
  DEFAULT_VOICE_CHAT_MODEL,
  DEFAULT_VOICE_CHAT_SPEAKER,
  type VoiceRealtimeServerEvent,
} from '../../shared/voice-chat';
import { getVoiceChatRealtimeCredentials } from './voice-chat-store';

const KEEPALIVE_INTERVAL_MS = 60_000;

const PROTOCOL_VERSION = 0b0001;
const HEADER_SIZE = 0b0001;

const MESSAGE_TYPE_FULL_CLIENT = 0b0001;
const MESSAGE_TYPE_AUDIO_CLIENT = 0b0010;
const MESSAGE_TYPE_FULL_SERVER = 0b1001;
const MESSAGE_TYPE_AUDIO_SERVER = 0b1011;
const MESSAGE_TYPE_ERROR = 0b1111;

const MESSAGE_FLAG_WITH_EVENT = 0b0100;
const MESSAGE_FLAG_POSITIVE_SEQUENCE = 0b0001;
const MESSAGE_FLAG_NEGATIVE_SEQUENCE = 0b0011;

const SERIALIZATION_RAW = 0b0000;
const SERIALIZATION_JSON = 0b0001;

const COMPRESSION_NONE = 0b0000;
const COMPRESSION_GZIP = 0b0001;

const EVENT_START_CONNECTION = 1;
const EVENT_FINISH_CONNECTION = 2;
const EVENT_CONNECTION_STARTED = 50;
const EVENT_CONNECTION_FAILED = 51;
const EVENT_CONNECTION_FINISHED = 52;
const EVENT_START_SESSION = 100;
const EVENT_FINISH_SESSION = 102;
const EVENT_TASK_REQUEST = 200;
const EVENT_UPDATE_CONFIG = 201;
const EVENT_END_ASR = 400;
const EVENT_CLIENT_INTERRUPT = 515;

const EVENT_SESSION_STARTED = 150;
const EVENT_SESSION_FINISHED = 152;
const EVENT_SESSION_FAILED = 153;
const EVENT_TTS_SENTENCE_START = 350;
const EVENT_TTS_RESPONSE = 352;
const EVENT_TTS_ENDED = 359;
const EVENT_ASR_INFO = 450;
const EVENT_ASR_RESPONSE = 451;
const EVENT_ASR_ENDED = 459;
const EVENT_CHAT_RESPONSE = 550;
const EVENT_CHAT_ENDED = 559;
const EVENT_DIALOG_COMMON_ERROR = 599;

const CONNECTION_EVENT_IDS = new Set<number>([
  EVENT_START_CONNECTION,
  EVENT_FINISH_CONNECTION,
  EVENT_CONNECTION_STARTED,
  EVENT_CONNECTION_FAILED,
  EVENT_CONNECTION_FINISHED,
]);

type VoiceRuntimeEvent =
  | ({ type: 'voice.connection.status'; status: 'connecting' | 'connected' | 'closed' } & Record<string, unknown>)
  | ({ type: 'voice.connection.error'; kind: 'auth' | 'network' | 'server'; message: string } & Record<string, unknown>)
  | ({ type: 'voice.interrupt' } & Record<string, unknown>)
  | VoiceRealtimeServerEvent;

type ParsedRealtimeMessage = {
  type: 'full' | 'audio' | 'error';
  event?: number;
  sessionId?: string;
  connectId?: string;
  sequence?: number;
  errorCode?: number;
  payload: unknown;
};

function containsSequence(flags: number): boolean {
  return (flags & MESSAGE_FLAG_POSITIVE_SEQUENCE) === MESSAGE_FLAG_POSITIVE_SEQUENCE
    || (flags & MESSAGE_FLAG_NEGATIVE_SEQUENCE) === MESSAGE_FLAG_NEGATIVE_SEQUENCE;
}

function inferErrorKind(message: string): 'auth' | 'server' {
  return /401|403|unauthor|forbidden|access key|access token|app key|app id|auth|token/i.test(message)
    ? 'auth'
    : 'server';
}

function normalizeEndpoint(value: string): string {
  const trimmed = value.trim();
  return trimmed || DEFAULT_VOICE_CHAT_ENDPOINT;
}

function int32Buffer(value: number): Buffer {
  const buffer = Buffer.alloc(4);
  buffer.writeInt32BE(value, 0);
  return buffer;
}

function uint32Buffer(value: number): Buffer {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32BE(value, 0);
  return buffer;
}

function buildHeader(messageType: number, serialization: number): Buffer {
  return Buffer.from([
    (PROTOCOL_VERSION << 4) | HEADER_SIZE,
    (messageType << 4) | MESSAGE_FLAG_WITH_EVENT,
    (serialization << 4) | COMPRESSION_NONE,
    0x00,
  ]);
}

function buildControlFrame(eventId: number, payload: Record<string, unknown>, sessionId?: string): Buffer {
  const payloadBuffer = Buffer.from(JSON.stringify(payload), 'utf8');
  const parts: Buffer[] = [
    buildHeader(MESSAGE_TYPE_FULL_CLIENT, SERIALIZATION_JSON),
    int32Buffer(eventId),
  ];

  if (sessionId && !CONNECTION_EVENT_IDS.has(eventId)) {
    const sessionBuffer = Buffer.from(sessionId, 'utf8');
    parts.push(uint32Buffer(sessionBuffer.length), sessionBuffer);
  }

  parts.push(uint32Buffer(payloadBuffer.length), payloadBuffer);
  return Buffer.concat(parts);
}

function buildAudioFrame(sessionId: string, audioChunk: Uint8Array): Buffer {
  const payloadBuffer = Buffer.from(audioChunk);
  const sessionBuffer = Buffer.from(sessionId, 'utf8');

  return Buffer.concat([
    buildHeader(MESSAGE_TYPE_AUDIO_CLIENT, SERIALIZATION_RAW),
    int32Buffer(EVENT_TASK_REQUEST),
    uint32Buffer(sessionBuffer.length),
    sessionBuffer,
    uint32Buffer(payloadBuffer.length),
    payloadBuffer,
  ]);
}

function buildStartSessionPayload(): Record<string, unknown> {
  return {
    asr: {
      extra: {
        end_smooth_window_ms: 1500,
      },
    },
    tts: {
      speaker: DEFAULT_VOICE_CHAT_SPEAKER,
      audio_config: {
        channel: 1,
        format: 'pcm_s16le',
        sample_rate: 24000,
      },
    },
    dialog: {
      dialog_id: '',
      bot_name: '小黑猫',
      system_role: '你是一个自然、口语化、简短的小黑猫语音助手，会像真人陪伴聊天一样回应用户。',
      speaking_style: '语气温柔、轻松、真实，回答尽量简洁，不要长篇大论。',
      extra: {
        input_mod: 'push_to_talk',
        model: DEFAULT_VOICE_CHAT_MODEL,
        enable_user_query_exit: true,
      },
    },
  };
}

function readPayload(buffer: Buffer, compression: number, serialization: number): unknown {
  const decoded = compression === COMPRESSION_GZIP ? gunzipSync(buffer) : buffer;

  if (serialization === SERIALIZATION_RAW) {
    return decoded;
  }

  if (serialization === SERIALIZATION_JSON) {
    return JSON.parse(decoded.toString('utf8'));
  }

  return decoded.toString('utf8');
}

function parseRealtimeMessage(rawData: WebSocket.RawData): ParsedRealtimeMessage {
  const buffer = Buffer.isBuffer(rawData)
    ? rawData
    : Array.isArray(rawData)
      ? Buffer.concat(rawData.map((entry) => Buffer.from(entry)))
      : Buffer.from(rawData as ArrayBuffer);

  if (buffer.length < 8) {
    throw new Error('Voice Chat frame is too short');
  }

  const headerSize = (buffer[0] & 0x0f) * 4;
  const messageType = buffer[1] >> 4;
  const flags = buffer[1] & 0x0f;
  const serialization = buffer[2] >> 4;
  const compression = buffer[2] & 0x0f;

  let offset = headerSize;
  let event: number | undefined;
  let sequence: number | undefined;
  let sessionId = '';
  let connectId = '';
  let errorCode: number | undefined;

  if (messageType === MESSAGE_TYPE_ERROR) {
    errorCode = buffer.readUInt32BE(offset);
    offset += 4;
  }

  if (containsSequence(flags)) {
    sequence = buffer.readInt32BE(offset);
    offset += 4;
  }

  if ((flags & MESSAGE_FLAG_WITH_EVENT) === MESSAGE_FLAG_WITH_EVENT) {
    event = buffer.readInt32BE(offset);
    offset += 4;
  }

  if (typeof event === 'number' && !CONNECTION_EVENT_IDS.has(event)) {
    const size = buffer.readUInt32BE(offset);
    offset += 4;
    sessionId = buffer.subarray(offset, offset + size).toString('utf8');
    offset += size;
  }

  if (
    typeof event === 'number'
    && (event === EVENT_CONNECTION_STARTED || event === EVENT_CONNECTION_FAILED || event === EVENT_CONNECTION_FINISHED)
  ) {
    const size = buffer.readUInt32BE(offset);
    offset += 4;
    connectId = buffer.subarray(offset, offset + size).toString('utf8');
    offset += size;
  }

  const payloadSize = buffer.readUInt32BE(offset);
  offset += 4;
  const payloadBuffer = buffer.subarray(offset, offset + payloadSize);
  const payload = readPayload(payloadBuffer, compression, serialization);

  if (messageType === MESSAGE_TYPE_FULL_SERVER) {
    return { type: 'full', event, sessionId, connectId, sequence, payload };
  }

  if (messageType === MESSAGE_TYPE_AUDIO_SERVER) {
    return { type: 'audio', event, sessionId, connectId, sequence, payload };
  }

  if (messageType === MESSAGE_TYPE_ERROR) {
    return { type: 'error', event, sessionId, connectId, sequence, errorCode, payload };
  }

  throw new Error(`Unsupported realtime message type: ${messageType}`);
}

function parsePayloadMessage(payload: unknown): string {
  if (typeof payload === 'string') return payload;
  if (payload && typeof payload === 'object') {
    if (typeof (payload as { error?: unknown }).error === 'string') {
      return (payload as { error: string }).error;
    }
    if (typeof (payload as { message?: unknown }).message === 'string') {
      return (payload as { message: string }).message;
    }
  }
  return '未知错误';
}

export class VolcengineRealtimeVoiceSession {
  private ws: WebSocket | null = null;
  private readonly readyPromise: Promise<void>;
  private readonly keepaliveTimer: NodeJS.Timeout;
  private readonly sessionId = randomUUID();
  private readonly connectId = randomUUID();
  private resolveReady: (() => void) | null = null;
  private rejectReady: ((error: Error) => void) | null = null;
  private closed = false;
  private failed = false;
  private ready = false;
  private closedStatusEmitted = false;
  private assistantReplyText = new Map<string, string>();
  private lastUserInterimText = '';

  constructor(
    private readonly onEvent: (event: VoiceRuntimeEvent) => void,
  ) {
    this.readyPromise = new Promise<void>((resolve, reject) => {
      this.resolveReady = resolve;
      this.rejectReady = reject;
    });

    this.onEvent({ type: 'voice.connection.status', status: 'connecting' });
    this.keepaliveTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.ping();
      }
    }, KEEPALIVE_INTERVAL_MS);

    void this.initialize();
  }

  async waitUntilReady(): Promise<void> {
    await this.readyPromise;
  }

  async appendAudio(audioChunk: Uint8Array): Promise<void> {
    if (!audioChunk.length) return;
    await this.waitUntilReady();
    await this.sendFrame(buildAudioFrame(this.sessionId, audioChunk));
  }

  async commitAudio(): Promise<void> {
    await this.waitUntilReady();
    await this.sendFrame(buildControlFrame(EVENT_END_ASR, {}, this.sessionId));
  }

  async createResponse(): Promise<void> {
    await this.waitUntilReady();
  }

  async cancelResponse(): Promise<void> {
    await this.waitUntilReady();
    await this.sendFrame(buildControlFrame(EVENT_CLIENT_INTERRUPT, {}, this.sessionId));
  }

  async close(): Promise<void> {
    this.closed = true;
    clearInterval(this.keepaliveTimer);

    const ws = this.ws;
    if (!ws) return;

    if (ws.readyState === WebSocket.OPEN) {
      try {
        if (this.ready) {
          await this.sendFrame(buildControlFrame(EVENT_FINISH_SESSION, {}, this.sessionId));
        }
        await this.sendFrame(buildControlFrame(EVENT_FINISH_CONNECTION, {}));
      } catch (error) {
        logger.warn('[voice-chat] Failed to close realtime session gracefully', error);
      }
      ws.close();
      return;
    }

    if (ws.readyState === WebSocket.CONNECTING) {
      ws.close();
    }
  }

  private async initialize(): Promise<void> {
    try {
      const credentials = await getVoiceChatRealtimeCredentials();
      const ws = new WebSocket(normalizeEndpoint(credentials.endpoint), {
        headers: {
          'X-Api-App-ID': credentials.appId,
          'X-Api-Access-Key': credentials.accessKey,
          'X-Api-Resource-Id': credentials.resourceId,
          'X-Api-App-Key': credentials.appKey,
          'X-Api-Connect-Id': this.connectId,
        },
      });
      this.ws = ws;

      ws.once('unexpected-response', (_request, response) => {
        const statusCode = response.statusCode ?? 0;
        const kind = statusCode === 401 || statusCode === 403 ? 'auth' : 'server';
        const message = `Voice Chat connection failed (${statusCode || 'unknown'})`;
        this.fail(kind, message);
      });

      ws.once('open', () => {
        void this.sendFrame(buildControlFrame(EVENT_START_CONNECTION, {})).catch((error) => {
          this.fail('network', error instanceof Error ? error.message : String(error));
        });
      });

      ws.on('message', (rawData) => {
        try {
          const message = parseRealtimeMessage(rawData);
          this.handleMessage(message);
        } catch (error) {
          logger.warn('[voice-chat] Failed to parse realtime frame', error);
        }
      });

      ws.on('error', (error) => {
        if (!this.closed) {
          this.fail('network', error instanceof Error ? error.message : String(error));
        }
      });

      ws.on('close', () => {
        clearInterval(this.keepaliveTimer);
        if (this.failed) {
          return;
        }
        if (!this.ready && !this.closed) {
          this.fail('network', 'Voice Chat connection closed before the session was ready');
          return;
        }
        this.emitClosedStatus();
      });
    } catch (error) {
      this.fail('server', error instanceof Error ? error.message : String(error));
    }
  }

  private handleMessage(message: ParsedRealtimeMessage): void {
    if (message.type === 'error') {
      const detail = parsePayloadMessage(message.payload);
      this.fail(inferErrorKind(detail), detail);
      return;
    }

    const payload = message.payload;

    switch (message.event) {
      case EVENT_CONNECTION_STARTED:
        void this.sendFrame(buildControlFrame(EVENT_START_SESSION, buildStartSessionPayload(), this.sessionId)).catch((error) => {
          this.fail('server', error instanceof Error ? error.message : String(error));
        });
        return;

      case EVENT_CONNECTION_FAILED:
      case EVENT_SESSION_FAILED: {
        const detail = parsePayloadMessage(payload);
        this.fail(inferErrorKind(detail), detail);
        return;
      }

      case EVENT_CONNECTION_FINISHED:
        this.emitClosedStatus();
        return;

      case EVENT_SESSION_STARTED:
        if (!this.ready) {
          this.ready = true;
          this.resolveReady?.();
          this.resolveReady = null;
          this.rejectReady = null;
        }
        this.onEvent({ type: 'voice.connection.status', status: 'connected' });
        return;

      case EVENT_SESSION_FINISHED:
        return;

      case EVENT_ASR_INFO:
        this.onEvent({ type: 'voice.interrupt' });
        return;

      case EVENT_ASR_RESPONSE:
        this.handleAsrResponse(payload);
        return;

      case EVENT_ASR_ENDED:
        if (this.lastUserInterimText.trim()) {
          this.onEvent({
            type: 'conversation.item.input_audio_transcription.completed',
            transcript: this.lastUserInterimText.trim(),
          });
          this.lastUserInterimText = '';
        }
        return;

      case EVENT_CHAT_RESPONSE:
        this.handleChatResponse(payload);
        return;

      case EVENT_CHAT_ENDED:
        this.handleChatEnded(payload);
        return;

      case EVENT_TTS_SENTENCE_START:
      case EVENT_TTS_ENDED:
        return;

      case EVENT_DIALOG_COMMON_ERROR: {
        const detail = parsePayloadMessage(payload);
        this.fail(inferErrorKind(detail), detail);
        return;
      }

      case EVENT_TTS_RESPONSE:
        if (message.type === 'audio' && Buffer.isBuffer(payload)) {
          this.onEvent({
            type: 'response.audio.delta',
            delta: payload.toString('base64'),
          });
        }
        return;

      default:
        logger.debug?.('[voice-chat] Ignored realtime event', message.event);
    }
  }

  private handleAsrResponse(payload: unknown): void {
    if (!payload || typeof payload !== 'object') return;
    const results = Array.isArray((payload as { results?: unknown[] }).results)
      ? (payload as { results: Array<{ text?: unknown; is_interim?: unknown }> }).results
      : [];
    const last = results[results.length - 1];
    const text = typeof last?.text === 'string' ? last.text.trim() : '';
    if (!text) return;

    if (last?.is_interim === true) {
      this.lastUserInterimText = text;
      this.onEvent({
        type: 'conversation.item.input_audio_transcription.delta',
        transcript: text,
      });
      return;
    }

    this.lastUserInterimText = '';
    this.onEvent({
      type: 'conversation.item.input_audio_transcription.completed',
      transcript: text,
    });
  }

  private handleChatResponse(payload: unknown): void {
    if (!payload || typeof payload !== 'object') return;
    const content = typeof (payload as { content?: unknown }).content === 'string'
      ? (payload as { content: string }).content
      : '';
    if (!content) return;

    const replyId = typeof (payload as { reply_id?: unknown }).reply_id === 'string'
      ? (payload as { reply_id: string }).reply_id
      : '__default__';
    const nextText = `${this.assistantReplyText.get(replyId) ?? ''}${content}`;
    this.assistantReplyText.set(replyId, nextText);
    this.onEvent({
      type: 'response.audio_transcript.delta',
      delta: content,
    });
  }

  private handleChatEnded(payload: unknown): void {
    const replyId = payload && typeof payload === 'object' && typeof (payload as { reply_id?: unknown }).reply_id === 'string'
      ? (payload as { reply_id: string }).reply_id
      : '__default__';
    const transcript = (this.assistantReplyText.get(replyId) ?? '').trim();
    this.assistantReplyText.delete(replyId);

    if (!transcript) return;
    this.onEvent({
      type: 'response.audio_transcript.done',
      transcript,
    });
  }

  private async sendFrame(frame: Buffer): Promise<void> {
    const ws = this.ws;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      throw new Error('Voice Chat socket is unavailable');
    }

    await new Promise<void>((resolve, reject) => {
      ws.send(frame, (error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }

  private fail(kind: 'auth' | 'network' | 'server', message: string): void {
    if (this.failed) {
      return;
    }
    this.failed = true;
    clearInterval(this.keepaliveTimer);
    const error = new Error(message);
    if (!this.ready) {
      this.rejectReady?.(error);
      this.resolveReady = null;
      this.rejectReady = null;
    }
    if (!this.closed) {
      this.onEvent({ type: 'voice.connection.error', kind, message });
    }

    const ws = this.ws;
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
      ws.close();
    }
  }

  private emitClosedStatus(): void {
    if (this.closedStatusEmitted) {
      return;
    }
    this.closedStatusEmitted = true;
    this.onEvent({ type: 'voice.connection.status', status: 'closed' });
  }
}

export async function createVolcengineRealtimeVoiceSession(
  onEvent: (event: VoiceRuntimeEvent) => void,
): Promise<VolcengineRealtimeVoiceSession> {
  const session = new VolcengineRealtimeVoiceSession(onEvent);
  await session.waitUntilReady();
  return session;
}
