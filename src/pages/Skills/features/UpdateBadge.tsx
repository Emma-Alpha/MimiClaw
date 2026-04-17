import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';

export function UpdateBadge() {
  const { t } = useTranslation('skills');
  return (
    <Badge variant="outline" className="text-xs">
      {t('update.available', { defaultValue: 'Update' })}
    </Badge>
  );
}
