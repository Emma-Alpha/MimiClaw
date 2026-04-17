import { Avatar, Flexbox, Text } from '@lobehub/ui';
import { memo } from 'react';
import { useDetailContext } from './DetailContext';
import { ICON_SIZE, styles } from './styles';

const Header = memo(() => {
  const { icon, label, localizedDescription } = useDetailContext();

  return (
    <Flexbox horizontal align="center" className={styles.header} gap={16} justify="space-between">
      <Flexbox horizontal align="center" gap={16} style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
        <div className={styles.icon}>
          <Avatar avatar={icon || '🧩'} size={ICON_SIZE} />
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
