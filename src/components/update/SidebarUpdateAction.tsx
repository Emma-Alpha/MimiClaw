import { ActionIcon } from '@lobehub/ui';
import { createStyles } from 'antd-style';
import { Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useUpdateStore } from '@/stores/update';

const useStyles = createStyles(({ css, token }) => ({
  button: css`
    flex-shrink: 0;
    border: 1px solid rgba(255, 255, 255, 0.16) !important;
    border-radius: 9999px !important;
    background:
      linear-gradient(180deg, color-mix(in srgb, #5cb3ff 72%, white), #0a84ff) !important;
    color: #fff !important;
    box-shadow:
      0 10px 20px -16px rgba(10, 132, 255, 0.92),
      inset 0 1px 0 rgba(255, 255, 255, 0.24);
    transition:
      transform 0.16s ease,
      box-shadow 0.16s ease,
      filter 0.16s ease;

    &:hover {
      transform: translateY(-1px);
      filter: saturate(1.04) brightness(1.02);
      box-shadow:
        0 14px 24px -16px rgba(10, 132, 255, 1),
        inset 0 1px 0 rgba(255, 255, 255, 0.28);
    }

    &:active {
      transform: translateY(0) scale(0.96);
      box-shadow:
        0 6px 14px -14px rgba(10, 132, 255, 0.8),
        inset 0 1px 0 rgba(255, 255, 255, 0.2);
    }

    &:focus-visible {
      outline: none;
      box-shadow:
        0 0 0 2px ${token.colorBgContainer},
        0 0 0 5px rgba(10, 132, 255, 0.3),
        0 14px 24px -16px rgba(10, 132, 255, 1);
    }

    & svg {
      width: 12px;
      height: 12px;
      stroke-width: 2.3;
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
    <ActionIcon
      className={styles.button}
      icon={Download}
      size={{ blockSize: 22, size: 12 }}
      aria-label={updateLabel}
      title={updateLabel}
      onClick={() => openUpdateAvailablePopup()}
    />
  );
}
