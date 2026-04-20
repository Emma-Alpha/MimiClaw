const CODEX_DARK_SIDEBAR_BACKGROUND = '#131313';
const CODEX_DARK_SURFACE = '#181818';
const CODEX_DARK_BORDER = 'rgba(255, 255, 255, 0.084)';
const CODEX_DARK_EDGE_SHADOW = 'rgba(255, 255, 255, 0.03)';

const CODEX_LIGHT_SIDEBAR_BACKGROUND = '#fcfcfc';
const CODEX_LIGHT_SURFACE = '#ffffff';
const CODEX_LIGHT_BORDER = 'rgba(26, 28, 31, 0.078)';
const CODEX_LIGHT_EDGE_SHADOW = 'rgba(26, 28, 31, 0.025)';

const SIDEBAR_TRANSLUCENT_ALPHA = 90;

export function getSidebarChromeCss() {
  return `
    --mimi-sidebar-surface: color-mix(in oklab, ${CODEX_LIGHT_SIDEBAR_BACKGROUND} ${SIDEBAR_TRANSLUCENT_ALPHA}%, transparent);
    --mimi-sidebar-surface-solid: ${CODEX_LIGHT_SIDEBAR_BACKGROUND};
    --mimi-sidebar-main-surface: ${CODEX_LIGHT_SURFACE};
    --mimi-sidebar-border: ${CODEX_LIGHT_BORDER};
    --mimi-sidebar-edge-shadow: ${CODEX_LIGHT_EDGE_SHADOW};

    position: relative;
    isolation: isolate;
    border-right: 1px solid var(--mimi-sidebar-border);
    background: var(--mimi-sidebar-surface-solid);
    box-shadow: inset -1px 0 0 var(--mimi-sidebar-edge-shadow);

    &[data-translucent-sidebar='true'] {
      background: var(--mimi-sidebar-surface);
    }

    [data-theme='dark'] & {
      --mimi-sidebar-surface: color-mix(in oklab, ${CODEX_DARK_SIDEBAR_BACKGROUND} ${SIDEBAR_TRANSLUCENT_ALPHA}%, transparent);
      --mimi-sidebar-surface-solid: ${CODEX_DARK_SIDEBAR_BACKGROUND};
      --mimi-sidebar-main-surface: ${CODEX_DARK_SURFACE};
      --mimi-sidebar-border: ${CODEX_DARK_BORDER};
      --mimi-sidebar-edge-shadow: ${CODEX_DARK_EDGE_SHADOW};
    }
  `;
}
