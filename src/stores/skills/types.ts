import type { AppError } from '@/lib/error-model';
import type { MarketplaceSkill, Skill } from '@/types/skill';

export type GatewaySkillStatus = {
  skillKey: string;
  slug?: string;
  name?: string;
  description?: string;
  disabled?: boolean;
  icon?: string;
  emoji?: string;
  version?: string;
  author?: string;
  config?: Record<string, unknown>;
  bundled?: boolean;
  always?: boolean;
  source?: string;
  baseDir?: string;
  filePath?: string;
};

export type GatewaySkillsStatusResult = {
  skills?: GatewaySkillStatus[];
};

export type DiskListResult = {
  slug: string;
  version?: string;
  source?: string;
  baseDir?: string;
};

export type NodeRuntimeUiState = {
  state: 'idle' | 'detecting' | 'downloading' | 'ready' | 'error';
  progress?: number;
  error?: string;
};

export type SkillOperation = 'fetch' | 'search' | 'install';

export interface SkillsStoreState {
  skills: Skill[];
  searchResults: MarketplaceSkill[];
  trending: MarketplaceSkill[] | null;
  loading: boolean;
  searching: boolean;
  searchError: string | null;
  installing: Record<string, boolean>;
  error: string | null;
  outdated: Record<string, { current: string; latest: string }>;
  outdatedCheckedAt: number | null;
  nodeRuntime: NodeRuntimeUiState;
}

export interface SkillsStoreAction {
  fetchSkills: () => Promise<void>;
  fetchTrending: () => Promise<void>;
  searchSkills: (query: string, opts?: { trending?: boolean }) => Promise<void>;
  installSkill: (slug: string, version?: string) => Promise<void>;
  uninstallSkill: (slug: string) => Promise<void>;
  updateRemoteSkill: (slug: string) => Promise<void>;
  checkOutdated: (force?: boolean) => Promise<void>;
  ensureNodeRuntime: () => Promise<void>;
  enableSkill: (skillId: string) => Promise<void>;
  disableSkill: (skillId: string) => Promise<void>;
  setSkills: (skills: Skill[]) => void;
  updateSkill: (skillId: string, updates: Partial<Skill>) => void;
  setNodeRuntime: (s: NodeRuntimeUiState) => void;
}

export type SkillsStore = SkillsStoreState & SkillsStoreAction;

export type SkillErrorCode = AppError['code'];
