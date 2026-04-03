import type { TextAreaRef } from "antd/es/input/TextArea";

export interface FileAttachment {
	id: string;
	fileName: string;
	mimeType: string;
	fileSize: number;
	stagedPath: string;
	preview: string | null;
	status: "staging" | "ready" | "error";
	error?: string;
}

export function formatFileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	if (bytes < 1024 * 1024 * 1024)
		return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
	return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function readFileAsBase64(file: globalThis.File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => {
			const dataUrl = reader.result as string;
			if (!dataUrl?.includes(",")) {
				reject(new Error(`Invalid data URL for ${file.name}`));
				return;
			}
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

export function getNativeTextArea(textAreaRef: TextAreaRef | null): HTMLTextAreaElement | null {
	return textAreaRef?.resizableTextArea?.textArea ?? null;
}
