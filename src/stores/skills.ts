/**
 * Skills State Store
 * Manages skill/plugin state
 */
import { create } from 'zustand';
import { hostApiFetch } from '@/lib/host-api';
import { type AppError, normalizeAppError } from '@/lib/error-model';
import { useGatewayStore } from './gateway';
import type { Skill, MarketplaceSkill } from '../types/skill';

type GatewaySkillStatus = {
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

type GatewaySkillsStatusResult = {
  skills?: GatewaySkillStatus[];
};

type DiskListResult = {
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

function mapErrorCodeToSkillErrorKey(
  code: AppError['code'],
  operation: 'fetch' | 'search' | 'install',
): string {
  if (code === 'TIMEOUT') {
    return operation === 'search'
      ? 'searchTimeoutError'
      : operation === 'install'
        ? 'installTimeoutError'
        : 'fetchTimeoutError';
  }
  if (code === 'RATE_LIMIT') {
    return operation === 'search'
      ? 'searchRateLimitError'
      : operation === 'install'
        ? 'installRateLimitError'
        : 'fetchRateLimitError';
  }
  return 'rateLimitError';
}

interface SkillsState {
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

const OUTDATED_CACHE_MS = 6 * 60 * 60 * 1000;

export const useSkillsStore = create<SkillsState>((set, get) => ({
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

  setNodeRuntime: (nodeRuntime) => set({ nodeRuntime }),

  fetchSkills: async () => {
    if (get().skills.length === 0) {
      set({ loading: true, error: null });
    }
    try {
      // Gateway RPC may fail when gateway is not running; degrade gracefully
      let gatewayData: GatewaySkillsStatusResult = { skills: [] };
      try {
        gatewayData = await useGatewayStore.getState().rpc<GatewaySkillsStatusResult>('skills.status');
      } catch {
        // Gateway offline — continue with disk-only skill list
      }

      const listResult = await hostApiFetch<{ success: boolean; results?: DiskListResult[]; error?: string }>(
        '/api/skills/list',
      );

      const configResult = await hostApiFetch<Record<string, { apiKey?: string; env?: Record<string, string> }>>(
        '/api/skills/configs',
      );

      let combinedSkills: Skill[] = [];
      const currentSkills = get().skills;

      if (gatewayData.skills) {
        combinedSkills = gatewayData.skills.map((s: GatewaySkillStatus) => {
          const directConfig = configResult[s.skillKey] || {};

          return {
            id: s.skillKey,
            slug: s.slug || s.skillKey,
            name: s.name || s.skillKey,
            description: s.description || '',
            enabled: !s.disabled,
            icon: s.icon || s.emoji || '📦',
            version: s.version || '1.0.0',
            author: s.author,
            config: {
              ...(s.config || {}),
              ...directConfig,
            },
            isCore: s.bundled && s.always,
            isBundled: s.bundled,
            source: s.source,
            baseDir: s.baseDir,
            filePath: s.filePath,
          };
        });
      } else if (currentSkills.length > 0) {
        combinedSkills = [...currentSkills];
      }

      if (listResult.success && listResult.results) {
        listResult.results.forEach((cs: DiskListResult) => {
          const existing = combinedSkills.find((s) => s.id === cs.slug);
          if (existing) {
            if (!existing.baseDir && cs.baseDir) {
              existing.baseDir = cs.baseDir;
            }
            if (!existing.source && cs.source) {
              existing.source = cs.source;
            }
            return;
          }
          const directConfig = configResult[cs.slug] || {};
          combinedSkills.push({
            id: cs.slug,
            slug: cs.slug,
            name: cs.slug,
            description: 'Recently installed, initializing...',
            enabled: false,
            icon: '⌛',
            version: cs.version || 'unknown',
            author: undefined,
            config: directConfig,
            isCore: false,
            isBundled: false,
            source: cs.source || 'agents-skills-personal',
            baseDir: cs.baseDir,
          });
        });
      }

      set({ skills: combinedSkills, loading: false });
    } catch (error) {
      console.error('Failed to fetch skills:', error);
      const appError = normalizeAppError(error, { module: 'skills', operation: 'fetch' });
      set({ loading: false, error: mapErrorCodeToSkillErrorKey(appError.code, 'fetch') });
    }
  },

  fetchTrending: async () => {
    try {
      const result = await hostApiFetch<{ success: boolean; results?: MarketplaceSkill[] }>('/api/skills/find', {
        method: 'POST',
        body: JSON.stringify({ trending: true, limit: 30 }),
      });
      if (result.success) {
        set({ trending: result.results || [] });
      }
    } catch (e) {
      console.warn('fetchTrending failed:', e);
    }
  },

  searchSkills: async (query: string, opts?: { trending?: boolean }) => {
    set({ searching: true, searchError: null });
    try {
      const trimmed = query.trim();
      const result = await hostApiFetch<{ success: boolean; results?: MarketplaceSkill[]; error?: string }>(
        '/api/skills/find',
        {
          method: 'POST',
          body: JSON.stringify({
            query: trimmed || undefined,
            trending: opts?.trending ?? !trimmed,
            limit: 40,
          }),
        },
      );
      if (result.success) {
        set({ searchResults: result.results || [] });
      } else {
        throw normalizeAppError(new Error(result.error || 'Search failed'), {
          module: 'skills',
          operation: 'search',
        });
      }
    } catch (error) {
      const appError = normalizeAppError(error, { module: 'skills', operation: 'search' });
      set({ searchError: mapErrorCodeToSkillErrorKey(appError.code, 'search') });
    } finally {
      set({ searching: false });
    }
  },

  installSkill: async (slug: string, version?: string) => {
    set((state) => ({ installing: { ...state.installing, [slug]: true } }));
    try {
      const result = await hostApiFetch<{ success: boolean; error?: string }>('/api/skills/install', {
        method: 'POST',
        body: JSON.stringify({ slug, version }),
      });
      if (!result.success) {
        const appError = normalizeAppError(new Error(result.error || 'Install failed'), {
          module: 'skills',
          operation: 'install',
        });
        throw new Error(mapErrorCodeToSkillErrorKey(appError.code, 'install'));
      }
      await get().fetchSkills();
    } catch (error) {
      console.error('Install error:', error);
      throw error;
    } finally {
      set((state) => {
        const next = { ...state.installing };
        delete next[slug];
        return { installing: next };
      });
    }
  },

  uninstallSkill: async (slug: string) => {
    set((state) => ({ installing: { ...state.installing, [slug]: true } }));
    try {
      const result = await hostApiFetch<{ success: boolean; error?: string }>('/api/skills/uninstall', {
        method: 'POST',
        body: JSON.stringify({ slug }),
      });
      if (!result.success) {
        throw new Error(result.error || 'Uninstall failed');
      }
      await get().fetchSkills();
    } catch (error) {
      console.error('Uninstall error:', error);
      throw error;
    } finally {
      set((state) => {
        const next = { ...state.installing };
        delete next[slug];
        return { installing: next };
      });
    }
  },

  updateRemoteSkill: async (slug: string) => {
    const result = await hostApiFetch<{ success: boolean; error?: string }>('/api/skills/update', {
      method: 'POST',
      body: JSON.stringify({ slug }),
    });
    if (!result.success) {
      throw new Error(result.error || 'Update failed');
    }
    await get().fetchSkills();
  },

  checkOutdated: async (force?: boolean) => {
    const { outdatedCheckedAt } = get();
    const now = Date.now();
    if (!force && outdatedCheckedAt && now - outdatedCheckedAt < OUTDATED_CACHE_MS) {
      return;
    }
    try {
      const res = await hostApiFetch<{ success: boolean; results?: Array<{ slug: string; current: string; latest: string }> }>(
        '/api/skills/outdated',
      );
      if (!res.success || !res.results?.length) {
        set({ outdated: {}, outdatedCheckedAt: now });
        return;
      }
      const map: Record<string, { current: string; latest: string }> = {};
      for (const r of res.results) {
        map[r.slug] = { current: r.current, latest: r.latest };
      }
      set({ outdated: map, outdatedCheckedAt: now });
    } catch {
      set({ outdatedCheckedAt: now });
    }
  },

  ensureNodeRuntime: async () => {
    try {
      await hostApiFetch('/api/skills/ensure-node', { method: 'POST' });
    } catch (e) {
      console.warn('ensureNodeRuntime:', e);
    }
  },

  enableSkill: async (skillId) => {
    const { updateSkill } = get();

    try {
      await useGatewayStore.getState().rpc('skills.update', { skillKey: skillId, enabled: true });
      updateSkill(skillId, { enabled: true });
    } catch (error) {
      console.error('Failed to enable skill:', error);
      throw error;
    }
  },

  disableSkill: async (skillId) => {
    const { updateSkill, skills } = get();

    const skill = skills.find((s) => s.id === skillId);
    if (skill?.isCore) {
      throw new Error('Cannot disable core skill');
    }

    try {
      await useGatewayStore.getState().rpc('skills.update', { skillKey: skillId, enabled: false });
      updateSkill(skillId, { enabled: false });
    } catch (error) {
      console.error('Failed to disable skill:', error);
      throw error;
    }
  },

  setSkills: (skills) => set({ skills }),

  updateSkill: (skillId, updates) => {
    set((state) => ({
      skills: state.skills.map((skill) => (skill.id === skillId ? { ...skill, ...updates } : skill)),
    }));
  },
}));
