/**
 * Preload Script
 * Exposes safe APIs to the renderer process via contextBridge
 */
import { contextBridge, ipcRenderer, webUtils } from 'electron';

/**
 * IPC renderer methods exposed to the renderer process
 */
const electronAPI = {
  /**
   * IPC invoke (request-response pattern)
   */
  ipcRenderer: {
    invoke: (channel: string, ...args: unknown[]) => {
      const validChannels = [
        // Gateway
        'gateway:status',
        'gateway:isConnected',
        'gateway:start',
        'gateway:stop',
        'gateway:restart',
        'gateway:rpc',
        'gateway:httpProxy',
        'hostapi:fetch',
        'gateway:health',
        'gateway:getControlUiUrl',
        // OpenClaw
        'openclaw:status',
        'openclaw:isReady',
        // Shell
        'shell:openExternal',
        'shell:showItemInFolder',
        'shell:openPath',
        'shell:openPathAtLine',
        'screenshot:captureSnipaste',
        // Dialog
        'dialog:open',
        'dialog:save',
        'dialog:message',
        // App
        'app:version',
        'app:name',
        'app:getPath',
        'app:platform',
        'app:quit',
        'app:relaunch',
        'app:request',
        'tray-runtime:getState',
        'tray-runtime:openThread',
        // Window controls
        'window:minimize',
        'window:maximize',
        'window:close',
        'window:isMaximized',
        'pet:getRuntimeState',
        'pet:setInputActivity',
        'pet:setUiActivity',
        'pet:setBubbleVisible',
        'pet:updateBubbleBounds',
        'pet:recordingCommand',
        'pet:asrSessionStart',
        'pet:asrSessionChunk',
        'pet:asrSessionFinish',
        'pet:asrSessionCancel',
        'pet:showContextMenu',
        'pet:pushTerminalLine',
        'pet:setIgnoreMouseEvents',
        'pet:move',
        'pet:toggleQuickChat',
        'pet:closeQuickChat',
        'pet:openMainWindow',
        'pet:openCodeAssistant',
        'pet:openQuickChatWithMessage',
        'pet:openQuickChatWithPayload',
        'pet:consumeQuickChatInitialMessage',
        'pet:syncCompanionProgress',
        'voice:openDialog',
        'voice:closeDialog',
        'voice:setDialogState',
        'voice:sessionStart',
        'voice:appendAudio',
        'voice:commitTurn',
        'voice:cancelResponse',
        'voice:endSession',
        // Settings
        'settings:get',
        'settings:set',
        'settings:setMany',
        'settings:getAll',
        'settings:reset',
        'usage:recentTokenHistory',
        // Update
        'update:status',
        'update:version',
        'update:check',
        'update:download',
        'update:install',
        'update:setChannel',
        'update:setAutoDownload',
        'update:cancelAutoInstall',
        'update:fetchPolicy',
        // Env
        'env:getConfig',
        'env:setApiKey',
        'env:deleteApiKey',
        // Provider
        'provider:list',
        'provider:get',
        'provider:save',
        'provider:delete',
        'provider:setApiKey',
        'provider:updateWithKey',
        'provider:deleteApiKey',
        'provider:hasApiKey',
        'provider:getApiKey',
        'provider:setDefault',
        'provider:getDefault',
        'provider:validateKey',
        'provider:requestOAuth',
        'provider:cancelOAuth',
        // Cron
        'cron:list',
        'cron:create',
        'cron:update',
        'cron:delete',
        'cron:toggle',
        'cron:trigger',
        // Channel Config
        'channel:saveConfig',
        'channel:getConfig',
        'channel:getFormValues',
        'channel:deleteConfig',
        'channel:listConfigured',
        'channel:setEnabled',
        'channel:validate',
        'channel:validate',
        'channel:validateCredentials',
        // WhatsApp
        'channel:requestWhatsAppQr',
        'channel:cancelWhatsAppQr',
        // UV
        'uv:check',
        'uv:install-all',
        // Skill config (direct file access)
        'skill:updateConfig',
        'skill:getConfig',
        'skill:getAllConfigs',
        // Logs
        'log:getRecent',
        'log:readFile',
        'log:getFilePath',
        'log:getDir',
        'log:listFiles',
        // File staging & media
        'file:stage',
        'file:stageBuffer',
        'media:getThumbnails',
        'media:saveImage',
        // Chat send with media (reads staged files in main process)
        'chat:sendWithMedia',
        // Session management
        'session:delete',
        // OpenClaw extras
        'openclaw:getDir',
        'openclaw:getConfigDir',
        'openclaw:getSkillsDir',
        'openclaw:getCliCommand',
        'code-agent:respond-permission',
        'code-agent:respond-elicitation',
        'thread-terminal:list-shells',
        'thread-terminal:start',
        'thread-terminal:input',
        'thread-terminal:resize',
        'thread-terminal:close',
      ];

      if (validChannels.includes(channel)) {
        return ipcRenderer.invoke(channel, ...args);
      }

      throw new Error(`Invalid IPC channel: ${channel}`);
    },

    /**
     * Listen for events from main process
     */
    on: (channel: string, callback: (...args: unknown[]) => void) => {
      const validChannels = [
        'gateway:status-changed',
        'gateway:message',
        'gateway:notification',
        'gateway:channel-status',
        'gateway:chat-message',
        'channel:whatsapp-qr',
        'channel:whatsapp-success',
        'channel:whatsapp-error',
        'channel:wechat-qr',
        'channel:wechat-success',
        'channel:wechat-error',
        'gateway:exit',
        'gateway:error',
        'navigate',
        'update:status-changed',
        'update:checking',
        'update:available',
        'update:not-available',
        'update:progress',
        'update:downloaded',
        'update:error',
        'update:auto-install-countdown',
        'cron:updated',
        'oauth:code',
        'oauth:success',
        'oauth:error',
        'cloud:auth-success',
        'cloud:auth-error',
        'jizhi:stream',
        'code-agent:status',
        'code-agent:error',
        'code-agent:exit',
        'code-agent:run-started',
        'code-agent:run-completed',
        'code-agent:run-failed',
        'code-agent:token',
        'code-agent:activity',
        'code-agent:tool-result',
        'code-agent:permission-request',
        'code-agent:sdk-message',
        'openclaw:cli-installed',
        'pet:settings-updated',
        'pet:runtime-state',
        'pet:recording-command',
        'pet:asr-event',
        'pet:clipboard-changed',
        'voice:realtime-event',
        'quick-chat:initial-message',
        'tray-runtime:state',
        'screenshot:capture',
        'skills:runtime-progress',
        'thread-terminal:data',
        'thread-terminal:exit',
      ];

      if (validChannels.includes(channel)) {
        // Wrap the callback to strip the event
        const subscription = (_event: Electron.IpcRendererEvent, ...args: unknown[]) => {
          callback(...args);
        };
        ipcRenderer.on(channel, subscription);

        // Return unsubscribe function
        return () => {
          ipcRenderer.removeListener(channel, subscription);
        };
      }

      throw new Error(`Invalid IPC channel: ${channel}`);
    },

    /**
     * Listen for a single event from main process
     */
    once: (channel: string, callback: (...args: unknown[]) => void) => {
      const validChannels = [
        'gateway:status-changed',
        'gateway:message',
        'gateway:notification',
        'gateway:channel-status',
        'gateway:chat-message',
        'channel:whatsapp-qr',
        'channel:whatsapp-success',
        'channel:whatsapp-error',
        'channel:wechat-qr',
        'channel:wechat-success',
        'channel:wechat-error',
        'gateway:exit',
        'gateway:error',
        'navigate',
        'update:status-changed',
        'update:checking',
        'update:available',
        'update:not-available',
        'update:progress',
        'update:downloaded',
        'update:error',
        'update:auto-install-countdown',
        'oauth:code',
        'oauth:success',
        'oauth:error',
        'cloud:auth-success',
        'cloud:auth-error',
        'jizhi:stream',
        'code-agent:status',
        'code-agent:error',
        'code-agent:exit',
        'code-agent:run-started',
        'code-agent:run-completed',
        'code-agent:run-failed',
        'code-agent:token',
        'code-agent:activity',
        'code-agent:tool-result',
        'code-agent:permission-request',
        'code-agent:sdk-message',
        'pet:settings-updated',
        'pet:runtime-state',
        'pet:asr-event',
        'tray-runtime:state',
        'screenshot:capture',
        'skills:runtime-progress',
        'thread-terminal:data',
        'thread-terminal:exit',
      ];

      if (validChannels.includes(channel)) {
        ipcRenderer.once(channel, (_event, ...args) => callback(...args));
        return;
      }

      throw new Error(`Invalid IPC channel: ${channel}`);
    },

    /**
     * Remove all listeners for a channel
     */
    off: (channel: string, callback?: (...args: unknown[]) => void) => {
      if (callback) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ipcRenderer.removeListener(channel, callback as any);
      } else {
        ipcRenderer.removeAllListeners(channel);
      }
    },
  },

  /**
   * Open external URL in default browser
   */
  openExternal: (url: string) => {
    return ipcRenderer.invoke('shell:openExternal', url);
  },

  /**
   * Capture a screenshot via Snipaste and return the image result to the renderer.
   */
  captureScreenshot: async () => {
    return ipcRenderer.invoke('screenshot:captureSnipaste');
  },

  /**
   * Resolve absolute filesystem path from a dropped File object.
   * Returns empty string when unavailable.
   */
  getPathForFile: (file: unknown): string => {
    try {
      return webUtils.getPathForFile(file as never);
    } catch {
      return '';
    }
  },

  /**
   * Get current platform
   */
  platform: process.platform,

  /**
   * Check if running in development
   */
  isDev: process.env.NODE_ENV === 'development' || !!process.env.VITE_DEV_SERVER_URL,
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electron', electronAPI);

// Type declarations for the renderer process
export type ElectronAPI = typeof electronAPI;
