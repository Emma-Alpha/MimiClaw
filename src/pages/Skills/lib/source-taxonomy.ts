import type { Skill } from '@/types/skill';

export type SkillCategory = 'bundled' | 'local' | 'remote';

export function categorizeSkill(skill: Skill): SkillCategory {
  if (skill.isBundled) {
    return 'bundled';
  }
  const s = (skill.source || '').trim().toLowerCase();
  if (s === 'openclaw-managed') {
    return 'remote';
  }
  return 'local';
}
