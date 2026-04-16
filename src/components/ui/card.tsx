/**
 * Card Component
 * antd-style based, same API as shadcn/ui card
 */
import * as React from 'react';
import { createStyles } from 'antd-style';
import { cn } from '@/lib/utils';

const useStyles = createStyles(({ css, token }) => ({
  card: css`
    border-radius: ${token.borderRadiusLG}px;
    border: 1px solid ${token.colorBorderSecondary};
    background: ${token.colorBgContainer};
    color: ${token.colorText};
    box-shadow: ${token.boxShadowTertiary};
  `,
  cardHeader: css`
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 24px;
  `,
  cardTitle: css`
    font-size: ${token.fontSizeSM}px;
    font-weight: 600;
    line-height: 1;
    letter-spacing: -0.015em;
    color: ${token.colorText};
  `,
  cardDescription: css`
    font-size: ${token.fontSizeSM}px;
    color: ${token.colorTextSecondary};
  `,
  cardContent: css`
    padding: 24px;
    padding-top: 0;
  `,
  cardFooter: css`
    display: flex;
    align-items: center;
    padding: 24px;
    padding-top: 0;
  `,
}));

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const { styles } = useStyles();
  return <div ref={ref} className={cn(styles.card, className)} {...props} />;
});
Card.displayName = 'Card';

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const { styles } = useStyles();
  return <div ref={ref} className={cn(styles.cardHeader, className)} {...props} />;
});
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => {
  const { styles } = useStyles();
  return <h3 ref={ref} className={cn(styles.cardTitle, className)} {...props} />;
});
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => {
  const { styles } = useStyles();
  return <p ref={ref} className={cn(styles.cardDescription, className)} {...props} />;
});
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const { styles } = useStyles();
  return <div ref={ref} className={cn(styles.cardContent, className)} {...props} />;
});
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const { styles } = useStyles();
  return (
    <div ref={ref} className={cn(styles.cardFooter, className)} {...props} />
  );
});
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
