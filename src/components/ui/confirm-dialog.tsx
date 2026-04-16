/**
 * ConfirmDialog — antd Modal wrapper.
 * Keeps the same props API as before; replaces the custom overlay implementation.
 */
import { useState } from 'react';
import { Button, Modal } from 'antd';

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
  const [confirming, setConfirming] = useState(false);

  const handleConfirm = () => {
    if (confirming) return;
    const result = onConfirm();
    if (result instanceof Promise) {
      setConfirming(true);
      result
        .catch((err) => onError?.(err))
        .finally(() => setConfirming(false));
    }
  };

  return (
    <Modal
      open={open}
      title={title}
      onCancel={onCancel}
      closable={!confirming}
      maskClosable={!confirming}
      footer={[
        <Button key="cancel" onClick={onCancel} disabled={confirming}>
          {cancelLabel}
        </Button>,
        <Button
          key="confirm"
          type="primary"
          danger={variant === 'destructive'}
          loading={confirming}
          onClick={handleConfirm}
        >
          {confirmLabel}
        </Button>,
      ]}
    >
      <p style={{ margin: 0 }}>{message}</p>
    </Modal>
  );
}
