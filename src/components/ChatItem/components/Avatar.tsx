import { Avatar as AntdAvatar } from 'antd';
import { type CSSProperties, memo } from 'react';
import { type MetaData } from '../types';

export interface AvatarProps {
  avatar: MetaData;
  loading?: boolean;
  onClick?: () => void;
  size?: number;
  style?: CSSProperties;
}

const Avatar = memo<AvatarProps>(({ loading, avatar, onClick, size = 40, style }) => {
  // 如果 avatar.avatar 是 ReactNode，直接渲染
  if (avatar.avatar && typeof avatar.avatar !== 'string') {
    return (
      <div
        style={{
          width: size,
          height: size,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: avatar.backgroundColor || 'transparent',
          borderRadius: 8,
          cursor: onClick ? 'pointer' : 'default',
          flexShrink: 0,
          ...style,
        }}
        onClick={onClick}
      >
        {avatar.avatar}
      </div>
    );
  }

  return (
    <AntdAvatar
      src={typeof avatar.avatar === 'string' ? avatar.avatar : undefined}
      alt={avatar.title}
      size={size}
      shape="square"
      style={{
        backgroundColor: avatar.backgroundColor || '#1890ff',
        cursor: onClick ? 'pointer' : 'default',
        flexShrink: 0,
        ...style,
      }}
      onClick={onClick}
    >
      {!avatar.avatar && avatar.title?.[0]?.toUpperCase()}
    </AntdAvatar>
  );
});

Avatar.displayName = 'ChatItemAvatar';

export default Avatar;
