/**
 * Badge Component — antd Tag wrapper
 */
import { Tag } from 'antd';
import type { TagProps } from 'antd';

export type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning';

const VARIANT_COLOR: Record<BadgeVariant, string | undefined> = {
  default: 'blue',
  secondary: undefined,
  destructive: 'error',
  outline: undefined,
  success: 'success',
  warning: 'warning',
};

export interface BadgeProps extends Omit<TagProps, 'color' | 'variant'> {
  variant?: BadgeVariant;
}

export function Badge({ variant = 'default', ...props }: BadgeProps) {
  return <Tag color={VARIANT_COLOR[variant]} {...props} />;
}

/** @deprecated */
export function badgeVariants() {
  return '';
}
