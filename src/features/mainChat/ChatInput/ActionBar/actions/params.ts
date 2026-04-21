import { toast } from 'sonner';
import type { ChatInputModelParams } from '../../store';
import type { ActionHandlerContext } from '../context';

export const PARAMETER_PRESETS: ChatInputModelParams[] = [
  {
    frequencyPenalty: 0,
    label: 'Balanced',
    temperature: 0.7,
    topP: 1,
  },
  {
    frequencyPenalty: 0.2,
    label: 'Creative',
    temperature: 1,
    topP: 1,
  },
  {
    frequencyPenalty: 0.1,
    label: 'Precise',
    temperature: 0.2,
    topP: 0.85,
  },
];

export function handleParamsAction({ modelParams, setModelParams }: ActionHandlerContext) {
  const currentIndex = PARAMETER_PRESETS.findIndex((preset) => preset.label === modelParams.label);
  const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % PARAMETER_PRESETS.length : 0;
  const nextPreset = PARAMETER_PRESETS[nextIndex] ?? PARAMETER_PRESETS[0];
  if (!nextPreset) return;
  setModelParams(nextPreset);
  toast.success(
    `Preset: ${nextPreset.label} (T=${nextPreset.temperature}, topP=${nextPreset.topP}, freq=${nextPreset.frequencyPenalty})`,
  );
}
