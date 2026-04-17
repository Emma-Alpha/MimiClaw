import { useEffect } from 'react';
import { Button, Icon } from '@lobehub/ui';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { SkillStoreContent } from '@/features/SkillStore/SkillStoreContent';
import { trackUiEvent } from '@/lib/telemetry';
import { SettingHeader } from '@/pages/Settings/components/SettingHeader';
import { useSkillsStyles } from '../styles';

export function SkillsStorePage() {
  const navigate = useNavigate();
  const { t } = useTranslation('skills');
  const { styles } = useSkillsStyles();

  useEffect(() => {
    trackUiEvent('skills.store_open', {});
  }, []);

  return (
    <div className={styles.pageRoot}>
      <div className={styles.pageInner}>
        <SettingHeader
          leading={
            <Button icon={<Icon icon={ArrowLeft} />} onClick={() => navigate('/skills')} type={'text'} />
          }
          title={t('store.open', { defaultValue: 'Skill store' })}
        />
        <div style={{ minWidth: 0, width: '100%' }}>
          <SkillStoreContent />
        </div>
      </div>
    </div>
  );
}
