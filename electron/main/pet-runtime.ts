import { BrowserWindow } from 'electron';
import type { GatewayManager } from '../gateway/manager';
import {
  DEFAULT_PET_ANIMATION,
  PET_IDLE_ANIMATIONS,
  type PetAnimation,
  type PetRuntimeState,
  type PetUiActivity,
} from '../../shared/pet';
import { getAllSettings } from '../utils/store';
import { logger } from '../utils/logger';

const SLEEP_AFTER_IDLE_MS = 45_000;
const LISTENING_DURATION_MS = 1800;
const RECORDING_PULSE_MS = 1200;
const SLEEP_START_DURATION_MS = 10_074;
const SLEEP_LEAVE_DURATION_MS = 15_074;
const TASK_START_DURATION_MS = 5_074;
const TASK_LEAVE_DURATION_MS = 8_908;

let activeRunIds = new Set<string>();
let transitionTimer: NodeJS.Timeout | null = null;
let sleepTimer: NodeJS.Timeout | null = null;
let inputActivity: 'idle' | 'recording' = 'idle';
let uiActivity: PetUiActivity = 'idle';
let terminalLines: string[] = [];
let runtimeState: PetRuntimeState = {
  animation: DEFAULT_PET_ANIMATION,
  activity: 'idle',
  showTerminal: false,
  terminalLines: [],
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
    return PET_IDLE_ANIMATIONS.includes(settings.petAnimation as typeof PET_IDLE_ANIMATIONS[number])
      ? settings.petAnimation
      : DEFAULT_PET_ANIMATION;
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

function setRuntimeState(next: Omit<PetRuntimeState, 'updatedAt' | 'terminalLines'> & { terminalLines?: string[] }): void {
  runtimeState = {
    ...next,
    terminalLines: next.terminalLines ?? (next.showTerminal ? terminalLines : []),
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
  terminalLines = [];
  setRuntimeState({
    animation: await resolveIdleAnimation(),
    activity: 'idle',
    showTerminal: false,
    terminalLines: [],
  });
  scheduleSleepCountdown();
}

function normalizeRunId(value: unknown): string | null {
  if (value == null) return null;
  const text = String(value).trim();
  return text ? text : null;
}

function extractLineFromMessage(message: Record<string, unknown>): string | null {
  const content = message.content;

  if (Array.isArray(content)) {
    // 1. Prefer tool_use / toolCall blocks (most informative)
    for (const block of content) {
      if (typeof block !== 'object' || block === null) continue;
      const b = block as Record<string, unknown>;
      if (b.type === 'tool_use' || b.type === 'toolCall') {
        const toolName = String(b.name ?? b.function ?? '');
        const input = typeof b.input === 'object' && b.input !== null
          ? b.input as Record<string, unknown>
          : {};
        const cmd = input.command ?? input.cmd ?? input.script ?? input.code;
        if (cmd) return `$ ${String(cmd).split('\n')[0].slice(0, 60)}`;
        const filePath = input.path ?? input.file_path ?? input.filepath;
        if (filePath) return `› ${toolName} ${String(filePath).split(/[\\/]/).slice(-2).join('/')}`;
        if (toolName) return `› ${toolName}`;
      }
    }
    // 2. Fall back to last non-empty text block
    for (let i = content.length - 1; i >= 0; i--) {
      const block = content[i] as Record<string, unknown>;
      if (typeof block !== 'object' || block === null) continue;
      if (block.type === 'text' && typeof block.text === 'string') {
        const lastLine = block.text.trim().split('\n').filter(Boolean).pop() ?? '';
        if (lastLine) return lastLine.slice(0, 72);
      }
    }
  }

  // Plain string content
  if (typeof content === 'string' && content.trim()) {
    const lastLine = content.trim().split('\n').filter(Boolean).pop() ?? '';
    if (lastLine) return lastLine.slice(0, 72);
  }

  // OpenAI format: tool_calls array on message root
  const toolCalls = (message.tool_calls ?? message.toolCalls) as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(toolCalls) && toolCalls.length > 0) {
    const tc = toolCalls[0] as Record<string, unknown>;
    const fn = tc.function as Record<string, unknown> | undefined;
    const toolName = String(fn?.name ?? tc.name ?? '');
    try {
      const args = JSON.parse(String(fn?.arguments ?? '{}')) as Record<string, unknown>;
      const cmd = args.command ?? args.cmd ?? args.script;
      if (cmd) return `$ ${String(cmd).split('\n')[0].slice(0, 60)}`;
    } catch { /* ignore */ }
    if (toolName) return `› ${toolName}`;
  }

  return null;
}

function extractTerminalLine(notification: { method?: string; params?: unknown }): string | null {
  const params = notification?.params && typeof notification.params === 'object'
    ? notification.params as Record<string, unknown>
    : {};
  const dataBlock = params.data && typeof params.data === 'object'
    ? params.data as Record<string, unknown>
    : {};

  // message can live at params.message OR params.data.message
  const rawMessage = params.message ?? dataBlock.message;
  if (rawMessage && typeof rawMessage === 'object') {
    const line = extractLineFromMessage(rawMessage as Record<string, unknown>);
    if (line) return line;
  }

  // Some gateways put content directly in params (no nested message)
  const directLine = extractLineFromMessage(params);
  if (directLine) return directLine;

  logger.debug('[pet-runtime] extractTerminalLine: no line found. params keys:', Object.keys(params));
  return null;
}

function pushTerminalLine(line: string): void {
  terminalLines = [...terminalLines.slice(-2), line];
  logger.debug(`[pet-runtime] terminal line: ${line}`);
  // Always update runtimeState with the latest lines and broadcast.
  // If showTerminal is still false the broadcast is still sent so the
  // renderer has the lines ready when showTerminal transitions to true.
  runtimeState = { ...runtimeState, terminalLines, updatedAt: Date.now() };
  broadcastPetRuntimeState();
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
    logger.debug(`[pet-runtime] agent event state=${event.state} phase=${event.phase} runId=${event.runId}`);

    if (event.state === 'delta' || event.state === 'final') {
      const line = extractTerminalLine(notification);
      if (line) pushTerminalLine(line);
    }

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

/** Called by the renderer via IPC to push a terminal line extracted from agent events. */
export function pushPetTerminalLine(line: string): void {
  pushTerminalLine(line);
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
