/**
 * Label Component
 * antd-style based, same API as shadcn/ui label
 */
import * as React from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
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

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => {
  const { styles } = useStyles();
  return (
    <LabelPrimitive.Root
      ref={ref}
      className={cn(styles.label, className)}
      {...props}
    />
  );
});
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };
