/**
 * Input Component
 * antd-style based, same API as shadcn/ui input
 */
import * as React from 'react';
import { createStyles } from 'antd-style';
import { cn } from '@/lib/utils';

const useStyles = createStyles(({ css, token }) => ({
  input: css`
    display: flex;
    height: 40px;
    width: 100%;
    border-radius: ${token.borderRadius}px;
    border: 1px solid ${token.colorBorder};
    background: ${token.colorBgContainer};
    padding: 8px 12px;
    font-size: ${token.fontSizeSM}px;
    color: ${token.colorText};
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;

    &::placeholder {
      color: ${token.colorTextPlaceholder};
    }
    &:focus-visible {
      border-color: ${token.colorPrimary};
      box-shadow: 0 0 0 2px ${token.colorPrimaryBg};
    }
    &:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }
    &[type="file"] {
      border: none;
      background: transparent;
      padding: 0;
      font-size: inherit;
      font-weight: 500;
    }
  `,
}));

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    const { styles } = useStyles();
    return (
      <input
        type={type}
        className={cn(styles.input, className)}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
