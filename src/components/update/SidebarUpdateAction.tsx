import { createStyles } from 'antd-style';
import { Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { useUpdateStore } from '@/stores/update';

const useStyles = createStyles(({ css, token }) => ({
  button: css`
    height: 28px;
    border-radius: 9999px;
    padding-inline: 14px;
    font-size: 12px;
    font-weight: 600;
    min-width: 0;

    @container sidebar-topbar (width <= 280px) {
      width: 28px;
      min-width: 28px;
      padding-inline: 0;
    }
  `,
  icon: css`
    display: none;
    width: 14px;
    height: 14px;

    @container sidebar-topbar (width <= 280px) {
      display: inline-flex;
    }
  `,
  label: css`
    display: inline-flex;

    @container sidebar-topbar (width <= 280px) {
      display: none;
    }
  `,
  iconOnlyButton: css`
    @container sidebar-topbar (width <= 280px) {
      box-shadow: ${token.boxShadowSecondary};
    }
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

  const updateLabel = t('updates.title', { defaultValue: '更新' });

  return (
    <Button
      aria-label={updateLabel}
      title={updateLabel}
      className={`${styles.button} ${styles.iconOnlyButton}`}
      type="primary"
      onClick={() => openUpdateAvailablePopup()}
    >
      <Download className={styles.icon} />
      <span className={styles.label}>{updateLabel}</span>
    </Button>
  );
}
