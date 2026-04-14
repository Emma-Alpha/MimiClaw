import { memo } from 'react';
import { ArrowDown } from 'lucide-react';
import { createStyles, cx } from 'antd-style';
import { useTranslation } from 'react-i18next';

const useStyles = createStyles(({ token, css }) => ({
  btn: css`
    pointer-events: none;
    position: absolute;
    z-index: 8;
    inset-block-end: 16px;
    inset-inline-end: 16px;

    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: 1px solid ${token.colorBorderSecondary};
    background: ${token.colorBgElevated};
    box-shadow: ${token.boxShadowSecondary};
    color: ${token.colorTextSecondary};
    cursor: pointer;

    opacity: 0;
    transform: translateY(16px);
    transition: opacity 0.2s ease, transform 0.2s ease, background 0.15s, color 0.15s;

    &:hover {
      background: ${token.colorBgContainer};
      color: ${token.colorText};
    }
  `,
  visible: css`
    pointer-events: all;
    opacity: 1;
    transform: translateY(0);
  `,
}));

interface BackBottomButtonProps {
  visible: boolean;
  onScrollToBottom: () => void;
  className?: string;
}

export const BackBottomButton = memo(function BackBottomButton({
  visible,
  onScrollToBottom,
  className,
}: BackBottomButtonProps) {
  const { styles } = useStyles();
  const { t } = useTranslation();

  return (
    <button
      type="button"
      className={cx(styles.btn, visible && styles.visible, className)}
      title={t('backToBottom', { defaultValue: 'Back to bottom' })}
      onClick={onScrollToBottom}
    >
      <ArrowDown size={18} />
    </button>
  );
});
