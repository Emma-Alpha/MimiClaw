/* eslint-disable react-refresh/only-export-components */
/**
 * Badge Component
 * antd-style based, same API as shadcn/ui badge
 */
import * as React from 'react';
import { createStyles } from 'antd-style';

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning';

const useStyles = createStyles(({ css, token }) => ({
  base: css`
    display: inline-flex;
    align-items: center;
    border-radius: 9999px;
    border: 1px solid transparent;
    padding: 2px 10px;
    font-size: 12px;
    font-weight: 600;
    transition: background-color 0.15s, color 0.15s;
    &:focus {
      outline: none;
      box-shadow: 0 0 0 2px ${token.colorBgContainer}, 0 0 0 4px ${token.colorPrimary};
    }
  `,
  variantDefault: css`
    background: ${token.colorPrimary};
    color: #fff;
    &:hover { background: ${token.colorPrimaryHover}; }
  `,
  variantSecondary: css`
    background: ${token.colorFillSecondary};
    color: ${token.colorText};
    &:hover { background: ${token.colorFill}; }
  `,
  variantDestructive: css`
    background: ${token.colorError};
    color: #fff;
    &:hover { background: ${token.colorErrorHover}; }
  `,
  variantOutline: css`
    border-color: ${token.colorBorder};
    color: ${token.colorText};
    background: transparent;
  `,
  variantSuccess: css`
    background: ${token.colorSuccessBg};
    color: ${token.colorSuccess};
    border-color: transparent;
  `,
  variantWarning: css`
    background: ${token.colorWarningBg};
    color: ${token.colorWarning};
    border-color: transparent;
  `,
}));

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: BadgeVariant;
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const { styles, cx } = useStyles();

  const variantClass = {
    default: styles.variantDefault,
    secondary: styles.variantSecondary,
    destructive: styles.variantDestructive,
    outline: styles.variantOutline,
    success: styles.variantSuccess,
    warning: styles.variantWarning,
  }[variant];

  return <div className={cx(styles.base, variantClass, className)} {...props} />;
}

/** @deprecated */
export function badgeVariants({ variant = 'default', className = '' }: { variant?: BadgeVariant; className?: string } = {}) {
  void variant;
  return className;
}

export { Badge };
