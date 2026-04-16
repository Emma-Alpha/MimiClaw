/* eslint-disable react-refresh/only-export-components */
/**
 * Button Component
 * antd-style based, same API as shadcn/ui button
 */
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { createStyles } from 'antd-style';

type ButtonVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

const useStyles = createStyles(({ css, token }) => ({
  base: css`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    white-space: nowrap;
    border-radius: ${token.borderRadius}px;
    font-size: ${token.fontSizeSM}px;
    font-weight: 500;
    transition: background-color 0.15s, color 0.15s, border-color 0.15s, opacity 0.15s;
    outline: none;
    border: none;
    cursor: pointer;
    text-decoration: none;
    &:focus-visible {
      box-shadow: 0 0 0 2px ${token.colorBgContainer}, 0 0 0 4px ${token.colorPrimary};
    }
    &:disabled {
      pointer-events: none;
      opacity: 0.5;
    }
  `,
  // Variants
  variantDefault: css`
    background: ${token.colorPrimary};
    color: #fff;
    &:hover { background: ${token.colorPrimaryHover}; }
    &:active { background: ${token.colorPrimaryActive}; }
  `,
  variantDestructive: css`
    background: ${token.colorError};
    color: #fff;
    &:hover { background: ${token.colorErrorHover}; }
    &:active { background: ${token.colorErrorActive}; }
  `,
  variantOutline: css`
    background: transparent;
    border: 1px solid ${token.colorBorder};
    color: ${token.colorText};
    &:hover {
      background: ${token.colorFillTertiary};
      color: ${token.colorText};
    }
  `,
  variantSecondary: css`
    background: ${token.colorFillSecondary};
    color: ${token.colorText};
    &:hover { background: ${token.colorFill}; }
  `,
  variantGhost: css`
    background: transparent;
    color: ${token.colorText};
    &:hover { background: ${token.colorFillTertiary}; }
  `,
  variantLink: css`
    background: transparent;
    color: ${token.colorPrimary};
    text-underline-offset: 4px;
    &:hover { text-decoration: underline; }
  `,
  // Sizes
  sizeDefault: css`
    height: 40px;
    padding: 8px 16px;
  `,
  sizeSm: css`
    height: 36px;
    border-radius: ${token.borderRadiusSM}px;
    padding: 0 12px;
  `,
  sizeLg: css`
    height: 44px;
    border-radius: ${token.borderRadius}px;
    padding: 0 32px;
  `,
  sizeIcon: css`
    height: 40px;
    width: 40px;
    padding: 0;
  `,
}));

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', asChild = false, ...props }, ref) => {
    const { styles, cx } = useStyles();
    const Comp = asChild ? Slot : 'button';

    const variantClass = {
      default: styles.variantDefault,
      destructive: styles.variantDestructive,
      outline: styles.variantOutline,
      secondary: styles.variantSecondary,
      ghost: styles.variantGhost,
      link: styles.variantLink,
    }[variant];

    const sizeClass = {
      default: styles.sizeDefault,
      sm: styles.sizeSm,
      lg: styles.sizeLg,
      icon: styles.sizeIcon,
    }[size];

    return (
      <Comp
        className={cx(styles.base, variantClass, sizeClass, className)}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

/** @deprecated use Button component directly */
export function buttonVariants({ variant = 'default', size = 'default', className = '' }: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}) {
  void variant; void size;
  return className;
}

export { Button };
