/**
 * 嵌入远程极智 Chat（独立会话分区，便于 Cookie 等状态持久化）
 */
import { REMOTE_JIZHI_CHAT_URL } from '@/lib/remote-jizhi-chat';

export function RemoteJizhiChat() {
  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col bg-background">
      <webview
        className="min-h-0 flex-1 w-full border-0"
        src={REMOTE_JIZHI_CHAT_URL}
        allowpopups
        partition="persist:jizhi-remote-chat"
        style={{ display: 'flex' }}
      />
    </div>
  );
}
