import { Block, Center, Flexbox, Icon, Skeleton, Text } from '@lobehub/ui';
import { ClaudeCode, OpenClaw } from '@lobehub/icons';
import { cssVar } from 'antd-style';
import { BotIcon, InboxIcon, LaptopIcon, ServerIcon } from 'lucide-react';
import { memo, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAgentsStore } from '@/stores/agents';
import { categorizeSkill } from '@/pages/Skills/lib/source-taxonomy';
import { useDetailContext } from './DetailContext';
import { agentListStyles } from './style';

interface SkillAgentItem {
  description: string;
  iconType: 'claude-code' | 'openclaw' | 'local-fallback' | 'remote-fallback';
  id: string;
  name: string;
}

const Agents = memo(() => {
  const { t } = useTranslation('skills');
  const { skill } = useDetailContext();
  const agents = useAgentsStore((s) => s.agents);
  const loading = useAgentsStore((s) => s.loading);
  const fetchAgents = useAgentsStore((s) => s.fetchAgents);

  const category = categorizeSkill(skill);
  const includeClaudeCode = category === 'local';
  const includeOpenClaw = category === 'bundled' || category === 'remote';

  useEffect(() => {
    if (!includeOpenClaw) return;
    if (agents.length > 0) return;
    void fetchAgents();
  }, [agents.length, fetchAgents, includeOpenClaw]);

  const items = useMemo<SkillAgentItem[]>(() => {
    const list: SkillAgentItem[] = [];

    if (includeClaudeCode) {
      list.push({
        description: t('source.badge.agentsPersonal', {
          defaultValue: 'Personal .agents',
        }),
        iconType: 'claude-code',
        id: 'claude-code',
        name: 'Claude Code',
      });
    }

    if (includeOpenClaw) {
      if (agents.length > 0) {
        for (const agent of agents) {
          list.push({
            description: `${agent.modelDisplay} · ${agent.workspace}`,
            iconType: 'openclaw',
            id: `openclaw:${agent.id}`,
            name: agent.name || 'OpenClaw',
          });
        }
      } else {
        list.push({
          description: t('source.badge.managed', { defaultValue: 'Managed' }),
          iconType: 'openclaw',
          id: 'openclaw',
          name: 'OpenClaw',
        });
      }
    }

    return list;
  }, [agents, includeClaudeCode, includeOpenClaw, t]);

  if (loading && includeOpenClaw && agents.length === 0) {
    return (
      <Flexbox gap={12}>
        <Skeleton active avatar={{ shape: 'square', size: 40 }} paragraph={{ rows: 1 }} />
        <Skeleton active avatar={{ shape: 'square', size: 40 }} paragraph={{ rows: 1 }} />
      </Flexbox>
    );
  }

  if (items.length === 0) {
    return (
      <Center gap={12} padding={40}>
        <Icon color={cssVar.colorTextDescription} icon={InboxIcon} size={64} />
        <Text type="secondary">
          {t('detail.noAgents', { defaultValue: '暂无使用该技能的助理信息。' })}
        </Text>
      </Center>
    );
  }

  return (
    <div className={agentListStyles.list}>
      {items.map((item) => (
        <div className={agentListStyles.item} key={item.id}>
          <Block horizontal align={'center'} gap={12} paddingBlock={12} paddingInline={12} variant={'outlined'}>
            {item.iconType === 'claude-code' ? (
              <ClaudeCode.Color size={22} />
            ) : item.iconType === 'openclaw' ? (
              <OpenClaw.Color size={22} />
            ) : item.iconType === 'local-fallback' ? (
              <Icon icon={LaptopIcon} size={22} />
            ) : (
              <Icon icon={ServerIcon} size={22} />
            )}
            <Flexbox gap={2} style={{ minWidth: 0 }}>
              <Flexbox horizontal align={'center'} gap={6}>
                <Text style={{ fontSize: 14, fontWeight: 500 }}>{item.name}</Text>
                <Icon color={cssVar.colorTextDescription} icon={BotIcon} size={14} />
              </Flexbox>
              <Text ellipsis type={'secondary'}>
                {item.description}
              </Text>
            </Flexbox>
          </Block>
        </div>
      ))}
    </div>
  );
});

Agents.displayName = 'Agents';

export default Agents;
