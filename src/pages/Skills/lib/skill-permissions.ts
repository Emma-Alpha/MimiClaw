import type { Skill } from '@/types/skill';
import type { SkillCategory } from './source-taxonomy';

export interface SkillPermissions {
  canToggle: boolean;
  canUninstall: boolean;
  canConfigure: boolean;
  canUpdate: boolean;
  canOpenFolder: boolean;
}

export function resolvePermissions(skill: Skill, category: SkillCategory): SkillPermissions {
  const isCore = !!skill.isCore;

  if (category === 'bundled') {
    return {
      canToggle: !isCore,
      canUninstall: false,
      canConfigure: false,
      canUpdate: false,
      canOpenFolder: true,
    };
  }

  if (category === 'local') {
    return {
      canToggle: false,
      canUninstall: !isCore,
      canConfigure: !isCore,
      canUpdate: false,
      canOpenFolder: true,
    };
  }

  return {
    canToggle: !isCore,
    canUninstall: !isCore,
    canConfigure: !isCore,
    canUpdate: !isCore,
    canOpenFolder: true,
  };
}
