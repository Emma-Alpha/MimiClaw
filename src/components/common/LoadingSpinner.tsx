/**
 * Loading Spinner Component
 * Displays a spinning loader animation
 */
import { Loader2 } from 'lucide-react';
import { createStyles } from 'antd-style';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = { sm: 16, md: 32, lg: 48 };

const useStyles = createStyles(({ css, token }) => ({
  wrap: css`
    display: flex;
    align-items: center;
    justify-content: center;
  `,
  icon: css`
    color: ${token.colorPrimary};
  `,
  fullHeight: css`
    display: flex;
    height: 100%;
    align-items: center;
    justify-content: center;
  `,
}));

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  const { styles } = useStyles();
  const px = sizeMap[size];
  return (
    <div className={cn(styles.wrap, className)}>
      <Loader2
        className={cn('animate-spin', styles.icon)}
        style={{ width: px, height: px }}
      />
    </div>
  );
}

/**
 * Full page loading spinner
 */
export function PageLoader() {
  const { styles } = useStyles();
  return (
    <div className={styles.fullHeight}>
      <LoadingSpinner size="lg" />
    </div>
  );
}
