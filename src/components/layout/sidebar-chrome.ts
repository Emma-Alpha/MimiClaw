type SidebarChromeToken = {
  colorBgContainer: string;
  colorBgLayout: string;
  colorBorderSecondary: string;
  colorText: string;
};

const SIDEBAR_GLASS_BACKDROP_SATURATION = 160;
const SIDEBAR_LIGHT_BLUR = 18;
const SIDEBAR_DARK_BLUR = 22;
const SIDEBAR_LIGHT_SURFACE_MIX = 84;
const SIDEBAR_DARK_SURFACE_MIX = 72;
const SIDEBAR_LIGHT_SOLID_MIX = 96;
const SIDEBAR_DARK_SOLID_MIX = 92;

export function getSidebarChromeCss(token: SidebarChromeToken) {
  return `
    --mimi-sidebar-surface: color-mix(in srgb, ${token.colorBgLayout} ${SIDEBAR_LIGHT_SURFACE_MIX}%, transparent);
    --mimi-sidebar-surface-solid: color-mix(in srgb, ${token.colorBgLayout} ${SIDEBAR_LIGHT_SOLID_MIX}%, ${token.colorBgContainer});
    --mimi-sidebar-border: color-mix(in srgb, ${token.colorBorderSecondary} 72%, transparent);
    --mimi-sidebar-edge-shadow: color-mix(in srgb, ${token.colorText} 5%, transparent);
    --mimi-sidebar-overlay: linear-gradient(
      180deg,
      color-mix(in srgb, ${token.colorBgContainer} 36%, transparent) 0%,
      transparent 18%,
      transparent 82%,
      color-mix(in srgb, ${token.colorText} 3%, transparent) 100%
    );
    --mimi-sidebar-backdrop-filter: blur(${SIDEBAR_LIGHT_BLUR}px) saturate(${SIDEBAR_GLASS_BACKDROP_SATURATION}%);

    position: relative;
    isolation: isolate;
    border-right: 1px solid var(--mimi-sidebar-border);
    background: var(--mimi-sidebar-surface-solid);
    box-shadow: inset -1px 0 0 var(--mimi-sidebar-edge-shadow);

    &[data-translucent-sidebar='true'] {
      background: var(--mimi-sidebar-surface);
      -webkit-backdrop-filter: var(--mimi-sidebar-backdrop-filter);
      backdrop-filter: var(--mimi-sidebar-backdrop-filter);
    }

    &[data-translucent-sidebar='true']::after {
      content: '';
      position: absolute;
      inset: 0;
      pointer-events: none;
      background: var(--mimi-sidebar-overlay);
    }

    &[data-translucent-sidebar='true'] > * {
      position: relative;
      z-index: 1;
    }

    [data-theme='dark'] & {
      --mimi-sidebar-surface: color-mix(in srgb, ${token.colorBgLayout} ${SIDEBAR_DARK_SURFACE_MIX}%, transparent);
      --mimi-sidebar-surface-solid: color-mix(in srgb, ${token.colorBgLayout} ${SIDEBAR_DARK_SOLID_MIX}%, ${token.colorBgContainer});
      --mimi-sidebar-border: color-mix(in srgb, ${token.colorBorderSecondary} 84%, transparent);
      --mimi-sidebar-edge-shadow: color-mix(in srgb, ${token.colorText} 8%, transparent);
      --mimi-sidebar-overlay: linear-gradient(
        180deg,
        color-mix(in srgb, ${token.colorBgContainer} 26%, transparent) 0%,
        transparent 18%,
        transparent 82%,
        color-mix(in srgb, ${token.colorText} 5%, transparent) 100%
      );
      --mimi-sidebar-backdrop-filter: blur(${SIDEBAR_DARK_BLUR}px) saturate(${SIDEBAR_GLASS_BACKDROP_SATURATION}%);
    }
  `;
}
