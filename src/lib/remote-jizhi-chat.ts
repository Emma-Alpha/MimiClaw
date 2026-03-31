import { resolveRemoteJizhiChatUrl } from './app-env';

/** Remote 极智 Chat（Electron webview 嵌入） */
export const REMOTE_JIZHI_CHAT_URL = resolveRemoteJizhiChatUrl();
/** 小九 Messenger（Electron webview 同步） */
export const REMOTE_MESSENGER_URL = 'https://im.4399om.com/main/messenger';
/** Shared persisted partition so embedded messenger state survives reloads. */
export const REMOTE_MESSENGER_PARTITION = 'persist:jizhi-remote-chat';
