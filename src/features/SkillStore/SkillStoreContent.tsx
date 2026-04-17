import { Flexbox, Segmented } from '@lobehub/ui';
import type { SegmentedOptions } from 'antd/es/segmented';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Search from './Search';
import MarketSkillList from './SkillList/MarketSkills';

enum SkillStoreTab {
  Skills = 'skills',
}

export const SkillStoreContent = () => {
  const { t } = useTranslation('skills');
  const [activeTab, setActiveTab] = useState<SkillStoreTab>(SkillStoreTab.Skills);
  const [skillKeywords, setSkillKeywords] = useState('');

  const options: SegmentedOptions = useMemo(
    () => [
      {
        label: t('store.open', { defaultValue: 'Skill store' }),
        value: SkillStoreTab.Skills,
      },
    ],
    [t],
  );

  return (
    <Flexbox
      gap={8}
      style={{ maxHeight: '75vh', minWidth: 0, width: '100%', boxSizing: 'border-box' }}
      width={'100%'}
    >
      <Flexbox gap={8} paddingInline={8} style={{ minWidth: 0, boxSizing: 'border-box' }}>
        <Flexbox horizontal align={'center'} gap={8}>
          <Segmented
            block
            options={options}
            style={{ flex: 1 }}
            value={activeTab}
            variant={'filled'}
            onChange={(v) => setActiveTab(v as SkillStoreTab)}
          />
        </Flexbox>
        <Search onSkillSearch={setSkillKeywords} />
      </Flexbox>
      <Flexbox height={496} style={{ minWidth: 0, boxSizing: 'border-box' }}>
        <Flexbox
          flex={1}
          style={{
            display: activeTab === SkillStoreTab.Skills ? 'flex' : 'none',
            overflow: 'auto',
            minWidth: 0,
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          <MarketSkillList keywords={skillKeywords} />
        </Flexbox>
      </Flexbox>
    </Flexbox>
  );
};
