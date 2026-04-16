/**
 * Label — antd-style token-driven <label> element.
 * antd has no standalone Label component; this keeps call sites unchanged.
 */
import * as React from 'react';
import { createStyles } from 'antd-style';
import { cn } from '@/lib/utils';

const useStyles = createStyles(({ css, token }) => ({
  label: css`
    font-size: ${token.fontSizeSM}px;
    font-weight: 500;
    line-height: 1;
    color: ${token.colorText};
    &[data-disabled] {
      cursor: not-allowed;
      opacity: 0.7;
    }
  `,
}));

const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => {
    const { styles } = useStyles();
    return <label ref={ref} className={cn(styles.label, className)} {...props} />;
  }
);
Label.displayName = 'Label';

export { Label };
