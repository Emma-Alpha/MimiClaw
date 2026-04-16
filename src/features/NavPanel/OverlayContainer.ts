import type { DropdownMenuProps, PopoverProps } from '@lobehub/ui';
import { createContext, useContext, useMemo } from 'react';

export const OverlayContainerContext = createContext<HTMLDivElement | null>(null);

interface OverlayPopoverPortalProps extends NonNullable<PopoverProps['portalProps']> {
  container?: HTMLElement | null;
}

export const useOverlayContainer = () => {
  return useContext(OverlayContainerContext);
};

export const useOverlayDropdownPortalProps = (): DropdownMenuProps['portalProps'] => {
  const container = useOverlayContainer();

  return useMemo(() => {
    if (!container) return undefined;
    return { container };
  }, [container]);
};

export const useOverlayPopoverPortalProps = (): OverlayPopoverPortalProps | undefined => {
  const container = useOverlayContainer();

  return useMemo(() => {
    if (!container) return undefined;
    return { container };
  }, [container]);
};
