/**
 * Progress Component
 * antd-style based, same API as shadcn/ui progress
 */
import * as React from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';
import { createStyles } from 'antd-style';
import { cn } from '@/lib/utils';

const useStyles = createStyles(({ css, token }) => ({
  root: css`
    position: relative;
    height: 16px;
    width: 100%;
    overflow: hidden;
    border-radius: 9999px;
    background: ${token.colorFillSecondary};
  `,
  indicator: css`
    height: 100%;
    width: 100%;
    flex: 1;
    background: ${token.colorPrimary};
    transition: transform 0.3s ease;
  `,
}));

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => {
  const { styles } = useStyles();
  return (
    <ProgressPrimitive.Root
      ref={ref}
      className={cn(styles.root, className)}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className={styles.indicator}
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  );
});
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
