/**
 * Progress — antd Progress wrapper.
 * Maps `value` prop to antd's `percent` so call sites don't need to change.
 */
import { Progress as AntdProgress } from 'antd';
import type { ProgressProps as AntdProgressProps } from 'antd';

export interface ProgressProps extends Omit<AntdProgressProps, 'percent'> {
  value?: number | null;
}

export function Progress({ value, ...props }: ProgressProps) {
  return (
    <AntdProgress
      percent={Math.min(100, Math.max(0, value ?? 0))}
      showInfo={false}
      {...props}
    />
  );
}
