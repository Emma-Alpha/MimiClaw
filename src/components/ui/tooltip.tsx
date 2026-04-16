/**
 * Tooltip Component
 * antd-style based, same API as shadcn/ui tooltip
 */
import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { createStyles } from 'antd-style';
import { cn } from '@/lib/utils';

const useStyles = createStyles(({ css, token }) => ({
  content: css`
    z-index: 50;
    overflow: hidden;
    border-radius: ${token.borderRadius}px;
    border: 1px solid ${token.colorBorderSecondary};
    background: ${token.colorBgContainer};
    padding: 6px 12px;
    font-size: ${token.fontSizeSM}px;
    color: ${token.colorText};
    box-shadow: ${token.boxShadowSecondary};
    animation: fadeIn 0.1s ease-out;

    @keyframes fadeIn {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }
  `,
}));

const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  React.ComponentRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => {
  const { styles } = useStyles();
  return (
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(styles.content, className)}
      {...props}
    />
  );
});
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
