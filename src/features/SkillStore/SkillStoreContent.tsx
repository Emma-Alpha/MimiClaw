import { Flexbox } from '@lobehub/ui';
import { useState } from 'react';
import Search from './Search';
import MarketSkillList from './SkillList/MarketSkills';

enum SkillStoreTab {
  Skills = 'skills',
}

export const SkillStoreContent = () => {
  const [activeTab] = useState<SkillStoreTab>(SkillStoreTab.Skills);
  const [skillKeywords, setSkillKeywords] = useState('');


  return (
    <Flexbox
      gap={8}
      style={{ maxHeight: '75vh', minWidth: 0, width: '100%', boxSizing: 'border-box' }}
      width={'100%'}
    >
      <Flexbox gap={8} paddingInline={8} style={{ minWidth: 0, boxSizing: 'border-box' }}>
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
