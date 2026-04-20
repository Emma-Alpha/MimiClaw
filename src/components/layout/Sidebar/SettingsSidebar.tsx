import { Flexbox } from '@lobehub/ui';
import { createStyles } from 'antd-style';
import { Bot, Cpu, Info, Network, Palette, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';

import { SidebarUpdateAction } from '@/components/update/SidebarUpdateAction';
import { useSettingsStore } from '@/stores/settings';
import { NavItem, SideBarHeaderLayout, SideBarLayout } from '@/features/NavPanel';
import { getSidebarChromeCss } from '@/components/layout/sidebar-chrome';

const useStyles = createStyles(({ token, css }) => ({
  aside: css`
    ${getSidebarChromeCss(token)}

    display: flex;
    width: 100%;
    min-width: 0;
    flex-shrink: 0;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
  `,
  topBar: css`
    container: sidebar-topbar / inline-size;
    height: ${window.electron?.platform === 'darwin' ? '40px' : '2.75rem'};
    width: 100%;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 8px;
    padding-inline: 8px;
    padding-inline-start: ${window.electron?.platform === 'darwin' ? '116px' : '8px'};
  `,
}));

export function SettingsSidebar() {
  const { styles } = useStyles();
  const { t } = useTranslation('settings');
  const [searchParams, setSearchParams] = useSearchParams();
  const devModeUnlocked = useSettingsStore((s) => s.devModeUnlocked);
  const translucentSidebar = useSettingsStore((s) => s.translucentSidebar);

  const activeSection = searchParams.get('section') ?? 'appearance';

  const navItems = [
    { key: 'appearance', label: t('appearance.title'), icon: Palette },
    { key: 'voicePet',   label: t('voicePet.title'),   icon: Bot      },
    { key: 'gateway',    label: t('gateway.title'),    icon: Network  },
    { key: 'updates',    label: t('updates.title'),    icon: RefreshCw },
    ...(devModeUnlocked ? [{ key: 'developer', label: t('developer.title'), icon: Cpu }] : []),
    { key: 'about',      label: t('about.title'),      icon: Info     },
  ];

  return (
    <aside
      className={styles.aside}
      data-translucent-sidebar={translucentSidebar ? 'true' : 'false'}
    >
      <div className={styles.topBar}>
        <SidebarUpdateAction />
      </div>
      <SideBarLayout
        header={
          <SideBarHeaderLayout
            left={t('title', { defaultValue: '设置' })}
            showBack
            backTo="/"
            preferHistoryBack
            showTogglePanelButton={false}
          />
        }
        body={
          <Flexbox gap={2} paddingInline={8} paddingBlock={4}>
            {navItems.map(({ key, label, icon }) => (
              <NavItem
                key={key}
                icon={icon}
                title={label}
                active={activeSection === key}
                onClick={() =>
                  setSearchParams(
                    (prev) => {
                      const next = new URLSearchParams(prev);
                      next.set('section', key);
                      return next;
                    },
                    { replace: true },
                  )
                }
              />
            ))}
          </Flexbox>
        }
      />
    </aside>
  );
}
