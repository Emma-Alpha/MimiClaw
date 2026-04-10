import { beforeEach, describe, expect, it } from 'vitest';
import {
  getTrayInteractionState,
  isTrayRecentUserInteraction,
  markTrayClosed,
  markTrayMenuOpened,
  requestTrayMenuOpen,
  requestTrayPanelToggle,
  resetTrayInteractionState,
} from '@electron/main/tray-interaction-center';

describe('tray interaction center', () => {
  beforeEach(() => {
    resetTrayInteractionState();
  });

  it('keeps menu state after close-and-reopen flow', () => {
    markTrayMenuOpened('left-click', 1_000);

    const decision = requestTrayMenuOpen('right-click', 1_220);
    expect(decision).toEqual({
      allow: true,
      closePanelFirst: false,
      closeMenuFirst: true,
    });

    markTrayClosed('programmatic', 1_221);
    markTrayMenuOpened('right-click', 1_222);

    expect(getTrayInteractionState()).toMatchObject({
      surface: 'menu',
      reason: 'right-click',
    });
  });

  it('dedupes repeated opens inside guard window', () => {
    markTrayMenuOpened('left-click', 2_000);

    const blocked = requestTrayMenuOpen('left-click', 2_120);
    expect(blocked.allow).toBe(false);

    const allowed = requestTrayMenuOpen('left-click', 2_181);
    expect(allowed).toEqual({
      allow: true,
      closePanelFirst: false,
      closeMenuFirst: true,
    });
  });

  it('marks user interaction recency correctly', () => {
    markTrayMenuOpened('left-click', 3_000);
    expect(isTrayRecentUserInteraction(2_000, 4_500)).toBe(true);
    expect(isTrayRecentUserInteraction(2_000, 5_100)).toBe(false);
  });

  it('toggles panel with menu mutual exclusion', () => {
    markTrayMenuOpened('left-click', 6_000);

    const openDecision = requestTrayPanelToggle('panel-toggle', 6_100);
    expect(openDecision).toEqual({
      action: 'open',
      closeMenuFirst: true,
    });
    expect(getTrayInteractionState()).toMatchObject({
      surface: 'panel',
      reason: 'panel-toggle',
    });

    const closeDecision = requestTrayPanelToggle('panel-toggle', 6_200);
    expect(closeDecision).toEqual({ action: 'close' });
    expect(getTrayInteractionState()).toMatchObject({
      surface: 'closed',
      reason: 'panel-toggle',
    });
  });
});
