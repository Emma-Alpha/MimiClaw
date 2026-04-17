import { Flexbox, Icon, Tabs } from '@lobehub/ui';
import { createStaticStyles } from 'antd-style';
import { BookOpenIcon, BotIcon, CodeIcon } from 'lucide-react';
import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

const navStyles = createStaticStyles(({ css, cssVar }) => ({
  nav: css`
    border-block-end: 1px solid ${cssVar.colorBorder};
  `,
  tabs: css`
    overflow-x: auto;
    flex: 1;
    min-width: 0;
    scrollbar-width: none;

    &::-webkit-scrollbar {
      display: none;
    }
  `,
}));

export type TabKey = 'overview' | 'schema' | 'agents';

interface NavProps {
  activeTab: TabKey;
  setActiveTab: (tab: TabKey) => void;
}

const Nav = memo<NavProps>(({ activeTab, setActiveTab }) => {
  const { t } = useTranslation('skills');

  const items = useMemo(
    () => [
      {
        icon: <Icon icon={BookOpenIcon} size={16} />,
        key: 'overview',
        label: t('detail.tabs.overview', { defaultValue: '概览' }),
      },
      {
        icon: <Icon icon={CodeIcon} size={16} />,
        key: 'schema',
        label: t('detail.tabs.schema', { defaultValue: '技能功能' }),
      },
      {
        icon: <Icon icon={BotIcon} size={16} />,
        key: 'agents',
        label: t('detail.tabs.agents', { defaultValue: '使用该技能的助理' }),
      },
    ],
    [t],
  );

  return (
    <Flexbox className={navStyles.nav}>
      <Tabs
        activeKey={activeTab}
        className={navStyles.tabs}
        items={items}
        onChange={(key) => setActiveTab(key as TabKey)}
      />
    </Flexbox>
  );
});

Nav.displayName = 'Nav';

export default Nav;
