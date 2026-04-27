import { createStyles } from 'antd-style';

export const usePluginsStyles = createStyles(({ token, css }) => ({
  pageRootInset: css`
    --plugins-extra-start: 12px;
    --plugins-safe-start: calc(var(--skills-inline-padding, 0px) + var(--plugins-extra-start));
    --mimi-content-safe-start: var(--plugins-safe-start);

    @media (max-width: 640px) {
      --plugins-extra-start: 8px;
    }
  `,
  contentInnerInset: css`
    padding-inline-start: max(var(--skills-inline-padding, 0px), var(--plugins-safe-start, 0px));
  `,

  /* ---- Tab shell ---- */
  tabsShell: css`
    --tab-shell-border: ${token.colorBorderSecondary};
    --tab-shell-bg: ${token.colorFillQuaternary};
    --tab-shell-active: ${token.colorBgContainer};

    margin-bottom: 18px;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px;
    border-radius: 16px;
    border: 1px solid var(--tab-shell-border);
    background:
      radial-gradient(circle at 18% 20%, rgba(22, 119, 255, 0.12) 0%, rgba(22, 119, 255, 0) 46%),
      radial-gradient(circle at 82% 80%, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0) 52%),
      var(--tab-shell-bg);

    @media (max-width: 640px) {
      width: 100%;
    }
  `,
  tabButton: css`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    height: 38px;
    min-width: 140px;
    padding: 0 18px;
    border-radius: 12px;
    border: 1px solid transparent;
    background: transparent;
    color: ${token.colorTextSecondary};
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.01em;
    cursor: pointer;
    transition:
      color 0.2s ease,
      border-color 0.2s ease,
      background 0.2s ease,
      transform 0.2s ease;

    &:hover {
      color: ${token.colorText};
      border-color: ${token.colorBorderSecondary};
      background: rgba(255, 255, 255, 0.08);
    }

    @media (max-width: 640px) {
      min-width: 0;
      flex: 1;
      padding-inline: 10px;
    }
  `,
  tabButtonActive: css`
    border-color: ${token.colorPrimaryBorder};
    background: var(--tab-shell-active);
    color: ${token.colorPrimary};
    box-shadow: 0 10px 18px rgba(0, 0, 0, 0.1);
    transform: translateY(-1px);
  `,

  /* ---- Section / panel shared ---- */
  sectionBlock: css`
    & + & {
      margin-top: 28px;
    }
  `,
  sectionTitle: css`
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    font-weight: 700;
    color: ${token.colorText};
  `,
  sectionDescription: css`
    margin-top: 6px;
    font-size: 13px;
    color: ${token.colorTextSecondary};
    line-height: 1.6;
  `,
  noticeBanner: css`
    margin-bottom: 24px;
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 16px 18px;
    border-radius: ${token.borderRadiusLG}px;
    border: 1px solid ${token.colorBorderSecondary};
    background: ${token.colorFillQuaternary};
    color: ${token.colorTextSecondary};
    font-size: 13px;
    line-height: 1.6;
  `,
  noticeIcon: css`
    margin-top: 2px;
    flex-shrink: 0;
    color: ${token.colorPrimary};
  `,

  /* ---- MCP card grid (Discover tab) ---- */
  mcpCatalogPanel: css`
    display: flex;
    flex-direction: column;
    gap: 14px;
  `,
  mcpCardGrid: css`
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;

    @media (max-width: 860px) {
      grid-template-columns: 1fr;
    }
  `,
  mcpCard: css`
    text-align: left;
    border: 1px solid ${token.colorBorderSecondary};
    background: ${token.colorBgContainer};
    border-radius: ${token.borderRadiusLG}px;
    padding: 14px;
    cursor: pointer;
    transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;

    &:hover {
      border-color: ${token.colorPrimaryBorder};
      box-shadow: 0 10px 18px rgba(15, 23, 42, 0.08);
      transform: translateY(-1px);
    }
  `,
  mcpCardHeader: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
  `,
  mcpCardIconWrap: css`
    width: 26px;
    height: 26px;
    border-radius: 9px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: ${token.colorPrimaryBg};
    color: ${token.colorPrimary};
  `,
  mcpCardBadge: css`
    height: 22px;
    padding: 0 8px;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    color: ${token.colorPrimary};
    border: 1px solid ${token.colorPrimaryBorder};
    background: ${token.colorPrimaryBg};
  `,
  mcpCardBadgeConnected: css`
    && {
      color: ${token.colorSuccess};
      border-color: ${token.colorSuccessBorder};
      background: ${token.colorSuccessBg};
    }
  `,
  mcpCardTitle: css`
    margin-top: 12px;
    font-size: 15px;
    font-weight: 700;
    color: ${token.colorText};
  `,
  mcpCardDescription: css`
    margin-top: 6px;
    font-size: 13px;
    line-height: 1.7;
    color: ${token.colorTextSecondary};
  `,
  mcpCardAction: css`
    margin-top: 12px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 30px;
    padding: 0 10px;
    border-radius: 999px;
    font-size: 12px;
    color: ${token.colorPrimary};
    background: ${token.colorPrimaryBg};
  `,
  mcpCardActionConnected: css`
    && {
      color: ${token.colorSuccess};
      background: ${token.colorSuccessBg};
    }
  `,

  /* ---- MCP detail (pencil panel) ---- */
  pencilPanel: css`
    display: flex;
    flex-direction: column;
    gap: 14px;
  `,
  mcpBackRow: css`
    display: flex;
    align-items: center;
  `,
  backButton: css`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    height: 30px;
    padding: 0 10px;
    border-radius: 999px;
    border: 1px solid ${token.colorBorderSecondary};
    background: transparent;
    color: ${token.colorTextSecondary};
    font-size: 12px;
    cursor: pointer;
    transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;

    &:hover {
      color: ${token.colorText};
      border-color: ${token.colorBorder};
      background: ${token.colorFillTertiary};
    }
  `,
  pencilIntro: css`
    position: relative;
    overflow: hidden;
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 18px;
    border-radius: ${token.borderRadiusLG}px;
    border: 1px solid ${token.colorBorderSecondary};
    background:
      linear-gradient(160deg, rgba(22, 119, 255, 0.12), rgba(16, 185, 129, 0.08) 48%, transparent 100%),
      ${token.colorBgContainer};
  `,
  pencilIntroIcon: css`
    width: 28px;
    height: 28px;
    border-radius: 9px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: ${token.colorPrimaryBg};
    color: ${token.colorPrimary};
    flex-shrink: 0;
  `,
  pencilTitle: css`
    margin: 0;
    font-size: 15px;
    font-weight: 700;
    letter-spacing: -0.01em;
    color: ${token.colorText};
  `,
  pencilTitleRow: css`
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  `,
  pencilDescription: css`
    margin-top: 6px;
    font-size: 13px;
    line-height: 1.65;
    color: ${token.colorTextSecondary};
  `,
  connectionBadge: css`
    height: 24px;
    padding: 0 10px;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 600;
    border: 1px solid ${token.colorBorderSecondary};
  `,
  connectionBadgeConnected: css`
    && {
      color: ${token.colorSuccess};
      border-color: ${token.colorSuccessBorder};
      background: ${token.colorSuccessBg};
    }
  `,
  connectionBadgePending: css`
    && {
      color: ${token.colorWarning};
      border-color: ${token.colorWarningBorder};
      background: ${token.colorWarningBg};
    }
  `,
  connectionPanel: css`
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 14px 16px;
    border-radius: ${token.borderRadiusLG}px;
    border: 1px solid ${token.colorBorderSecondary};
    background: ${token.colorBgContainer};
  `,
  connectionPanelConnected: css`
    && {
      border-color: ${token.colorSuccessBorder};
      background: linear-gradient(180deg, ${token.colorSuccessBg} 0%, ${token.colorBgContainer} 100%);
    }
  `,
  connectionPanelPending: css`
    && {
      border-color: ${token.colorWarningBorder};
      background: linear-gradient(180deg, ${token.colorWarningBg} 0%, ${token.colorBgContainer} 100%);
    }
  `,
  connectionPanelHeader: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  `,
  connectionPanelTitle: css`
    font-size: 13px;
    font-weight: 600;
    color: ${token.colorText};
  `,
  connectionMetaList: css`
    display: flex;
    flex-direction: column;
    gap: 8px;
  `,
  connectionMetaItem: css`
    display: flex;
    gap: 10px;
    align-items: flex-start;

    @media (max-width: 640px) {
      flex-direction: column;
      gap: 4px;
    }
  `,
  connectionMetaLabel: css`
    min-width: 56px;
    font-size: 12px;
    color: ${token.colorTextSecondary};
  `,
  connectionHint: css`
    margin: 0;
    font-size: 12px;
    line-height: 1.6;
    color: ${token.colorTextSecondary};
  `,
  pencilSteps: css`
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;

    @media (max-width: 860px) {
      grid-template-columns: 1fr;
    }
  `,
  pencilStepItem: css`
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 46px;
    padding: 10px 12px;
    border-radius: 12px;
    border: 1px solid ${token.colorBorderSecondary};
    background: ${token.colorFillQuaternary};
    color: ${token.colorTextSecondary};
    font-size: 13px;
  `,
  pencilStepIndex: css`
    width: 20px;
    height: 20px;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 700;
    background: ${token.colorPrimaryBg};
    color: ${token.colorPrimary};
    flex-shrink: 0;
  `,
  codeCard: css`
    border-radius: ${token.borderRadiusLG}px;
    border: 1px solid ${token.colorBorderSecondary};
    background: ${token.colorBgContainer};
    padding: 14px;
  `,
  codeCardTitle: css`
    margin-bottom: 10px;
    font-size: 12px;
    color: ${token.colorTextSecondary};
  `,
  templateCode: css`
    margin: 0;
    padding: 14px;
    border-radius: 12px;
    border: 1px solid ${token.colorBorderSecondary};
    background: ${token.colorFillQuaternary};
    overflow: auto;
    font-size: 12px;
    line-height: 1.6;
    color: ${token.colorText};
    font-family: SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  `,
  pathText: css`
    display: inline-block;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: monospace;
  `,

  /* ---- Header actions ---- */
  headerActions: css`
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
  `,
  headerButton: css`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    height: 38px;
    padding: 0 16px;
    border-radius: 999px;
    border: 1px solid ${token.colorBorderSecondary};
    background: transparent;
    color: ${token.colorTextSecondary};
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;

    &:hover {
      border-color: ${token.colorBorder};
      background: ${token.colorFillTertiary};
      color: ${token.colorText};
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.55;
    }
  `,
  /* ---- Installed / Marketplace list rows ---- */
  listRow: css`
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 12px 14px;
    border-radius: ${token.borderRadiusLG}px;
    border: 1px solid ${token.colorBorderSecondary};
    background: ${token.colorBgContainer};
    transition: border-color 0.15s ease;

    & + & {
      margin-top: 8px;
    }

    &:hover {
      border-color: ${token.colorBorder};
    }
  `,
  listRowMeta: css`
    flex: 1;
    min-width: 0;
  `,
  listRowName: css`
    font-size: 14px;
    font-weight: 600;
    color: ${token.colorText};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  listRowSub: css`
    margin-top: 4px;
    font-size: 12px;
    color: ${token.colorTextTertiary};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: monospace;
  `,
  listRowActions: css`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  `,
  rowActionButton: css`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    height: 32px;
    padding: 0 12px;
    border-radius: 999px;
    border: 1px solid ${token.colorBorderSecondary};
    background: transparent;
    color: ${token.colorTextSecondary};
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;

    &:hover {
      border-color: ${token.colorBorder};
      background: ${token.colorFillTertiary};
      color: ${token.colorText};
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.55;
    }
  `,
  rowActionDanger: css`
    &&:hover {
      border-color: ${token.colorErrorBorder};
      color: ${token.colorError};
    }
  `,
  enabledBadge: css`
    height: 22px;
    padding: 0 8px;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 600;
    color: ${token.colorSuccess};
    border: 1px solid ${token.colorSuccessBorder};
    background: ${token.colorSuccessBg};
  `,
  disabledBadge: css`
    height: 22px;
    padding: 0 8px;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 600;
    color: ${token.colorTextQuaternary};
    border: 1px solid ${token.colorBorderSecondary};
    background: ${token.colorFillQuaternary};
  `,

  /* ---- Empty state ---- */
  emptyState: css`
    padding: 40px 0;
    text-align: center;
    color: ${token.colorTextSecondary};
    font-size: 13px;
  `,

  /* ---- Search bar ---- */
  searchBar: css`
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 14px;
    flex-wrap: wrap;
  `,
  searchInput: css`
    flex: 1;
    min-width: 160px;
    height: 36px;
    padding: 0 12px;
    border-radius: 10px;
    border: 1px solid ${token.colorBorderSecondary};
    background: ${token.colorBgContainer};
    color: ${token.colorText};
    font-size: 13px;
    outline: none;
    transition: border-color 0.15s ease;

    &::placeholder {
      color: ${token.colorTextQuaternary};
    }

    &:focus {
      border-color: ${token.colorPrimary};
    }
  `,
  categoryChip: css`
    display: inline-flex;
    align-items: center;
    height: 30px;
    padding: 0 10px;
    border-radius: 999px;
    border: 1px solid ${token.colorBorderSecondary};
    background: transparent;
    color: ${token.colorTextSecondary};
    font-size: 12px;
    cursor: pointer;
    transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;

    &:hover {
      border-color: ${token.colorBorder};
      color: ${token.colorText};
    }
  `,
  categoryChipActive: css`
    border-color: ${token.colorPrimaryBorder};
    background: ${token.colorPrimaryBg};
    color: ${token.colorPrimary};
  `,

  /* ---- Marketplace plugin card (Discover tab) ---- */
  pluginCard: css`
    text-align: left;
    border: 1px solid ${token.colorBorderSecondary};
    background: ${token.colorBgContainer};
    border-radius: ${token.borderRadiusLG}px;
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    transition: border-color 0.18s ease, box-shadow 0.18s ease;

    &:hover {
      border-color: ${token.colorPrimaryBorder};
      box-shadow: 0 6px 16px rgba(15, 23, 42, 0.06);
    }
  `,
  pluginCardHeader: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
  `,
  pluginCardName: css`
    font-size: 14px;
    font-weight: 700;
    color: ${token.colorText};
  `,
  pluginCardAuthor: css`
    font-size: 12px;
    color: ${token.colorTextTertiary};
  `,
  pluginCardDescription: css`
    font-size: 13px;
    line-height: 1.6;
    color: ${token.colorTextSecondary};
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  `,
  pluginCardFooter: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-top: auto;
  `,
  pluginCardTags: css`
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  `,
  componentTag: css`
    height: 20px;
    padding: 0 6px;
    border-radius: 4px;
    display: inline-flex;
    align-items: center;
    font-size: 11px;
    color: ${token.colorPrimary};
    background: ${token.colorPrimaryBg};
  `,

  /* ---- Add marketplace dialog ---- */
  dialogOverlay: css`
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.45);
  `,
  dialogBox: css`
    width: 420px;
    max-width: calc(100vw - 32px);
    border-radius: ${token.borderRadiusLG}px;
    background: ${token.colorBgContainer};
    border: 1px solid ${token.colorBorderSecondary};
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
    padding: 24px;
  `,
  dialogTitle: css`
    font-size: 16px;
    font-weight: 700;
    color: ${token.colorText};
    margin-bottom: 18px;
  `,
  dialogField: css`
    margin-bottom: 14px;
  `,
  dialogLabel: css`
    display: block;
    margin-bottom: 6px;
    font-size: 13px;
    font-weight: 600;
    color: ${token.colorText};
  `,
  dialogInput: css`
    width: 100%;
    height: 36px;
    padding: 0 12px;
    border-radius: 8px;
    border: 1px solid ${token.colorBorderSecondary};
    background: ${token.colorBgContainer};
    color: ${token.colorText};
    font-size: 13px;
    outline: none;

    &::placeholder {
      color: ${token.colorTextQuaternary};
    }

    &:focus {
      border-color: ${token.colorPrimary};
    }
  `,
  dialogSelect: css`
    width: 100%;
    height: 36px;
    padding: 0 12px;
    border-radius: 8px;
    border: 1px solid ${token.colorBorderSecondary};
    background: ${token.colorBgContainer};
    color: ${token.colorText};
    font-size: 13px;
    outline: none;

    &:focus {
      border-color: ${token.colorPrimary};
    }
  `,
  dialogActions: css`
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 20px;
  `,
}));
