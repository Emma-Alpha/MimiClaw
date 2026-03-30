/**
 * 嵌入远程极智 Chat（独立会话分区，便于 Cookie 等状态持久化）
 */
import { useRef, useEffect } from 'react';
import { REMOTE_JIZHI_CHAT_URL } from '@/lib/remote-jizhi-chat';

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
        /* 调整输入框样式，去掉生硬边框，增加阴影，减小宽度 */
        textarea, [contenteditable="true"], .chat-input-container {
          border-color: transparent !important;
          box-shadow: 0 4px 20px rgba(0,0,0,0.05) !important;
          background-color: #F9FAFB !important;
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
        src={REMOTE_JIZHI_CHAT_URL}
        allowpopups
        partition="persist:jizhi-remote-chat"
        style={{ display: 'flex' }}
      />
    </div>
  );
}
