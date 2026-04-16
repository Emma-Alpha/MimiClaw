/**
 * Select Component
 * antd-style based, same API as shadcn/ui select (native select)
 */
import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { createStyles } from 'antd-style';
import { cn } from '@/lib/utils';

const useStyles = createStyles(({ css, token }) => ({
  wrapper: css`
    position: relative;
    width: 100%;
  `,
  select: css`
    display: flex;
    height: 40px;
    width: 100%;
    border-radius: ${token.borderRadius}px;
    border: 1px solid ${token.colorBorder};
    background: ${token.colorBgContainer};
    padding: 8px 40px 8px 12px;
    font-size: ${token.fontSizeSM}px;
    line-height: 1;
    color: ${token.colorText};
    outline: none;
    appearance: none;
    -webkit-appearance: none;
    transition: border-color 0.15s, box-shadow 0.15s;
    cursor: pointer;

    &:focus-visible {
      border-color: ${token.colorPrimary};
      box-shadow: 0 0 0 2px ${token.colorPrimaryBg};
    }
    &:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }
  `,
  chevron: css`
    pointer-events: none;
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    width: 16px;
    height: 16px;
    color: ${token.colorTextTertiary};
  `,
}));

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => {
    const { styles } = useStyles();
    return (
      <div className={styles.wrapper}>
        <select
          className={cn(styles.select, className)}
          ref={ref}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className={styles.chevron} />
      </div>
    );
  }
);
Select.displayName = 'Select';

export { Select };
