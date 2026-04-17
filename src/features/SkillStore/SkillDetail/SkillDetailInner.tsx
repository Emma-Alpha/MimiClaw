import { Flexbox, Skeleton } from '@lobehub/ui';
import { lazy, memo, Suspense, useState } from 'react';
import Agents from './Agents';
import Header from './Header';
import Nav, { type TabKey } from './Nav';
import Overview from './Overview';

const Schema = lazy(() => import('./Schema'));

const TabSkeleton = () => (
  <Flexbox gap={16}>
    <Skeleton active paragraph={{ rows: 4 }} />
  </Flexbox>
);

const SkillDetailInner = memo(() => {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  const renderContent = () => {
    switch (activeTab) {
      case 'agents':
        return <Agents />;
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
      <Header />
      <Nav activeTab={activeTab} setActiveTab={setActiveTab} />
      {renderContent()}
    </Flexbox>
  );
});

SkillDetailInner.displayName = 'SkillDetailInner';

export default SkillDetailInner;
