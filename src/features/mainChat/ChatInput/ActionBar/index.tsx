import { ChatInputActions, type ChatInputActionItem } from '@lobehub/editor/react';
import { useMemo } from 'react';
import { useChatInputContext } from '../ChatInputProvider';
import { ACTION_COMPONENT_MAP } from './config';

export function ChatInputActionBar() {
  const {
    leftActions = [],
    rightActions = [],
  } = useChatInputContext();

  const orderedActions = useMemo(
    () => Array.from(new Set([...leftActions, ...rightActions])),
    [leftActions, rightActions],
  );

  const items = useMemo<ChatInputActionItem[]>(
    () => orderedActions.flatMap((action) => {
      const Component = ACTION_COMPONENT_MAP[action];
      if (!Component) return [];
      return [{ children: <Component />, key: action }];
    }),
    [orderedActions],
  );

  return (
    <ChatInputActions
      autoCollapse
      collapseOffset={20}
      items={items}
    />
  );
}
