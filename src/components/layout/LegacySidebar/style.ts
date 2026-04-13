import { createStyles } from 'antd-style';

const darkMode = (rules: string) => `
  .dark &,
  [data-theme='dark'] & {
    ${rules}
  }
`;

export const useLegacySidebarStyles = createStyles(({ css }) => ({
  aside: css`
    display: flex;
    width: 268px;
    flex-shrink: 0;
    flex-direction: column;
    border-right: 1px solid rgba(0, 0, 0, 0.06);
    background: #f3f3f2;

    ${darkMode(`
      border-right-color: rgba(255, 255, 255, 0.08);
      background: #1a1c20;
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
      background: rgba(0, 0, 0, 0.05);
      color: hsl(var(--foreground));
    }

    ${darkMode(`
      color: hsl(var(--foreground) / 0.9);

      &:hover {
        background: rgba(255, 255, 255, 0.08);
      }
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
      background: rgba(0, 0, 0, 0.05);
      color: hsl(var(--foreground));
    }

    ${darkMode(`
      &:focus-within {
        background: rgba(255, 255, 255, 0.08);
      }
    `)}
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
    background: rgba(0, 0, 0, 0.07);
    color: hsl(var(--foreground));

    ${darkMode(`
      background: rgba(255, 255, 255, 0.14);
    `)}
  `,
  navActionIdle: css`
    color: hsl(var(--foreground) / 0.8);

    &:hover {
      background: rgba(0, 0, 0, 0.05);
      color: hsl(var(--foreground));
    }

    ${darkMode(`
      color: hsl(var(--foreground) / 0.9);

      &:hover {
        background: rgba(255, 255, 255, 0.08);
      }
    `)}
  `,
  threadsArea: css`
    margin-top: 1rem;
    min-height: 0;
    flex: 1;
    overflow-y: auto;
    padding: 0 0.75rem;
  `,
  threadsMeta: css`
    margin-bottom: 0.5rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 0.25rem;
    font-size: 12px;
    color: hsl(var(--muted-foreground) / 0.8);
  `,
  clearSearchButton: css`
    border-radius: 0.25rem;
    padding: 0.125rem 0.25rem;
    font-size: 10px;
    color: hsl(var(--muted-foreground));
    transition: background-color 0.2s ease, color 0.2s ease;

    &:hover {
      background: rgba(0, 0, 0, 0.05);
      color: hsl(var(--foreground));
    }

    ${darkMode(`
      &:hover {
        background: rgba(255, 255, 255, 0.08);
      }
    `)}
  `,
  tinyCount: css`
    font-size: 10px;
    letter-spacing: 0;
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

    &:hover,
    &:focus-within {
      background: rgba(0, 0, 0, 0.05);
    }

    ${darkMode(`
      &:hover,
      &:focus-within {
        background: rgba(255, 255, 255, 0.08);
      }
    `)}
  `,
  folderHeaderActive: css`
    background: rgba(0, 0, 0, 0.07);

    ${darkMode(`
      background: rgba(255, 255, 255, 0.13);
    `)}
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
      background: rgba(0, 0, 0, 0.05);
      color: hsl(var(--foreground) / 0.8);
    }

    ${darkMode(`
      &:hover {
        background: rgba(255, 255, 255, 0.08);
      }
    `)}
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
    color: rgba(0, 0, 0, 0.46);
    opacity: 0;
    pointer-events: none;
    transform: translate(-2px, -50%);
    transition: opacity 0.16s ease, transform 0.16s ease, color 0.2s ease;

    ${darkMode(`
      color: rgba(255, 255, 255, 0.5);
    `)}
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
    background: rgba(0, 0, 0, 0.07);
    color: hsl(var(--foreground));

    ${darkMode(`
      background: rgba(255, 255, 255, 0.12);
    `)}
  `,
  sessionButtonIdle: css`
    color: hsl(var(--foreground) / 0.8);

    &:hover {
      background: rgba(0, 0, 0, 0.06);
    }

    ${darkMode(`
      &:hover {
        background: rgba(255, 255, 255, 0.1);
      }
    `)}
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
    background: rgba(0, 0, 0, 0.07);
    color: hsl(var(--foreground));

    ${darkMode(`
      background: rgba(255, 255, 255, 0.12);
    `)}
  `,
  listButtonIdle: css`
    color: hsl(var(--foreground) / 0.8);

    &:hover {
      background: rgba(0, 0, 0, 0.06);
    }

    ${darkMode(`
      &:hover {
        background: rgba(255, 255, 255, 0.1);
      }
    `)}
  `,
  listButtonLabel: css`
    display: block;
    min-width: 0;
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  cliWorkspaceCard: css`
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
    border-radius: 0.375rem;
    background: rgba(0, 0, 0, 0.04);
    padding: 0.5rem;

    ${darkMode(`
      background: rgba(255, 255, 255, 0.06);
    `)}
  `,
  cliWorkspaceText: css`
    font-size: 12px;
    line-height: 1rem;
    color: hsl(var(--muted-foreground) / 0.8);
  `,
  cliWorkspaceButton: css`
    width: fit-content;
    border-radius: 0.375rem;
    background: rgba(0, 0, 0, 0.08);
    padding: 0.25rem 0.5rem;
    font-size: 11px;
    font-weight: 500;
    color: hsl(var(--foreground) / 0.9);
    transition: background-color 0.2s ease;

    &:hover {
      background: rgba(0, 0, 0, 0.12);
    }

    ${darkMode(`
      background: rgba(255, 255, 255, 0.12);

      &:hover {
        background: rgba(255, 255, 255, 0.16);
      }
    `)}
  `,
  footer: css`
    margin-top: auto;
    border-top: none;
    padding: 0.625rem;
    position: relative;
    z-index: 10;
    background: #f3f3f2;

    &::before {
      content: "";
      position: absolute;
      bottom: 100%;
      left: 0;
      right: 0;
      height: 32px;
      background: linear-gradient(to top, #f3f3f2 0%, transparent 100%);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      mask-image: linear-gradient(to top, black 0%, transparent 100%);
      -webkit-mask-image: linear-gradient(to top, black 0%, transparent 100%);
      pointer-events: none;
    }

    ${darkMode(`
      background: #1a1c20;
      &::before {
        background: linear-gradient(to top, #1a1c20 0%, transparent 100%);
      }
    `)}
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
      background: rgba(0, 0, 0, 0.05);
    }

    ${darkMode(`
      &:hover {
        background: rgba(255, 255, 255, 0.08);
      }
    `)}
  `,
  settingsLinkActive: css`
    background: rgba(0, 0, 0, 0.07);
    color: hsl(var(--foreground));

    ${darkMode(`
      background: rgba(255, 255, 255, 0.12);
    `)}
  `,
  settingsIcon: css`
    height: 18px;
    width: 18px;
    flex-shrink: 0;
  `,
}));
