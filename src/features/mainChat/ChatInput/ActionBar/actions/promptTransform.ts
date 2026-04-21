import { toast } from 'sonner';
import { hostApiFetch } from '@/lib/host-api';
import type { ActionHandlerContext } from '../context';

export async function handlePromptTransformAction({
  editor,
  promptTransformEnabled,
}: ActionHandlerContext) {
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
}
