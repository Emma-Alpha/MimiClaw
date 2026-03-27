import beginVideo from '@/assets/pets/begin.webm';
import listeningVideo from '@/assets/pets/listening.webm';
import sleepLeaveVideo from '@/assets/pets/sleep-leave.webm';
import sleepLoopVideo from '@/assets/pets/sleep-loop.webm';
import sleepStartVideo from '@/assets/pets/sleep-start.webm';
import staticVideo from '@/assets/pets/static.webm';
import taskLeaveVideo from '@/assets/pets/task-leave.webm';
import taskLoopVideo from '@/assets/pets/task-loop.webm';
import taskStartVideo from '@/assets/pets/task-start.webm';
import { DEFAULT_PET_ANIMATION, PET_ANIMATIONS, type PetAnimation } from '../../shared/pet';

export { DEFAULT_PET_ANIMATION, PET_ANIMATIONS, type PetAnimation };

export const PET_ANIMATION_LABEL_KEYS: Record<PetAnimation, string> = {
  begin: 'pet.animations.begin',
  static: 'pet.animations.static',
  listening: 'pet.animations.listening',
  'sleep-start': 'pet.animations.sleepStart',
  'sleep-loop': 'pet.animations.sleepLoop',
  'sleep-leave': 'pet.animations.sleepLeave',
  'task-start': 'pet.animations.taskStart',
  'task-loop': 'pet.animations.taskLoop',
  'task-leave': 'pet.animations.taskLeave',
};

export const PET_ANIMATION_SOURCES: Record<PetAnimation, string> = {
  begin: beginVideo,
  static: staticVideo,
  listening: listeningVideo,
  'sleep-start': sleepStartVideo,
  'sleep-loop': sleepLoopVideo,
  'sleep-leave': sleepLeaveVideo,
  'task-start': taskStartVideo,
  'task-loop': taskLoopVideo,
  'task-leave': taskLeaveVideo,
};
