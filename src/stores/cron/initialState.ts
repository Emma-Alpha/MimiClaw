import type { CronStoreState } from './types';

export const initialCronState: CronStoreState = {
  jobs: [],
  loading: false,
  error: null,
};
