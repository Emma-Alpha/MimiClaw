const CODEX_DARK_SIDEBAR_BACKGROUND = '#131313';
const CODEX_DARK_SURFACE = '#181818';
const CODEX_DARK_BORDER = 'rgba(255, 255, 255, 0.084)';
const CODEX_DARK_EDGE_SHADOW = 'rgba(255, 255, 255, 0.03)';

const CODEX_LIGHT_SIDEBAR_BACKGROUND = '#fcfcfc';
const CODEX_LIGHT_SURFACE = '#ffffff';
const CODEX_LIGHT_BORDER = 'rgba(26, 28, 31, 0.078)';
const CODEX_LIGHT_EDGE_SHADOW = 'rgba(26, 28, 31, 0.025)';

const SIDEBAR_GLASS_BACKDROP_SATURATION = 160;
const SIDEBAR_LIGHT_BLUR = 24;
const SIDEBAR_DARK_BLUR = 24;
const SIDEBAR_TRANSLUCENT_ALPHA = 84;

export function getSidebarChromeCss() {
  return `
    --mimi-sidebar-surface: color-mix(in oklab, ${CODEX_LIGHT_SIDEBAR_BACKGROUND} ${SIDEBAR_TRANSLUCENT_ALPHA}%, transparent);
    --mimi-sidebar-surface-solid: ${CODEX_LIGHT_SIDEBAR_BACKGROUND};
    --mimi-sidebar-main-surface: ${CODEX_LIGHT_SURFACE};
    --mimi-sidebar-border: ${CODEX_LIGHT_BORDER};
    --mimi-sidebar-edge-shadow: ${CODEX_LIGHT_EDGE_SHADOW};
    --mimi-sidebar-sheen: linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.18) 0%,
      rgba(255, 255, 255, 0.05) 8%,
      rgba(255, 255, 255, 0.01) 16%,
      rgba(255, 255, 255, 0) 30%,
      rgba(255, 255, 255, 0.03) 100%
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
      background: var(--mimi-sidebar-sheen);
      opacity: 0.9;
    }

    &[data-translucent-sidebar='true'] > * {
      position: relative;
      z-index: 1;
    }

    [data-theme='dark'] & {
      --mimi-sidebar-surface: color-mix(in oklab, ${CODEX_DARK_SIDEBAR_BACKGROUND} ${SIDEBAR_TRANSLUCENT_ALPHA}%, transparent);
      --mimi-sidebar-surface-solid: ${CODEX_DARK_SIDEBAR_BACKGROUND};
      --mimi-sidebar-main-surface: ${CODEX_DARK_SURFACE};
      --mimi-sidebar-border: ${CODEX_DARK_BORDER};
      --mimi-sidebar-edge-shadow: ${CODEX_DARK_EDGE_SHADOW};
      --mimi-sidebar-sheen: linear-gradient(
        180deg,
        rgba(255, 255, 255, 0.12) 0%,
        rgba(255, 255, 255, 0.045) 10%,
        rgba(255, 255, 255, 0.015) 20%,
        rgba(255, 255, 255, 0) 32%,
        rgba(255, 255, 255, 0.025) 100%
      );
      --mimi-sidebar-backdrop-filter: blur(${SIDEBAR_DARK_BLUR}px) saturate(${SIDEBAR_GLASS_BACKDROP_SATURATION}%);
    }
  `;
}
