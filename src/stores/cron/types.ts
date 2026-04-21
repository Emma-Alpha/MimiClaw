import type { CronJob, CronJobCreateInput, CronJobUpdateInput } from '@/types/cron';

export interface CronStoreState {
  jobs: CronJob[];
  loading: boolean;
  error: string | null;
}

export interface CronStoreAction {
  fetchJobs: () => Promise<void>;
  createJob: (input: CronJobCreateInput) => Promise<CronJob>;
  updateJob: (id: string, input: CronJobUpdateInput) => Promise<void>;
  deleteJob: (id: string) => Promise<void>;
  toggleJob: (id: string, enabled: boolean) => Promise<void>;
  triggerJob: (id: string) => Promise<void>;
  setJobs: (jobs: CronJob[]) => void;
}

export type CronStore = CronStoreState & CronStoreAction;
