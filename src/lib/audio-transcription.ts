import { hostApiFetch } from "@/lib/host-api";
import type { PetCodeChatSeedAttachment } from "../../shared/pet";

export interface LocalSpeechTranscription {
	text: string;
	engine: "whisper.cpp";
	model: string;
	language: string;
	durationMs: number;
}

export type LocalSpeechLanguageHint = "auto" | "zh" | "en" | "ja";

function writeAsciiString(view: DataView, offset: number, value: string) {
	for (let index = 0; index < value.length; index += 1) {
		view.setUint8(offset + index, value.charCodeAt(index));
	}
}

function encodeMonoWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
	const pcmBuffer = new ArrayBuffer(44 + samples.length * 2);
	const view = new DataView(pcmBuffer);

	writeAsciiString(view, 0, "RIFF");
	view.setUint32(4, 36 + samples.length * 2, true);
	writeAsciiString(view, 8, "WAVE");
	writeAsciiString(view, 12, "fmt ");
	view.setUint32(16, 16, true);
	view.setUint16(20, 1, true);
	view.setUint16(22, 1, true);
	view.setUint32(24, sampleRate, true);
	view.setUint32(28, sampleRate * 2, true);
	view.setUint16(32, 2, true);
	view.setUint16(34, 16, true);
	writeAsciiString(view, 36, "data");
	view.setUint32(40, samples.length * 2, true);

	let offset = 44;
	for (let index = 0; index < samples.length; index += 1) {
		const sample = Math.max(-1, Math.min(1, samples[index] ?? 0));
		view.setInt16(
			offset,
			sample < 0 ? sample * 0x8000 : sample * 0x7fff,
			true,
		);
		offset += 2;
	}

	return pcmBuffer;
}

function downmixToMono(buffer: AudioBuffer): Float32Array {
	const mono = new Float32Array(buffer.length);
	const channelCount = Math.max(1, buffer.numberOfChannels);

	for (let channelIndex = 0; channelIndex < channelCount; channelIndex += 1) {
		const channelData = buffer.getChannelData(channelIndex);
		for (let sampleIndex = 0; sampleIndex < buffer.length; sampleIndex += 1) {
			mono[sampleIndex] += (channelData[sampleIndex] ?? 0) / channelCount;
		}
	}

	return mono;
}

async function decodeAudioBlob(blob: Blob): Promise<AudioBuffer> {
	const AudioContextCtor = window.AudioContext;
	if (!AudioContextCtor) {
		throw new Error("AudioContext is unavailable");
	}

	const audioContext = new AudioContextCtor();
	try {
		const arrayBuffer = await blob.arrayBuffer();
		return await audioContext.decodeAudioData(arrayBuffer.slice(0));
	} finally {
		void audioContext.close().catch(() => {});
	}
}

async function resampleMonoAudio(
	samples: Float32Array,
	inputSampleRate: number,
	outputSampleRate: number,
): Promise<Float32Array> {
	if (inputSampleRate === outputSampleRate) {
		return samples;
	}

	const frameCount = Math.max(
		1,
		Math.ceil(samples.length * outputSampleRate / inputSampleRate),
	);
	const offlineContext = new OfflineAudioContext(1, frameCount, outputSampleRate);
	const sourceBuffer = offlineContext.createBuffer(1, samples.length, inputSampleRate);
	sourceBuffer.getChannelData(0).set(samples);

	const source = offlineContext.createBufferSource();
	source.buffer = sourceBuffer;
	source.connect(offlineContext.destination);
	source.start(0);

	const rendered = await offlineContext.startRendering();
	return rendered.getChannelData(0).slice();
}

function ensureReadyAttachment(
	attachment: Omit<PetCodeChatSeedAttachment, "status"> & { status?: PetCodeChatSeedAttachment["status"] },
): PetCodeChatSeedAttachment {
	return {
		...attachment,
		status: attachment.status ?? "ready",
	};
}

async function readFileAsBase64(file: globalThis.File): Promise<string> {
	return await new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => {
			const dataUrl = String(reader.result || "");
			const base64 = dataUrl.split(",")[1];
			if (!base64) {
				reject(new Error(`Empty base64 for ${file.name}`));
				return;
			}
			resolve(base64);
		};
		reader.onerror = () => reject(new Error(`Failed to read: ${file.name}`));
		reader.readAsDataURL(file);
	});
}

export async function stageFileForChat(file: File): Promise<PetCodeChatSeedAttachment> {
	const base64 = await readFileAsBase64(file);
	const attachment = await hostApiFetch<
		Omit<PetCodeChatSeedAttachment, "status"> & { status?: PetCodeChatSeedAttachment["status"] }
	>("/api/files/stage-buffer", {
		method: "POST",
		body: JSON.stringify({
			base64,
			fileName: file.name,
			mimeType: file.type || "application/octet-stream",
		}),
	});

	return ensureReadyAttachment(attachment);
}

export async function transcribeLocalAudioFile(
	filePath: string,
	languageHint: LocalSpeechLanguageHint = "auto",
): Promise<LocalSpeechTranscription> {
	return await hostApiFetch<LocalSpeechTranscription>("/api/speech/transcribe-local", {
		method: "POST",
		body: JSON.stringify({ filePath, language: languageHint }),
	});
}

export async function convertAudioBlobToWavFile(
	audioBlob: Blob,
	filePrefix: string,
): Promise<File> {
	const decodedBuffer = await decodeAudioBlob(audioBlob);
	const monoSamples = downmixToMono(decodedBuffer);
	const resampled = await resampleMonoAudio(
		monoSamples,
		decodedBuffer.sampleRate,
		16_000,
	);
	const wavBuffer = encodeMonoWav(resampled, 16_000);
	const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

	return new File(
		[wavBuffer],
		`${filePrefix}_${timestamp}.wav`,
		{ type: "audio/wav" },
	);
}
