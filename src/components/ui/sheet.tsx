/**
 * Sheet compound components — antd Drawer as the underlying panel.
 * Keeps the same Sheet / SheetContent / SheetHeader / SheetTitle / SheetDescription /
 * SheetFooter / SheetClose API so call sites don't need to change.
 */
import * as React from 'react';
import { Drawer } from 'antd';
import { createStyles } from 'antd-style';
import { cn } from '@/lib/utils';

// ─── Styles for sub-components ────────────────────────────────────────────────

const useStyles = createStyles(({ css, token }) => ({
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

// ─── Context ──────────────────────────────────────────────────────────────────

const SheetContext = React.createContext<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
}>({ open: false, onOpenChange: () => {} });

// ─── Sheet (root) ─────────────────────────────────────────────────────────────

interface SheetRootProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
}

function Sheet({ open = false, onOpenChange = () => {}, children }: SheetRootProps) {
  return (
    <SheetContext.Provider value={{ open, onOpenChange }}>
      {children}
    </SheetContext.Provider>
  );
}
Sheet.displayName = 'Sheet';

// ─── SheetTrigger ─────────────────────────────────────────────────────────────

function SheetTrigger({ children, asChild }: { children?: React.ReactNode; asChild?: boolean }) {
  const { onOpenChange } = React.useContext(SheetContext);
  const handleClick = () => onOpenChange(true);

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<{ onClick?: React.MouseEventHandler }>;
    return React.cloneElement(child, {
      onClick: (e: React.MouseEvent) => {
        handleClick();
        child.props.onClick?.(e);
      },
    });
  }
  return <button type="button" onClick={handleClick}>{children}</button>;
}
SheetTrigger.displayName = 'SheetTrigger';

// ─── SheetClose ───────────────────────────────────────────────────────────────

function SheetClose({ children, asChild }: { children?: React.ReactNode; asChild?: boolean }) {
  const { onOpenChange } = React.useContext(SheetContext);
  const handleClick = () => onOpenChange(false);

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<{ onClick?: React.MouseEventHandler }>;
    return React.cloneElement(child, {
      onClick: (e: React.MouseEvent) => {
        handleClick();
        child.props.onClick?.(e);
      },
    });
  }
  return <button type="button" onClick={handleClick}>{children}</button>;
}
SheetClose.displayName = 'SheetClose';

// ─── Kept for API compat (no-ops) ─────────────────────────────────────────────

function SheetPortal({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
}
SheetPortal.displayName = 'SheetPortal';

const SheetOverlay = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  (props, ref) => <div ref={ref} {...props} />
);
SheetOverlay.displayName = 'SheetOverlay';

// ─── SheetContent — antd Drawer ───────────────────────────────────────────────

type SheetSide = 'top' | 'bottom' | 'left' | 'right';

interface SheetContentProps {
  side?: SheetSide;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

const SheetContent = React.forwardRef<HTMLDivElement, SheetContentProps>(
  ({ side = 'right', className, style, children }, ref) => {
    const { open, onOpenChange } = React.useContext(SheetContext);

    return (
      <Drawer
        open={open}
        placement={side}
        onClose={() => onOpenChange(false)}
        className={className}
        style={style}
        closable={false}
        styles={{ header: { display: 'none' }, body: { padding: 0 } }}
        width="auto"
      >
        <div ref={ref} style={{ height: '100%' }}>
          {children}
        </div>
      </Drawer>
    );
  }
);
SheetContent.displayName = 'SheetContent';

// ─── SheetHeader / SheetFooter / SheetTitle / SheetDescription ────────────────

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

const SheetTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => {
    const { styles } = useStyles();
    return <h2 ref={ref} className={cn(styles.title, className)} {...props} />;
  }
);
SheetTitle.displayName = 'SheetTitle';

const SheetDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => {
    const { styles } = useStyles();
    return <p ref={ref} className={cn(styles.description, className)} {...props} />;
  }
);
SheetDescription.displayName = 'SheetDescription';

// ─── Exports ──────────────────────────────────────────────────────────────────

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
