import { createStyles } from 'antd-style';

export const useCronStyles = createStyles(({ css, token }) => ({
  pageRoot: css`
    display: flex;
    flex-direction: column;
    width: 100%;
    min-width: 0;
    height: 100%;
    overflow: hidden;
    background: ${token.colorBgContainer};
    --cron-inline-padding: 32px;
    --cron-extra-start: 12px;
    --cron-safe-start: calc(var(--cron-inline-padding, 0px) + var(--cron-extra-start));
    --mimi-content-safe-start: var(--cron-safe-start);

    @media (max-width: 992px) {
      --cron-inline-padding: 20px;
    }

    @media (max-width: 640px) {
      --cron-inline-padding: 12px;
      --cron-extra-start: 8px;
    }
  `,
  pageInner: css`
    display: flex;
    flex: 1;
    min-height: 0;
    flex-direction: column;
    overflow: hidden;
  `,
  pageHeader: css`
    position: sticky;
    top: 0;
    z-index: 6;
    --setting-header-bleed: var(--cron-inline-padding);
    background: color-mix(in srgb, ${token.colorBgContainer} 82%, transparent);
    backdrop-filter: blur(12px) saturate(130%);
    -webkit-backdrop-filter: blur(12px) saturate(130%);
  `,
  pageContent: css`
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding-bottom: 36px;
  `,
  pageContentInner: css`
    width: min(880px, 100%);
    margin-inline: auto;
    padding-inline: var(--cron-inline-padding);
    padding-inline-start: max(var(--cron-inline-padding, 0px), var(--cron-safe-start, 0px));
  `,
  loadingWrapper: css`
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: center;
  `,
  headerIcon: css`
    width: 18px;
    height: 18px;
    color: ${token.colorTextSecondary};
  `,

  noticeBanner: css`
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
    padding: 14px 16px;
    border-radius: ${token.borderRadiusLG}px;
    font-size: 13px;
    line-height: 1.65;
    font-weight: 500;
  `,
  noticeWarning: css`
    border: 1px solid rgba(234, 179, 8, 0.28);
    background: rgba(234, 179, 8, 0.1);
    color: #a16207;

    [data-theme='dark'] & {
      color: #facc15;
    }
  `,
  noticeError: css`
    border: 1px solid rgba(239, 68, 68, 0.22);
    background: rgba(239, 68, 68, 0.08);
    color: ${token.colorError};
  `,

  sectionStack: css`
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding-bottom: 8px;
  `,
  infoPanel: css`
    display: flex;
    flex-direction: column;
    gap: 16px;
    border-radius: 24px;
    background: rgba(0, 0, 0, 0.03);
    padding: 24px;
    border: 1px solid rgba(0, 0, 0, 0.04);

    [data-theme='dark'] & {
      background: rgba(255, 255, 255, 0.03);
      border-color: rgba(255, 255, 255, 0.06);
    }
  `,
  panelTitle: css`
    font-size: 15px;
    font-weight: 600;
    color: ${token.colorText};
  `,
  panelDesc: css`
    font-size: 13px;
    line-height: 1.65;
    color: ${token.colorTextSecondary};
  `,
  gatewayStatusTag: css`
    align-self: flex-start;
    border-radius: 999px;
    border: 1px solid transparent;
    font-weight: 500;
  `,
  gatewayStatusTagReady: css`
    background: rgba(34, 197, 94, 0.1);
    color: #16a34a;
    border-color: rgba(34, 197, 94, 0.18);
  `,
  gatewayStatusTagWarning: css`
    background: rgba(245, 158, 11, 0.1);
    color: #ca8a04;
    border-color: rgba(245, 158, 11, 0.18);
  `,
  gatewayStatusTagOffline: css`
    background: rgba(239, 68, 68, 0.1);
    color: ${token.colorError};
    border-color: rgba(239, 68, 68, 0.18);
  `,

  statsGrid: css`
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;

    @media (max-width: 640px) {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  `,
  statBlock: css`
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 16px;
    border-radius: 18px;
    background: ${token.colorBgContainer};
    border: 1px solid rgba(0, 0, 0, 0.05);

    [data-theme='dark'] & {
      border-color: rgba(255, 255, 255, 0.06);
      background: rgba(255, 255, 255, 0.02);
    }
  `,
  statValue: css`
    font-size: 22px;
    font-weight: 700;
    line-height: 1;
    color: ${token.colorText};
  `,
  statLabel: css`
    font-size: 12px;
    color: ${token.colorTextSecondary};
  `,

  summaryGrid: css`
    display: grid;
    gap: 12px;
    grid-template-columns: repeat(2, minmax(0, 1fr));

    @media (max-width: 640px) {
      grid-template-columns: 1fr;
    }
  `,
  summaryCard: css`
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 16px;
    border-radius: 18px;
    background: ${token.colorBgContainer};
    border: 1px solid rgba(0, 0, 0, 0.05);

    [data-theme='dark'] & {
      border-color: rgba(255, 255, 255, 0.06);
      background: rgba(255, 255, 255, 0.02);
    }
  `,
  summaryLabel: css`
    font-size: 12px;
    color: ${token.colorTextSecondary};
  `,
  summaryTitle: css`
    font-size: 14px;
    font-weight: 600;
    color: ${token.colorText};
  `,
  summaryMeta: css`
    font-size: 13px;
    line-height: 1.65;
    color: ${token.colorTextSecondary};
  `,

  emptyPanel: css`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 40px 24px;
    text-align: center;
    border-radius: 24px;
    background: rgba(0, 0, 0, 0.02);
    border: 1px dashed rgba(0, 0, 0, 0.08);

    [data-theme='dark'] & {
      background: rgba(255, 255, 255, 0.02);
      border-color: rgba(255, 255, 255, 0.08);
    }
  `,
  emptyIcon: css`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 56px;
    height: 56px;
    border-radius: 18px;
    background: rgba(0, 0, 0, 0.04);
    color: ${token.colorTextSecondary};

    [data-theme='dark'] & {
      background: rgba(255, 255, 255, 0.04);
    }
  `,
  emptyTitle: css`
    font-size: 18px;
    font-weight: 600;
    color: ${token.colorText};
  `,
  emptyDesc: css`
    max-width: 36rem;
    font-size: 13px;
    line-height: 1.75;
    color: ${token.colorTextSecondary};
  `,

  jobList: css`
    display: flex;
    flex-direction: column;
    gap: 12px;
  `,
  jobCard: css`
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 18px 20px;
    border-radius: 22px;
    border: 1px solid rgba(0, 0, 0, 0.05);
    background: rgba(0, 0, 0, 0.02);
    cursor: pointer;
    transition: border-color 0.2s, background 0.2s, transform 0.2s;

    &:hover {
      transform: translateY(-1px);
      background: rgba(0, 0, 0, 0.03);
      border-color: rgba(0, 0, 0, 0.08);
    }

    [data-theme='dark'] & {
      background: rgba(255, 255, 255, 0.02);
      border-color: rgba(255, 255, 255, 0.06);

      &:hover {
        background: rgba(255, 255, 255, 0.03);
        border-color: rgba(255, 255, 255, 0.1);
      }
    }
  `,
  jobCardFailed: css`
    border-color: rgba(239, 68, 68, 0.18);
    background: rgba(239, 68, 68, 0.04);
  `,
  jobCardHeader: css`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
  `,
  jobCardIcon: css`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 12px;
    background: rgba(0, 0, 0, 0.05);
    color: ${token.colorTextSecondary};

    [data-theme='dark'] & {
      background: rgba(255, 255, 255, 0.06);
    }
  `,
  jobCardIconFailed: css`
    background: rgba(239, 68, 68, 0.1);
    color: ${token.colorError};
  `,
  jobCardIconPaused: css`
    background: rgba(148, 163, 184, 0.12);
    color: ${token.colorTextSecondary};
  `,
  jobCardName: css`
    max-width: 100%;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    font-size: 15px;
    font-weight: 600;
    color: ${token.colorText};
  `,
  jobCardSchedule: css`
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: ${token.colorTextSecondary};
  `,
  statusTag: css`
    border-radius: 999px;
    border: 1px solid transparent;
    font-weight: 500;
  `,
  statusTagActive: css`
    background: rgba(34, 197, 94, 0.1);
    color: #16a34a;
    border-color: rgba(34, 197, 94, 0.18);
  `,
  statusTagPaused: css`
    background: rgba(0, 0, 0, 0.05);
    color: ${token.colorTextSecondary};
    border-color: rgba(0, 0, 0, 0.06);

    [data-theme='dark'] & {
      background: rgba(255, 255, 255, 0.05);
      border-color: rgba(255, 255, 255, 0.06);
    }
  `,
  statusTagFailed: css`
    background: rgba(239, 68, 68, 0.1);
    color: ${token.colorError};
    border-color: rgba(239, 68, 68, 0.18);
  `,
  jobCardMessage: css`
    display: flex;
    align-items: flex-start;
    gap: 8px;
    font-size: 13px;
    line-height: 1.75;
    color: ${token.colorTextSecondary};
  `,
  jobMetaRow: css`
    align-items: center;
  `,
  metaTag: css`
    border-radius: 999px;
    background: ${token.colorBgContainer};
    border: 1px solid rgba(0, 0, 0, 0.05);
    color: ${token.colorTextSecondary};
    font-weight: 400;

    [data-theme='dark'] & {
      background: rgba(255, 255, 255, 0.02);
      border-color: rgba(255, 255, 255, 0.06);
    }
  `,
  metaTagIconWrap: css`
    display: inline-flex;
    align-items: center;
    justify-content: center;
  `,
  jobErrorBox: css`
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 12px 14px;
    border-radius: 16px;
    background: rgba(239, 68, 68, 0.08);
    border: 1px solid rgba(239, 68, 68, 0.16);
    font-size: 12px;
    line-height: 1.7;
    color: ${token.colorError};
  `,
  jobActionRow: css`
    align-items: center;
  `,

  dialogOverlay: css`
    position: fixed;
    inset: 0;
    z-index: 50;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    background: rgba(15, 23, 42, 0.36);
    backdrop-filter: blur(10px);
  `,
  dialogCard: css`
    width: 100%;
    max-width: 560px;
    max-height: min(90vh, 880px);
    overflow: hidden;
    border: 1px solid rgba(0, 0, 0, 0.08);
    border-radius: 28px;
    background: ${token.colorBgElevated};
    box-shadow: ${token.boxShadowSecondary};

    [data-theme='dark'] & {
      border-color: rgba(255, 255, 255, 0.08);
      background: ${token.colorBgContainer};
    }
  `,
  dialogHeader: css`
    display: flex;
    flex-direction: row;
    align-items: flex-start;
    justify-content: space-between;
    padding: 24px 24px 8px;
  `,
  dialogTitleBlock: css`
    display: flex;
    flex-direction: column;
    gap: 6px;
  `,
  dialogEyebrow: css`
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: ${token.colorPrimary};
  `,
  dialogTitle: css`
    margin: 0;
    font-size: 22px;
    font-weight: 700;
    letter-spacing: -0.03em;
  `,
  dialogDesc: css`
    margin: 0;
    max-width: 32rem;
    font-size: 13px;
    line-height: 1.7;
    color: ${token.colorTextSecondary};
  `,
  dialogCloseBtn: css`
    border-radius: 999px;
    color: ${token.colorTextSecondary};

    &:hover {
      color: ${token.colorText} !important;
      background: rgba(0, 0, 0, 0.05) !important;
    }

    [data-theme='dark'] & {
      &:hover {
        background: rgba(255, 255, 255, 0.05) !important;
      }
    }
  `,
  dialogBody: css`
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 22px;
    overflow: auto;
    padding: 12px 24px 24px;
  `,
  dialogField: css`
    display: flex;
    flex-direction: column;
    gap: 10px;
  `,
  dialogLabel: css`
    font-size: 13px;
    font-weight: 700;
    color: ${token.colorText};
  `,
  dialogInput: css`
    height: 46px;
    border-radius: 14px;
    background: rgba(0, 0, 0, 0.03);
    border-color: rgba(0, 0, 0, 0.08);
    font-size: 13px;
    box-shadow: none;

    &:hover,
    &:focus {
      border-color: rgba(var(--ant-color-primary-rgb, 22, 119, 255), 0.28);
      background: rgba(var(--ant-color-primary-rgb, 22, 119, 255), 0.03);
    }

    [data-theme='dark'] & {
      background: rgba(255, 255, 255, 0.04);
      border-color: rgba(255, 255, 255, 0.08);
    }
  `,
  dialogTextarea: css`
    border-radius: 14px;
    background: rgba(0, 0, 0, 0.03);
    border-color: rgba(0, 0, 0, 0.08);
    font-size: 13px;
    line-height: 1.7;
    box-shadow: none;
    resize: none;

    &:hover,
    &:focus {
      border-color: rgba(var(--ant-color-primary-rgb, 22, 119, 255), 0.28);
      background: rgba(var(--ant-color-primary-rgb, 22, 119, 255), 0.03);
    }

    [data-theme='dark'] & {
      background: rgba(255, 255, 255, 0.04);
      border-color: rgba(255, 255, 255, 0.08);
    }
  `,
  presetGrid: css`
    display: grid;
    gap: 10px;
    grid-template-columns: repeat(2, minmax(0, 1fr));

    @media (max-width: 560px) {
      grid-template-columns: 1fr;
    }
  `,
  presetBtn: css`
    justify-content: flex-start;
    height: 42px;
    border-radius: 14px;
    font-size: 13px;
    font-weight: 600;
    box-shadow: none;
  `,
  presetBtnActive: css`
    border: none;
    background: linear-gradient(135deg, ${token.colorPrimary}, ${token.colorPrimaryHover}) !important;
    color: #fff !important;
  `,
  presetBtnInactive: css`
    border-color: rgba(0, 0, 0, 0.08);
    background: rgba(0, 0, 0, 0.03);
    color: ${token.colorText};

    &:hover {
      border-color: rgba(var(--ant-color-primary-rgb, 22, 119, 255), 0.18) !important;
      color: ${token.colorPrimary} !important;
    }

    [data-theme='dark'] & {
      border-color: rgba(255, 255, 255, 0.08);
      background: rgba(255, 255, 255, 0.04);
    }
  `,
  scheduleFooter: css`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  `,
  schedulePreview: css`
    margin: 0;
    font-size: 12px;
    color: ${token.colorTextSecondary};
  `,
  toggleCustomBtn: css`
    height: 30px;
    border-radius: 999px;
    padding-inline: 10px;
    font-size: 12px;
    font-weight: 600;
    color: ${token.colorTextSecondary};

    &:hover {
      color: ${token.colorPrimary} !important;
      background: rgba(var(--ant-color-primary-rgb, 22, 119, 255), 0.08) !important;
    }
  `,
  enableRow: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    border: 1px solid rgba(0, 0, 0, 0.07);
    border-radius: 18px;
    background: rgba(0, 0, 0, 0.025);
    padding: 16px;

    [data-theme='dark'] & {
      border-color: rgba(255, 255, 255, 0.08);
      background: rgba(255, 255, 255, 0.03);
    }
  `,
  enableLabel: css`
    font-size: 13px;
    font-weight: 700;
    color: ${token.colorText};
  `,
  enableDesc: css`
    margin: 4px 0 0;
    font-size: 12px;
    line-height: 1.7;
    color: ${token.colorTextSecondary};
  `,
  dialogFooter: css`
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 10px;
    padding-top: 8px;
  `,
  dialogCancelBtn: css`
    height: 40px;
    border-radius: 999px;
    padding-inline: 18px;
    border-color: rgba(0, 0, 0, 0.1);
    background: transparent;
    font-weight: 600;
    box-shadow: none;

    [data-theme='dark'] & {
      border-color: rgba(255, 255, 255, 0.1);
    }
  `,
  dialogSubmitBtn: css`
    height: 40px;
    border: none;
    border-radius: 999px;
    padding-inline: 18px;
    background: linear-gradient(135deg, ${token.colorPrimary}, ${token.colorPrimaryHover});
    box-shadow: 0 12px 24px rgba(var(--ant-color-primary-rgb, 22, 119, 255), 0.24);
    font-weight: 600;
  `,
}));
