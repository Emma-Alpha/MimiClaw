import { MCP } from '@lobehub/icons';
import { Avatar } from '@lobehub/ui';
import { type CSSProperties } from 'react';
import { memo } from 'react';

interface PluginAvatarProps {
  alt?: string;
  avatar?: string;
  size?: number;
  style?: CSSProperties;
}

// @lobehub/ui Avatar only recognizes strings starting with "/", "http", or
// "data:" as image URLs. In packaged Electron builds, Vite-imported assets
// resolve to "file://" URLs, which get treated as text and render the first
// two letters ("FI") as a fallback. Detect URL-shaped strings ourselves and
// render <img> directly.
const isImageUrl = (value: string) =>
  /^(https?:|data:|file:|blob:|\/)/i.test(value) || /\.(png|jpe?g|gif|svg|webp|avif|ico)(\?|$)/i.test(value);

const PluginAvatar = memo<PluginAvatarProps>(({ avatar, style, size = 40, alt }) => {
  if (avatar === 'MCP_AVATAR') {
    return (
      <MCP.Avatar
        className={'ant-avatar'}
        shape={'square'}
        size={size}
        style={{ flex: 'none', overflow: 'hidden', ...style }}
      />
    );
  }

  if (typeof avatar === 'string' && isImageUrl(avatar)) {
    return (
      <img
        alt={alt || 'plugin'}
        src={avatar}
        width={size}
        height={size}
        style={{
          borderRadius: 6,
          flex: 'none',
          objectFit: 'cover',
          overflow: 'hidden',
          ...style,
        }}
      />
    );
  }

  return (
    <Avatar
      alt={alt}
      avatar={avatar}
      shape={'square'}
      size={size}
      style={{ flex: 'none', overflow: 'hidden', ...style }}
    />
  );
});

export default PluginAvatar;
