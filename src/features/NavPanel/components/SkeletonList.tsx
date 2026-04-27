import { type FlexboxProps } from '@lobehub/ui';
import { Flexbox, Skeleton } from '@lobehub/ui';
import { cssVar } from 'antd-style';
import { memo } from 'react';

export const SkeletonItem = memo<{ avatarSize?: number } & Omit<FlexboxProps, 'children'>>(
  ({ padding = 8, height = 30, style, avatarSize = 24, ...rest }) => {
    return (
      <Flexbox
        horizontal
        align={'center'}
        flex={1}
        gap={6}
        height={height}
        padding={padding}
        style={style}
        {...rest}
      >
        <Skeleton.Button
          size={'small'}
          style={{
            borderRadius: cssVar.borderRadius,
            height: avatarSize,
            maxHeight: avatarSize,
            maxWidth: avatarSize,
            minWidth: avatarSize,
          }}
        />
        <Flexbox flex={1} height={16}>
          <Skeleton.Button
            active
            block
            size={'small'}
            style={{
              borderRadius: cssVar.borderRadius,
              height: 16,
              margin: 0,
              maxHeight: 16,
              opacity: 0.5,
              padding: 0,
            }}
          />
        </Flexbox>
      </Flexbox>
    );
  },
);

export const SkeletonList = memo<{ rows?: number } & Omit<FlexboxProps, 'children'>>(
  ({ rows = 3, ...rest }) => {
    return (
      <Flexbox gap={2} {...rest}>
        {Array.from({ length: rows }).map((_, i) => (
          <SkeletonItem key={i} />
        ))}
      </Flexbox>
    );
  },
);

export default SkeletonList;
