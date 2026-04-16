/**
 * Separator Component
 * antd-style based, same API as shadcn/ui separator
 */
import * as React from 'react';
import * as SeparatorPrimitive from '@radix-ui/react-separator';
import { createStyles } from 'antd-style';
import { cn } from '@/lib/utils';

const useStyles = createStyles(({ css, token }) => ({
  horizontal: css`
    flex-shrink: 0;
    background: ${token.colorBorderSecondary};
    height: 1px;
    width: 100%;
  `,
  vertical: css`
    flex-shrink: 0;
    background: ${token.colorBorderSecondary};
    height: 100%;
    width: 1px;
  `,
}));

const Separator = React.forwardRef<
  React.ElementRef<typeof SeparatorPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>
>(
  (
    { className, orientation = 'horizontal', decorative = true, ...props },
    ref
  ) => {
    const { styles } = useStyles();
    return (
      <SeparatorPrimitive.Root
        ref={ref}
        decorative={decorative}
        orientation={orientation}
        className={cn(
          orientation === 'horizontal' ? styles.horizontal : styles.vertical,
          className
        )}
        {...props}
      />
    );
  }
);
Separator.displayName = SeparatorPrimitive.Root.displayName;

export { Separator };
