/**
 * Switch Component
 * antd-style based, same API as shadcn/ui switch
 */
import * as React from 'react';
import * as SwitchPrimitives from '@radix-ui/react-switch';
import { createStyles } from 'antd-style';
import { cn } from '@/lib/utils';

const useStyles = createStyles(({ css, token }) => ({
  root: css`
    display: inline-flex;
    height: 24px;
    width: 44px;
    flex-shrink: 0;
    cursor: pointer;
    align-items: center;
    border-radius: 9999px;
    border: 2px solid transparent;
    transition: background-color 0.2s;
    outline: none;

    &:focus-visible {
      box-shadow: 0 0 0 2px ${token.colorBgContainer}, 0 0 0 4px ${token.colorPrimary};
    }
    &:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }
    &[data-state="checked"] {
      background: ${token.colorPrimary};
    }
    &[data-state="unchecked"] {
      background: ${token.colorBorder};
    }
  `,
  thumb: css`
    pointer-events: none;
    display: block;
    height: 20px;
    width: 20px;
    border-radius: 9999px;
    background: ${token.colorBgContainer};
    box-shadow: 0 1px 4px rgba(0,0,0,0.15);
    transition: transform 0.2s;

    &[data-state="checked"] {
      transform: translateX(20px);
    }
    &[data-state="unchecked"] {
      transform: translateX(0);
    }
  `,
}));

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => {
  const { styles } = useStyles();
  return (
    <SwitchPrimitives.Root
      className={cn(styles.root, className)}
      {...props}
      ref={ref}
    >
      <SwitchPrimitives.Thumb className={styles.thumb} />
    </SwitchPrimitives.Root>
  );
});
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
