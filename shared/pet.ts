export const PET_ANIMATIONS = [
  'begin',
  'static',
  'listening',
  'sleep-start',
  'sleep-loop',
  'sleep-leave',
  'task-start',
  'task-loop',
  'task-leave',
] as const;

export type PetAnimation = typeof PET_ANIMATIONS[number];

export const DEFAULT_PET_ANIMATION: PetAnimation = 'static';

export type PetRuntimeActivity = 'idle' | 'listening' | 'working' | 'sleeping' | 'recording';
export type PetUiActivity = 'idle' | 'listening' | 'working';

export interface PetRuntimeState {
  animation: PetAnimation;
  activity: PetRuntimeActivity;
  showTerminal: boolean;
  updatedAt: number;
}
