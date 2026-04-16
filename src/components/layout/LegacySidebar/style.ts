import { createStyles } from 'antd-style';

const darkMode = (rules: string) => `
  .dark &,
  [data-theme='dark'] & {
    ${rules}
  }
`;

export const useLegacySidebarStyles = createStyles(({ css }) => ({
  aside: css`
    --mimi-sidebar-surface: color-mix(in srgb, var(--ant-color-bg-layout) 90%, transparent);
    --mimi-sidebar-surface-solid: var(--ant-color-bg-layout, #f3f3f2);
    --mimi-sidebar-border: color-mix(in srgb, var(--ant-color-border) 72%, transparent);
    --mimi-sidebar-footer-surface: color-mix(in srgb, var(--ant-color-bg-layout) 96%, transparent);
    --mimi-sidebar-hover-bg: color-mix(in srgb, var(--ant-color-text) 5%, transparent);
    --mimi-sidebar-hover-strong-bg: color-mix(in srgb, var(--ant-color-text) 8%, transparent);
    --mimi-sidebar-active-bg: color-mix(in srgb, var(--ant-color-text) 6%, transparent);
    --mimi-sidebar-active-strong-bg: color-mix(in srgb, var(--ant-color-text) 7%, transparent);
    --mimi-sidebar-muted-icon: var(--ant-color-text-tertiary, rgba(0, 0, 0, 0.46));
    --mimi-sidebar-card-bg: color-mix(in srgb, var(--ant-color-text) 4%, transparent);
    --mimi-sidebar-chip-bg: color-mix(in srgb, var(--ant-color-text) 8%, transparent);
    --mimi-sidebar-chip-hover-bg: color-mix(in srgb, var(--ant-color-text) 12%, transparent);

    display: flex;
    width: 268px;
    flex-shrink: 0;
    flex-direction: column;
    border-right: 1px solid var(--mimi-sidebar-border);
    /* Codex-like sidebar material:
       1. native macOS vibrancy from the BrowserWindow
       2. renderer tint mixed with transparency for softer depth */
    background: var(--mimi-sidebar-surface-solid);
    background: var(--mimi-sidebar-surface);
    -webkit-backdrop-filter: saturate(160%) blur(18px);
    backdrop-filter: saturate(160%) blur(18px);

    ${darkMode(`
      --mimi-sidebar-surface: color-mix(in srgb, var(--ant-color-bg-layout) 78%, transparent);
      --mimi-sidebar-surface-solid: var(--ant-color-bg-layout, #1a1c20);
      --mimi-sidebar-footer-surface: color-mix(in srgb, var(--ant-color-bg-layout) 88%, transparent);
      --mimi-sidebar-hover-bg: color-mix(in srgb, var(--ant-color-text) 8%, transparent);
      --mimi-sidebar-hover-strong-bg: color-mix(in srgb, var(--ant-color-text) 10%, transparent);
      --mimi-sidebar-active-bg: color-mix(in srgb, var(--ant-color-text) 10%, transparent);
      --mimi-sidebar-active-strong-bg: color-mix(in srgb, var(--ant-color-text) 12%, transparent);
      --mimi-sidebar-card-bg: color-mix(in srgb, var(--ant-color-text) 6%, transparent);
      --mimi-sidebar-chip-bg: color-mix(in srgb, var(--ant-color-text) 12%, transparent);
      --mimi-sidebar-chip-hover-bg: color-mix(in srgb, var(--ant-color-text) 16%, transparent);
    `)}
  `,
  topSpacer: css`
    height: ${window.electron?.platform === "darwin" ? "40px" : "2.75rem"};
    width: 100%;
    flex-shrink: 0;
  `,
  topBlock: css`
    padding: 0 0.5rem;
  `,
  actionStack: css`
    display: flex;
    flex-direction: column;
    gap: 2px;
  `,
  primaryAction: css`
    display: flex;
    width: 100%;
    align-items: center;
    gap: 0.625rem;
    border-radius: 0.5rem;
    padding: 0.375rem 0.5rem;
    text-align: left;
    font-size: 13px;
    font-weight: 500;
    color: hsl(var(--foreground) / 0.8);
    transition: background-color 0.2s ease, color 0.2s ease;

    &:hover {
      background: var(--mimi-sidebar-hover-bg);
      color: hsl(var(--foreground));
    }

    ${darkMode(`
      color: hsl(var(--foreground) / 0.9);
    `)}
  `,
  primaryActionIcon: css`
    height: 15px;
    width: 15px;
    flex-shrink: 0;
  `,
  truncate: css`
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  searchInput: css`
    &:focus-within {
      background: var(--mimi-sidebar-hover-bg);
      color: hsl(var(--foreground));
    }
  `,
  searchInputIcon: css`
    height: 15px;
    width: 15px;
    flex-shrink: 0;
  `,
  searchInputField: css`
    width: 100%;
    background: transparent;
    font-size: 13px;
    color: hsl(var(--foreground));
    outline: none;

    &::placeholder {
      color: hsl(var(--foreground) / 0.8);
    }

    ${darkMode(`
      &::placeholder {
        color: hsl(var(--foreground) / 0.9);
      }
    `)}
  `,
  navAction: css`
    display: flex;
    align-items: center;
    gap: 0.625rem;
    border-radius: 0.5rem;
    padding: 0.375rem 0.5rem;
    font-size: 13px;
    font-weight: 500;
    transition: background-color 0.2s ease, color 0.2s ease;
  `,
  navActionActive: css`
    background: var(--mimi-sidebar-active-strong-bg);
    color: hsl(var(--foreground));
  `,
  navActionIdle: css`
    color: hsl(var(--foreground) / 0.8);

    &:hover {
      background: var(--mimi-sidebar-hover-bg);
      color: hsl(var(--foreground));
    }

    ${darkMode(`
      color: hsl(var(--foreground) / 0.9);
    `)}
  `,
  threadsArea: css`
    margin-top: 1rem;
    min-height: 0;
    flex: 1;
    overflow-y: auto;
    padding: 0 0.75rem;
  `,
  folderSection: css`
    border-radius: 0.75rem;
    padding: 0.125rem 0;
  `,
  folderHeader: css`
    display: flex;
    align-items: center;
    gap: 0;
    border-radius: 0.5rem;
    transition: background-color 0.2s ease;

    &:hover [data-folder-icon='true'],
    &:focus-within [data-folder-icon='true'] {
      opacity: 0;
    }

    &:hover [data-folder-chevron='true'],
    &:focus-within [data-folder-chevron='true'] {
      opacity: 1;
    }

    &:hover [data-folder-actions='true'],
    &:focus-within [data-folder-actions='true'] {
      opacity: 1;
      pointer-events: auto;
    }

    &:hover,
    &:focus-within {
      background: var(--mimi-sidebar-hover-bg);
    }
  `,
  threadFolderSection: css`
    margin-bottom: 0.125rem;
  `,
  threadFolderHeader: css`
    border-radius: 0.5rem;
    padding: 0.125rem 0;

    &:hover,
    &:focus-within {
      background: var(--mimi-sidebar-hover-bg);
    }
  `,
  threadFolderHeaderActive: css`
    background: var(--mimi-sidebar-active-bg);
  `,
  threadFolderInlineToggleButton: css`
    display: none;
  `,
  threadFolderActivateButton: css`
    gap: 0.375rem;
    padding: 0.25rem 0.5rem;
    font-size: 13px;
    font-weight: 400;
    color: hsl(var(--foreground) / 0.82);
  `,
  threadFolderCount: css`
    margin-left: auto;
    font-size: 11px;
    color: hsl(var(--muted-foreground) / 0.85);
  `,
  threadFolderChildren: css`
    margin-top: 0.125rem;
    padding-left: 0;
  `,
  threadFolderHeaderActions: css`
    opacity: 1;
    pointer-events: auto;
  `,
  folderHeaderActive: css`
    background: var(--mimi-sidebar-active-strong-bg);
  `,
  folderActivateButton: css`
    display: flex;
    min-width: 0;
    flex: 1;
    align-items: center;
    gap: 0.5rem;
    border-radius: 0.375rem;
    padding: 0.375rem 0.5rem 0.375rem 0.25rem;
    text-align: left;
    font-size: 12.5px;
    transition: background-color 0.2s ease, color 0.2s ease;
  `,
  folderActivateButtonActive: css`
    color: hsl(var(--foreground));
  `,
  folderActivateButtonIdle: css`
    color: hsl(var(--foreground) / 0.75);
  `,
  folderActivateButtonSecondaryHeading: css`
    font-size: 12px;
    font-weight: 500;
    color: hsl(var(--muted-foreground) / 0.9);
  `,
  folderActivateButtonSecondaryHeadingActive: css`
    color: hsl(var(--muted-foreground) / 0.95);
  `,
  folderIconWrap: css`
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: hsl(var(--muted-foreground));
    transition: opacity 0.16s ease, color 0.2s ease;
  `,
  folderIconWrapActive: css`
    color: hsl(var(--foreground) / 0.8);
  `,
  folderCount: css`
    margin-left: auto;
    flex-shrink: 0;
    font-size: 11px;
    color: hsl(var(--muted-foreground) / 0.85);
  `,
  folderHeaderActions: css`
    display: flex;
    align-items: center;
    gap: 2px;
    margin-right: 0.25rem;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.16s ease;
  `,
  folderHeaderActionsAlwaysVisible: css`
    opacity: 1;
    pointer-events: auto;
  `,
  folderHeaderActionButton: css`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 0.25rem;
    padding: 0.25rem;
    color: hsl(var(--muted-foreground));
    transition: background-color 0.2s ease, color 0.2s ease;

    &:hover {
      background: var(--mimi-sidebar-hover-strong-bg);
      color: hsl(var(--foreground));
    }

    &:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }
  `,
  folderInlineToggleButton: css`
    position: relative;
    display: flex;
    height: 1.5rem;
    width: 1.5rem;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    border-radius: 0.25rem;
    color: hsl(var(--muted-foreground));
    transition: background-color 0.2s ease, color 0.2s ease;

    &:focus-visible {
      color: hsl(var(--foreground));
      outline: none;
    }
  `,
  folderChevron: css`
    height: 14px;
    width: 14px;
    transition: transform 0.2s ease;
  `,
  folderInlineToggleChevron: css`
    position: absolute;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.16s ease, transform 0.2s ease;
  `,
  folderChevronCollapsed: css`
    transform: rotate(-90deg);
  `,
  folderChildren: css`
    margin-left: 0;
    margin-top: 0.25rem;
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding-left: 0;
  `,
  sessionEmpty: css`
    border-radius: 0.375rem;
    padding: 0.375rem 0.5rem;
    font-size: 12px;
    color: hsl(var(--muted-foreground) / 0.7);
  `,
  sessionListToggleButton: css`
    width: 100%;
    border-radius: 0.375rem;
    padding: 0.25rem 0.5rem 0.25rem 1.75rem;
    text-align: left;
    font-size: 11px;
    color: hsl(var(--muted-foreground) / 0.85);
    transition: background-color 0.2s ease, color 0.2s ease;

    &:hover {
      background: var(--mimi-sidebar-hover-bg);
      color: hsl(var(--foreground) / 0.8);
    }
  `,
  warningText: css`
    border-radius: 0.375rem;
    padding: 0.375rem 0.5rem;
    font-size: 11px;
    color: #b45309;

    ${darkMode(`
      color: #fcd34d;
    `)}
  `,
  chatSessionRow: css`
    position: relative;
    display: flex;
    align-items: center;

    &:hover [data-session-delete='true'] {
      opacity: 1;
    }

    &:hover [data-subitem-pin='true'] {
      opacity: 1;
      transform: translate(0, -50%);
    }
  `,
  subItemPinWrap: css`
    position: absolute;
    left: calc((1.5rem - 11px) / 2);
    top: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--mimi-sidebar-muted-icon);
    opacity: 0;
    pointer-events: none;
    transform: translate(-2px, -50%);
    transition: opacity 0.16s ease, transform 0.16s ease, color 0.2s ease;
  `,
  subItemPinIcon: css`
    height: 11px;
    width: 11px;
    stroke-width: 2px;
  `,
  sessionButton: css`
    position: relative;
    width: 100%;
    border-radius: 0.375rem;
    padding: 0.375rem 1.75rem 0.375rem 1.75rem;
    text-align: left;
    transition: background-color 0.2s ease, color 0.2s ease;

    &:hover [data-subitem-pin='true'] {
      opacity: 1;
      transform: translate(0, -50%);
    }
  `,
  sessionButtonActive: css`
    background: var(--mimi-sidebar-active-strong-bg);
    color: hsl(var(--foreground));
  `,
  sessionButtonIdle: css`
    color: hsl(var(--foreground) / 0.8);

    &:hover {
      background: var(--mimi-sidebar-active-bg);
    }
  `,
  sessionMainRow: css`
    display: flex;
    min-width: 0;
    align-items: center;
    gap: 0.375rem;
  `,
  loader: css`
    height: 14px;
    width: 14px;
    flex-shrink: 0;
    color: hsl(var(--muted-foreground) / 0.8);
    animation: legacySidebarSpin 1s linear infinite;

    @keyframes legacySidebarSpin {
      to {
        transform: rotate(360deg);
      }
    }
  `,
  sessionTitle: css`
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 12px;
  `,
  sessionTime: css`
    margin-left: auto;
    flex-shrink: 0;
    font-size: 10px;
    color: hsl(var(--muted-foreground) / 0.7);
  `,
  sessionSubtitle: css`
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 10px;
    color: hsl(var(--muted-foreground) / 0.7);
  `,
  sessionDeleteButton: css`
    position: absolute;
    right: 0.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 0.25rem;
    padding: 0.125rem;
    opacity: 0;
    color: hsl(var(--muted-foreground));
    transition: opacity 0.2s ease, background-color 0.2s ease, color 0.2s ease;

    &:hover {
      background: hsl(var(--destructive) / 0.1);
      color: hsl(var(--destructive));
    }
  `,
  sessionDeleteIcon: css`
    height: 14px;
    width: 14px;
  `,
  listButton: css`
    position: relative;
    width: 100%;
    border-radius: 0.375rem;
    padding: 0.375rem 0.5rem 0.375rem 1.75rem;
    text-align: left;
    font-size: 12px;
    transition: background-color 0.2s ease, color 0.2s ease;

    &:hover [data-subitem-pin='true'] {
      opacity: 1;
      transform: translate(0, -50%);
    }
  `,
  listButtonRow: css`
    display: flex;
    align-items: center;
    gap: 0.5rem;
  `,
  listButtonActive: css`
    background: var(--mimi-sidebar-active-strong-bg);
    color: hsl(var(--foreground));
  `,
  listButtonIdle: css`
    color: hsl(var(--foreground) / 0.8);

    &:hover {
      background: var(--mimi-sidebar-active-bg);
    }
  `,
  listButtonLabel: css`
    display: block;
    min-width: 0;
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  threadLikeSessionRow: css`
    border-radius: 0.5rem;

    [data-session-time='true'] {
      transition: opacity 0.16s ease;
    }

    &:hover [data-session-lead='true'],
    &:focus-within [data-session-lead='true'] {
      opacity: 1;
      transform: translate(0, -50%);
    }

    &:hover [data-session-time='true'],
    &:focus-within [data-session-time='true'] {
      opacity: 0;
    }
  `,
  threadLikeSessionButtonWithActions: css`
    padding-right: 3.25rem;

    [data-session-time='true'] {
      position: absolute;
      right: 0.625rem;
      top: 50%;
      margin-left: 0;
      transform: translateY(-50%);
    }
  `,
  threadLikeSessionLead: css`
    position: absolute;
    left: calc((1.5rem - 11px) / 2);
    top: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--mimi-sidebar-muted-icon);
    opacity: 0;
    pointer-events: none;
    transform: translate(-2px, -50%);
    transition: opacity 0.16s ease, transform 0.16s ease, color 0.2s ease;
  `,
  threadLikeSessionLeadVisible: css`
    opacity: 1;
    transform: translate(0, -50%);
  `,
  threadLikeDeleteActionButton: css`
    &:hover {
      background: hsl(var(--destructive) / 0.1);
      color: hsl(var(--destructive));
    }
  `,
  workspaceRow: css`
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 0;

    &:hover [data-workspace-actions='true'],
    &:focus-within [data-workspace-actions='true'] {
      opacity: 1;
      pointer-events: auto;
    }
  `,
  workspaceButton: css`
    position: relative;
    display: flex;
    min-width: 0;
    align-items: center;
    width: 100%;
    border-radius: 0.5rem;
    padding: 0.125rem 3.25rem 0.125rem 0.25rem;
    text-align: left;
    font-size: 12px;
    transition: background-color 0.2s ease, color 0.2s ease;
  `,
  workspaceTopRow: css`
    position: relative;
  `,
  threadWorkspaceRow: css`
    border-radius: 0.5rem;

    &:hover [data-workspace-folder-icon='true'],
    &:focus-within [data-workspace-folder-icon='true'] {
      opacity: 0;
    }

    &:hover [data-workspace-chevron='true'],
    &:focus-within [data-workspace-chevron='true'] {
      opacity: 1;
    }
  `,
  threadWorkspaceRowActive: css`
    background: var(--mimi-sidebar-active-bg);
  `,
  threadWorkspaceButton: css`
    color: hsl(var(--foreground) / 0.82);
  `,
  threadWorkspaceButtonActive: css`
    background: var(--mimi-sidebar-active-bg);
    color: hsl(var(--foreground));
  `,
  threadWorkspaceButtonIdle: css`
    color: hsl(var(--foreground) / 0.82);
  `,
  workspaceFolderWrap: css`
    position: relative;
    display: flex;
    height: 24px;
    width: 24px;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    color: hsl(var(--muted-foreground) / 0.8);
  `,
  workspaceFolderIcon: css`
    height: 14px;
    width: 14px;
    flex-shrink: 0;
    transition: opacity 0.16s ease;
  `,
  workspaceChevron: css`
    position: absolute;
    height: 14px;
    width: 14px;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.16s ease, transform 0.2s ease;
  `,
  workspaceChevronCollapsed: css`
    transform: rotate(-90deg);
  `,
  workspaceMain: css`
    display: flex;
    min-width: 0;
    flex: 1;
    align-items: flex-start;
    justify-content: flex-start;
    gap: 0.375rem;
    white-space: nowrap;
  `,
  workspaceName: css`
    min-width: 0;
    flex: 0 1 auto;
    max-width: 65%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    padding-right: 0;
  `,
  workspaceSecondary: css`
    max-width: 35%;
    min-width: 0;
    flex: 0 1 auto;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 11px;
    color: hsl(var(--muted-foreground) / 0.9);
  `,
  workspaceActions: css`
    position: absolute;
    right: 0.375rem;
    top: 50%;
    display: inline-flex;
    align-items: center;
    gap: 2px;
    opacity: 0;
    pointer-events: none;
    transform: translateY(-50%);
    transition: opacity 0.16s ease;
  `,
  workspaceActionButton: css`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 0.25rem;
    padding: 0.25rem;
    color: hsl(var(--muted-foreground));
    transition: background-color 0.2s ease, color 0.2s ease;

    &:hover {
      background: var(--mimi-sidebar-hover-strong-bg);
      color: hsl(var(--foreground));
    }

    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  `,
  threadWorkspaceActionButton: css`
    border-radius: 0.375rem;
    padding: 0.1875rem;
  `,
  workspaceChildren: css`
    margin-left: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  `,
  threadWorkspaceChildren: css`
    margin-top: 0.125rem;
    padding-left: 0;
  `,
  threadSessionButton: css`
    position: relative;
    width: 100%;
    border-radius: 0.5rem;
    padding: 0.25rem 0.5rem 0.25rem 1.75rem;
    text-align: left;
    font-size: 13px;
    transition: background-color 0.2s ease, color 0.2s ease;
  `,
  workspaceUnavailableTag: css`
    flex-shrink: 0;
    border-radius: 999px;
    background: rgba(180, 83, 9, 0.14);
    padding: 0.125rem 0.375rem;
    font-size: 10px;
    line-height: 1;
    color: #92400e;

    ${darkMode(`
      background: rgba(252, 211, 77, 0.16);
      color: #fcd34d;
    `)}
  `,
  cliWorkspaceCard: css`
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
    border-radius: 0.375rem;
    background: var(--mimi-sidebar-card-bg);
    padding: 0.5rem;
  `,
  cliWorkspaceText: css`
    font-size: 12px;
    line-height: 1rem;
    color: hsl(var(--muted-foreground) / 0.8);
  `,
  cliWorkspaceButton: css`
    width: fit-content;
    border-radius: 0.375rem;
    background: var(--mimi-sidebar-chip-bg);
    padding: 0.25rem 0.5rem;
    font-size: 11px;
    font-weight: 500;
    color: hsl(var(--foreground) / 0.9);
    transition: background-color 0.2s ease;

    &:hover {
      background: var(--mimi-sidebar-chip-hover-bg);
    }
  `,
  footer: css`
    margin-top: auto;
    border-top: none;
    padding: 0.625rem;
    position: relative;
    z-index: 10;
    background: var(--mimi-sidebar-footer-surface);

    &::before {
      content: "";
      position: absolute;
      bottom: 100%;
      left: 0;
      right: 0;
      height: 32px;
      background: linear-gradient(to top, var(--mimi-sidebar-footer-surface) 0%, transparent 100%);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      mask-image: linear-gradient(to top, black 0%, transparent 100%);
      -webkit-mask-image: linear-gradient(to top, black 0%, transparent 100%);
      pointer-events: none;
    }
  `,
  settingsLink: css`
    display: flex;
    align-items: center;
    gap: 0.625rem;
    border-radius: 0.5rem;
    padding: 0.5rem 0.625rem;
    font-size: 14px;
    color: hsl(var(--foreground) / 0.82);
    transition: background-color 0.2s ease, color 0.2s ease;

    &:hover {
      background: var(--mimi-sidebar-hover-bg);
    }
  `,
  settingsLinkActive: css`
    background: var(--mimi-sidebar-active-strong-bg);
    color: hsl(var(--foreground));
  `,
  settingsIcon: css`
    height: 18px;
    width: 18px;
    flex-shrink: 0;
  `,
}));
