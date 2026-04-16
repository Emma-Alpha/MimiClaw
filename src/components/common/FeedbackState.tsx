import { AlertCircle, Inbox, Loader2 } from 'lucide-react';
import { createStyles } from 'antd-style';

interface FeedbackStateProps {
  state: 'loading' | 'empty' | 'error';
  title: string;
  description?: string;
  action?: React.ReactNode;
}

const useStyles = createStyles(({ css, token }) => ({
  container: css`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 32px 0;
    text-align: center;
  `,
  iconWrap: css`
    margin-bottom: 12px;
  `,
  title: css`
    font-weight: 500;
    color: ${token.colorText};
  `,
  description: css`
    margin-top: 4px;
    font-size: ${token.fontSizeSM}px;
    color: ${token.colorTextSecondary};
  `,
  action: css`
    margin-top: 12px;
  `,
}));

export function FeedbackState({ state, title, description, action }: FeedbackStateProps) {
  const { styles } = useStyles();

  const iconStyle = { width: 32, height: 32 };
  const icon = state === 'loading'
    ? <Loader2 className="animate-spin" style={{ ...iconStyle, color: 'var(--ant-color-primary)' }} />
    : state === 'error'
      ? <AlertCircle style={{ ...iconStyle, color: 'var(--ant-color-error)' }} />
      : <Inbox style={{ ...iconStyle, color: 'var(--ant-color-text-secondary)' }} />;

  return (
    <div className={styles.container}>
      <div className={styles.iconWrap}>{icon}</div>
      <p className={styles.title}>{title}</p>
      {description && <p className={styles.description}>{description}</p>}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}
