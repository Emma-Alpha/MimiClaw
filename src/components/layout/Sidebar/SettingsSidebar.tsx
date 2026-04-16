import { Flexbox } from '@lobehub/ui';
import { createStyles } from 'antd-style';
import { Cpu, Info, Network, Palette, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';

import { useSettingsStore } from '@/stores/settings';
import { NavItem, SideBarHeaderLayout, SideBarLayout } from '@/features/NavPanel';

const useStyles = createStyles(({ token, css }) => ({
  aside: css`
    display: flex;
    width: 248px;
    flex-shrink: 0;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
    border-right: 1px solid ${token.colorBorderSecondary};
    background: ${token.colorBgLayout};
  `,
  topSpacer: css`
    height: ${window.electron?.platform === 'darwin' ? '40px' : '2.75rem'};
    width: 100%;
    flex-shrink: 0;
  `,
}));

export function SettingsSidebar() {
  const { styles } = useStyles();
  const { t } = useTranslation('settings');
  const [searchParams, setSearchParams] = useSearchParams();
  const devModeUnlocked = useSettingsStore((s) => s.devModeUnlocked);

  const activeSection = searchParams.get('section') ?? 'appearance';

  const navItems = [
    { key: 'appearance', label: t('appearance.title'), icon: Palette },
    { key: 'gateway',    label: t('gateway.title'),    icon: Network  },
    { key: 'updates',    label: t('updates.title'),    icon: RefreshCw },
    ...(devModeUnlocked ? [{ key: 'developer', label: t('developer.title'), icon: Cpu }] : []),
    { key: 'about',      label: t('about.title'),      icon: Info     },
  ];

  return (
    <aside className={styles.aside}>
      <div className={styles.topSpacer} />
      <SideBarLayout
        header={
          <SideBarHeaderLayout
            left={t('title', { defaultValue: '设置' })}
            showBack
            backTo="/"
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
                onClick={() => setSearchParams({ section: key })}
              />
            ))}
          </Flexbox>
        }
      />
    </aside>
  );
}
