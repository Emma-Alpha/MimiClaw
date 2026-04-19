/**
 * Tooltip — shared light-card wrapper around antd Tooltip.
 * Use antd's native API: <Tooltip title="hint">trigger</Tooltip>
 * TooltipProvider is kept as a no-op for backward compat.
 */
import * as React from 'react';
import { Tooltip as AntdTooltip, theme } from 'antd';
import type { TooltipProps as AntdTooltipProps } from 'antd';

export type TooltipProps = AntdTooltipProps;

const LIGHT_CARD_TOOLTIP_BG = 'rgba(255, 255, 255, 0.98)';
const LIGHT_CARD_TOOLTIP_TEXT = 'rgba(15, 23, 42, 0.88)';

export function Tooltip({
  arrow = false,
  color,
  overlayInnerStyle,
  overlayStyle,
  styles,
  ...props
}: TooltipProps) {
  const { token } = theme.useToken();
  const resolvedColor = color ?? LIGHT_CARD_TOOLTIP_BG;
  const styleProps = typeof styles === 'function' ? undefined : styles;
  const mergedContainerStyle = {
    background: resolvedColor,
    backdropFilter: 'blur(12px)',
    border: `1px solid ${token.colorBorderSecondary}`,
    borderRadius: 12,
    boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08), 0 2px 6px rgba(15, 23, 42, 0.05)',
    color: LIGHT_CARD_TOOLTIP_TEXT,
    padding: '7px 10px',
    ...(styleProps?.container ?? {}),
    ...(overlayInnerStyle ?? {}),
  };

  return (
    <AntdTooltip
      {...props}
      arrow={arrow}
      color={resolvedColor}
      overlayInnerStyle={mergedContainerStyle}
      overlayStyle={overlayStyle}
      styles={
        typeof styles === 'function'
          ? styles
          : {
              ...styleProps,
              arrow: {
                ...(styleProps?.arrow ?? {}),
              },
              container: mergedContainerStyle,
              root: {
                ...(styleProps?.root ?? {}),
                ...(overlayStyle ?? {}),
              },
            }
      }
    />
  );
}

export function TooltipProvider({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
}
