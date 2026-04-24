import { Wrench } from 'lucide-react';
import type { MenuProps } from 'antd';
import { useCallback, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useSkillsStore } from '@/stores/skills';
import { ActionWrapper } from './ActionWrapper';

export function ToolsAction() {
  const skills = useSkillsStore((s) => s.skills);
  const skillsLoading = useSkillsStore((s) => s.loading);
  const fetchSkills = useSkillsStore((s) => s.fetchSkills);
  const enableSkill = useSkillsStore((s) => s.enableSkill);
  const disableSkill = useSkillsStore((s) => s.disableSkill);

  const enabledSkillIds = useSkillsStore(
    useShallow((s) => s.skills.filter((skill) => skill.enabled).map((skill) => skill.id)),
  );

  const toggleSkillEnabled = useCallback(async (skillId: string) => {
    const target = skills.find((s) => s.id === skillId);
    if (!target) return;
    try {
      if (target.enabled) {
        await disableSkill(skillId);
      } else {
        await enableSkill(skillId);
      }
    } catch (error) {
      console.error('Failed to toggle skill:', error);
    }
  }, [disableSkill, enableSkill, skills]);

  const toolsMenu = useMemo<MenuProps>(() => {
    const items: NonNullable<MenuProps['items']> = skills.length > 0
      ? skills.map((skill) => ({
        disabled: skill.isCore,
        key: skill.id,
        label: `${skill.name}${skill.isCore ? ' (core)' : ''}`,
      }))
      : [{
        disabled: true,
        key: '__empty',
        label: skillsLoading ? 'Loading tools...' : 'No tools installed',
      }];

    return {
      items,
      multiple: true,
      onClick: ({ key }) => {
        if (key === '__empty') return;
        void toggleSkillEnabled(String(key));
      },
      onOpenChange: (open) => {
        if (open && skills.length === 0 && !skillsLoading) {
          void fetchSkills();
        }
      },
      selectedKeys: enabledSkillIds,
      selectable: true,
    };
  }, [enabledSkillIds, fetchSkills, skills, skillsLoading, toggleSkillEnabled]);

  return (
    <ActionWrapper
      active={enabledSkillIds.length > 0}
      dropdownMenu={toolsMenu}
      icon={Wrench}
      title="Tools"
    />
  );
}
