import { createStyles } from 'antd-style';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { useUpdateStore } from '@/stores/update';

const useStyles = createStyles(({ css }) => ({
  button: css`
    height: 28px;
    border-radius: 9999px;
    padding-inline: 14px;
    font-size: 12px;
    font-weight: 600;
  `,
}));

export function SidebarUpdateAction() {
  const { styles } = useStyles();
  const { t } = useTranslation('settings');

  const status = useUpdateStore((s) => s.status);
  const availableUpdateTier = useUpdateStore((s) => s.availableUpdateTier);
  const forcedUpdateModal = useUpdateStore((s) => s.forcedUpdateModal);
  const openUpdateAvailablePopup = useUpdateStore((s) => s.openUpdateAvailablePopup);

  if (forcedUpdateModal) return null;
  if (status !== 'available' || availableUpdateTier !== 'patch') return null;

  return (
    <Button className={styles.button} type="primary" onClick={() => openUpdateAvailablePopup()}>
      {t('updates.title', { defaultValue: '更新' })}
    </Button>
  );
}
