import { type ActionIconProps } from '@lobehub/ui';
import { ActionIcon } from '@lobehub/ui';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { type ReactNode } from 'react';
import { memo } from 'react';

const DESKTOP_HEADER_ICON_SIZE: ActionIconProps['size'] = { blockSize: 32, size: 20 };

export const TOGGLE_BUTTON_ID = 'toggle_left_panel_button';

interface ToggleLeftPanelButtonProps {
  expand?: boolean;
  icon?: ActionIconProps['icon'];
  onToggle?: () => void;
  showActive?: boolean;
  size?: ActionIconProps['size'];
  title?: ReactNode;
}

const ToggleLeftPanelButton = memo<ToggleLeftPanelButtonProps>(
  ({ title, showActive, icon, size, expand = true, onToggle }) => {
    return (
      <ActionIcon
        active={showActive ? expand : undefined}
        icon={icon || (expand ? PanelLeftClose : PanelLeftOpen)}
        id={TOGGLE_BUTTON_ID}
        size={size || DESKTOP_HEADER_ICON_SIZE}
        title={title as string}
        onClick={onToggle}
      />
    );
  },
);

export default ToggleLeftPanelButton;
