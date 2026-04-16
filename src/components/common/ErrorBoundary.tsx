/**
 * Error Boundary Component
 * Catches and displays errors in the component tree
 */
import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { createStyles } from 'antd-style';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

const useErrorBoundaryStyles = createStyles(({ css, token }) => ({
  container: css`
    display: flex;
    height: 100%;
    align-items: center;
    justify-content: center;
    padding: 24px;
  `,
  card: css`
    max-width: 448px;
  `,
  headerRow: css`
    display: flex;
    align-items: center;
    gap: 8px;
  `,
  errorPre: css`
    border-radius: ${token.borderRadiusLG}px;
    background: ${token.colorFillTertiary};
    padding: 16px;
    font-size: ${token.fontSizeSM}px;
    overflow: auto;
    max-height: 160px;
  `,
  contentStack: css`
    display: flex;
    flex-direction: column;
    gap: 16px;
  `,
  fullWidth: css`
    width: 100%;
  `,
}));

function ErrorFallback({ error, onReset }: { error: Error | null; onReset: () => void }) {
  const { styles } = useErrorBoundaryStyles();
  return (
    <div className={styles.container}>
      <Card className={styles.card}>
        <CardHeader>
          <div className={styles.headerRow}>
            <AlertTriangle style={{ width: 24, height: 24, color: 'var(--ant-color-error)' }} />
            <CardTitle>Something went wrong</CardTitle>
          </div>
          <CardDescription>
            An unexpected error occurred. Please try again.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className={styles.contentStack}>
            {error && (
              <pre className={styles.errorPre}>
                {error.message}
              </pre>
            )}
            <Button type="primary" onClick={onReset} className={styles.fullWidth}>
              <RefreshCw style={{ marginRight: 8, width: 16, height: 16 }} />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <ErrorFallback error={this.state.error} onReset={this.handleReset} />
      );
    }

    return this.props.children;
  }
}
