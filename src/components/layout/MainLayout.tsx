/**
 * Main Layout Component
 * TitleBar at top, then sidebar + content below.
 */
import { Outlet, useLocation } from 'react-router-dom';
import { createStyles } from 'antd-style';
import { Sidebar } from './Sidebar/index';
import { TitleBar } from './TitleBar';
import { JizhiSessionBridge } from './JizhiSessionBridge';
import { RemoteMessengerSessionBridge } from './RemoteMessengerSessionBridge';
import { VoiceChatSessionBridge } from './VoiceChatSessionBridge';

const useStyles = createStyles(({ token, css }) => ({
  root: css`
    display: flex;
    height: 100vh;
    flex-direction: column;
    overflow: hidden;
    position: relative;
    background: ${token.colorBgLayout};
  `,
  body: css`
    display: flex;
    height: 100%;
    flex: 1;
    overflow: hidden;
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
  mainFullBleed: css`
    overflow: hidden;
    padding: 0;
  `,
  content: css`
    flex: 1;
    min-height: 0;
    position: relative;
    z-index: 10;
    display: flex;
    flex-direction: column;
  `,
}));

const FULL_BLEED_PATHS = new Set(['/jizhi-chat']);

export function MainLayout() {
  const { styles, cx } = useStyles();
  const { pathname } = useLocation();
  const fullBleed = FULL_BLEED_PATHS.has(pathname);
  const hideTitleBarManagementMenu = pathname === '/code-agent/chat'
    || pathname === '/'
    || pathname === '/chat'
    || pathname.startsWith('/chat/');

  return (
    <div className={styles.root}>
      <JizhiSessionBridge />
      <RemoteMessengerSessionBridge />
      <VoiceChatSessionBridge />
      {/* Global Title Bar for dragging */}
      <TitleBar
        hideManagementMenu={hideTitleBarManagementMenu}
      />
      <div className={styles.body}>
        <Sidebar />
        <main className={cx(styles.main, fullBleed && styles.mainFullBleed)}>
          <div className={styles.content}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
