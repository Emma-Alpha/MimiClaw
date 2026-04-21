export type ChatInputActionKey =
  | 'model'
  | 'search'
  | 'memory'
  | 'fileUpload'
  | 'tools'
  | 'typo'
  | 'params'
  | 'mainToken'
  | 'portalToken'
  | 'promptTransform'
  | 'stt'
  | 'agentMode'
  | 'clear'
  | 'history'
  | 'mention'
  | 'saveTopic';

export interface MentionItem {
  id: string;
  label: string;
  description?: string;
}

export interface ChatInputAttachment {
  id: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  stagedPath: string;
  preview: string | null;
  status: 'staging' | 'ready' | 'error';
  error?: string;
}

export function readFileAsBase64(file: globalThis.File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      if (!dataUrl?.includes(',')) {
        reject(new Error(`Invalid data URL for ${file.name}`));
        return;
      }
      const base64 = dataUrl.split(',')[1];
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

export interface ChatInputEditorData {
  markdown: string;
}

import type { IEditor } from '@lobehub/editor';

export interface ChatInputTextareaAdapter {
  focus?: () => void;
  setValue?: (value: string) => void;
}

export type ChatInputEditorInstance = IEditor | HTMLTextAreaElement | ChatInputTextareaAdapter;

export interface ChatInputSendPayload {
  clearAttachments: () => void;
  clearContent: () => void;
  getMarkdownContent: () => string;
  getEditorData: () => Record<string, unknown> | null;
  attachments: ChatInputAttachment[];
}

export interface ChatInputEditorApi {
  focus: () => void;
  clearContent: () => void;
  getMarkdownContent: () => string;
  getEditorData: () => Record<string, unknown> | null;
  setMarkdownContent: (value: string) => void;
  insertTextAtCursor: (value: string) => void;
  setInstance: (instance: ChatInputEditorInstance | null) => void;
}
