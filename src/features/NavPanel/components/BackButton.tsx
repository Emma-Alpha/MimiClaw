import { type ActionIconProps } from '@lobehub/ui';
import { ActionIcon } from '@lobehub/ui';
import { ChevronLeftIcon } from 'lucide-react';
import { type MouseEvent, memo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const DESKTOP_HEADER_ICON_SIZE: ActionIconProps['size'] = { blockSize: 32, size: 20 };

export const BACK_BUTTON_ID = 'mimi-back-button';

interface BackButtonProps extends ActionIconProps {
  preferHistoryBack?: boolean;
  to?: string;
}

type BackButtonClickEvent = Parameters<NonNullable<ActionIconProps['onClick']>>[0];

const BackButton = memo<BackButtonProps>(
  ({ preferHistoryBack = false, to = '/', onClick, ...rest }) => {
    const navigate = useNavigate();

    const handleClick = useCallback(
      (event: MouseEvent<HTMLAnchorElement>) => {
        onClick?.(event as unknown as BackButtonClickEvent);
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
      <Link to={to} onClick={handleClick}>
        <ActionIcon
          icon={ChevronLeftIcon}
          id={BACK_BUTTON_ID}
          size={DESKTOP_HEADER_ICON_SIZE}
          {...rest}
        />
      </Link>
    );
  },
);

export default BackButton;
