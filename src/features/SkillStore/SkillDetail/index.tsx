import { createModal } from '@lobehub/ui';
import { t } from 'i18next';
import type { Skill } from '@/types/skill';
import SkillDetailModalContent from './SkillDetailModalContent';

export interface CreateSkillDetailModalOptions {
  skill: Skill;
}

export const createSkillDetailModal = ({ skill }: CreateSkillDetailModalOptions) =>
  createModal({
    children: <SkillDetailModalContent skill={skill} />,
    destroyOnHidden: true,
    footer: null,
    title: t('list.modalTitle', { defaultValue: 'Skill details', ns: 'skills' }),
    width: 900,
    centered: true,
  });
