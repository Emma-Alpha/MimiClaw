import { memo } from 'react';

export interface MessageContentProps {
  message?: React.ReactNode;
  messageExtra?: React.ReactNode;
  variant?: 'bubble' | 'default';
  onDoubleClick?: React.MouseEventHandler<HTMLDivElement>;
  className?: string;
}

const MessageContent = memo<MessageContentProps>(
  ({ message, messageExtra, variant, onDoubleClick, className }) => {
    const isBubble = variant === 'bubble';

    return (
      <div
        className={className}
        style={{
          position: 'relative',
          overflow: 'hidden',
          maxWidth: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          ...(isBubble && {
            padding: '8px 12px',
            borderRadius: 8,
            backgroundColor: 'rgba(0, 0, 0, 0.02)',
          }),
        }}
        onDoubleClick={onDoubleClick}
      >
        {message}
        {messageExtra}
      </div>
    );
  },
);

MessageContent.displayName = 'MessageContent';

export default MessageContent;
