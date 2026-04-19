export const SIDEBAR_MIN_WIDTH = 240;
export const SIDEBAR_DEFAULT_WIDTH = 300;
export const SIDEBAR_MAX_WIDTH = 520;
export const SIDEBAR_VIEWPORT_MARGIN = 320;

export function getSidebarMaxWidth(viewportWidth = Number.POSITIVE_INFINITY) {
  const viewportLimitedMax = Number.isFinite(viewportWidth)
    ? Math.max(SIDEBAR_MIN_WIDTH, Math.round(viewportWidth - SIDEBAR_VIEWPORT_MARGIN))
    : SIDEBAR_MAX_WIDTH;

  return Math.min(SIDEBAR_MAX_WIDTH, viewportLimitedMax);
}

export function clampSidebarWidth(sidebarWidth: number, viewportWidth = Number.POSITIVE_INFINITY) {
  return Math.max(
    SIDEBAR_MIN_WIDTH,
    Math.min(getSidebarMaxWidth(viewportWidth), Math.round(sidebarWidth)),
  );
}
