import { createHostEventSource } from './host-api';

let eventSource: EventSource | null = null;

const HOST_EVENT_TO_IPC_CHANNEL: Record<string, string> = {
  'gateway:status': 'gateway:status-changed',
  'gateway:error': 'gateway:error',
  'gateway:notification': 'gateway:notification',
  'gateway:chat-message': 'gateway:chat-message',
  'chat:stream-event': 'chat:stream-event',
  'gateway:channel-status': 'gateway:channel-status',
  'gateway:exit': 'gateway:exit',
  'oauth:code': 'oauth:code',
  'oauth:success': 'oauth:success',
  'oauth:error': 'oauth:error',
  'cloud:auth-success': 'cloud:auth-success',
  'cloud:auth-error': 'cloud:auth-error',
  'code-agent:status': 'code-agent:status',
  'code-agent:error': 'code-agent:error',
  'code-agent:exit': 'code-agent:exit',
  'code-agent:run-started': 'code-agent:run-started',
  'code-agent:run-completed': 'code-agent:run-completed',
  'code-agent:run-failed': 'code-agent:run-failed',
  'code-agent:token': 'code-agent:token',
  'code-agent:activity': 'code-agent:activity',
  'code-agent:tool-result': 'code-agent:tool-result',
  'code-agent:sdk-message': 'code-agent:sdk-message',
  'code-agent:permission-request': 'code-agent:permission-request',
  'thread-terminal:data': 'thread-terminal:data',
  'thread-terminal:exit': 'thread-terminal:exit',
  // Browser-use events
  'browser-use:status': 'browser-use:status-changed',
  'browser-use:cursor': 'browser-use:cursor',
  'browser-use:error': 'browser-use:error',
  // Inspector events
  'inspector:element-hovered': 'inspector:element-hovered',
  'inspector:element-selected': 'inspector:element-selected',
  'inspector:mode-changed': 'inspector:mode-changed',
  'inspector:area-screenshot': 'inspector:area-screenshot',
  'channel:whatsapp-qr': 'channel:whatsapp-qr',
  'channel:whatsapp-success': 'channel:whatsapp-success',
  'channel:whatsapp-error': 'channel:whatsapp-error',
  'channel:wechat-qr': 'channel:wechat-qr',
  'channel:wechat-success': 'channel:wechat-success',
  'channel:wechat-error': 'channel:wechat-error',
};

function getEventSource(): EventSource {
  if (!eventSource) {
    eventSource = createHostEventSource();
  }
  return eventSource;
}

function allowSseFallback(): boolean {
  try {
    return window.localStorage.getItem('mimiclaw:allow-sse-fallback') === '1';
  } catch {
    return false;
  }
}

export function subscribeHostEvent<T = unknown>(
  eventName: string,
  handler: (payload: T) => void,
): () => void {
  const ipc = window.electron?.ipcRenderer;
  const ipcChannel = HOST_EVENT_TO_IPC_CHANNEL[eventName];
  if (ipcChannel && ipc?.on && ipc?.off) {
    const listener = (payload: unknown) => {
      handler(payload as T);
    };
    // The preload wraps `listener` into an internal subscription and returns
    // a cleanup that removes the wrapper. We must use that cleanup — calling
    // ipc.off(channel, listener) would try to remove the original (unwrapped)
    // function which was never registered, so the listener would leak.
    const cleanup = ipc.on(ipcChannel, listener) as (() => void) | undefined;
    if (typeof cleanup === 'function') {
      return cleanup;
    }
    return () => {
      ipc.off(ipcChannel, listener);
    };
  }

  if (!allowSseFallback()) {
    console.warn(`[host-events] no IPC mapping for event "${eventName}", SSE fallback disabled`);
    return () => {};
  }

  const source = getEventSource();
  const listener = (event: Event) => {
    const payload = JSON.parse((event as MessageEvent).data) as T;
    handler(payload);
  };
  source.addEventListener(eventName, listener);
  return () => {
    source.removeEventListener(eventName, listener);
  };
}
