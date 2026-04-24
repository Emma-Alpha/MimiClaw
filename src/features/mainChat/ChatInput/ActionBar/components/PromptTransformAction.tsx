import { Wand2 } from 'lucide-react';
import { useCallback } from 'react';
import { toast } from 'sonner';
import { hostApiFetch } from '@/lib/host-api';
import { labPreferSelectors, useSettingsStore } from '@/stores/settings';
import { useChatInputContext } from '../../ChatInputProvider';
import { ActionWrapper } from './ActionWrapper';

export function PromptTransformAction() {
  const { editor } = useChatInputContext();
  const promptTransformEnabled = useSettingsStore(labPreferSelectors.enabled('promptTransform'));

  const handleClick = useCallback(async () => {
    if (!promptTransformEnabled) return;
    const markdown = editor?.getMarkdownContent().trim() ?? '';
    if (!markdown) return;

    try {
      const response = await hostApiFetch<{ transformed?: string }>('/api/prompt/transform', {
        body: JSON.stringify({ text: markdown }),
        method: 'POST',
      });
      const transformed = response.transformed?.trim();
      if (!transformed) {
        toast.info('Prompt transform service returned empty content');
        return;
      }
      editor?.setMarkdownContent(transformed);
      toast.success('Prompt transformed');
    } catch (error) {
      console.error('Failed to transform prompt:', error);
      toast.error('Prompt transform is unavailable');
    }
  }, [editor, promptTransformEnabled]);

  return (
    <ActionWrapper
      disabled={!promptTransformEnabled}
      icon={Wand2}
      onClick={handleClick}
      title="Prompt transform"
    />
  );
}
