import { createStyles } from 'antd-style';

const darkMode = (rules: string) => `
  .dark &,
  [data-theme='dark'] & {
    ${rules}
  }
`;

export const useExperimentalSidebarStyles = createStyles(({ css }) => ({
  aside: css`
    position: relative;
    display: flex;
    flex-shrink: 0;
    flex-direction: column;
    border-right: 1px solid rgba(0, 0, 0, 0.05);
    background: #f4f6fa;

    ${darkMode(`
      border-right-color: rgba(255, 255, 255, 0.08);
      background: #1d1f24;
    `)}
  `,
  collapseArea: css`
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding: 1.5rem 0.75rem 0.5rem;
  `,
  collapseButton: css`
    -webkit-app-region: no-drag;
    display: flex;
    height: 1.75rem;
    width: 1.75rem;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    border-radius: 0.25rem;
    color: hsl(var(--muted-foreground));
    transition: background-color 0.2s ease;

    &:hover {
      background: rgba(0, 0, 0, 0.05);
    }

    ${darkMode(`
      &:hover {
        background: rgba(255, 255, 255, 0.1);
      }
    `)}
  `,
  icon16: css`
    height: 16px;
    width: 16px;
  `,
  tooltipContent: css`
    border: none;
    background: rgba(0, 0, 0, 0.9);
    padding: 0.375rem 0.625rem;
    font-size: 12px;
    color: #fff;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.25);
  `,
  tooltipLabel: css`
    display: flex;
    align-items: center;
    gap: 0.5rem;
    white-space: nowrap;
  `,
  tooltipShortcut: css`
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.18);
    padding: 1px 0.375rem;
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.02em;
    color: rgba(255, 255, 255, 0.95);
  `,
  quickActions: css`
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 0 0.5rem;
  `,
  quickAction: css`
    display: flex;
    width: 100%;
    align-items: center;
    gap: 0.5rem;
    border-radius: 0.375rem;
    padding: 0.375rem 0.5rem;
    color: hsl(var(--foreground) / 0.8);
    transition: background-color 0.2s ease, color 0.2s ease;

    &:hover {
      background: rgba(0, 0, 0, 0.05);
      color: hsl(var(--foreground));
    }

    ${darkMode(`
      color: hsl(var(--foreground) / 0.9);

      &:hover {
        background: rgba(255, 255, 255, 0.05);
      }
    `)}
  `,
  quickActionActive: css`
    background: rgba(0, 0, 0, 0.05);
    color: hsl(var(--foreground));

    ${darkMode(`
      background: rgba(255, 255, 255, 0.1);
    `)}
  `,
  icon15: css`
    height: 15px;
    width: 15px;
    flex-shrink: 0;
  `,
  quickActionText: css`
    font-size: 13px;
    font-weight: 500;
  `,
  searchInput: css`
    cursor: text;

    &:focus-within {
      background: rgba(0, 0, 0, 0.05);
      color: hsl(var(--foreground));
    }

    ${darkMode(`
      &:focus-within {
        background: rgba(255, 255, 255, 0.05);
      }
    `)}
  `,
  searchInputIcon: css`
    height: 15px;
    width: 15px;
    flex-shrink: 0;
  `,
  searchInputField: css`
    flex: 1;
    background: transparent;
    font-size: 13px;
    font-weight: 500;
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
  threadArea: css`
    margin-top: 1rem;
    display: flex;
    min-height: 0;
    flex: 1;
    flex-direction: column;
  `,
  threadHeader: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.375rem 1rem;

    &:hover [data-thread-header-title='true'] {
      color: hsl(var(--foreground) / 0.7);
    }

    &:hover [data-thread-header-controls='true'] {
      opacity: 1;
    }
  `,
  threadHeaderTitle: css`
    font-size: 11px;
    font-weight: 500;
    color: hsl(var(--muted-foreground));
    transition: color 0.2s ease;
  `,
  threadHeaderControls: css`
    display: flex;
    align-items: center;
    gap: 2px;
    opacity: 0;
    transition: opacity 0.2s ease;
  `,
  relativeFlex: css`
    position: relative;
    display: flex;
  `,
  iconButton22: css`
    display: flex;
    height: 22px;
    width: 22px;
    align-items: center;
    justify-content: center;
    border-radius: 0.25rem;
    color: hsl(var(--muted-foreground));

    &:hover {
      background: rgba(0, 0, 0, 0.05);
      color: hsl(var(--foreground));
    }

    ${darkMode(`
      &:hover {
        background: rgba(255, 255, 255, 0.1);
      }
    `)}
  `,
  icon14: css`
    height: 14px;
    width: 14px;
  `,
  controlsPopover: css`
    position: absolute;
    left: 0;
    top: 100%;
    z-index: 30;
    margin-top: 0.25rem;
    width: 14rem;
    border-radius: 0.5rem;
    border: 1px solid rgba(0, 0, 0, 0.08);
    background: rgba(255, 255, 255, 0.95);
    padding: 0.5rem;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    backdrop-filter: blur(8px);

    ${darkMode(`
      border-color: rgba(255, 255, 255, 0.12);
      background: rgba(35, 38, 44, 0.95);
    `)}
  `,
  controlsBlock: css`
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  `,
  controlsBlockWithGap: css`
    margin-top: 0.5rem;
  `,
  controlsLabel: css`
    padding: 0.125rem 0.25rem;
    font-size: 11px;
    color: hsl(var(--muted-foreground));
  `,
  controlsOptionsRow: css`
    display: flex;
    gap: 0.25rem;
  `,
  controlsOption: css`
    flex: 1;
    border-radius: 0.375rem;
    padding: 0.25rem 0.5rem;
    font-size: 12px;
    transition: background-color 0.2s ease;

    &:hover {
      background: rgba(0, 0, 0, 0.05);
    }

    ${darkMode(`
      &:hover {
        background: rgba(255, 255, 255, 0.08);
      }
    `)}
  `,
  controlsOptionActive: css`
    background: rgba(0, 0, 0, 0.08);

    ${darkMode(`
      background: rgba(255, 255, 255, 0.14);
    `)}
  `,
  threadScroller: css`
    min-height: 0;
    flex: 1;
    overflow-y: auto;
    padding: 0 0.5rem 0.75rem;
  `,
  searchPanel: css`
    margin-bottom: 0.75rem;
    border-radius: 0.75rem;
    border: 1px solid rgba(0, 0, 0, 0.06);
    background: rgba(0, 0, 0, 0.02);
    padding: 0.5rem;

    ${darkMode(`
      border-color: rgba(255, 255, 255, 0.1);
      background: rgba(255, 255, 255, 0.02);
    `)}
  `,
  searchPanelHeader: css`
    margin-bottom: 0.375rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 0.25rem;
  `,
  searchPanelTitle: css`
    font-size: 11px;
    font-weight: 500;
    color: hsl(var(--muted-foreground));
  `,
  searchPanelCount: css`
    font-size: 10px;
    color: hsl(var(--muted-foreground) / 0.8);
  `,
  compactStack: css`
    display: flex;
    flex-direction: column;
    gap: 2px;
  `,
  groupsStack: css`
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  `,
  emptyState: css`
    border-radius: 0.5rem;
    padding: 0.375rem 0.5rem;
    font-size: 12px;
    color: hsl(var(--muted-foreground) / 0.7);
  `,
  groupSection: css`
    border-radius: 0.75rem;
    border: 1px solid transparent;

    &:hover {
      border-color: rgba(0, 0, 0, 0.05);
    }

    ${darkMode(`
      &:hover {
        border-color: rgba(255, 255, 255, 0.08);
      }
    `)}
  `,
  groupHeader: css`
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem;
  `,
  groupToggle: css`
    display: flex;
    min-width: 0;
    flex: 1;
    align-items: center;
    gap: 0.25rem;
    border-radius: 0.375rem;
    padding: 0.25rem;
    text-align: left;
    font-size: 12px;
    font-weight: 500;
    color: hsl(var(--foreground) / 0.85);

    &:hover {
      background: rgba(0, 0, 0, 0.05);
    }

    ${darkMode(`
      &:hover {
        background: rgba(255, 255, 255, 0.08);
      }
    `)}
  `,
  icon14Shrink: css`
    height: 14px;
    width: 14px;
    flex-shrink: 0;
  `,
  truncate: css`
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  countBadge: css`
    margin-left: auto;
    flex-shrink: 0;
    border-radius: 999px;
    background: rgba(0, 0, 0, 0.06);
    padding: 0.125rem 0.375rem;
    font-size: 10px;
    color: hsl(var(--foreground) / 0.6);

    ${darkMode(`
      background: rgba(255, 255, 255, 0.1);
    `)}
  `,
  groupActions: css`
    display: flex;
    align-items: center;
    gap: 2px;
  `,
  groupAction: css`
    display: flex;
    height: 1.5rem;
    width: 1.5rem;
    align-items: center;
    justify-content: center;
    border-radius: 0.25rem;
    color: hsl(var(--muted-foreground));

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
  groupActionDanger: css`
    &:hover {
      background: hsl(var(--destructive) / 0.1);
      color: hsl(var(--destructive));
    }
  `,
  groupChildren: css`
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding-bottom: 0.25rem;
    padding-left: 0.5rem;
  `,
  groupListToggleButton: css`
    width: 100%;
    border-radius: 0.375rem;
    padding: 0.25rem 0.5rem;
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
  connectionHeader: css`
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.5rem;
    font-size: 12px;
    font-weight: 500;
    color: hsl(var(--foreground) / 0.85);
  `,
  threadRow: css`
    position: relative;

    &:hover [data-thread-menu-button='true'] {
      opacity: 1;
    }
  `,
  threadButton: css`
    width: 100%;
    border-radius: 0.5rem;
    padding: 0.375rem 2rem 0.375rem 0.5rem;
    text-align: left;
    transition: background-color 0.2s ease, color 0.2s ease;
  `,
  threadButtonActive: css`
    background: rgba(0, 0, 0, 0.07);
    color: hsl(var(--foreground));

    ${darkMode(`
      background: rgba(255, 255, 255, 0.14);
    `)}
  `,
  threadButtonIdle: css`
    color: hsl(var(--foreground) / 0.75);

    &:hover {
      background: rgba(0, 0, 0, 0.05);
    }

    ${darkMode(`
      &:hover {
        background: rgba(255, 255, 255, 0.08);
      }
    `)}
  `,
  threadMain: css`
    display: flex;
    align-items: center;
    gap: 0.375rem;
  `,
  loader: css`
    height: 14px;
    width: 14px;
    flex-shrink: 0;
    animation: experimentalSidebarSpin 1s linear infinite;
    color: hsl(var(--muted-foreground) / 0.8);

    @keyframes experimentalSidebarSpin {
      to {
        transform: rotate(360deg);
      }
    }
  `,
  threadLabel: css`
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 12.5px;
  `,
  sourceBadge: css`
    flex-shrink: 0;
    border-radius: 999px;
    background: rgba(0, 0, 0, 0.06);
    padding: 0.125rem 0.375rem;
    font-size: 10px;
    color: hsl(var(--foreground) / 0.6);

    ${darkMode(`
      background: rgba(255, 255, 255, 0.1);
    `)}
  `,
  unreadDot: css`
    height: 6px;
    width: 6px;
    flex-shrink: 0;
    border-radius: 999px;
    background: #0ea5e9;
  `,
  threadSubtitle: css`
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 10px;
    color: hsl(var(--muted-foreground) / 0.7);
  `,
  threadMenuButton: css`
    position: absolute;
    right: 0.25rem;
    top: 0.375rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 0.25rem;
    padding: 0.125rem;
    color: hsl(var(--muted-foreground));
    opacity: 0;
    transition: opacity 0.2s ease, background-color 0.2s ease, color 0.2s ease;

    &:hover {
      background: rgba(0, 0, 0, 0.06);
      color: hsl(var(--foreground));
    }

    ${darkMode(`
      &:hover {
        background: rgba(255, 255, 255, 0.1);
      }
    `)}
  `,
  threadMenuButtonVisible: css`
    opacity: 1;
  `,
  threadMenu: css`
    position: absolute;
    right: 0.5rem;
    top: 1.75rem;
    z-index: 20;
    width: 13rem;
    border-radius: 0.5rem;
    border: 1px solid rgba(0, 0, 0, 0.08);
    background: rgba(255, 255, 255, 0.95);
    padding: 0.25rem;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    backdrop-filter: blur(8px);

    ${darkMode(`
      border-color: rgba(255, 255, 255, 0.12);
      background: rgba(35, 38, 44, 0.95);
    `)}
  `,
  threadMenuLabel: css`
    padding: 0.25rem 0.5rem;
    font-size: 11px;
    color: hsl(var(--muted-foreground));
  `,
  threadProjectOption: css`
    display: flex;
    width: 100%;
    align-items: center;
    justify-content: space-between;
    border-radius: 0.375rem;
    padding: 0.375rem 0.5rem;
    text-align: left;
    font-size: 12px;
    transition: background-color 0.2s ease;

    &:hover {
      background: rgba(0, 0, 0, 0.05);
    }

    ${darkMode(`
      &:hover {
        background: rgba(255, 255, 255, 0.08);
      }
    `)}
  `,
  threadProjectOptionSelected: css`
    background: rgba(0, 0, 0, 0.07);
    color: hsl(var(--foreground));

    ${darkMode(`
      background: rgba(255, 255, 255, 0.14);
    `)}
  `,
  threadProjectCurrent: css`
    font-size: 10px;
    color: hsl(var(--muted-foreground));
  `,
  threadDeleteButton: css`
    margin-top: 0.25rem;
    display: flex;
    width: 100%;
    align-items: center;
    gap: 0.5rem;
    border-radius: 0.375rem;
    padding: 0.375rem 0.5rem;
    text-align: left;
    font-size: 12px;
    color: hsl(var(--destructive));
    transition: background-color 0.2s ease;

    &:hover {
      background: hsl(var(--destructive) / 0.1);
    }
  `,
  footer: css`
    margin-top: auto;
    border-top: 1px solid rgba(0, 0, 0, 0.05);
    padding: 0.5rem;

    ${darkMode(`
      border-top-color: rgba(255, 255, 255, 0.08);
    `)}
  `,
  footerStatus: css`
    margin-bottom: 0.25rem;
    padding: 0 0.25rem;
    font-size: 11px;
    color: hsl(var(--muted-foreground) / 0.8);
  `,
  settingsLink: css`
    display: flex;
    align-items: center;
    gap: 0.625rem;
    border-radius: 0.5rem;
    padding: 0.5rem 0.625rem;
    font-size: 14px;
    font-weight: 500;
    color: hsl(var(--foreground) / 0.8);
    transition: background-color 0.2s ease, color 0.2s ease;

    &:hover {
      background: rgba(0, 0, 0, 0.05);
    }

    ${darkMode(`
      &:hover {
        background: rgba(255, 255, 255, 0.05);
      }
    `)}
  `,
  settingsLinkActive: css`
    background: rgba(0, 0, 0, 0.05);
    color: hsl(var(--foreground));

    ${darkMode(`
      background: rgba(255, 255, 255, 0.1);
    `)}
  `,
  settingsIconWrap: css`
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    color: hsl(var(--muted-foreground));
  `,
  settingsIconWrapActive: css`
    color: hsl(var(--foreground));
  `,
  icon18: css`
    height: 18px;
    width: 18px;
  `,
  settingsLabel: css`
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  resizeHandle: css`
    position: absolute;
    right: 0;
    top: 0;
    height: 100%;
    width: 0.25rem;
    cursor: col-resize;
    background: transparent;
    transition: background-color 0.2s ease;

    &:hover {
      background: rgba(0, 0, 0, 0.12);
    }

    ${darkMode(`
      &:hover {
        background: rgba(255, 255, 255, 0.2);
      }
    `)}
  `,
}));
