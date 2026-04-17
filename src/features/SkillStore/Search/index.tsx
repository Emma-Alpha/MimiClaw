import { Flexbox, SearchBar } from '@lobehub/ui';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSkillsStore } from '@/stores/skills';

interface SearchProps {
  onSkillSearch: (keywords: string) => void;
}

const Search = memo<SearchProps>(({ onSkillSearch }) => {
  const { t } = useTranslation('skills');
  const searching = useSkillsStore((s) => s.searching);

  return (
    <Flexbox horizontal align={'center'} gap={8} justify={'space-between'}>
      <Flexbox flex={1}>
        <SearchBar
          allowClear
          loading={searching}
          placeholder={t('searchMarketplace', {
            defaultValue: 'Search marketplace...',
          })}
          variant="outlined"
          onSearch={(keywords: string) => {
            onSkillSearch(keywords);
          }}
        />
      </Flexbox>
    </Flexbox>
  );
});

Search.displayName = 'SkillStoreSearch';

export default Search;
