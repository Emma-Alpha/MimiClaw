import { ActionIcon, Avatar, Block, Flexbox, Icon } from '@lobehub/ui';
import { ExternalLink, Loader2, Plus, Trash2 } from 'lucide-react';
import { Button, Modal } from 'antd';
import { memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { invokeIpc } from '@/lib/api-client';
import SkillDetailModalContent from '@/features/SkillStore/SkillDetail/SkillDetailModalContent';
import MarketSkillDetailModalContent from '@/features/SkillStore/SkillDetail/MarketSkillDetailModalContent';
import type { MarketplaceSkill, Skill } from '@/types/skill';
import { useSkillStoreListStyles } from '../style';

interface MarketSkillItemProps {
  installedSkill?: Skill;
  loading: boolean;
  skill: MarketplaceSkill;
  onInstall: (slug: string) => void;
  onUninstall: (slug: string) => void;
}

const MarketSkillItem = memo<MarketSkillItemProps>(
  ({ skill, installedSkill, loading, onInstall, onUninstall }) => {
    const { styles } = useSkillStoreListStyles();
    const { t } = useTranslation('skills');
    const [detailOpen, setDetailOpen] = useState(false);

    const handleOpenSource = useCallback(async () => {
      const target = skill.url?.trim();
      if (!target) return;
      await invokeIpc('shell:openExternal', target);
    }, [skill.url]);

    const installed = !!installedSkill;
    const canUninstall = installed && !installedSkill.isCore;

    return (
      <Flexbox gap={0}>
        <Block
          horizontal
          align={'center'}
          gap={12}
          paddingBlock={12}
          paddingInline={12}
          variant={'outlined'}
        >
          <Avatar
            avatar={skill.name}
            shape={'square'}
            size={40}
            style={{ flex: 'none' }}
          />
          <Flexbox flex={1} gap={4} style={{ minWidth: 0, overflow: 'hidden' }}>
            <Flexbox horizontal align="center" gap={8}>
              <span className={styles.itemTitle} onClick={() => setDetailOpen(true)}>
                {skill.name}
              </span>
              <span className={styles.itemBadge}>skills.sh</span>
            </Flexbox>
            {skill.description && (
              <span className={styles.itemDescription}>{skill.description}</span>
            )}
          </Flexbox>
          {loading ? (
            <ActionIcon icon={Loader2} loading />
          ) : installed ? (
            canUninstall ? (
              <ActionIcon
                icon={Trash2}
                title={t('detail.uninstall', { defaultValue: 'Uninstall' })}
                onClick={() => onUninstall(skill.slug)}
              />
            ) : (
              <ActionIcon
                disabled
                icon={ExternalLink}
                title={t('detail.openManual', { defaultValue: 'Open manual' })}
                onClick={() => void handleOpenSource()}
              />
            )
          ) : (
            <ActionIcon
              icon={Plus}
              title={t('marketplace.install', { defaultValue: 'Install' })}
              onClick={() => onInstall(skill.slug)}
            />
          )}
          {installed && (
            <Icon
              icon={ExternalLink}
              style={{ color: 'var(--ant-color-text-tertiary)', cursor: 'pointer' }}
              onClick={() => void handleOpenSource()}
            />
          )}
        </Block>
        <Modal
          open={detailOpen}
          footer={null}
          onCancel={() => setDetailOpen(false)}
          title={t('list.modalTitle', { defaultValue: 'Skill details' })}
          width={960}
          centered
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div
              style={{
                maxHeight: 'calc(100dvh - 300px)',
                overflowY: 'auto',
                overflowX: 'hidden',
              }}
            >
              {installedSkill ? (
                <SkillDetailModalContent skill={installedSkill} />
              ) : (
                <MarketSkillDetailModalContent marketSkill={skill} />
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              {!installed && (
                <Button type="primary" loading={loading} onClick={() => onInstall(skill.slug)}>
                  {t('marketplace.install', { defaultValue: 'Install' })}
                </Button>
              )}
              {canUninstall && (
                <Button danger loading={loading} onClick={() => onUninstall(skill.slug)}>
                  {t('detail.uninstall', { defaultValue: 'Uninstall' })}
                </Button>
              )}
              {skill.url && (
                <Button onClick={() => void handleOpenSource()}>
                  {t('detail.openManual', { defaultValue: 'Open manual' })}
                </Button>
              )}
            </div>
          </div>
        </Modal>
      </Flexbox>
    );
  },
);

MarketSkillItem.displayName = 'MarketSkillItem';

export default MarketSkillItem;
