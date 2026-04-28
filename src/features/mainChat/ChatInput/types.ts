export type ChatInputActionKey =
  | 'model'
  | 'thinking'
  | 'search'
  | 'memory'
  | 'fileUpload'
  | 'tools'
  | 'typo'
  | 'params'
  | 'mainToken'
  | 'portalToken'
  | 'promptTransform'
  | 'screenshot'
  | 'stt'
  | 'agentMode'
  | 'clear'
  | 'history'
  | 'mention'
  | 'saveTopic';

export interface MentionItem {
  id: string;
  /**
   * Mention text inserted into the editor when the item is selected.
   * Must be a plain string. Prefix "@" is added automatically if missing.
   */
  label: string;
  /** Secondary text used for fuzzy matching. */
  description?: string;
  /**
   * Optional short string used for the dropdown row's main label.
   * Defaults to `label` when omitted. This MUST be a plain string so the
   * editor's fuse.js client-side filter can search it.
   */
  displayLabel?: string;
  /** Optional icon rendered at the start of the menu row. */
  icon?: import('react').ReactNode;
  /** Optional trailing node rendered on the right of the menu row. */
  extra?: import('react').ReactNode;
  /**
   * Type hint used by the inserted pill to pick an icon. The editor
   * serializes MentionNode metadata, so callers can drive visual state
   * (e.g. folder vs. file) from here without shipping React nodes.
   */
  kind?: 'folder' | 'file' | 'agent' | string;
  /** Called when the user confirms this mention in the editor */
  onSelect?: () => void;
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

export interface MentionMeta {
  label: string;
  metadata?: Record<string, unknown>;
}

export interface ChatInputSendPayload {
  clearAttachments: () => void;
  clearContent: () => void;
  getMarkdownContent: () => string;
  getEditorData: () => Record<string, unknown> | null;
  getMentions: () => MentionMeta[];
  attachments: ChatInputAttachment[];
}

export interface ChatInputEditorApi {
  focus: () => void;
  clearContent: () => void;
  getMarkdownContent: () => string;
  getEditorData: () => Record<string, unknown> | null;
  getMentions: () => MentionMeta[];
  setMarkdownContent: (value: string) => void;
  insertTextAtCursor: (value: string) => void;
  setInstance: (instance: ChatInputEditorInstance | null) => void;
}
