/**
 * Card compound components — antd Card as the outer shell.
 * Keeps CardHeader / CardContent / CardFooter / CardTitle / CardDescription
 * sub-component API so call sites don't need to change.
 */
import * as React from 'react';
import { Card as AntdCard } from 'antd';
import { createStyles } from 'antd-style';
import { cn } from '@/lib/utils';

const useSubStyles = createStyles(({ css, token }) => ({
  header: css`
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 24px;
  `,
  title: css`
    font-size: ${token.fontSizeSM}px;
    font-weight: 600;
    line-height: 1;
    letter-spacing: -0.015em;
    color: ${token.colorText};
  `,
  description: css`
    font-size: ${token.fontSizeSM}px;
    color: ${token.colorTextSecondary};
  `,
  content: css`
    padding: 24px;
    padding-top: 0;
  `,
  footer: css`
    display: flex;
    align-items: center;
    padding: 24px;
    padding-top: 0;
  `,
}));

// ─── Card root ────────────────────────────────────────────────────────────────

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, style, ...props }, _ref) => (
    <AntdCard
      className={className}
      style={style}
      styles={{ body: { padding: 0 } }}
      {...props}
    >
      {children}
    </AntdCard>
  )
);
Card.displayName = 'Card';

// ─── Sub-components ───────────────────────────────────────────────────────────

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const { styles } = useSubStyles();
    return <div ref={ref} className={cn(styles.header, className)} {...props} />;
  }
);
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => {
    const { styles } = useSubStyles();
    return <h3 ref={ref} className={cn(styles.title, className)} {...props} />;
  }
);
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => {
    const { styles } = useSubStyles();
    return <p ref={ref} className={cn(styles.description, className)} {...props} />;
  }
);
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const { styles } = useSubStyles();
    return <div ref={ref} className={cn(styles.content, className)} {...props} />;
  }
);
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const { styles } = useSubStyles();
    return <div ref={ref} className={cn(styles.footer, className)} {...props} />;
  }
);
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
