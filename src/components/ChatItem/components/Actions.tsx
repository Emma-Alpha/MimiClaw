import { memo } from 'react';

export interface ActionsProps {
  actions?: React.ReactNode;
  placement?: 'left' | 'right';
}

const Actions = memo<ActionsProps>(({ placement, actions }) => {
  const isUser = placement === 'right';

  if (!actions) return null;

  return (
    <div
      role="menubar"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        alignSelf: isUser ? 'flex-end' : 'flex-start',
      }}
    >
      {actions}
    </div>
  );
});

Actions.displayName = 'ChatItemActions';

export default Actions;
