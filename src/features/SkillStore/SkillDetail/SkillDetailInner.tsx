import { Flexbox, Skeleton } from '@lobehub/ui';
import { lazy, memo, Suspense, useState } from 'react';
import Agents from './Agents';
import { useDetailContext } from './DetailContext';
import Header from './Header';
import Nav, { type TabKey } from './Nav';
import Overview from './Overview';
import { styles } from './styles';

const Schema = lazy(() => import('./Schema'));

const TabSkeleton = () => (
  <Flexbox gap={16}>
    <Skeleton active paragraph={{ rows: 4 }} />
  </Flexbox>
);

const SkillDetailInner = memo(() => {
  const { isInstalled } = useDetailContext();
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const resolvedActiveTab = !isInstalled && activeTab === 'agents' ? 'overview' : activeTab;

  const renderContent = () => {
    switch (resolvedActiveTab) {
      case 'agents':
        return isInstalled ? <Agents /> : <Overview />;
      case 'schema':
        return (
          <Suspense fallback={<TabSkeleton />}>
            <Schema />
          </Suspense>
        );
      case 'overview':
      default:
        return <Overview />;
    }
  };

  return (
    <Flexbox gap={16}>
      <div className={styles.stickyTop}>
        <Header />
        <Nav activeTab={resolvedActiveTab} setActiveTab={setActiveTab} showAgentsTab={isInstalled} />
      </div>
      <div className={styles.tabContent}>{renderContent()}</div>
    </Flexbox>
  );
});

SkillDetailInner.displayName = 'SkillDetailInner';

export default SkillDetailInner;
