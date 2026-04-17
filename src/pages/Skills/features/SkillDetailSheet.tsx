import { Modal } from 'antd';
import type { Skill } from '@/types/skill';
import { useTranslation } from 'react-i18next';
import { useSkillsStyles } from '../styles';
import type { SkillPermissions } from '../lib/skill-permissions';
import { SkillDetailContent } from '@/features/SkillStore/SkillDetail/SkillDetailContent';

export interface SkillDetailSheetProps {
  skill: Skill | null;
  isOpen: boolean;
  onClose: () => void;
  onToggle: (enabled: boolean) => void;
  onUninstall?: (slug: string) => void;
  onOpenFolder?: (skill: Skill) => Promise<void> | void;
  permissions: SkillPermissions;
}

export function SkillDetailSheet({
  skill,
  isOpen,
  onClose,
  onToggle,
  onUninstall,
  onOpenFolder,
  permissions,
}: SkillDetailSheetProps) {
  const { t } = useTranslation('skills');
  const { styles } = useSkillsStyles();

  if (!skill) return null;

  return (
    <Modal
      open={isOpen}
      onCancel={onClose}
      footer={null}
      centered
      width={860}
      title={t('list.modalTitle', { defaultValue: 'Skill details' })}
      className={styles.skillDetailModal}
      destroyOnHidden
    >
      <SkillDetailContent
        skill={skill}
        onClose={onClose}
        onToggle={onToggle}
        onUninstall={onUninstall}
        onOpenFolder={onOpenFolder}
        permissions={permissions}
      />
    </Modal>
  );
}
