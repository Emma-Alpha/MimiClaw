/**
 * ConfirmDialog - In-DOM confirmation dialog (replaces window.confirm)
 * Keeps focus within the renderer to avoid Windows focus loss after native dialogs.
 */
import { useEffect, useRef, useState } from 'react';
import { createStyles } from 'antd-style';
import { Button } from '@/components/ui/button';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive';
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  onError?: (error: unknown) => void;
}

const useStyles = createStyles(({ css, token }) => ({
  overlay: css`
    position: fixed;
    inset: 0;
    z-index: 50;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.5);
  `,
  dialog: css`
    margin: 0 16px;
    max-width: 448px;
    border-radius: ${token.borderRadiusLG}px;
    border: 1px solid ${token.colorBorderSecondary};
    background: ${token.colorBgContainer};
    padding: 24px;
    box-shadow: ${token.boxShadowSecondary};
    outline: none;
  `,
  title: css`
    font-size: ${token.fontSizeSM}px;
    font-weight: 600;
    color: ${token.colorText};
    margin: 0;
  `,
  message: css`
    margin-top: 8px;
    font-size: ${token.fontSizeSM}px;
    color: ${token.colorTextSecondary};
  `,
  footer: css`
    margin-top: 24px;
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  `,
}));

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'OK',
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
  onCancel,
  onError,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [confirming, setConfirming] = useState(false);
  const [prevOpen, setPrevOpen] = useState(open);
  const { styles } = useStyles();

  // Reset confirming when dialog closes (during render to avoid setState-in-effect)
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (!open) {
      setConfirming(false);
    }
  }

  useEffect(() => {
    if (open && cancelRef.current) {
      cancelRef.current.focus();
    }
  }, [open]);

  if (!open) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && !confirming) {
      e.preventDefault();
      onCancel();
    }
  };

  const handleConfirm = () => {
    if (confirming) return;
    const result = onConfirm();
    if (result instanceof Promise) {
      setConfirming(true);
      result.catch((error) => {
        if (onError) {
          onError(error);
        }
      }).finally(() => {
        setConfirming(false);
      });
    }
  };

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      onKeyDown={handleKeyDown}
    >
      <div className={styles.dialog} tabIndex={-1}>
        <h2 id="confirm-dialog-title" className={styles.title}>
          {title}
        </h2>
        <p className={styles.message}>{message}</p>
        <div className={styles.footer}>
          <Button
            ref={cancelRef}
            variant="outline"
            onClick={onCancel}
            disabled={confirming}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={variant === 'destructive' ? 'destructive' : 'default'}
            onClick={handleConfirm}
            disabled={confirming}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
