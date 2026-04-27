import { Flexbox, Text } from '@lobehub/ui';
import { createStyles } from 'antd-style';
import { Clock, Plus } from 'lucide-react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

const useStyles = createStyles(({ css, token }) => ({
  page: css`
    height: 100%;
    overflow-y: auto;
    padding: 24px 32px;
  `,
  emptyState: css`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 80px 24px;
    gap: 16px;
  `,
  emptyIcon: css`
    width: 64px;
    height: 64px;
    border-radius: 16px;
    background: ${token.colorFillSecondary};
    display: flex;
    align-items: center;
    justify-content: center;
    color: ${token.colorTextSecondary};
  `,
  createButton: css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    border-radius: 8px;
    border: 1px solid ${token.colorBorder};
    background: transparent;
    color: ${token.colorText};
    cursor: pointer;
    font-size: 13px;
    transition: border-color 0.15s;

    &:hover {
      border-color: ${token.colorPrimary};
    }
  `,
}));

const CronPage = memo(() => {
  const { styles } = useStyles();
  const { t } = useTranslation('cron');

  return (
    <div className={styles.page}>
      <Flexbox gap={8} style={{ marginBottom: 24 }}>
        <Text style={{ fontSize: 20, fontWeight: 600 }}>{t('title')}</Text>
        <Text type="secondary">{t('subtitle')}</Text>
      </Flexbox>

      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>
          <Clock size={28} />
        </div>
        <Text weight={500}>{t('empty.title')}</Text>
        <Text type="secondary" style={{ textAlign: 'center', maxWidth: 320 }}>
          {t('empty.description')}
        </Text>
        <button type="button" className={styles.createButton}>
          <Plus size={14} />
          {t('empty.create')}
        </button>
      </div>
    </div>
  );
});

export { CronPage as Cron };
export default CronPage;
