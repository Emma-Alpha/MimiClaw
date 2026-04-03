/**
 * 嵌入小九 Messenger（共享会话分区，便于 Cookie 等状态持久化）
 */
import { useRef, useEffect } from 'react';
import {
  REMOTE_MESSENGER_URL,
  REMOTE_MESSENGER_PARTITION,
} from '@/lib/remote-jizhi-chat';

type WebviewElement = HTMLElement & {
  insertCSS: (css: string) => Promise<string>;
};

export function RemoteJizhiChat() {
  const webviewRef = useRef<WebviewElement>(null);

  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview) return;

    const handleDomReady = () => {
      // 注入 CSS 隐藏不必要的边框，修改背景色，让它与 Electron 外壳更融合
      webview.insertCSS(`
        /* 隐藏左侧导航栏的右边框 */
        .border-r, [class*="border-r-"] {
          border-right-color: transparent !important;
        }
        /* 统一输入框样式：无边框，轻微阴影，圆角 */
        .chat-input-container, [class*="inputArea"], [class*="chatInput"] {
          border-color: transparent !important;
          border-radius: 16px !important;
          box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02) !important;
        }
        /* 限制输入框最大宽度并居中，减小高度 */
        .chat-input-container, [class*="inputArea"] {
          max-width: 800px !important;
          margin-left: auto !important;
          margin-right: auto !important;
        }
        textarea {
          min-height: 48px !important;
        }
        /* 消息气泡样式优化 */
        [class*="message-bubble"], [class*="MessageBubble"] {
          background-color: #F3F4F6 !important;
          border-radius: 12px !important;
          padding: 12px 16px !important;
          box-shadow: 0 2px 8px rgba(0,0,0,0.02) !important;
        }
        /* 用户消息气泡通常在右侧，给个不同的颜色 */
        [class*="message-user"] [class*="message-bubble"] {
          background-color: #E5E7EB !important;
        }
        /* 调整中间栏背景色 */
        aside, .sidebar-container, [class*="sidebar"] {
          background-color: #F9FAFB !important;
        }
      `);
    };

    webview.addEventListener('dom-ready', handleDomReady);
    return () => {
      webview.removeEventListener('dom-ready', handleDomReady);
    };
  }, []);

  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col bg-background">
      <webview
        ref={webviewRef}
        className="min-h-0 flex-1 w-full border-0"
        src={REMOTE_MESSENGER_URL}
        allowpopups
        partition={REMOTE_MESSENGER_PARTITION}
        style={{ display: 'flex' }}
      />
    </div>
  );
}
