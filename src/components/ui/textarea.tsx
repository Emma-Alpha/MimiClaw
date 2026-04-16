/**
 * Textarea Component
 * antd-style based, same API as shadcn/ui textarea
 */
import * as React from 'react';
import { createStyles } from 'antd-style';
import { cn } from '@/lib/utils';

const useStyles = createStyles(({ css, token }) => ({
  textarea: css`
    display: flex;
    min-height: 80px;
    width: 100%;
    border-radius: ${token.borderRadius}px;
    border: 1px solid ${token.colorBorder};
    background: ${token.colorBgContainer};
    padding: 8px 12px;
    font-size: ${token.fontSizeSM}px;
    color: ${token.colorText};
    outline: none;
    resize: vertical;
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
  `,
}));

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<'textarea'>
>(({ className, ...props }, ref) => {
  const { styles } = useStyles();
  return (
    <textarea
      className={cn(styles.textarea, className)}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = 'Textarea';

export { Textarea };
