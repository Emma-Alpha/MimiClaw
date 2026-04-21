import type { SkillsStoreState } from './types';

export const initialSkillsState: SkillsStoreState = {
  skills: [],
  searchResults: [],
  trending: null,
  loading: false,
  searching: false,
  searchError: null,
  installing: {},
  error: null,
  outdated: {},
  outdatedCheckedAt: null,
  nodeRuntime: { state: 'idle' },
};
