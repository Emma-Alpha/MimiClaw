/**
 * Main Layout Component
 * TitleBar at top, then sidebar + content below.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { createStyles } from 'antd-style';
import { useChatHeaderInsets } from '@/lib/titlebar-safe-area';
import { clampSidebarWidth } from '@/lib/sidebar-layout';
import { useSettingsStore } from '@/stores/settings';
import { Sidebar } from './Sidebar/index';
import { TitleBar } from './TitleBar';
import { JizhiSessionBridge } from './JizhiSessionBridge';
import { RemoteMessengerSessionBridge } from './RemoteMessengerSessionBridge';
import { VoiceChatSessionBridge } from './VoiceChatSessionBridge';

type SidebarResizeState = {
  pointerId: number;
  startWidth: number;
  startX: number;
};

const useStyles = createStyles(({ token, css }) => ({
  root: css`
    display: flex;
    height: 100vh;
    flex-direction: column;
    overflow: hidden;
    position: relative;
    background: ${token.colorBgLayout};
  `,
  rootTranslucent: css`
    background: transparent;
  `,
  body: css`
    display: flex;
    height: 100%;
    flex: 1;
    overflow: hidden;
    position: relative;
  `,
  bodyTranslucent: css`
    background: transparent;
  `,
  sidebarPane: css`
    display: flex;
    height: 100%;
    min-width: 0;
    flex-shrink: 0;
    overflow: hidden;
  `,
  sidebarResizer: css`
    position: relative;
    width: 10px;
    flex: 0 0 10px;
    margin-inline: -5px;
    cursor: col-resize;
    touch-action: none;
    user-select: none;
    z-index: 20;

    &::before {
      content: '';
      position: absolute;
      inset: 0;
      background: transparent;
      transition: background 0.18s ease;
    }

    &:hover::before {
      background: color-mix(in srgb, ${token.colorText} 4%, transparent);
    }

    &:hover > div {
      opacity: 1;
    }
  `,
  sidebarResizerActive: css`
    &::before {
      background: color-mix(in srgb, ${token.colorText} 6%, transparent);
    }
  `,
  sidebarResizerLine: css`
    position: absolute;
    top: 0;
    bottom: 0;
    left: 50%;
    width: 1px;
    transform: translateX(-50%);
    background: color-mix(in srgb, ${token.colorText} 12%, transparent);
    opacity: 0;
    transition: opacity 0.18s ease, background 0.18s ease;
  `,
  sidebarResizerLineVisible: css`
    opacity: 1;
  `,
  main: css`
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    min-width: 0;
    overflow: hidden;
    position: relative;
    background: ${token.colorBgContainer};
  `,
  mainCodexChrome: css`
    background: var(--mimi-sidebar-main-surface, ${token.colorBgContainer});

    [data-theme='dark'] & {
      background: var(--mimi-sidebar-main-background, ${token.colorBgContainer});
    }
  `,
  mainFullBleed: css`
    overflow: hidden;
    padding: 0;
  `,
  content: css`
    flex: 1;
    min-height: 0;
    min-width: 0;
    position: relative;
    z-index: 10;
    display: flex;
    flex-direction: column;
  `,
}));

const FULL_BLEED_PATHS = new Set(['/chat/jizhi']);

export function MainLayout() {
  const { styles, cx } = useStyles();
  const { pathname } = useLocation();
  const sidebarCollapsed = useSettingsStore((state) => state.sidebarCollapsed);
  const translucentSidebar = useSettingsStore((state) => state.translucentSidebar);
  const rawSidebarWidth = useSettingsStore((state) => state.sidebarWidth);
  const setSidebarWidth = useSettingsStore((state) => state.setSidebarWidth);
  const [sidebarResizing, setSidebarResizing] = useState(false);
  const resizeStateRef = useRef<SidebarResizeState | null>(null);
  const sidebarWidth = clampSidebarWidth(
    rawSidebarWidth,
    typeof window === 'undefined' ? Number.POSITIVE_INFINITY : window.innerWidth,
  );
  const headerInsets = useChatHeaderInsets(sidebarCollapsed);
  const fullBleed = FULL_BLEED_PATHS.has(pathname);
  const usesInlineCollapsedSidebarToggle = pathname === '/code-agent/quick-chat'
    || pathname === '/'
    || pathname === '/chat'
    || pathname.startsWith('/chat/');
  const hideTitleBarManagementMenu = pathname === '/code-agent/quick-chat'
    || pathname === '/'
    || pathname === '/chat'
    || pathname.startsWith('/chat/');

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const syncSidebarWidth = () => {
      const nextWidth = clampSidebarWidth(rawSidebarWidth, window.innerWidth);
      if (nextWidth !== rawSidebarWidth) setSidebarWidth(nextWidth);
    };

    syncSidebarWidth();
    window.addEventListener('resize', syncSidebarWidth);

    return () => {
      window.removeEventListener('resize', syncSidebarWidth);
    };
  }, [rawSidebarWidth, setSidebarWidth]);

  useEffect(() => {
    if (!sidebarResizing || typeof document === 'undefined') return undefined;

    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    return () => {
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
    };
  }, [sidebarResizing]);

  useEffect(() => {
    if (!sidebarCollapsed) return;
    resizeStateRef.current = null;

    const frameId = window.requestAnimationFrame(() => {
      setSidebarResizing(false);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [sidebarCollapsed]);

  const finishSidebarResize = useCallback(
    (target: HTMLDivElement | null, pointerId: number) => {
      const resizeState = resizeStateRef.current;
      if (resizeState == null || resizeState.pointerId !== pointerId) return;

      resizeStateRef.current = null;
      if (target?.hasPointerCapture?.(pointerId)) {
        target.releasePointerCapture?.(pointerId);
      }
      setSidebarResizing(false);
    },
    [],
  );

  const handleSidebarResizeStart = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return;

      resizeStateRef.current = {
        pointerId: event.pointerId,
        startWidth: sidebarWidth,
        startX: event.clientX,
      };
      event.currentTarget.setPointerCapture?.(event.pointerId);
      setSidebarResizing(true);
      event.preventDefault();
    },
    [sidebarWidth],
  );

  const handleSidebarResizeMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const resizeState = resizeStateRef.current;
      if (resizeState == null || resizeState.pointerId !== event.pointerId) return;

      const nextWidth = clampSidebarWidth(
        resizeState.startWidth + event.clientX - resizeState.startX,
        window.innerWidth,
      );
      if (nextWidth !== rawSidebarWidth) setSidebarWidth(nextWidth);
    },
    [rawSidebarWidth, setSidebarWidth],
  );

  const handleSidebarResizeEnd = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      finishSidebarResize(event.currentTarget, event.pointerId);
    },
    [finishSidebarResize],
  );
  const contentSafeAreaStyle = useMemo(
    () =>
      ({
        '--mimi-content-safe-end': `${headerInsets.end}px`,
        '--mimi-content-safe-start': `${headerInsets.start}px`,
      }) as CSSProperties,
    [headerInsets.end, headerInsets.start],
  );

  return (
    <div className={cx(styles.root, translucentSidebar && styles.rootTranslucent)}>
      <JizhiSessionBridge />
      <RemoteMessengerSessionBridge />
      <VoiceChatSessionBridge />
      {/* Global Title Bar for dragging */}
      <TitleBar
        hideManagementMenu={hideTitleBarManagementMenu}
        hideSidebarToggle={usesInlineCollapsedSidebarToggle && sidebarCollapsed}
      />
      <div className={cx(styles.body, translucentSidebar && styles.bodyTranslucent)}>
        {!sidebarCollapsed && (
          <>
            <div className={styles.sidebarPane} style={{ width: sidebarWidth }}>
              <Sidebar />
            </div>
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize sidebar"
              className={cx(styles.sidebarResizer, sidebarResizing && styles.sidebarResizerActive)}
              onPointerDown={handleSidebarResizeStart}
              onPointerMove={handleSidebarResizeMove}
              onPointerUp={handleSidebarResizeEnd}
              onPointerCancel={handleSidebarResizeEnd}
            >
              <div
                className={cx(
                  styles.sidebarResizerLine,
                  sidebarResizing && styles.sidebarResizerLineVisible,
                )}
              />
            </div>
          </>
        )}
        <main
          className={cx(
            styles.main,
            translucentSidebar && styles.mainCodexChrome,
            fullBleed && styles.mainFullBleed,
          )}
          style={contentSafeAreaStyle}
        >
          <div className={styles.content}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
