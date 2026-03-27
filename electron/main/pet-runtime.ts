import { BrowserWindow } from 'electron';
import type { GatewayManager } from '../gateway/manager';
import { DEFAULT_PET_ANIMATION, type PetAnimation, type PetRuntimeState, type PetUiActivity } from '../../shared/pet';
import { getAllSettings } from '../utils/store';

const SLEEP_AFTER_IDLE_MS = 45_000;
const LISTENING_DURATION_MS = 1800;
const RECORDING_PULSE_MS = 1200;
const SLEEP_START_DURATION_MS = 1200;
const SLEEP_LEAVE_DURATION_MS = 1100;
const TASK_START_DURATION_MS = 1100;
const TASK_LEAVE_DURATION_MS = 900;

let activeRunIds = new Set<string>();
let transitionTimer: NodeJS.Timeout | null = null;
let sleepTimer: NodeJS.Timeout | null = null;
let inputActivity: 'idle' | 'recording' = 'idle';
let uiActivity: PetUiActivity = 'idle';
let runtimeState: PetRuntimeState = {
  animation: DEFAULT_PET_ANIMATION,
  activity: 'idle',
  showTerminal: false,
  updatedAt: Date.now(),
};

function clearTransitionTimer(): void {
  if (transitionTimer) {
    clearTimeout(transitionTimer);
    transitionTimer = null;
  }
}

function clearSleepTimer(): void {
  if (sleepTimer) {
    clearTimeout(sleepTimer);
    sleepTimer = null;
  }
}

async function resolveIdleAnimation(): Promise<PetAnimation> {
  try {
    const settings = await getAllSettings();
    return settings.petAnimation || DEFAULT_PET_ANIMATION;
  } catch {
    return DEFAULT_PET_ANIMATION;
  }
}

function broadcastPetRuntimeState(): void {
  const windows = BrowserWindow.getAllWindows();
  for (const win of windows) {
    if (!win.isDestroyed()) {
      win.webContents.send('pet:runtime-state', runtimeState);
    }
  }
}

function setRuntimeState(next: Omit<PetRuntimeState, 'updatedAt'>): void {
  runtimeState = {
    ...next,
    updatedAt: Date.now(),
  };
  broadcastPetRuntimeState();
}

function isSleepingAnimation(animation: PetAnimation): boolean {
  return animation === 'sleep-start' || animation === 'sleep-loop' || animation === 'sleep-leave';
}

function isSleepingState(): boolean {
  return runtimeState.activity === 'sleeping' || isSleepingAnimation(runtimeState.animation);
}

function hasWorkingSignal(): boolean {
  return activeRunIds.size > 0 || uiActivity === 'working';
}

function hasListeningSignal(): boolean {
  return uiActivity === 'listening';
}

function scheduleSleepCountdown(): void {
  clearSleepTimer();
  if (hasWorkingSignal() || hasListeningSignal() || inputActivity === 'recording') {
    return;
  }

  sleepTimer = setTimeout(() => {
    sleepTimer = null;
    if (hasWorkingSignal() || hasListeningSignal() || inputActivity === 'recording' || runtimeState.activity !== 'idle') {
      return;
    }

    setRuntimeState({
      animation: 'sleep-start',
      activity: 'sleeping',
      showTerminal: false,
    });

    clearTransitionTimer();
    transitionTimer = setTimeout(() => {
      transitionTimer = null;
      if (hasWorkingSignal() || hasListeningSignal() || inputActivity === 'recording') {
        return;
      }
      setRuntimeState({
        animation: 'sleep-loop',
        activity: 'sleeping',
        showTerminal: false,
      });
    }, SLEEP_START_DURATION_MS);
  }, SLEEP_AFTER_IDLE_MS);
}

async function enterIdle(): Promise<void> {
  clearTransitionTimer();
  clearSleepTimer();
  setRuntimeState({
    animation: await resolveIdleAnimation(),
    activity: 'idle',
    showTerminal: false,
  });
  scheduleSleepCountdown();
}

function normalizeRunId(value: unknown): string | null {
  if (value == null) return null;
  const text = String(value).trim();
  return text ? text : null;
}

function extractAgentEnvelope(notification: { method?: string; params?: unknown } | undefined): {
  phase: string;
  state: string;
  runId: string | null;
} {
  const params = notification?.params && typeof notification.params === 'object'
    ? notification.params as Record<string, unknown>
    : {};
  const data = params.data && typeof params.data === 'object'
    ? params.data as Record<string, unknown>
    : {};

  return {
    phase: String(data.phase ?? params.phase ?? ''),
    state: String(params.state ?? data.state ?? ''),
    runId: normalizeRunId(params.runId ?? data.runId),
  };
}

function enterTaskLoop(): void {
  clearTransitionTimer();
  clearSleepTimer();
  setRuntimeState({
    animation: 'task-loop',
    activity: 'working',
    showTerminal: true,
  });
}

function enterTaskStart(): void {
  clearTransitionTimer();
  clearSleepTimer();
  setRuntimeState({
    animation: 'task-start',
    activity: 'working',
    showTerminal: true,
  });
  transitionTimer = setTimeout(() => {
    transitionTimer = null;
    if (hasWorkingSignal()) {
      enterTaskLoop();
    } else if (hasListeningSignal()) {
      enterListeningHold();
    } else {
      void enterIdle();
    }
  }, TASK_START_DURATION_MS);
}

function enterTaskLeave(): void {
  clearTransitionTimer();
  clearSleepTimer();
  setRuntimeState({
    animation: 'task-leave',
    activity: 'working',
    showTerminal: true,
  });
  transitionTimer = setTimeout(() => {
    transitionTimer = null;
    void enterIdle();
  }, TASK_LEAVE_DURATION_MS);
}

function enterListening(): void {
  if (hasWorkingSignal()) {
    return;
  }

  clearTransitionTimer();
  clearSleepTimer();
  setRuntimeState({
    animation: 'listening',
    activity: 'listening',
    showTerminal: false,
  });
  transitionTimer = setTimeout(() => {
    transitionTimer = null;
    if (activeRunIds.size > 0) {
      enterTaskLoop();
    } else {
      void enterIdle();
    }
  }, LISTENING_DURATION_MS);
}

function enterListeningHold(): void {
  if (hasWorkingSignal()) {
    return;
  }

  clearTransitionTimer();
  clearSleepTimer();
  setRuntimeState({
    animation: 'listening',
    activity: 'listening',
    showTerminal: false,
  });
}

function enterRecording(): void {
  clearTransitionTimer();
  clearSleepTimer();
  setRuntimeState({
    animation: 'listening',
    activity: 'recording',
    showTerminal: false,
  });
  transitionTimer = setTimeout(() => {
    transitionTimer = null;
    if (inputActivity === 'recording') {
      enterRecording();
    } else if (hasWorkingSignal()) {
      enterTaskLoop();
    } else if (hasListeningSignal()) {
      enterListeningHold();
    } else {
      void enterIdle();
    }
  }, RECORDING_PULSE_MS);
}

function wakeThen(next: () => void): void {
  if (!isSleepingState()) {
    next();
    return;
  }

  clearTransitionTimer();
  clearSleepTimer();
  setRuntimeState({
    animation: 'sleep-leave',
    activity: 'sleeping',
    showTerminal: false,
  });
  transitionTimer = setTimeout(() => {
    transitionTimer = null;
    next();
  }, SLEEP_LEAVE_DURATION_MS);
}

function startRun(runId: string | null): void {
  if (runId) {
    activeRunIds.add(runId);
  }
  wakeThen(() => {
    enterTaskStart();
  });
}

function finishRun(runId: string | null): void {
  if (runId) {
    activeRunIds.delete(runId);
  } else {
    activeRunIds = new Set();
  }

  if (activeRunIds.size === 0) {
    if (uiActivity === 'working') {
      enterTaskLoop();
      return;
    }
    if (uiActivity === 'listening') {
      enterListeningHold();
      return;
    }
    enterTaskLeave();
  }
}

export function registerPetRuntime(gatewayManager: GatewayManager): void {
  void enterIdle();

  gatewayManager.on('status', (status) => {
    if (status.state === 'error' || status.state === 'stopped') {
      activeRunIds = new Set();
      void enterIdle();
    }
  });

  gatewayManager.on('chat:message', () => {
    wakeThen(() => {
      if (inputActivity === 'recording') {
        enterRecording();
      } else {
        enterListening();
      }
    });
  });

  gatewayManager.on('notification', (notification) => {
    if (notification.method === 'chat.message_received') {
      wakeThen(() => {
        if (inputActivity === 'recording') {
          enterRecording();
        } else {
          enterListening();
        }
      });
    }

    if (notification.method !== 'agent') {
      return;
    }

    const event = extractAgentEnvelope(notification);
    if (event.phase === 'started' || event.state === 'started') {
      startRun(event.runId);
      return;
    }

    if (event.state === 'delta' && activeRunIds.size > 0) {
      wakeThen(() => {
        enterTaskLoop();
      });
      return;
    }

    if (
      event.phase === 'completed'
      || event.phase === 'done'
      || event.phase === 'finished'
      || event.phase === 'end'
      || event.state === 'final'
      || event.state === 'error'
      || event.state === 'aborted'
    ) {
      finishRun(event.runId);
    }
  });
}

export function getPetRuntimeState(): PetRuntimeState {
  return runtimeState;
}

export async function syncPetRuntimeIdleState(): Promise<void> {
  if (activeRunIds.size === 0 && uiActivity === 'idle' && runtimeState.activity === 'idle' && inputActivity !== 'recording') {
    await enterIdle();
  }
}

export function setPetInputActivity(activity: 'idle' | 'recording'): void {
  inputActivity = activity;

  if (activity === 'recording') {
    wakeThen(() => {
      enterRecording();
    });
    return;
  }

  if (hasWorkingSignal()) {
    enterTaskLoop();
    return;
  }

  if (hasListeningSignal()) {
    wakeThen(() => {
      enterListeningHold();
    });
    return;
  }

  void enterIdle();
}

export function setPetUiActivity(activity: PetUiActivity): void {
  uiActivity = activity;

  if (inputActivity === 'recording') {
    wakeThen(() => {
      enterRecording();
    });
    return;
  }

  if (activity === 'working') {
    wakeThen(() => {
      if (runtimeState.activity === 'working') {
        enterTaskLoop();
      } else {
        enterTaskStart();
      }
    });
    return;
  }

  if (activity === 'listening') {
    wakeThen(() => {
      enterListeningHold();
    });
    return;
  }

  if (activeRunIds.size > 0) {
    enterTaskLoop();
    return;
  }

  if (runtimeState.activity === 'working') {
    enterTaskLeave();
    return;
  }

  void enterIdle();
}
