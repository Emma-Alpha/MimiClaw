/**
 * Button — re-exports antd Button directly.
 * Use antd's native API: type="primary|default|text|link|dashed", danger, size="small|middle|large"
 */
export { Button } from 'antd';
export type { ButtonProps } from 'antd';

/** @deprecated */
export function buttonVariants() {
  return '';
}
