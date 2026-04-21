import { hostApiFetch } from '@/lib/host-api';
import type { StoreGetter, StorePublicActions, StoreSetter } from '@/stores/types';
import type { CronJob } from '@/types/cron';
import type { CronStore, CronStoreAction } from './types';

type Setter = StoreSetter<CronStore>;
type Getter = StoreGetter<CronStore>;

export class CronActionImpl {
  readonly #set: Setter;

  constructor(set: Setter, get: Getter, _api?: unknown) {
    void get;
    void _api;
    this.#set = set;
  }

  fetchJobs = async () => {
    this.#set({ loading: true, error: null });

    try {
      const result = await hostApiFetch<CronJob[]>('/api/cron/jobs');
      this.#set({ jobs: result, loading: false });
    } catch (error) {
      this.#set({ error: String(error), loading: false });
    }
  };

  createJob: CronStoreAction['createJob'] = async (input) => {
    try {
      const job = await hostApiFetch<CronJob>('/api/cron/jobs', {
        method: 'POST',
        body: JSON.stringify(input),
      });
      this.#set((state) => ({ jobs: [...state.jobs, job] }));
      return job;
    } catch (error) {
      console.error('Failed to create cron job:', error);
      throw error;
    }
  };

  updateJob: CronStoreAction['updateJob'] = async (id, input) => {
    try {
      await hostApiFetch(`/api/cron/jobs/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(input),
      });
      this.#set((state) => ({
        jobs: state.jobs.map((job) =>
          job.id === id ? { ...job, ...input, updatedAt: new Date().toISOString() } : job,
        ),
      }));
    } catch (error) {
      console.error('Failed to update cron job:', error);
      throw error;
    }
  };

  deleteJob: CronStoreAction['deleteJob'] = async (id) => {
    try {
      await hostApiFetch(`/api/cron/jobs/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      this.#set((state) => ({
        jobs: state.jobs.filter((job) => job.id !== id),
      }));
    } catch (error) {
      console.error('Failed to delete cron job:', error);
      throw error;
    }
  };

  toggleJob: CronStoreAction['toggleJob'] = async (id, enabled) => {
    try {
      await hostApiFetch('/api/cron/toggle', {
        method: 'POST',
        body: JSON.stringify({ id, enabled }),
      });
      this.#set((state) => ({
        jobs: state.jobs.map((job) =>
          job.id === id ? { ...job, enabled } : job,
        ),
      }));
    } catch (error) {
      console.error('Failed to toggle cron job:', error);
      throw error;
    }
  };

  triggerJob: CronStoreAction['triggerJob'] = async (id) => {
    try {
      const result = await hostApiFetch('/api/cron/trigger', {
        method: 'POST',
        body: JSON.stringify({ id }),
      });
      console.log('Cron trigger result:', result);
      try {
        const jobs = await hostApiFetch<CronJob[]>('/api/cron/jobs');
        this.#set({ jobs });
      } catch {
        // Ignore refresh error
      }
    } catch (error) {
      console.error('Failed to trigger cron job:', error);
      throw error;
    }
  };

  setJobs: CronStoreAction['setJobs'] = (jobs) => this.#set({ jobs });
}

export type CronAction = StorePublicActions<CronActionImpl>;

export const createCronSlice = (set: Setter, get: Getter, api?: unknown): CronStoreAction =>
  new CronActionImpl(set, get, api);
