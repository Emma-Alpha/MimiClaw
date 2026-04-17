import { createModal } from '@lobehub/ui';
import { createStaticStyles } from 'antd-style';
import { t } from 'i18next';
import type { Skill } from '@/types/skill';
import SkillDetailModalContent from './SkillDetailModalContent';

export interface CreateSkillDetailModalOptions {
  skill: Skill;
}

const detailModalStyles = createStaticStyles(({ css, cssVar }) => ({
  modal: css`
    & .ant-modal-content {
      overflow: hidden;
    }

    & .ant-modal-header {
      position: sticky;
      top: 0;
      z-index: 10;
      background: color-mix(in srgb, ${cssVar.colorBgElevated} 78%, transparent);
      backdrop-filter: blur(14px) saturate(130%);
      -webkit-backdrop-filter: blur(14px) saturate(130%);
    }

    & .ant-modal-body {
      max-height: min(78vh, 820px);
      overflow-y: auto;
      overflow-x: hidden;
    }
  `,
}));

export const createSkillDetailModal = ({ skill }: CreateSkillDetailModalOptions) =>
  createModal({
    className: detailModalStyles.modal,
    children: <SkillDetailModalContent skill={skill} />,
    destroyOnHidden: true,
    footer: null,
    title: t('list.modalTitle', { defaultValue: 'Skill details', ns: 'skills' }),
    width: 900,
    centered: true,
  });
