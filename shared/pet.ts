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
export const PET_IDLE_ANIMATIONS = ['static'] as const;
export type PetIdleAnimation = typeof PET_IDLE_ANIMATIONS[number];
export const PET_TRANSITION_ANIMATIONS = ['begin', 'sleep-start', 'sleep-leave', 'task-start', 'task-leave'] as const;
export const PET_LOOPING_ANIMATIONS = ['static', 'listening', 'sleep-loop', 'task-loop'] as const;

export const DEFAULT_PET_ANIMATION: PetAnimation = 'static';

export type PetRuntimeActivity = 'idle' | 'listening' | 'working' | 'sleeping' | 'recording' | 'transcribing';
export type PetUiActivity = 'idle' | 'listening' | 'working';

export type PetRecordingCommandAction = 'start' | 'confirm' | 'cancel';

export interface PetRecordingCommandPayload {
  action: PetRecordingCommandAction;
}

export interface PetMiniChatSeedAttachment {
  id: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  stagedPath: string;
  preview: string | null;
  status: 'staging' | 'ready' | 'error';
  error?: string;
}

export interface PetMiniChatSeed {
  text: string;
  attachments?: PetMiniChatSeedAttachment[];
  autoSend?: boolean;
  target?: 'chat' | 'code';
  persistTarget?: boolean;
}

export interface PetRuntimeState {
  animation: PetAnimation;
  activity: PetRuntimeActivity;
  showTerminal: boolean;
  terminalLines: string[];
  updatedAt: number;
}
