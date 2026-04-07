import { randomUUID } from 'node:crypto';
import { gunzipSync, gzipSync } from 'node:zlib';
import WebSocket from 'ws';
import { logger } from '../utils/logger';
import { getVolcengineSpeechCredentials, type VolcengineSpeechCredentials } from './speech-config';

const DEFAULT_AUDIO_RATE = 16_000;
const FINISH_TIMEOUT_MS = 6_000;

const PROTOCOL_VERSION = 0x1;
const PROTOCOL_HEADER_SIZE = 0x1;

const MESSAGE_TYPE_FULL_CLIENT_REQUEST = 0x1;
const MESSAGE_TYPE_AUDIO_ONLY_REQUEST = 0x2;
const MESSAGE_TYPE_FULL_SERVER_RESPONSE = 0x9;
const MESSAGE_TYPE_SERVER_ERROR_RESPONSE = 0xf;

const MESSAGE_TYPE_SPECIFIC_DEFAULT = 0x0;
const MESSAGE_TYPE_SPECIFIC_LAST_AUDIO = 0x2;

const SERIALIZATION_NONE = 0x0;
const SERIALIZATION_JSON = 0x1;

const COMPRESSION_NONE = 0x0;
const COMPRESSION_GZIP = 0x1;

export type VolcengineAsrEvent =
  | { type: 'partial'; text: string }
  | { type: 'final'; text: string }
  | { type: 'error'; message: string }
  | { type: 'status'; status: 'connecting' | 'connected' | 'closed' };

type VolcengineAsrResult = {
  text: string;
};

function buildHeader(
  messageType: number,
  messageTypeSpecificFlags: number,
  serializationMethod: number,
  compressionType: number,
): Buffer {
  return Buffer.from([
    (PROTOCOL_VERSION << 4) | PROTOCOL_HEADER_SIZE,
    (messageType << 4) | messageTypeSpecificFlags,
    (serializationMethod << 4) | compressionType,
    0x00,
  ]);
}

function buildPacket(
  messageType: number,
  messageTypeSpecificFlags: number,
  serializationMethod: number,
  compressionType: number,
  payload: Buffer,
): Buffer {
  const header = buildHeader(
    messageType,
    messageTypeSpecificFlags,
    serializationMethod,
    compressionType,
  );
  const length = Buffer.alloc(4);
  length.writeUInt32BE(payload.length, 0);
  return Buffer.concat([header, length, payload]);
}

function decodePayload(payload: Buffer, compressionType: number): Buffer {
  if (compressionType === COMPRESSION_GZIP && payload.length > 0) {
    try {
      return gunzipSync(payload);
    } catch (error) {
      logger.warn(
        '[speech] Volcengine ASR payload marked as gzip but failed to decompress, fallback to raw payload',
        error,
      );
      return payload;
    }
  }
  return payload;
}

function extractTranscriptText(payload: Record<string, unknown>): string {
  const result = Array.isArray(payload.result) ? payload.result : [];
  const segments = result
    .map((item) => {
      if (!item || typeof item !== 'object') return '';
      const text = Reflect.get(item, 'text');
      return typeof text === 'string' ? text : '';
    })
    .filter(Boolean);

  return segments.join('').trim();
}

function buildInitialRequest(credentials: VolcengineSpeechCredentials): Buffer {
  const requestPayload = {
    app: {
      appid: credentials.appId,
      cluster: credentials.cluster,
      token: credentials.token,
    },
    user: {
      uid: `pet-${randomUUID()}`,
    },
    audio: {
      format: 'raw',
      codec: 'raw',
      rate: DEFAULT_AUDIO_RATE,
      bits: 16,
      channel: 1,
      language: credentials.language,
    },
    request: {
      reqid: randomUUID(),
      workflow: 'audio_in,resample,partition,vad,fe,decode,itn,nlu_punctuate',
      nbest: 1,
      show_utterances: true,
      result_type: 'single',
      sequence: 1,
      vad_signal: true,
      start_silence_time: 5000,
      vad_silence_time: 800,
    },
  };

  const payload = gzipSync(Buffer.from(JSON.stringify(requestPayload), 'utf8'));
  return buildPacket(
    MESSAGE_TYPE_FULL_CLIENT_REQUEST,
    MESSAGE_TYPE_SPECIFIC_DEFAULT,
    SERIALIZATION_JSON,
    COMPRESSION_GZIP,
    payload,
  );
}

function buildAudioPacket(audioChunk: Uint8Array, isLast: boolean): Buffer {
  const payload = gzipSync(Buffer.from(audioChunk));
  return buildPacket(
    MESSAGE_TYPE_AUDIO_ONLY_REQUEST,
    isLast ? MESSAGE_TYPE_SPECIFIC_LAST_AUDIO : MESSAGE_TYPE_SPECIFIC_DEFAULT,
    SERIALIZATION_NONE,
    COMPRESSION_GZIP,
    payload,
  );
}

function createTimeoutPromise(timeoutMs: number): Promise<VolcengineAsrResult> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Volcengine ASR final result timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });
}

function parseServerMessage(rawData: WebSocket.RawData): {
  event: VolcengineAsrEvent | null;
  isFinal: boolean;
  finalText: string;
} {
  const buffer = Array.isArray(rawData)
    ? Buffer.concat(rawData)
    : Buffer.isBuffer(rawData)
      ? rawData
      : ArrayBuffer.isView(rawData)
        ? Buffer.from(rawData.buffer, rawData.byteOffset, rawData.byteLength)
        : Buffer.from(rawData as ArrayBuffer);
  if (buffer.length < 8) {
    throw new Error('Volcengine ASR returned an invalid frame');
  }

  const headerSize = (buffer[0] & 0x0f) * 4;
  const messageType = buffer[1] >> 4;
  const compressionType = buffer[2] & 0x0f;
  const payloadSize = buffer.readUInt32BE(headerSize);
  const payloadStart = headerSize + 4;
  const payloadEnd = payloadStart + payloadSize;
  const payloadBytes = buffer.subarray(payloadStart, payloadEnd);

  if (messageType === MESSAGE_TYPE_SERVER_ERROR_RESPONSE) {
    const decoded = decodePayload(payloadBytes, compressionType).toString('utf8').trim();
    throw new Error(decoded || 'Volcengine ASR returned an error');
  }

  if (messageType !== MESSAGE_TYPE_FULL_SERVER_RESPONSE) {
    return {
      event: null,
      isFinal: false,
      finalText: '',
    };
  }

  const decodedPayload = decodePayload(payloadBytes, compressionType).toString('utf8');
  const data = decodedPayload ? JSON.parse(decodedPayload) as Record<string, unknown> : {};
  const sequence = typeof data.sequence === 'number' ? data.sequence : 0;
  const text = extractTranscriptText(data);

  if (!text) {
    return {
      event: null,
      isFinal: sequence < 0,
      finalText: '',
    };
  }

  if (sequence < 0) {
    return {
      event: { type: 'final', text },
      isFinal: true,
      finalText: text,
    };
  }

  return {
    event: { type: 'partial', text },
    isFinal: false,
    finalText: '',
  };
}

async function sendPacket(ws: WebSocket, packet: Buffer): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    ws.send(packet, (error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

export class VolcengineAsrSession {
  private readonly ws: WebSocket;
  private readonly openPromise: Promise<void>;
  private readonly completionPromise: Promise<VolcengineAsrResult>;
  private completionResolve: ((value: VolcengineAsrResult) => void) | null = null;
  private completionReject: ((reason?: unknown) => void) | null = null;
  private completed = false;
  private latestText = '';

  constructor(
    private readonly credentials: VolcengineSpeechCredentials,
    private readonly onEvent: (event: VolcengineAsrEvent) => void,
  ) {
    this.onEvent({ type: 'status', status: 'connecting' });
    this.ws = new WebSocket(credentials.endpoint, {
      headers: {
        Authorization: `Bearer; ${credentials.token}`,
      },
    });

    this.openPromise = new Promise<void>((resolve, reject) => {
      this.ws.once('open', () => {
        this.onEvent({ type: 'status', status: 'connected' });
        resolve();
      });
      this.ws.once('error', (error) => {
        reject(error);
      });
    });

    this.completionPromise = new Promise<VolcengineAsrResult>((resolve, reject) => {
      this.completionResolve = resolve;
      this.completionReject = reject;
    });

    this.ws.on('message', (data) => {
      try {
        const parsed = parseServerMessage(data);
        if (parsed.event?.type === 'partial' || parsed.event?.type === 'final') {
          this.latestText = parsed.event.text;
        }
        if (parsed.event) {
          this.onEvent(parsed.event);
        }
        if (parsed.isFinal) {
          this.complete({ text: parsed.finalText || this.latestText });
        }
      } catch (error) {
        this.fail(error);
      }
    });

    this.ws.on('close', () => {
      this.onEvent({ type: 'status', status: 'closed' });
      if (!this.completed) {
        this.complete({ text: this.latestText });
      }
    });

    this.ws.on('error', (error) => {
      this.fail(error);
    });
  }

  async start(): Promise<void> {
    await this.openPromise;
    await sendPacket(this.ws, buildInitialRequest(this.credentials));
    logger.info('[speech] Volcengine ASR session started');
  }

  async pushAudio(audioChunk: Uint8Array): Promise<void> {
    if (this.completed) return;
    await this.openPromise;
    if (audioChunk.length === 0) return;
    await sendPacket(this.ws, buildAudioPacket(audioChunk, false));
  }

  async finish(lastAudioChunk?: Uint8Array): Promise<VolcengineAsrResult> {
    if (this.completed) {
      return { text: this.latestText };
    }

    await this.openPromise;
    await sendPacket(this.ws, buildAudioPacket(lastAudioChunk ?? new Uint8Array(0), true));
    return await Promise.race([
      this.completionPromise,
      createTimeoutPromise(FINISH_TIMEOUT_MS),
    ]);
  }

  cancel(): void {
    if (this.completed) return;
    this.complete({ text: '' });
    this.ws.close();
  }

  private complete(result: VolcengineAsrResult): void {
    if (this.completed) return;
    this.completed = true;
    this.completionResolve?.(result);
    this.completionResolve = null;
    this.completionReject = null;
    if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
      this.ws.close();
    }
  }

  private fail(error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('[speech] Volcengine ASR session failed', error);
    this.onEvent({ type: 'error', message });
    if (!this.completed) {
      this.completed = true;
      this.completionReject?.(error);
      this.completionResolve = null;
      this.completionReject = null;
    }
    if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
      this.ws.close();
    }
  }
}

export async function createVolcengineAsrSession(
  onEvent: (event: VolcengineAsrEvent) => void,
): Promise<VolcengineAsrSession> {
  const credentials = await getVolcengineSpeechCredentials();
  const session = new VolcengineAsrSession(credentials, onEvent);
  await session.start();
  return session;
}
