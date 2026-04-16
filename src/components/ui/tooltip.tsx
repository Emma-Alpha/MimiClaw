/**
 * Tooltip — re-exports antd Tooltip directly.
 * Use antd's native API: <Tooltip title="hint">trigger</Tooltip>
 * TooltipProvider kept as no-op for backward compat.
 */
import * as React from 'react';

export { Tooltip } from 'antd';
export type { TooltipProps } from 'antd';

export function TooltipProvider({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
}
