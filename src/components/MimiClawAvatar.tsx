import { memo } from 'react';

import avatarSrc from '@/assets/mimiclaw-avatar.png';

interface MimiClawAvatarProps {
  size?: number;
}

const MimiClawAvatar = memo<MimiClawAvatarProps>(({ size = 24 }) => (
  <img
    alt="MimiClaw"
    src={avatarSrc}
    width={size}
    height={size}
    style={{ borderRadius: '50%', objectFit: 'cover', display: 'block' }}
  />
));

MimiClawAvatar.displayName = 'MimiClawAvatar';

export default MimiClawAvatar;
