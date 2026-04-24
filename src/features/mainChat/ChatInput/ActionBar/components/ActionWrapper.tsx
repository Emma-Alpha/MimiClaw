import { ActionIcon } from '@lobehub/ui';
import { Dropdown, Popover, type MenuProps } from 'antd';
import type { FC, ReactNode } from 'react';
import { memo } from 'react';
import type { LucideProps } from 'lucide-react';

export interface ActionWrapperProps {
  icon: FC<LucideProps>;
  title: string;
  active?: boolean;
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  popoverContent?: ReactNode;
  popoverOpen?: boolean;
  onPopoverOpenChange?: (open: boolean) => void;
  dropdownMenu?: MenuProps;
}

export const ActionWrapper = memo<ActionWrapperProps>(({
  icon,
  title,
  active,
  disabled,
  loading,
  onClick,
  popoverContent,
  popoverOpen,
  onPopoverOpenChange,
  dropdownMenu,
}) => {
  const iconNode = (
    <ActionIcon
      active={active}
      disabled={disabled}
      icon={icon}
      loading={loading}
      onClick={!popoverContent && !dropdownMenu ? onClick : undefined}
      title={disabled ? `${title} (unavailable)` : title}
    />
  );

  if (popoverContent) {
    return (
      <Popover
        content={popoverContent}
        onOpenChange={onPopoverOpenChange}
        open={popoverOpen}
        placement="top"
        trigger={['click']}
      >
        <span>{iconNode}</span>
      </Popover>
    );
  }

  if (dropdownMenu) {
    return (
      <Dropdown menu={dropdownMenu} placement="topLeft" trigger={['click']}>
        <span>{iconNode}</span>
      </Dropdown>
    );
  }

  return iconNode;
});

ActionWrapper.displayName = 'ActionWrapper';
