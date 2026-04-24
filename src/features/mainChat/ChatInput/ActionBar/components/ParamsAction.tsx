import { Settings2 } from 'lucide-react';
import { useCallback } from 'react';
import { toast } from 'sonner';
import type { ChatInputModelParams } from '../../store';
import { chatInputStoreSelectors, useChatInputStore } from '../../store';
import { ActionWrapper } from './ActionWrapper';

const PARAMETER_PRESETS: ChatInputModelParams[] = [
  { frequencyPenalty: 0, label: 'Balanced', temperature: 0.7, topP: 1 },
  { frequencyPenalty: 0.2, label: 'Creative', temperature: 1, topP: 1 },
  { frequencyPenalty: 0.1, label: 'Precise', temperature: 0.2, topP: 0.85 },
];

export function ParamsAction() {
  const modelParams = useChatInputStore(chatInputStoreSelectors.modelParams);
  const setModelParams = useChatInputStore((s) => s.setModelParams);

  const handleClick = useCallback(() => {
    const currentIndex = PARAMETER_PRESETS.findIndex((p) => p.label === modelParams.label);
    const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % PARAMETER_PRESETS.length : 0;
    const nextPreset = PARAMETER_PRESETS[nextIndex] ?? PARAMETER_PRESETS[0];
    if (!nextPreset) return;
    setModelParams(nextPreset);
    toast.success(
      `Preset: ${nextPreset.label} (T=${nextPreset.temperature}, topP=${nextPreset.topP}, freq=${nextPreset.frequencyPenalty})`,
    );
  }, [modelParams.label, setModelParams]);

  return (
    <ActionWrapper
      active={modelParams.label !== 'Balanced'}
      icon={Settings2}
      onClick={handleClick}
      title="Parameters"
    />
  );
}
