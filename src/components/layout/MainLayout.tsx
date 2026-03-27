/**
 * Main Layout Component
 * TitleBar at top, then sidebar + content below.
 */
import { Outlet, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Sidebar } from './Sidebar';
import { TitleBar } from './TitleBar';

const FULL_BLEED_PATHS = new Set(['/jizhi-chat']);

export function MainLayout() {
  const { pathname } = useLocation();
  const fullBleed = FULL_BLEED_PATHS.has(pathname);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {/* Title bar: drag region on macOS, icon + controls on Windows */}
      <TitleBar />

      {/* Below the title bar: sidebar + content */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <Sidebar />
        <main
          className={cn(
            'flex min-h-0 min-w-0 flex-1 flex-col',
            fullBleed ? 'overflow-hidden p-0' : 'overflow-auto p-6',
          )}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
