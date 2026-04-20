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
    min-width: 170px;
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
  sectionBlock: css`
    & + & {
      margin-top: 28px;
    }
  `,
  pencilPanel: css`
    display: flex;
    flex-direction: column;
    gap: 14px;
  `,
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
    color: ${token.colorSuccess};
    border-color: ${token.colorSuccessBorder};
    background: ${token.colorSuccessBg};
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
    color: ${token.colorSuccess};
    background: ${token.colorSuccessBg};
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
    color: ${token.colorSuccess};
    border-color: ${token.colorSuccessBorder};
    background: ${token.colorSuccessBg};
  `,
  connectionBadgePending: css`
    color: ${token.colorWarning};
    border-color: ${token.colorWarningBorder};
    background: ${token.colorWarningBg};
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
    border-color: ${token.colorSuccessBorder};
    background: linear-gradient(180deg, ${token.colorSuccessBg} 0%, ${token.colorBgContainer} 100%);
  `,
  connectionPanelPending: css`
    border-color: ${token.colorWarningBorder};
    background: linear-gradient(180deg, ${token.colorWarningBg} 0%, ${token.colorBgContainer} 100%);
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
  sectionDescription: css`
    margin-top: 6px;
    font-size: 13px;
    color: ${token.colorTextSecondary};
    line-height: 1.6;
  `,
  pluginRow: css`
    cursor: default !important;
  `,
  pluginImage: css`
    width: 28px;
    height: 28px;
    object-fit: contain;
  `,
  maskedBrandIcon: css`
    width: 28px;
    height: 28px;
    display: block;
    mask-position: center;
    mask-repeat: no-repeat;
    mask-size: contain;
    -webkit-mask-position: center;
    -webkit-mask-repeat: no-repeat;
    -webkit-mask-size: contain;
  `,
  generatedIcon: css`
    width: 28px;
    height: 28px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: ${token.colorWhite};
    box-shadow: 0 10px 24px rgba(0, 0, 0, 0.18);
    overflow: hidden;
  `,
  generatedIconLabel: css`
    font-size: 14px;
    line-height: 1;
    font-weight: 700;
    letter-spacing: -0.02em;
    text-transform: uppercase;
  `,
  metaFooter: css`
    margin-top: 6px;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    min-width: 0;
    font-size: 12px;
    color: ${token.colorTextTertiary};
  `,
  pathText: css`
    display: inline-block;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: monospace;
  `,
  actionRow: css`
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 8px;
  `,
  rowActionButton: css`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    height: 34px;
    padding: 0 14px;
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
  rowActionPrimary: css`
    border-color: ${token.colorPrimaryBorder};
    background: ${token.colorPrimary};
    color: ${token.colorTextLightSolid};

    &:hover {
      border-color: ${token.colorPrimaryHover};
      background: ${token.colorPrimaryHover};
      color: ${token.colorTextLightSolid};
    }
  `,
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
  headerButtonPrimary: css`
    border-color: ${token.colorPrimaryBorder};
    background: ${token.colorPrimary};
    color: ${token.colorTextLightSolid};

    &:hover {
      border-color: ${token.colorPrimaryHover};
      background: ${token.colorPrimaryHover};
      color: ${token.colorTextLightSolid};
    }
  `,
}));
