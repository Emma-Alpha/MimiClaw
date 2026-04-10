export type TrayInteractionSurface = 'closed' | 'menu' | 'panel';

export type TrayInteractionReason =
  | 'left-click'
  | 'right-click'
  | 'panel-toggle'
  | 'panel-blur'
  | 'programmatic'
  | 'destroy'
  | 'unknown';

export type TrayInteractionState = {
  surface: TrayInteractionSurface;
  reason: TrayInteractionReason;
  updatedAt: number;
};

type MenuOpenDecision = {
  allow: boolean;
  closePanelFirst: boolean;
  closeMenuFirst: boolean;
};

type PanelToggleDecision =
  | {
      action: 'open';
      closeMenuFirst: boolean;
    }
  | {
      action: 'close';
    }
  | {
      action: 'noop';
    };

const MENU_OPEN_GUARD_MS = 180;

const listeners = new Set<(state: TrayInteractionState) => void>();

let interactionState: TrayInteractionState = {
  surface: 'closed',
  reason: 'unknown',
  updatedAt: Date.now(),
};

let lastMenuOpenAt = 0;

function isUserDrivenReason(reason: TrayInteractionReason): boolean {
  return reason === 'left-click' || reason === 'right-click' || reason === 'panel-toggle';
}

function emitState(): void {
  for (const listener of listeners) {
    try {
      listener(interactionState);
    } catch {
      // Interaction listeners are best-effort; never block UI.
    }
  }
}

function setInteractionState(surface: TrayInteractionSurface, reason: TrayInteractionReason, now = Date.now()): void {
  if (
    interactionState.surface === surface
    && interactionState.reason === reason
    && now - interactionState.updatedAt < 16
  ) {
    return;
  }
  interactionState = {
    surface,
    reason,
    updatedAt: now,
  };
  emitState();
}

export function subscribeTrayInteractionState(listener: (state: TrayInteractionState) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getTrayInteractionState(): TrayInteractionState {
  return interactionState;
}

export function isTrayRecentUserInteraction(maxAgeMs = 2_000, now = Date.now()): boolean {
  if (!isUserDrivenReason(interactionState.reason)) return false;
  return now - interactionState.updatedAt <= maxAgeMs;
}

export function requestTrayMenuOpen(reason: TrayInteractionReason, now = Date.now()): MenuOpenDecision {
  const withinGuard = now - lastMenuOpenAt < MENU_OPEN_GUARD_MS;
  if (withinGuard) {
    return {
      allow: false,
      closePanelFirst: false,
      closeMenuFirst: false,
    };
  }

  const closePanelFirst = interactionState.surface === 'panel';
  const closeMenuFirst = interactionState.surface === 'menu';

  return {
    allow: true,
    closePanelFirst,
    closeMenuFirst,
  };
}

export function markTrayMenuOpened(reason: TrayInteractionReason, now = Date.now()): void {
  lastMenuOpenAt = now;
  setInteractionState('menu', reason, now);
}

export function requestTrayPanelToggle(reason: TrayInteractionReason, now = Date.now()): PanelToggleDecision {
  if (interactionState.surface === 'panel') {
    setInteractionState('closed', reason, now);
    return { action: 'close' };
  }

  if (interactionState.surface === 'menu') {
    setInteractionState('panel', reason, now);
    return {
      action: 'open',
      closeMenuFirst: true,
    };
  }

  if (interactionState.surface === 'closed') {
    setInteractionState('panel', reason, now);
    return {
      action: 'open',
      closeMenuFirst: false,
    };
  }

  return { action: 'noop' };
}

export function markTrayPanelClosed(reason: TrayInteractionReason, now = Date.now()): void {
  if (interactionState.surface !== 'panel') return;
  setInteractionState('closed', reason, now);
}

export function markTrayClosed(reason: TrayInteractionReason, now = Date.now()): void {
  if (interactionState.surface === 'closed') return;
  setInteractionState('closed', reason, now);
}

export function resetTrayInteractionState(): void {
  lastMenuOpenAt = 0;
  setInteractionState('closed', 'destroy', Date.now());
}
