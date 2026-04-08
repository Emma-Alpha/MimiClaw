export const PET_WINDOW_WIDTH = 200;
export const PET_WINDOW_HEIGHT = 200;

export const PET_BUBBLE_WINDOW_WIDTH = 126;
export const PET_BUBBLE_WINDOW_HEIGHT = 112;
export const PET_BUBBLE_WINDOW_MIN_HEIGHT = 40;
export const PET_BUBBLE_WINDOW_GAP = 8;

// Reverse-engineered from PetClaw's separate bubble window geometry:
// the bubble window is positioned from the pet window's top-left corner
// using `offsetX` and `bottomOffset` semantics:
// bubbleX = petX + offsetX
// bubbleY = petY - bubbleHeight + bottomOffset
//
// These default values were recovered by executing PetClaw's compiled
// `pet-behavior.jsc` with instrumented window stubs.
export const PET_BUBBLE_OFFSET_X = 80;
export const PET_BUBBLE_BOTTOM_OFFSET = 70;

export const DEFAULT_PET_WINDOW_BOUNDS = {
	x: 0,
	y: 0,
	width: PET_WINDOW_WIDTH,
	height: PET_WINDOW_HEIGHT,
} as const;
