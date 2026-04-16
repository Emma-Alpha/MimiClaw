/**
 * Tabs Component
 * antd-style based, same API as shadcn/ui tabs
 */
import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { createStyles } from 'antd-style';
import { cn } from '@/lib/utils';

const useStyles = createStyles(({ css, token }) => ({
  list: css`
    display: inline-flex;
    height: 40px;
    align-items: center;
    justify-content: center;
    border-radius: ${token.borderRadius}px;
    background: ${token.colorFillTertiary};
    padding: 4px;
    color: ${token.colorTextSecondary};
  `,
  trigger: css`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    white-space: nowrap;
    border-radius: ${token.borderRadiusSM}px;
    padding: 6px 12px;
    font-size: ${token.fontSizeSM}px;
    font-weight: 500;
    background: transparent;
    border: none;
    cursor: pointer;
    color: ${token.colorTextSecondary};
    transition: all 0.15s;
    outline: none;

    &:focus-visible {
      box-shadow: 0 0 0 2px ${token.colorBgContainer}, 0 0 0 4px ${token.colorPrimary};
    }
    &:disabled {
      pointer-events: none;
      opacity: 0.5;
    }
    &[data-state="active"] {
      background: ${token.colorBgContainer};
      color: ${token.colorText};
      box-shadow: ${token.boxShadowTertiary};
    }
  `,
  content: css`
    margin-top: 8px;
    outline: none;
    &:focus-visible {
      box-shadow: 0 0 0 2px ${token.colorBgContainer}, 0 0 0 4px ${token.colorPrimary};
    }
  `,
}));

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => {
  const { styles } = useStyles();
  return (
    <TabsPrimitive.List
      ref={ref}
      className={cn(styles.list, className)}
      {...props}
    />
  );
});
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => {
  const { styles } = useStyles();
  return (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(styles.trigger, className)}
      {...props}
    />
  );
});
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => {
  const { styles } = useStyles();
  return (
    <TabsPrimitive.Content
      ref={ref}
      className={cn(styles.content, className)}
      {...props}
    />
  );
});
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
