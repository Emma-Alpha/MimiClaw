import { Center, Icon, Text } from '@lobehub/ui';
import { cssVar } from 'antd-style';
import { InboxIcon } from 'lucide-react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

const Agents = memo(() => {
  const { t } = useTranslation('skills');

  return (
    <Center gap={12} padding={40}>
      <Icon color={cssVar.colorTextDescription} icon={InboxIcon} size={64} />
      <Text type="secondary">
        {t('detail.noAgents', { defaultValue: '暂无使用该技能的助理信息。' })}
      </Text>
    </Center>
  );
});

Agents.displayName = 'Agents';

export default Agents;
