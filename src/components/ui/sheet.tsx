"use client"

/**
 * Sheet Component
 * antd-style based, same API as shadcn/ui sheet
 */
import * as React from 'react';
import * as SheetPrimitive from '@radix-ui/react-dialog';
import { createStyles } from 'antd-style';
import { cn } from '@/lib/utils';

const useStyles = createStyles(({ css, token }) => ({
  overlay: css`
    position: fixed;
    inset: 0;
    z-index: 50;
    background: rgba(0, 0, 0, 0.4);
    animation: overlayShow 0.15s ease-out;

    &[data-state="closed"] {
      animation: overlayHide 0.15s ease-in;
    }

    @keyframes overlayShow {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes overlayHide {
      from { opacity: 1; }
      to { opacity: 0; }
    }
  `,
  contentBase: css`
    position: fixed;
    z-index: 50;
    background: ${token.colorBgContainer};
    padding: 24px;
    box-shadow: ${token.boxShadowSecondary};
    transition: transform 0.3s ease;
  `,
  contentRight: css`
    top: 0;
    right: 0;
    bottom: 0;
    height: 100%;
    width: 75%;
    max-width: 384px;
    border-left: 1px solid ${token.colorBorderSecondary};
    animation: slideInFromRight 0.3s ease-out;

    &[data-state="closed"] {
      animation: slideOutToRight 0.3s ease-in;
    }

    @keyframes slideInFromRight {
      from { transform: translateX(100%); }
      to { transform: translateX(0); }
    }
    @keyframes slideOutToRight {
      from { transform: translateX(0); }
      to { transform: translateX(100%); }
    }
  `,
  contentLeft: css`
    top: 0;
    left: 0;
    bottom: 0;
    height: 100%;
    width: 75%;
    max-width: 384px;
    border-right: 1px solid ${token.colorBorderSecondary};
    animation: slideInFromLeft 0.3s ease-out;

    &[data-state="closed"] {
      animation: slideOutToLeft 0.3s ease-in;
    }

    @keyframes slideInFromLeft {
      from { transform: translateX(-100%); }
      to { transform: translateX(0); }
    }
    @keyframes slideOutToLeft {
      from { transform: translateX(0); }
      to { transform: translateX(-100%); }
    }
  `,
  contentTop: css`
    top: 0;
    left: 0;
    right: 0;
    width: 100%;
    border-bottom: 1px solid ${token.colorBorderSecondary};
    animation: slideInFromTop 0.3s ease-out;

    &[data-state="closed"] {
      animation: slideOutToTop 0.3s ease-in;
    }

    @keyframes slideInFromTop {
      from { transform: translateY(-100%); }
      to { transform: translateY(0); }
    }
    @keyframes slideOutToTop {
      from { transform: translateY(0); }
      to { transform: translateY(-100%); }
    }
  `,
  contentBottom: css`
    bottom: 0;
    left: 0;
    right: 0;
    width: 100%;
    border-top: 1px solid ${token.colorBorderSecondary};
    animation: slideInFromBottom 0.3s ease-out;

    &[data-state="closed"] {
      animation: slideOutToBottom 0.3s ease-in;
    }

    @keyframes slideInFromBottom {
      from { transform: translateY(100%); }
      to { transform: translateY(0); }
    }
    @keyframes slideOutToBottom {
      from { transform: translateY(0); }
      to { transform: translateY(100%); }
    }
  `,
  header: css`
    display: flex;
    flex-direction: column;
    gap: 8px;
    text-align: left;
  `,
  footer: css`
    display: flex;
    flex-direction: row;
    justify-content: flex-end;
    gap: 8px;
  `,
  title: css`
    font-size: ${token.fontSizeSM}px;
    font-weight: 600;
    color: ${token.colorText};
  `,
  description: css`
    font-size: ${token.fontSizeSM}px;
    color: ${token.colorTextSecondary};
  `,
}));

const Sheet = SheetPrimitive.Root;
const SheetTrigger = SheetPrimitive.Trigger;
const SheetClose = SheetPrimitive.Close;
const SheetPortal = SheetPrimitive.Portal;

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
>(({ className, ...props }, ref) => {
  const { styles } = useStyles();
  return (
    <SheetPrimitive.Overlay
      className={cn(styles.overlay, className)}
      {...props}
      ref={ref}
    />
  );
});
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName;

type SheetSide = 'top' | 'bottom' | 'left' | 'right';

interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content> {
  side?: SheetSide;
}

const SheetContent = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Content>,
  SheetContentProps
>(({ side = 'right', className, children, ...props }, ref) => {
  const { styles, cx } = useStyles();

  const sideClass = {
    right: styles.contentRight,
    left: styles.contentLeft,
    top: styles.contentTop,
    bottom: styles.contentBottom,
  }[side];

  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content
        ref={ref}
        className={cx(styles.contentBase, sideClass, className)}
        {...props}
      >
        {children}
      </SheetPrimitive.Content>
    </SheetPortal>
  );
});
SheetContent.displayName = SheetPrimitive.Content.displayName;

const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
  const { styles } = useStyles();
  return <div className={cn(styles.header, className)} {...props} />;
};
SheetHeader.displayName = 'SheetHeader';

const SheetFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
  const { styles } = useStyles();
  return <div className={cn(styles.footer, className)} {...props} />;
};
SheetFooter.displayName = 'SheetFooter';

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>(({ className, ...props }, ref) => {
  const { styles } = useStyles();
  return (
    <SheetPrimitive.Title
      ref={ref}
      className={cn(styles.title, className)}
      {...props}
    />
  );
});
SheetTitle.displayName = SheetPrimitive.Title.displayName;

const SheetDescription = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>
>(({ className, ...props }, ref) => {
  const { styles } = useStyles();
  return (
    <SheetPrimitive.Description
      ref={ref}
      className={cn(styles.description, className)}
      {...props}
    />
  );
});
SheetDescription.displayName = SheetPrimitive.Description.displayName;

export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};
