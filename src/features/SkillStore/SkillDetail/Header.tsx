import { Avatar, Flexbox, Text } from '@lobehub/ui';
import { memo, useMemo, useState } from 'react';
import { useDetailContext } from './DetailContext';
import { ICON_SIZE, styles } from './styles';

const IMAGE_ICON_RE = /^(https?:\/\/|data:image\/|blob:|file:\/\/|\/)/i;

const Header = memo(() => {
  const { icon, label, localizedDescription } = useDetailContext();
  const [failedImageSrc, setFailedImageSrc] = useState<string | null>(null);

  const showImage = useMemo(() => {
    if (!icon) return false;
    const normalizedIcon = icon.trim();
    if (normalizedIcon === failedImageSrc) return false;
    return IMAGE_ICON_RE.test(normalizedIcon);
  }, [icon, failedImageSrc]);

  return (
    <Flexbox horizontal align="center" className={styles.header} gap={16} justify="space-between">
      <Flexbox horizontal align="center" gap={16} style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
        <div className={styles.icon}>
          {showImage ? (
            <img
              alt={label}
              onError={(event) => setFailedImageSrc(event.currentTarget.src)}
              src={icon}
              style={{ width: ICON_SIZE, height: ICON_SIZE, objectFit: 'contain' }}
            />
          ) : (
            <Avatar avatar={icon || '🧩'} size={ICON_SIZE} />
          )}
        </div>
        <Flexbox gap={4} style={{ minWidth: 0, overflow: 'hidden' }}>
          <span className={styles.title}>{label}</span>
          <Text style={{ fontSize: 14 }} type="secondary">
            {localizedDescription}
          </Text>
        </Flexbox>
      </Flexbox>
    </Flexbox>
  );
});

Header.displayName = 'Header';

export default Header;
