/**
 * Initializes update IPC listeners once and applies optional remote update policy.
 */
import { useEffect } from 'react';
import { useUpdateStore } from '@/stores/update';
import { ForceUpdateModal } from './ForceUpdateModal';

export function UpdateBootstrap() {
  useEffect(() => {
    const run = async () => {
      await useUpdateStore.getState().init();
      await useUpdateStore.getState().applyRemoteUpdatePolicy();
    };
    void run();
  }, []);

  return <ForceUpdateModal />;
}
