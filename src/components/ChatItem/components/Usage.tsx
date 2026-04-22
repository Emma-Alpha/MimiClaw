import { ModelIcon } from '@lobehub/icons';
import { Center, Flexbox } from '@lobehub/ui';
import { createStaticStyles } from 'antd-style';
import { memo } from 'react';

import type { ModelPerformance, ModelUsage } from '../types';
import TokenDetail from './UsageDetail';

const styles = createStaticStyles(({ css, cssVar }) => ({
  container: css`
    font-size: 12px;
    color: ${cssVar.colorTextQuaternary};
  `,
}));

export interface UsageProps {
  model?: string;
  performance?: ModelPerformance;
  provider?: string;
  usage?: ModelUsage;
}

const Usage = memo<UsageProps>(({ model, usage, performance }) => {
  if (!usage?.totalTokens && !model) return null;

  return (
    <Flexbox
      horizontal
      align={'center'}
      className={styles.container}
      gap={12}
      justify={'space-between'}
    >
      {model && (
        <Center horizontal gap={4} style={{ fontSize: 12 }}>
          <ModelIcon model={model} type={'mono'} size={14} />
          {model}
        </Center>
      )}

      {!!usage?.totalTokens && (
        <TokenDetail model={model ?? ''} performance={performance} usage={usage} />
      )}
    </Flexbox>
  );
});

Usage.displayName = 'Usage';

export default Usage;
