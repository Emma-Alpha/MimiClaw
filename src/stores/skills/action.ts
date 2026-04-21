import { normalizeAppError } from '@/lib/error-model';
import { hostApiFetch } from '@/lib/host-api';
import type { StoreGetter, StorePublicActions, StoreSetter } from '@/stores/types';
import { useGatewayStore } from '@/stores/gateway';
import type {
  DiskListResult,
  GatewaySkillStatus,
  GatewaySkillsStatusResult,
  SkillErrorCode,
  SkillOperation,
  SkillsStore,
  SkillsStoreAction,
} from './types';

type Setter = StoreSetter<SkillsStore>;
type Getter = StoreGetter<SkillsStore>;

const OUTDATED_CACHE_MS = 6 * 60 * 60 * 1000;

function mapErrorCodeToSkillErrorKey(
  code: SkillErrorCode,
  operation: SkillOperation,
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

export class SkillsActionImpl {
  readonly #get: Getter;
  readonly #set: Setter;

  constructor(set: Setter, get: Getter, _api?: unknown) {
    void _api;
    this.#set = set;
    this.#get = get;
  }

  setNodeRuntime: SkillsStoreAction['setNodeRuntime'] = (nodeRuntime) =>
    this.#set({ nodeRuntime });

  fetchSkills = async () => {
    if (this.#get().skills.length === 0) {
      this.#set({ loading: true, error: null });
    }
    try {
      let gatewayData: GatewaySkillsStatusResult = { skills: [] };
      try {
        gatewayData = await useGatewayStore.getState().rpc<GatewaySkillsStatusResult>('skills.status');
      } catch {
        // Gateway offline
      }

      const listResult = await hostApiFetch<{ success: boolean; results?: DiskListResult[]; error?: string }>(
        '/api/skills/list',
      );

      const configResult = await hostApiFetch<Record<string, { apiKey?: string; env?: Record<string, string> }>>(
        '/api/skills/configs',
      );

      let combinedSkills = [] as SkillsStore['skills'];
      const currentSkills = this.#get().skills;

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

      this.#set({ skills: combinedSkills, loading: false });
    } catch (error) {
      console.error('Failed to fetch skills:', error);
      const appError = normalizeAppError(error, { module: 'skills', operation: 'fetch' });
      this.#set({ loading: false, error: mapErrorCodeToSkillErrorKey(appError.code, 'fetch') });
    }
  };

  fetchTrending = async () => {
    try {
      const result = await hostApiFetch<{ success: boolean; results?: SkillsStore['searchResults'] }>('/api/skills/find', {
        method: 'POST',
        body: JSON.stringify({ trending: true, limit: 30 }),
      });
      if (result.success) {
        this.#set({ trending: result.results || [] });
      }
    } catch (e) {
      console.warn('fetchTrending failed:', e);
    }
  };

  searchSkills = async (query: string, opts?: { trending?: boolean }) => {
    this.#set({ searching: true, searchError: null });
    try {
      const trimmed = query.trim();
      const result = await hostApiFetch<{ success: boolean; results?: SkillsStore['searchResults']; error?: string }>(
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
        this.#set({ searchResults: result.results || [] });
      } else {
        throw normalizeAppError(new Error(result.error || 'Search failed'), {
          module: 'skills',
          operation: 'search',
        });
      }
    } catch (error) {
      const appError = normalizeAppError(error, { module: 'skills', operation: 'search' });
      this.#set({ searchError: mapErrorCodeToSkillErrorKey(appError.code, 'search') });
    } finally {
      this.#set({ searching: false });
    }
  };

  installSkill = async (slug: string, version?: string) => {
    this.#set((state) => ({ installing: { ...state.installing, [slug]: true } }));
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
      await this.#get().fetchSkills();
    } catch (error) {
      console.error('Install error:', error);
      throw error;
    } finally {
      this.#set((state) => {
        const next = { ...state.installing };
        delete next[slug];
        return { installing: next };
      });
    }
  };

  uninstallSkill = async (slug: string) => {
    this.#set((state) => ({ installing: { ...state.installing, [slug]: true } }));
    try {
      const result = await hostApiFetch<{ success: boolean; error?: string }>('/api/skills/uninstall', {
        method: 'POST',
        body: JSON.stringify({ slug }),
      });
      if (!result.success) {
        throw new Error(result.error || 'Uninstall failed');
      }
      await this.#get().fetchSkills();
    } catch (error) {
      console.error('Uninstall error:', error);
      throw error;
    } finally {
      this.#set((state) => {
        const next = { ...state.installing };
        delete next[slug];
        return { installing: next };
      });
    }
  };

  updateRemoteSkill = async (slug: string) => {
    const result = await hostApiFetch<{ success: boolean; error?: string }>('/api/skills/update', {
      method: 'POST',
      body: JSON.stringify({ slug }),
    });
    if (!result.success) {
      throw new Error(result.error || 'Update failed');
    }
    await this.#get().fetchSkills();
  };

  checkOutdated = async (force?: boolean) => {
    const { outdatedCheckedAt } = this.#get();
    const now = Date.now();
    if (!force && outdatedCheckedAt && now - outdatedCheckedAt < OUTDATED_CACHE_MS) {
      return;
    }
    try {
      const res = await hostApiFetch<{ success: boolean; results?: Array<{ slug: string; current: string; latest: string }> }>(
        '/api/skills/outdated',
      );
      if (!res.success || !res.results?.length) {
        this.#set({ outdated: {}, outdatedCheckedAt: now });
        return;
      }
      const map: Record<string, { current: string; latest: string }> = {};
      for (const r of res.results) {
        map[r.slug] = { current: r.current, latest: r.latest };
      }
      this.#set({ outdated: map, outdatedCheckedAt: now });
    } catch {
      this.#set({ outdatedCheckedAt: now });
    }
  };

  ensureNodeRuntime = async () => {
    try {
      await hostApiFetch('/api/skills/ensure-node', { method: 'POST' });
    } catch (e) {
      console.warn('ensureNodeRuntime:', e);
    }
  };

  enableSkill: SkillsStoreAction['enableSkill'] = async (skillId) => {
    const { updateSkill } = this.#get();

    try {
      await useGatewayStore.getState().rpc('skills.update', { skillKey: skillId, enabled: true });
      updateSkill(skillId, { enabled: true });
    } catch (error) {
      console.error('Failed to enable skill:', error);
      throw error;
    }
  };

  disableSkill: SkillsStoreAction['disableSkill'] = async (skillId) => {
    const { updateSkill, skills } = this.#get();

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
  };

  setSkills: SkillsStoreAction['setSkills'] = (skills) => this.#set({ skills });

  updateSkill: SkillsStoreAction['updateSkill'] = (skillId, updates) => {
    this.#set((state) => ({
      skills: state.skills.map((skill) => (skill.id === skillId ? { ...skill, ...updates } : skill)),
    }));
  };
}

export type SkillsAction = StorePublicActions<SkillsActionImpl>;

export const createSkillsSlice = (set: Setter, get: Getter, api?: unknown): SkillsStoreAction =>
  new SkillsActionImpl(set, get, api);
