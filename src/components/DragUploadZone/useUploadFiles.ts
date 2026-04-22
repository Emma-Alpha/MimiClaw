import { useCallback } from 'react';
import { useFileStore } from '@/stores/file';

/**
 * Hook to handle file uploads from paste/drag events.
 * Uses stageBufferFile to upload each file individually.
 *
 * @returns handleUploadFiles - Callback to handle file uploads
 */
export const useUploadFiles = () => {
  const stageBufferFile = useFileStore((s) => s.stageBufferFile);

  const handleUploadFiles = useCallback(
    async (files: File[]) => {
      console.log('[useUploadFiles] Uploading files:', files);
      if (files.length === 0) return;

      // Upload each file individually via stageBufferFile
      const results = await Promise.allSettled(files.map((file) => stageBufferFile(file)));
      console.log('[useUploadFiles] Upload results:', results);
    },
    [stageBufferFile],
  );

  return { handleUploadFiles };
};
