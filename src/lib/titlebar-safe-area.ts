import { useEffect, useMemo, useState } from 'react';

export interface HeaderSafeInsets {
  left: number;
  right: number;
}

interface WindowControlsOverlayLike extends EventTarget {
  getTitlebarAreaRect: () => DOMRect;
  visible: boolean;
}

interface NavigatorUserAgentDataLike {
  platform?: string;
}

interface NavigatorWithWindowControlsOverlay extends Navigator {
  userAgentData?: NavigatorUserAgentDataLike;
  windowControlsOverlay?: WindowControlsOverlayLike;
}

const ZERO_INSETS = { left: 0, right: 0 } as const satisfies HeaderSafeInsets;
const LEGACY_MAC_INSETS = { left: 84, right: 0 } as const satisfies HeaderSafeInsets;
const MODERN_MAC_INSETS = { left: 94, right: 0 } as const satisfies HeaderSafeInsets;
export const DEFAULT_HEADER_SIDE_PADDING = 12;
const MAC_OS_VERSION_PATTERN = /mac os x (\d+)[_.](\d+)/i;

const COLLAPSED_SIDEBAR_TOGGLE_RESERVE = {
  darwin: 34,
  default: 0,
  linux: 40,
  win32: 40,
} as const;

export const CHAT_HEADER_HEIGHT = 46;

function getNavigator(): NavigatorWithWindowControlsOverlay | null {
  if (typeof navigator === 'undefined') return null;

  return navigator as NavigatorWithWindowControlsOverlay;
}

function readWindowControlsOverlayInsets(): HeaderSafeInsets | null {
  if (typeof window === 'undefined') return null;

  const overlay = getNavigator()?.windowControlsOverlay;
  if (!overlay?.visible) return null;

  const titlebarRect = overlay.getTitlebarAreaRect();

  return {
    left: Math.max(0, Math.round(titlebarRect.x)),
    right: Math.max(0, Math.round(window.innerWidth - (titlebarRect.x + titlebarRect.width))),
  };
}

function getMacFallbackInsets(userAgent: string): HeaderSafeInsets {
  const versionMatch = MAC_OS_VERSION_PATTERN.exec(userAgent);
  if (versionMatch == null) return MODERN_MAC_INSETS;

  const major = Number.parseInt(versionMatch[1] ?? '', 10);
  const minor = Number.parseInt(versionMatch[2] ?? '', 10);
  if (Number.isNaN(major) || Number.isNaN(minor)) return MODERN_MAC_INSETS;

  return major === 10 && minor <= 15 ? LEGACY_MAC_INSETS : MODERN_MAC_INSETS;
}

function isFullscreenDisplayMode(): boolean {
  if (typeof window === 'undefined') return false;

  return window.matchMedia('(display-mode: fullscreen)').matches;
}

export function getCollapsedSidebarToggleReserve(platform: string | undefined): number {
  switch (platform) {
    case 'darwin':
      return COLLAPSED_SIDEBAR_TOGGLE_RESERVE.darwin;
    case 'win32':
      return COLLAPSED_SIDEBAR_TOGGLE_RESERVE.win32;
    case 'linux':
      return COLLAPSED_SIDEBAR_TOGGLE_RESERVE.linux;
    default:
      return COLLAPSED_SIDEBAR_TOGGLE_RESERVE.default;
  }
}

function resolvePlatformSafeInsets(
  platform: string | undefined,
  isFullscreen: boolean,
  overlayInsets: HeaderSafeInsets | null,
): HeaderSafeInsets {
  if (isFullscreen) return ZERO_INSETS;

  switch (platform) {
    case 'darwin':
      return getMacFallbackInsets(getNavigator()?.userAgent?.toLowerCase() ?? '');
    case 'win32':
      return overlayInsets ?? ZERO_INSETS;
    case 'linux':
      return ZERO_INSETS;
    default:
      return ZERO_INSETS;
  }
}

export function useTitlebarSafeInsets(): HeaderSafeInsets {
  const platform = typeof window === 'undefined' ? undefined : window.electron?.platform;
  const [isFullscreen, setIsFullscreen] = useState(isFullscreenDisplayMode);
  const [overlayInsets, setOverlayInsets] = useState<HeaderSafeInsets | null>(
    readWindowControlsOverlayInsets,
  );

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const mediaQuery = window.matchMedia('(display-mode: fullscreen)');
    const handleChange = (event: MediaQueryListEvent) => {
      setIsFullscreen(event.matches);
    };

    setIsFullscreen(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const overlay = getNavigator()?.windowControlsOverlay;
    if (overlay == null) {
      setOverlayInsets(null);
      return undefined;
    }

    const updateInsets = () => {
      setOverlayInsets(readWindowControlsOverlayInsets());
    };

    updateInsets();
    overlay.addEventListener('geometrychange', updateInsets);
    window.addEventListener('resize', updateInsets);

    return () => {
      overlay.removeEventListener('geometrychange', updateInsets);
      window.removeEventListener('resize', updateInsets);
    };
  }, [platform]);

  return useMemo(
    () => resolvePlatformSafeInsets(platform, isFullscreen, overlayInsets),
    [isFullscreen, overlayInsets, platform],
  );
}

export function useChatHeaderInsets(sidebarCollapsed: boolean) {
  const platform = typeof window === 'undefined' ? undefined : window.electron?.platform;
  const safeInsets = useTitlebarSafeInsets();

  return useMemo(() => {
    const startInset = sidebarCollapsed
      ? safeInsets.left + getCollapsedSidebarToggleReserve(platform)
      : DEFAULT_HEADER_SIDE_PADDING;
    const endInset = safeInsets.right + DEFAULT_HEADER_SIDE_PADDING;

    return {
      end: Math.max(DEFAULT_HEADER_SIDE_PADDING, endInset),
      start: Math.max(DEFAULT_HEADER_SIDE_PADDING, startInset),
    };
  }, [platform, safeInsets.left, safeInsets.right, sidebarCollapsed]);
}
