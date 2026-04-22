import { memo } from 'react';
import Actions from './components/Actions';
import Avatar from './components/Avatar';
import MessageContent from './components/MessageContent';
import Title from './components/Title';
import Usage from './components/Usage';
import type { ChatItemProps } from './types';

const ChatItem = memo<ChatItemProps>(
  ({
    id,
    onAvatarClick,
    actions,
    className,
    loading,
    message,
    placement = 'left',
    avatar,
    showTitle,
    time,
    messageExtra,
    showAvatar = true,
    style,
    onDoubleClick,
    model,
    provider,
    usage,
    performance,
  }) => {
    const isUser = placement === 'right';

    return (
      <div
        data-message-id={id}
        className={className}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: isUser ? 'flex-end' : 'flex-start',
          gap: 8,
          padding: '8px 0',
          paddingLeft: isUser ? 36 : 0,
          ...style,
        }}
      >
        {/* Header: Avatar + Title */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexDirection: isUser ? 'row-reverse' : 'row',
          }}
        >
          {showAvatar && (
            <Avatar avatar={avatar} loading={loading} onClick={onAvatarClick} />
          )}
          <Title avatar={avatar} showTitle={showTitle} time={time} />
        </div>

        {/* Message Body */}
        <div
          style={{
            maxWidth: '100%',
            overflow: 'hidden',
            position: 'relative',
            width: isUser ? undefined : '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <MessageContent
            message={message}
            messageExtra={messageExtra}
            variant={isUser ? 'bubble' : undefined}
            onDoubleClick={onDoubleClick}
          />

          {/* Usage Info */}
          {!isUser && (model || usage) && (
            <Usage model={model} provider={provider} usage={usage} performance={performance} />
          )}
        </div>

        {/* Actions */}
        {actions && <Actions actions={actions} placement={placement} />}
      </div>
    );
  },
);

ChatItem.displayName = 'ChatItem';

export default ChatItem;
export type { ChatItemProps } from './types';
