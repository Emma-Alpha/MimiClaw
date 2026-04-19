import { ActionIcon, Text } from '@lobehub/ui';
import type { ActionIconProps } from '@lobehub/ui';
import { createStaticStyles } from 'antd-style';
import { ChevronLeftIcon } from 'lucide-react';
import { type MouseEvent, type ReactNode, memo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const DESKTOP_HEADER_ICON_SIZE: ActionIconProps['size'] = { blockSize: 32, size: 20 };

export const BACK_BUTTON_ID = 'mimi-back-button';

const styles = createStaticStyles(({ css, cssVar }) => ({
  button: css`
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    min-width: 0;
    padding: 0;
    border: 0;
    background: transparent;
    color: ${cssVar.colorTextSecondary};
    font: inherit;
    text-align: left;

    &:hover {
      color: ${cssVar.colorText};
    }
  `,
  label: css`
    min-width: 0;
  `,
}));

interface BackButtonProps extends Omit<ActionIconProps, 'onClick'> {
  label?: ReactNode;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  preferHistoryBack?: boolean;
  to?: string;
}

const BackButton = memo<BackButtonProps>(
  ({ label, preferHistoryBack = false, to = '/', onClick, ...rest }) => {
    const navigate = useNavigate();

    const handleClick = useCallback(
      (event: MouseEvent<HTMLButtonElement>) => {
        onClick?.(event);
        if (event.defaultPrevented) return;

        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
          return;
        }

        if (preferHistoryBack) {
          const historyIndex = window.history.state?.idx;
          if (typeof historyIndex === 'number' && historyIndex > 0) {
            event.preventDefault();
            navigate(-1);
            return;
          }
        }

        event.preventDefault();
        navigate(to);
      },
      [navigate, onClick, preferHistoryBack, to],
    );

    return (
      <button className={styles.button} id={BACK_BUTTON_ID} onClick={handleClick} type="button">
        <ActionIcon
          icon={ChevronLeftIcon}
          size={DESKTOP_HEADER_ICON_SIZE}
          {...rest}
        />
        {label && (
          typeof label === 'string' ? (
            <Text className={styles.label} ellipsis fontSize={16} weight={500}>
              {label}
            </Text>
          ) : (
            label
          )
        )}
      </button>
    );
  },
);

export default BackButton;
