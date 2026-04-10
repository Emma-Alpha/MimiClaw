/**
 * Main Layout Component
 * TitleBar at top, then sidebar + content below.
 */
import { Outlet, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Sidebar } from './Sidebar';
import { TitleBar } from './TitleBar';
import { JizhiSessionBridge } from './JizhiSessionBridge';
import { RemoteMessengerSessionBridge } from './RemoteMessengerSessionBridge';
import { VoiceChatSessionBridge } from './VoiceChatSessionBridge';

const FULL_BLEED_PATHS = new Set(['/jizhi-chat']);

export function MainLayout() {
  const { pathname } = useLocation();
  const fullBleed = FULL_BLEED_PATHS.has(pathname);
  const hideTitleBarManagementMenu = pathname === '/code-agent/chat';

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background relative">
      <JizhiSessionBridge />
      <RemoteMessengerSessionBridge />
      <VoiceChatSessionBridge />
      {/* Global Title Bar for dragging */}
      <TitleBar hideManagementMenu={hideTitleBarManagementMenu} />
      <div className="flex h-full flex-1 overflow-hidden">
        <Sidebar />
        <main
          className={cn(
            'flex min-h-0 min-w-0 flex-1 flex-col relative',
            fullBleed ? 'overflow-hidden p-0' : 'overflow-hidden',
          )}
        >
          <div className="flex-1 min-h-0 relative z-10 flex flex-col">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
