import { Flexbox, Icon, Text, Typography } from '@lobehub/ui';
import { ExternalLink } from 'lucide-react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { useDetailContext } from './DetailContext';
import { styles } from './styles';

function extractSummary(markdown: string): string {
  if (!markdown) return '';
  const cleaned = markdown
    .replace(/^---[\s\S]*?---\s*/m, '')
    .replace(/`{3}[\s\S]*?`{3}/g, '')
    .replace(/^#+\s*/gm, '')
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .trim();
  const firstBlock = cleaned.split(/\n{2,}/).find((line) => line.trim().length > 0) || '';
  return firstBlock;
}

const Overview = memo(() => {
  const { t } = useTranslation('skills');
  const { author, readme, description } = useDetailContext();
  const intro = extractSummary(readme) || description;

  return (
    <Flexbox gap={20}>
      <Typography className={styles.introduction}>{intro || t('detail.noOverview', { defaultValue: '暂无介绍。' })}</Typography>

      <Flexbox gap={8}>
        <Flexbox horizontal align="center" gap={4}>
          <span className={styles.sectionTitle}>{t('detail.developedBy', { defaultValue: '开发者' })}</span>
          <span className={styles.authorLink}>
            {author}
            {author && <Icon icon={ExternalLink} size={12} />}
          </span>
        </Flexbox>
        <Text className={styles.trustWarning} type="secondary">
          {t('detail.trustWarning', {
            defaultValue: '请仅使用你信任的开发者提供的技能，并自行确认其行为与权限。',
          })}
        </Text>
      </Flexbox>
    </Flexbox>
  );
});

Overview.displayName = 'Overview';

export default Overview;
