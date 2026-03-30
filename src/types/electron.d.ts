/**
 * Electron API Type Declarations
 * Types for the APIs exposed via contextBridge
 */

export interface IpcRenderer {
  invoke(channel: string, ...args: unknown[]): Promise<unknown>;
  on(channel: string, callback: (...args: unknown[]) => void): (() => void) | undefined;
  once(channel: string, callback: (...args: unknown[]) => void): void;
  off(channel: string, callback?: (...args: unknown[]) => void): void;
}

export interface ElectronAPI {
  ipcRenderer: IpcRenderer;
  openExternal: (url: string) => Promise<void>;
  captureScreenshot: () => Promise<{
    fileName: string;
    mimeType: string;
    fileSize: number;
    base64: string;
    preview: string;
  }>;
  platform: NodeJS.Platform;
  isDev: boolean;
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}
