import { Flexbox, ScrollShadow, TooltipGroup } from '@lobehub/ui';
import { type ReactNode } from 'react';
import { memo, Suspense } from 'react';

import { SkeletonItem, SkeletonList } from './components/SkeletonList';

interface SidebarLayoutProps {
  body?: ReactNode;
  header?: ReactNode;
}

const SideBarLayout = memo<SidebarLayoutProps>(({ header, body }) => {
  return (
    <Flexbox gap={8} style={{ height: '100%', overflow: 'hidden', paddingBottom: 6 }}>
      <Suspense fallback={<SkeletonItem height={44} style={{ marginTop: 8 }} />}>
        <div style={{ paddingInline: 6 }}>{header}</div>
      </Suspense>
      <ScrollShadow
        size={6}
        style={{
          height: '100%',
          paddingInline: 6,
        }}
      >
        <TooltipGroup>
          <Suspense fallback={<SkeletonList paddingBlock={8} />}>{body}</Suspense>
        </TooltipGroup>
      </ScrollShadow>
    </Flexbox>
  );
});

export default SideBarLayout;
