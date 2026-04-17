import type { Skill } from '@/types/skill';

export type SkillResourceTreeNode = {
  name: string;
  path: string;
  type: 'directory' | 'file';
  children?: SkillResourceTreeNode[];
  content?: string;
};

export type SkillDetailApiResponse = {
  success: boolean;
  error?: string;
  detail?: {
    readmeContent: string;
    readmePath: string | null;
    resourceTree: SkillResourceTreeNode[];
    skillDir: string;
  };
};

export type SkillDetailContextValue = {
  author: string;
  description: string;
  icon?: string;
  identifier: string;
  label: string;
  localizedDescription: string;
  localizedReadme: string;
  readme: string;
  skill: Skill;
  skillContent: string;
  contentMap: Record<string, string>;
  resourceTree: SkillResourceTreeNode[];
  loading: boolean;
  error?: string;
};
