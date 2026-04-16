import { createStyles } from 'antd-style';

export const useAgentsStyles = createStyles(({ css, token }) => ({
  // Page layout
  pageRoot: css`
    display: flex;
    flex-direction: column;
    margin: -24px;
    background: ${token.colorBgContainer};
    height: calc(100vh - 2.5rem);
    overflow: hidden;
  `,
  pageLoadingRoot: css`
    display: flex;
    flex-direction: column;
    margin: -24px;
    background: ${token.colorBgContainer};
    min-height: calc(100vh - 2.5rem);
    align-items: center;
    justify-content: center;
  `,
  contentWrap: css`
    width: 100%;
    max-width: 64rem;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 40px 40px 40px 40px;
    padding-top: 64px;
  `,
  pageHeader: css`
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    margin-bottom: 48px;
    flex-shrink: 0;
    gap: 16px;

    @media (min-width: 768px) {
      flex-direction: row;
      align-items: flex-start;
    }
  `,
  pageTitle: css`
    font-size: ${token.fontSizeSM}px;
    font-family: Georgia, Cambria, 'Times New Roman', Times, serif;
    color: ${token.colorText};
    margin-bottom: 12px;
    font-weight: normal;
    letter-spacing: -0.025em;
  `,
  pageSubtitle: css`
    font-size: 14px;
    color: ${token.colorText};
    opacity: 0.7;
    font-weight: 500;
  `,
  headerActions: css`
    display: flex;
    align-items: center;
    gap: 12px;
    @media (min-width: 768px) {
      margin-top: 8px;
    }
  `,
  scrollArea: css`
    flex: 1;
    overflow-y: auto;
    padding-right: 8px;
    padding-bottom: 40px;
    min-height: 0;
    margin-right: -8px;
  `,
  // Warning / error banners
  warningBanner: css`
    margin-bottom: 32px;
    padding: 16px;
    border-radius: 12px;
    border: 1px solid rgba(234, 179, 8, 0.5);
    background: rgba(234, 179, 8, 0.1);
    display: flex;
    align-items: center;
    gap: 12px;
  `,
  warningIcon: css`
    height: 20px;
    width: 20px;
    color: #ca8a04;

    [data-theme='dark'] & {
      color: #facc15;
    }
  `,
  warningText: css`
    color: #a16207;
    font-size: ${token.fontSizeSM}px;
    font-weight: 500;

    [data-theme='dark'] & {
      color: #facc15;
    }
  `,
  errorBanner: css`
    margin-bottom: 32px;
    padding: 16px;
    border-radius: 12px;
    border: 1px solid ${token.colorError}80;
    background: ${token.colorError}1a;
    display: flex;
    align-items: center;
    gap: 12px;
  `,
  errorIcon: css`
    height: 20px;
    width: 20px;
    color: ${token.colorError};
  `,
  errorText: css`
    color: ${token.colorError};
    font-size: ${token.fontSizeSM}px;
    font-weight: 500;
  `,
  agentList: css`
    display: flex;
    flex-direction: column;
    gap: 12px;
  `,

  // AgentCard
  agentCard: css`
    display: flex;
    align-items: flex-start;
    gap: 16px;
    padding: 16px;
    border-radius: 16px;
    transition: background 0.2s;
    text-align: left;
    border: 1px solid transparent;
    position: relative;
    overflow: hidden;
    background: transparent;
    cursor: default;

    &:hover {
      background: rgba(0, 0, 0, 0.05);
    }

    [data-theme='dark'] &:hover {
      background: rgba(255, 255, 255, 0.05);
    }
  `,
  agentCardDefault: css`
    background: rgba(0, 0, 0, 0.04);

    [data-theme='dark'] & {
      background: rgba(255, 255, 255, 0.06);
    }
  `,
  agentAvatar: css`
    height: 46px;
    width: 46px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: ${token.colorPrimary};
    background: ${token.colorPrimary}1a;
    border-radius: 50%;
    box-shadow: 0 1px 2px rgba(0,0,0,0.08);
    margin-bottom: 12px;
  `,
  agentBody: css`
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
    padding-top: 2px;
    margin-top: 4px;
  `,
  agentNameRow: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 4px;
  `,
  agentNameGroup: css`
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  `,
  agentName: css`
    font-size: 14px;
    font-weight: 600;
    color: ${token.colorText};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  agentActions: css`
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
  `,
  agentMeta: css`
    font-size: 13.5px;
    color: ${token.colorTextSecondary};
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    line-height: 1.5;
  `,

  // Overlay modal backdrop
  modalBackdrop: css`
    position: fixed;
    inset: 0;
    z-index: 50;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
  `,

  // AddAgentDialog
  addDialogCard: css`
    width: 100%;
    max-width: 28rem;
    border-radius: 24px;
    border: none;
    box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
    background: #f3f1e9;
    overflow: hidden;

    [data-theme='dark'] & {
      background: ${token.colorBgElevated};
    }
  `,
  dialogFormRow: css`
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  `,

  // AgentSettingsModal
  settingsModalCard: css`
    width: 100%;
    max-width: 42rem;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    border-radius: 24px;
    border: none;
    box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
    background: #f3f1e9;
    overflow: hidden;

    [data-theme='dark'] & {
      background: ${token.colorBgElevated};
    }
  `,
  settingsCardHeader: css`
    display: flex;
    flex-direction: row;
    align-items: flex-start;
    justify-content: space-between;
    padding-bottom: 8px;
    flex-shrink: 0;
  `,
  settingsCardContent: css`
    display: flex;
    flex-direction: column;
    gap: 24px;
    padding-top: 16px;
    overflow-y: auto;
    flex: 1;
    padding: 24px;
  `,
  infoGrid: css`
    display: grid;
    gap: 16px;
    @media (min-width: 768px) {
      grid-template-columns: 1fr 1fr;
    }
  `,
  infoCell: css`
    display: flex;
    flex-direction: column;
    gap: 4px;
    border-radius: 16px;
    background: rgba(0, 0, 0, 0.05);
    border: 1px solid transparent;
    padding: 16px;

    [data-theme='dark'] & {
      background: rgba(255, 255, 255, 0.05);
    }
  `,
  infoCellLabel: css`
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: ${token.colorTextSecondary};
    opacity: 0.8;
    font-weight: 500;
  `,
  infoCellValue: css`
    font-family: monospace;
    font-size: 13px;
    color: ${token.colorText};
  `,
  infoCellValueNormal: css`
    font-size: 13.5px;
    color: ${token.colorText};
  `,
  channelsSection: css`
    display: flex;
    flex-direction: column;
    gap: 16px;
  `,
  channelsSectionHeader: css`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
  `,
  channelsSectionTitle: css`
    font-size: ${token.fontSizeSM}px;
    font-family: Georgia, Cambria, 'Times New Roman', Times, serif;
    color: ${token.colorText};
    font-weight: normal;
    letter-spacing: -0.025em;
  `,
  channelsSectionDesc: css`
    font-size: 14px;
    color: ${token.colorText};
    opacity: 0.7;
    margin-top: 4px;
  `,
  noChannelsBox: css`
    border-radius: 16px;
    border: 1px dashed rgba(0, 0, 0, 0.1);
    background: rgba(0, 0, 0, 0.05);
    padding: 16px;
    font-size: 13.5px;
    color: ${token.colorTextSecondary};

    [data-theme='dark'] & {
      border-color: rgba(255, 255, 255, 0.1);
      background: rgba(255, 255, 255, 0.05);
    }
  `,
  channelList: css`
    display: flex;
    flex-direction: column;
    gap: 12px;
  `,
  channelRow: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-radius: 16px;
    background: rgba(0, 0, 0, 0.05);
    border: 1px solid transparent;
    padding: 16px;

    [data-theme='dark'] & {
      background: rgba(255, 255, 255, 0.05);
    }
  `,
  channelRowLeft: css`
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  `,
  channelIcon: css`
    height: 40px;
    width: 40px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: ${token.colorText};
    background: rgba(0, 0, 0, 0.05);
    border: 1px solid rgba(0, 0, 0, 0.05);
    border-radius: 50%;
    box-shadow: 0 1px 2px rgba(0,0,0,0.08);

    [data-theme='dark'] & {
      background: rgba(255, 255, 255, 0.05);
      border-color: rgba(255, 255, 255, 0.1);
    }
  `,
  channelInfo: css`
    min-width: 0;
  `,
  channelName: css`
    font-size: 14px;
    font-weight: 600;
    color: ${token.colorText};
  `,
  channelMeta: css`
    font-size: 13.5px;
    color: ${token.colorTextSecondary};
  `,
  channelError: css`
    font-size: 12px;
    color: ${token.colorError};
    margin-top: 4px;
  `,
  channelLogoImg: css`
    width: 20px;
    height: 20px;

    [data-theme='dark'] & {
      filter: invert(1);
    }
  `,

  // Action buttons that appear on card hover
  agentActionBtnHoverable: css`
    opacity: 0;
    transition: opacity 0.15s;

    .mimi-agent-card:hover & {
      opacity: 1;
    }
  `,

  // Misc
  nameInputRow: css`
    display: flex;
    gap: 8px;
  `,
  spaceY4: css`
    display: flex;
    flex-direction: column;
    gap: 16px;
  `,
  spaceY25: css`
    display: flex;
    flex-direction: column;
    gap: 10px;
  `,
}));
