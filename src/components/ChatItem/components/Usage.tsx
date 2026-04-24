import { ModelIcon } from '@lobehub/icons';
import { Center, Flexbox, Icon } from '@lobehub/ui';
import { createStaticStyles } from 'antd-style';
import { ClockIcon } from 'lucide-react';
import { memo } from 'react';

import type { ModelPerformance, ModelUsage } from '../types';
import TokenDetail from './UsageDetail';

const styles = createStaticStyles(({ css, cssVar }) => ({
  container: css`
    font-size: 12px;
    color: ${cssVar.colorTextQuaternary};
  `,
}));

const formatElapsed = (ms: number): string => {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
};

export interface UsageProps {
  elapsed?: number;
  model?: string;
  performance?: ModelPerformance;
  provider?: string;
  usage?: ModelUsage;
}

const Usage = memo<UsageProps>(({ model, usage, performance, elapsed }) => {
  if (!usage?.totalTokens && !model && !elapsed) return null;

  return (
    <Flexbox
      horizontal
      align={'center'}
      className={styles.container}
      gap={12}
      justify={'space-between'}
    >
      <Flexbox horizontal align={'center'} gap={8}>
        {model && (
          <Center horizontal gap={4} style={{ fontSize: 12 }}>
            <ModelIcon model={model} type={'mono'} size={14} />
            {model}
          </Center>
        )}
        {typeof elapsed === 'number' && elapsed > 0 && (
          <Center horizontal gap={2} style={{ fontSize: 12 }}>
            <Icon icon={ClockIcon} size={12} />
            {formatElapsed(elapsed)}
          </Center>
        )}
      </Flexbox>

      {!!usage?.totalTokens && (
        <TokenDetail model={model ?? ''} performance={performance} usage={usage} />
      )}
    </Flexbox>
  );
});

Usage.displayName = 'Usage';

export default Usage;
