import { createStyles } from 'antd-style';

export const useCodeAgentStyles = createStyles(({ css, token }) => ({
  pageRoot: css`
    display: flex;
    height: 100%;
    min-height: 0;
    flex-direction: column;
    overflow: auto;
    background: ${token.colorBgContainer};
  `,
  contentWrap: css`
    margin: 0 auto;
    display: flex;
    width: 100%;
    max-width: 72rem;
    flex: 1;
    flex-direction: column;
    gap: 24px;
    padding: 24px;
  `,
  pageHeaderBlock: css`
    display: flex;
    flex-direction: column;
    gap: 8px;
  `,
  titleRow: css`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;
  `,
  pageTitle: css`
    font-size: ${token.fontSizeSM}px;
    font-weight: 600;
    letter-spacing: -0.025em;
    color: ${token.colorText};
  `,
  pageDesc: css`
    max-width: 48rem;
    font-size: ${token.fontSizeSM}px;
    color: ${token.colorTextSecondary};
  `,
  mainGrid: css`
    display: grid;
    gap: 24px;

    @media (min-width: 1024px) {
      grid-template-columns: 1.15fr 0.85fr;
    }
  `,
  leftCol: css`
    display: flex;
    flex-direction: column;
    gap: 24px;
  `,
  rightCol: css`
    display: flex;
    flex-direction: column;
    gap: 24px;
  `,

  // Section card
  sectionCard: css`
    display: flex;
    flex-direction: column;
    gap: 16px;
    border-radius: 16px;
    border: 1px solid rgba(0, 0, 0, 0.1);
    background: ${token.colorBgElevated};
    padding: 20px;

    [data-theme='dark'] & {
      border-color: rgba(255, 255, 255, 0.1);
    }
  `,

  // Status section
  statusHeader: css`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  `,
  statusTitleBlock: css`
    display: flex;
    flex-direction: column;
    gap: 4px;
  `,
  sectionTitle: css`
    font-size: ${token.fontSizeSM}px;
    font-weight: 600;
    color: ${token.colorText};
  `,
  sectionSubtitle: css`
    font-size: 12px;
    color: ${token.colorTextSecondary};
  `,
  statusButtonGroup: css`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  `,
  badgeRow: css`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    font-size: 12px;
  `,
  badgeHealthOk: css`
    border-color: rgba(34, 197, 94, 0.3) !important;
    color: #15803d !important;
    background: rgba(34, 197, 94, 0.1) !important;

    [data-theme='dark'] & {
      color: #4ade80 !important;
    }
  `,
  badgeHealthWarn: css`
    border-color: rgba(245, 158, 11, 0.3) !important;
    color: #b45309 !important;
    background: rgba(245, 158, 11, 0.1) !important;

    [data-theme='dark'] & {
      color: #fcd34d !important;
    }
  `,
  badgeHealthError: css`
    border-color: rgba(239, 68, 68, 0.3) !important;
    color: #b91c1c !important;
    background: rgba(239, 68, 68, 0.1) !important;

    [data-theme='dark'] & {
      color: #f87171 !important;
    }
  `,
  infoGrid2: css`
    display: grid;
    gap: 12px;

    @media (min-width: 768px) {
      grid-template-columns: 1fr 1fr;
    }
  `,
  infoCol: css`
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 12px;
    color: ${token.colorTextSecondary};
  `,
  diagnosticsPre: css`
    max-height: 160px;
    overflow: auto;
    border-radius: 12px;
    border: 1px solid rgba(0, 0, 0, 0.1);
    background: rgba(0, 0, 0, 0.05);
    padding: 12px;
    font-size: 11px;
    color: ${token.colorTextSecondary};

    [data-theme='dark'] & {
      border-color: rgba(255, 255, 255, 0.1);
      background: rgba(255, 255, 255, 0.05);
    }
  `,

  // Config section
  configHeader: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  `,
  configTitleBlock: css`
    display: flex;
    flex-direction: column;
  `,
  configGrid2: css`
    display: grid;
    gap: 16px;

    @media (min-width: 768px) {
      grid-template-columns: 1fr 1fr;
    }
  `,
  formField: css`
    display: flex;
    flex-direction: column;
    gap: 8px;
  `,
  apiKeyWrap: css`
    position: relative;
  `,
  apiKeyToggle: css`
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: ${token.colorTextSecondary};
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    display: flex;
    align-items: center;

    &:hover {
      color: ${token.colorText};
    }
  `,
  apiKeyDesc: css`
    font-size: 12px;
    color: ${token.colorTextSecondary};
  `,

  // Run section
  runButtonsFlex: css`
    display: grid;
    gap: 8px;

    @media (min-width: 640px) {
      grid-template-columns: 1fr 1fr;
    }
  `,
  runMainButton: css`
    height: 44px;
    width: 100%;
    border-radius: 12px;
  `,

  // Last run section
  lastRunHeader: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  `,
  lastRunTitleGroup: css`
    display: flex;
    align-items: center;
    gap: 8px;
  `,
  lastRunMetaList: css`
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 12px;
    color: ${token.colorTextSecondary};
  `,
  lastRunNoData: css`
    font-size: 12px;
    color: ${token.colorTextSecondary};
  `,
  summaryBlock: css`
    display: flex;
    flex-direction: column;
    gap: 8px;
  `,
  summaryLabel: css`
    font-size: 12px;
    font-weight: 600;
    color: ${token.colorText};
    opacity: 0.8;
  `,
  summaryText: css`
    font-size: ${token.fontSizeSM}px;
    white-space: pre-wrap;
    word-break: break-word;
    color: ${token.colorTextSecondary};
  `,
  outputBlock: css`
    display: flex;
    flex-direction: column;
    gap: 8px;
  `,
  outputLabel: css`
    font-size: 12px;
    font-weight: 600;
    color: ${token.colorText};
    opacity: 0.8;
  `,
  outputPre: css`
    max-height: 288px;
    overflow: auto;
    border-radius: 12px;
    border: 1px solid rgba(0, 0, 0, 0.1);
    background: rgba(0, 0, 0, 0.05);
    padding: 12px;
    font-size: 11px;
    white-space: pre-wrap;
    word-break: break-word;

    [data-theme='dark'] & {
      border-color: rgba(255, 255, 255, 0.1);
      background: rgba(255, 255, 255, 0.05);
    }
  `,
  runDetails: css`
    display: flex;
    flex-direction: column;
    gap: 12px;
  `,
}));
