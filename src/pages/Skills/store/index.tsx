import { useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { trackUiEvent } from '@/lib/telemetry';
import { SkillStoreContent } from '@/features/SkillStore/SkillStoreContent';
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
        <div className={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Button type="text" size="small" onClick={() => navigate('/skills')}>
              <ArrowLeft style={{ width: 18, height: 18 }} />
            </Button>
            <div>
              <h1 className={styles.headerTitle}>
                {t('store.title', { defaultValue: 'Skill store' })}
              </h1>
              <p className={styles.headerSubtitle}>
                {t('store.subtitle', {
                  defaultValue:
                    'Search and install skills via npx skills (skills.sh).',
                })}
              </p>
            </div>
          </div>
        </div>
        <SkillStoreContent />
      </div>
    </div>
  );
}

