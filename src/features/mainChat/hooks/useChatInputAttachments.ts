import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { hostApiFetch } from '@/lib/host-api';
import { invokeIpc } from '@/lib/api-client';
import type { ChatInputAttachment } from '../ChatInput/types';
import { readFileAsBase64 } from '../ChatInput/types';

type StagedFilePayload = {
  id: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  stagedPath: string;
  preview: string | null;
};

type UseChatInputAttachmentsOptions = {
  setAttachments: Dispatch<SetStateAction<ChatInputAttachment[]>>;
};

export function useChatInputAttachments({ setAttachments }: UseChatInputAttachmentsOptions) {
  const pickFiles = useCallback(async () => {
    try {
      const result = (await invokeIpc('dialog:open', {
        properties: ['openFile', 'multiSelections'],
      })) as { canceled: boolean; filePaths?: string[] };
      if (result.canceled || !result.filePaths?.length) return;

      const tempIds: string[] = [];
      for (const fp of result.filePaths) {
        const tempId = crypto.randomUUID();
        tempIds.push(tempId);
        const fileName = fp.split(/[\\/]/).pop() || 'file';
        setAttachments((prev) => [
          ...prev,
          {
            id: tempId,
            fileName,
            mimeType: '',
            fileSize: 0,
            stagedPath: '',
            preview: null,
            status: 'staging',
          },
        ]);
      }

      const staged = await hostApiFetch<StagedFilePayload[]>('/api/files/stage-paths', {
        method: 'POST',
        body: JSON.stringify({ filePaths: result.filePaths }),
      });

      setAttachments((prev) => {
        let updated = [...prev];
        for (const [index, tempId] of tempIds.entries()) {
          const data = staged[index];
          updated = updated.map((attachment) =>
            attachment.id === tempId
              ? data
                ? { ...data, status: 'ready' as const }
                : { ...attachment, status: 'error' as const, error: 'Staging failed' }
              : attachment,
          );
        }
        return updated;
      });
    } catch (err) {
      setAttachments((prev) =>
        prev.map((attachment) =>
          attachment.status === 'staging'
            ? { ...attachment, status: 'error' as const, error: String(err) }
            : attachment,
        ),
      );
    }
  }, [setAttachments]);

  const stageBufferFiles = useCallback(async (files: globalThis.File[]) => {
    for (const file of files) {
      const tempId = crypto.randomUUID();
      setAttachments((prev) => [
        ...prev,
        {
          id: tempId,
          fileName: file.name,
          mimeType: file.type || 'application/octet-stream',
          fileSize: file.size,
          stagedPath: '',
          preview: null,
          status: 'staging',
        },
      ]);
      try {
        const base64 = await readFileAsBase64(file);
        const staged = await hostApiFetch<StagedFilePayload>('/api/files/stage-buffer', {
          method: 'POST',
          body: JSON.stringify({
            base64,
            fileName: file.name,
            mimeType: file.type || 'application/octet-stream',
          }),
        });
        setAttachments((prev) =>
          prev.map((attachment) =>
            attachment.id === tempId ? { ...staged, status: 'ready' as const } : attachment,
          ),
        );
      } catch (err) {
        setAttachments((prev) =>
          prev.map((attachment) =>
            attachment.id === tempId
              ? { ...attachment, status: 'error' as const, error: String(err) }
              : attachment,
          ),
        );
      }
    }
  }, [setAttachments]);

  return {
    pickFiles,
    stageBufferFiles,
  };
}
