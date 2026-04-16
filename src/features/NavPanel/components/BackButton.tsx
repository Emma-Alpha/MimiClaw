import { type ActionIconProps } from '@lobehub/ui';
import { ActionIcon } from '@lobehub/ui';
import { ChevronLeftIcon } from 'lucide-react';
import { memo } from 'react';
import { Link } from 'react-router-dom';

const DESKTOP_HEADER_ICON_SIZE: ActionIconProps['size'] = { blockSize: 32, size: 20 };

export const BACK_BUTTON_ID = 'mimi-back-button';

const BackButton = memo<ActionIconProps & { to?: string }>(({ to = '/', onClick, ...rest }) => {
  return (
    // @ts-expect-error
    <Link to={to} onClick={onClick}>
      <ActionIcon
        icon={ChevronLeftIcon}
        id={BACK_BUTTON_ID}
        size={DESKTOP_HEADER_ICON_SIZE}
        {...rest}
      />
    </Link>
  );
});

export default BackButton;
