import { createStyles } from 'antd-style';

export const useChannelsStyles = createStyles(({ token, css }) => ({
  pageRoot: css`
    display: flex;
    flex-direction: column;
    margin: -24px;
    height: calc(100vh - 2.5rem);
    overflow: hidden;
    [data-theme='dark'] & {
      background: ${token.colorBgContainer};
    }
  `,

  pageRootLoading: css`
    display: flex;
    flex-direction: column;
    margin: -24px;
    min-height: calc(100vh - 2.5rem);
    align-items: center;
    justify-content: center;
    [data-theme='dark'] & {
      background: ${token.colorBgContainer};
    }
  `,

  inner: css`
    width: 100%;
    max-width: 1024px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 40px;
    padding-top: 64px;
  `,

  headerRow: css`
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
    font-family: Georgia, Cambria, "Times New Roman", Times, serif;
    color: ${token.colorText};
    margin-bottom: 12px;
    font-weight: 400;
    letter-spacing: -0.015em;
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

  refreshBtn: css`
    height: 36px;
    font-size: 13px;
    font-weight: 500;
    border-radius: 9999px;
    padding: 0 16px;
    border: 1px solid rgba(0, 0, 0, 0.1);
    background: transparent;
    box-shadow: none;
    color: ${token.colorText};
    opacity: 0.8;
    transition: all 0.15s;
    [data-theme='dark'] & {
      border-color: rgba(255, 255, 255, 0.1);
    }
    &:hover {
      background: rgba(0, 0, 0, 0.05);
      opacity: 1;
      color: ${token.colorText};
      [data-theme='dark'] & {
        background: rgba(255, 255, 255, 0.05);
      }
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

  /* Warning/error banners */
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

  warningText: css`
    color: #a16207;
    font-size: ${token.fontSizeSM}px;
    font-weight: 500;
    [data-theme='dark'] & {
      color: #facc15;
    }
  `,

  warningIcon: css`
    color: #ca8a04;
    width: 20px;
    height: 20px;
    [data-theme='dark'] & {
      color: #facc15;
    }
  `,

  errorBanner: css`
    margin-bottom: 32px;
    padding: 16px;
    border-radius: 12px;
    border: 1px solid rgba(239, 68, 68, 0.5);
    background: rgba(239, 68, 68, 0.1);
    display: flex;
    align-items: center;
    gap: 12px;
  `,

  errorText: css`
    color: ${token.colorError};
    font-size: ${token.fontSizeSM}px;
    font-weight: 500;
  `,

  errorIcon: css`
    color: ${token.colorError};
    width: 20px;
    height: 20px;
  `,

  /* Configured section */
  configuredSection: css`
    margin-bottom: 48px;
  `,

  sectionTitle: css`
    font-size: ${token.fontSizeSM}px;
    font-family: Georgia, Cambria, "Times New Roman", Times, serif;
    color: ${token.colorText};
    margin-bottom: 24px;
    font-weight: 400;
    letter-spacing: -0.015em;
  `,

  groupList: css`
    display: flex;
    flex-direction: column;
    gap: 16px;
  `,

  groupCard: css`
    border-radius: 16px;
    border: 1px solid rgba(0, 0, 0, 0.1);
    padding: 16px;
    background: transparent;
    [data-theme='dark'] & {
      border-color: rgba(255, 255, 255, 0.1);
    }
  `,

  groupHeader: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 12px;
  `,

  groupHeaderLeft: css`
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  `,

  channelLogoWrap: css`
    height: 40px;
    width: 40px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: ${token.colorText};
    background: rgba(0, 0, 0, 0.05);
    border: 1px solid rgba(0, 0, 0, 0.05);
    border-radius: 9999px;
    box-shadow: ${token.boxShadowTertiary};
    [data-theme='dark'] & {
      background: rgba(255, 255, 255, 0.05);
      border-color: rgba(255, 255, 255, 0.1);
    }
  `,

  channelNameWrap: css`
    min-width: 0;
  `,

  channelName: css`
    font-size: 14px;
    font-weight: 600;
    color: ${token.colorText};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,

  channelType: css`
    font-size: 12px;
    color: ${token.colorTextSecondary};
  `,

  statusDotConnected: css`
    width: 8px;
    height: 8px;
    border-radius: 9999px;
    flex-shrink: 0;
    background: #22c55e;
  `,

  statusDotConnecting: css`
    width: 8px;
    height: 8px;
    border-radius: 9999px;
    flex-shrink: 0;
    background: #eab308;
    animation: pulse 2s infinite;
  `,

  statusDotError: css`
    width: 8px;
    height: 8px;
    border-radius: 9999px;
    flex-shrink: 0;
    background: ${token.colorError};
  `,

  statusDotDefault: css`
    width: 8px;
    height: 8px;
    border-radius: 9999px;
    flex-shrink: 0;
    background: ${token.colorTextSecondary};
  `,

  groupHeaderRight: css`
    display: flex;
    align-items: center;
    gap: 8px;
  `,

  addAccountBtn: css`
    height: 32px;
    font-size: 12px;
    border-radius: 9999px;
  `,

  deleteGroupBtn: css`
    height: 28px;
    width: 28px;
    color: ${token.colorTextSecondary};
    &:hover {
      color: ${token.colorError};
      background: rgba(239, 68, 68, 0.1);
    }
  `,

  accountList: css`
    display: flex;
    flex-direction: column;
    gap: 8px;
  `,

  accountRow: css`
    border-radius: 12px;
    background: rgba(0, 0, 0, 0.05);
    padding: 8px 12px;
    [data-theme='dark'] & {
      background: rgba(255, 255, 255, 0.05);
    }
  `,

  accountRowInner: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  `,

  accountLeft: css`
    min-width: 0;
  `,

  accountNameRow: css`
    display: flex;
    align-items: center;
    gap: 8px;
  `,

  accountName: css`
    font-size: 13px;
    font-weight: 500;
    color: ${token.colorText};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,

  accountError: css`
    font-size: 12px;
    color: ${token.colorError};
    margin-top: 4px;
  `,

  accountRight: css`
    display: flex;
    align-items: center;
    gap: 8px;
  `,

  bindLabel: css`
    font-size: 12px;
    color: ${token.colorTextSecondary};
  `,

  agentSelect: css`
    height: 32px;
    border-radius: 8px;
    border: 1px solid rgba(0, 0, 0, 0.1);
    background: ${token.colorBgContainer};
    padding: 0 8px;
    font-size: 12px;
    [data-theme='dark'] & {
      border-color: rgba(255, 255, 255, 0.1);
    }
  `,

  editAccountBtn: css`
    height: 32px;
    font-size: 12px;
    border-radius: 9999px;
  `,

  deleteAccountBtn: css`
    height: 28px;
    width: 28px;
    color: ${token.colorTextSecondary};
    &:hover {
      color: ${token.colorError};
      background: rgba(239, 68, 68, 0.1);
    }
  `,

  /* Supported channels grid */
  supportedSection: css`
    margin-bottom: 32px;
  `,

  channelGrid: css`
    display: grid;
    grid-template-columns: repeat(1, 1fr);
    gap: 16px 24px;
    @media (min-width: 768px) {
      grid-template-columns: repeat(2, 1fr);
    }
  `,

  channelGridButton: css`
    display: flex;
    align-items: flex-start;
    gap: 16px;
    padding: 16px;
    border-radius: 16px;
    transition: all 0.15s;
    text-align: left;
    border: 1px solid transparent;
    position: relative;
    overflow: hidden;
    background: transparent;
    cursor: pointer;
    &:hover {
      background: rgba(0, 0, 0, 0.05);
      [data-theme='dark'] & {
        background: rgba(255, 255, 255, 0.05);
      }
    }
  `,

  channelGridLogoWrap: css`
    height: 46px;
    width: 46px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: ${token.colorText};
    background: rgba(0, 0, 0, 0.05);
    border: 1px solid rgba(0, 0, 0, 0.05);
    border-radius: 9999px;
    box-shadow: ${token.boxShadowTertiary};
    margin-bottom: 12px;
    [data-theme='dark'] & {
      background: rgba(255, 255, 255, 0.05);
      border-color: rgba(255, 255, 255, 0.1);
    }
  `,

  channelGridInfo: css`
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
    padding-top: 2px;
    margin-top: 4px;
  `,

  channelGridNameRow: css`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
  `,

  channelGridName: css`
    font-size: 14px;
    font-weight: 600;
    color: ${token.colorText};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,

  channelGridDesc: css`
    font-size: 13.5px;
    color: ${token.colorTextSecondary};
    -webkit-line-clamp: 2;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    overflow: hidden;
    line-height: 1.5;
  `,

  pluginBadge: css`
    font-family: monospace;
    font-size: 10px;
    font-weight: 500;
    padding: 1px 8px;
    border-radius: 9999px;
    background: rgba(0, 0, 0, 0.04);
    border: 0;
    box-shadow: none;
    color: ${token.colorTextSecondary};
    opacity: 0.9;
    [data-theme='dark'] & {
      background: rgba(255, 255, 255, 0.08);
    }
  `,

  channelLogoImg: css`
    width: 22px;
    height: 22px;
  `,
}));
