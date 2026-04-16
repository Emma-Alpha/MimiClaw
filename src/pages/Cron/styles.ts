import { createStyles } from 'antd-style';

export const useCronStyles = createStyles(({ token, css }) => ({
  pageRoot: css`
    display: flex;
    flex-direction: column;
    margin: -24px;
    height: calc(100vh - 2.5rem);
    overflow: hidden;
  `,
  pageInner: css`
    width: 100%;
    max-width: 80rem;
    margin-left: auto;
    margin-right: auto;
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 40px;
    padding-top: 64px;
  `,
  loadingWrapper: css`
    display: flex;
    flex-direction: column;
    margin: -24px;
    min-height: calc(100vh - 2.5rem);
    align-items: center;
    justify-content: center;
  `,

  /* Header */
  header: css`
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
  headerTitle: css`
    font-size: 14px;
    font-family: Georgia, Cambria, 'Times New Roman', Times, serif;
    color: ${token.colorText};
    margin-bottom: 12px;
    font-weight: 400;
    letter-spacing: -0.025em;
  `,
  headerSubtitle: css`
    font-size: 14px;
    color: rgba(0, 0, 0, 0.7);
    font-weight: 500;
    [data-theme='dark'] & {
      color: rgba(255, 255, 255, 0.7);
    }
  `,
  headerActions: css`
    display: flex;
    align-items: center;
    gap: 12px;
    @media (min-width: 768px) {
      margin-top: 8px;
    }
  `,

  /* Content Scroll Area */
  contentArea: css`
    flex: 1;
    overflow-y: auto;
    padding-right: 8px;
    padding-bottom: 40px;
    min-height: 0;
    margin-right: -8px;
  `,

  /* Gateway Warning */
  gatewayWarning: css`
    margin-bottom: 32px;
    padding: 16px;
    border-radius: ${token.borderRadiusLG}px;
    border: 1px solid rgba(234, 179, 8, 0.5);
    background: rgba(234, 179, 8, 0.1);
    display: flex;
    align-items: center;
    gap: 12px;
  `,
  gatewayWarningIcon: css`
    width: 20px;
    height: 20px;
    color: #ca8a04;
    [data-theme='dark'] & {
      color: #facc15;
    }
  `,
  gatewayWarningText: css`
    color: #a16207;
    font-size: 14px;
    font-weight: 500;
    [data-theme='dark'] & {
      color: #facc15;
    }
  `,

  /* Error Banner */
  errorBanner: css`
    margin-bottom: 32px;
    padding: 16px;
    border-radius: ${token.borderRadiusLG}px;
    border: 1px solid rgba(255, 77, 79, 0.5);
    background: rgba(255, 77, 79, 0.1);
    display: flex;
    align-items: center;
    gap: 12px;
  `,
  errorText: css`
    color: ${token.colorError};
    font-size: 14px;
    font-weight: 500;
  `,

  /* Stats Grid */
  statsGrid: css`
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
    margin-bottom: 32px;
    @media (min-width: 768px) {
      grid-template-columns: repeat(4, 1fr);
    }
  `,
  statCard: css`
    padding: 20px;
    border-radius: 24px;
    background: rgba(0, 0, 0, 0.05);
    border: 1px solid transparent;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    min-height: 130px;
    position: relative;
    overflow: hidden;
    transition: background 0.2s;
    cursor: default;
    &:hover {
      background: rgba(0, 0, 0, 0.1);
    }
    [data-theme='dark'] & {
      background: rgba(255, 255, 255, 0.05);
      &:hover {
        background: rgba(255, 255, 255, 0.1);
      }
    }
  `,
  statIconRow: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
  `,
  statIconCircle: css`
    height: 44px;
    width: 44px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
  `,
  statIconPrimary: css`
    background: rgba(${token.colorPrimary}, 0.1);
  `,
  statBottom: css`
    margin-top: 16px;
    display: flex;
    align-items: baseline;
    gap: 12px;
  `,
  statValue: css`
    font-size: 14px;
    line-height: 1;
    font-family: Georgia, Cambria, 'Times New Roman', Times, serif;
    color: ${token.colorText};
  `,
  statLabel: css`
    font-size: 14px;
    font-weight: 500;
    color: ${token.colorTextSecondary};
  `,

  /* Job Grid */
  jobGrid: css`
    display: grid;
    grid-template-columns: 1fr;
    gap: 16px 24px;
    @media (min-width: 768px) {
      grid-template-columns: repeat(2, 1fr);
    }
  `,

  /* Empty State */
  emptyState: css`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 80px 0;
    color: ${token.colorTextSecondary};
    background: rgba(0, 0, 0, 0.05);
    border-radius: 24px;
    border: 1px dashed transparent;
    [data-theme='dark'] & {
      background: rgba(255, 255, 255, 0.05);
    }
  `,
  emptyIcon: css`
    opacity: 0.5;
    margin-bottom: 16px;
  `,
  emptyTitle: css`
    font-size: 14px;
    font-weight: 500;
    margin-bottom: 8px;
    color: ${token.colorText};
  `,
  emptyDesc: css`
    font-size: 14px;
    text-align: center;
    margin-bottom: 24px;
    max-width: 28rem;
  `,

  /* CronJobCard */
  jobCard: css`
    display: flex;
    flex-direction: column;
    padding: 20px;
    border-radius: 16px;
    background: transparent;
    border: 1px solid transparent;
    transition: background 0.2s;
    position: relative;
    overflow: hidden;
    cursor: pointer;
    &:hover {
      background: rgba(0, 0, 0, 0.05);
    }
    [data-theme='dark'] & {
      &:hover {
        background: rgba(255, 255, 255, 0.05);
      }
    }
  `,
  jobCardTop: css`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 16px;
  `,
  jobCardLeft: css`
    display: flex;
    align-items: center;
    gap: 16px;
  `,
  jobCardIconCircle: css`
    height: 46px;
    width: 46px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: ${token.colorText};
    background: rgba(0, 0, 0, 0.05);
    border: 1px solid rgba(0, 0, 0, 0.05);
    border-radius: 50%;
    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    transition: transform 0.2s;
    .job-card:hover & {
      transform: scale(1.05);
    }
    [data-theme='dark'] & {
      background: rgba(255, 255, 255, 0.05);
      border-color: rgba(255, 255, 255, 0.1);
    }
  `,
  jobCardNameCol: css`
    display: flex;
    flex-direction: column;
    min-width: 0;
  `,
  jobCardNameRow: css`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
  `,
  jobCardName: css`
    font-size: 14px;
    font-weight: 600;
    color: ${token.colorText};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  jobCardStatusDot: css`
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  `,
  jobCardStatusDotActive: css`
    background: #22c55e;
  `,
  jobCardStatusDotPaused: css`
    background: ${token.colorTextSecondary};
  `,
  jobCardScheduleRow: css`
    font-size: 13px;
    color: ${token.colorTextSecondary};
    display: flex;
    align-items: center;
    gap: 6px;
  `,
  jobCardRight: css`
    display: flex;
    align-items: center;
    gap: 8px;
  `,
  jobCardBody: css`
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    margin-top: 8px;
    padding-left: 62px;
  `,
  jobCardMessageRow: css`
    display: flex;
    align-items: flex-start;
    gap: 8px;
    margin-bottom: 12px;
  `,
  jobCardMessage: css`
    font-size: 13.5px;
    color: ${token.colorTextSecondary};
    line-height: 1.5;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  `,
  jobCardMeta: css`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px 16px;
    font-size: 12px;
    color: rgba(0,0,0,0.6);
    font-weight: 500;
    margin-bottom: 12px;
    [data-theme='dark'] & {
      color: rgba(255,255,255,0.6);
    }
  `,
  jobCardMetaItem: css`
    display: flex;
    align-items: center;
    gap: 6px;
  `,
  jobCardErrorBox: css`
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 10px;
    margin-bottom: 12px;
    border-radius: ${token.borderRadiusLG}px;
    background: rgba(255, 77, 79, 0.1);
    border: 1px solid rgba(255, 77, 79, 0.2);
    font-size: 13px;
    color: ${token.colorError};
  `,
  jobCardActions: css`
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: auto;
    opacity: 0;
    transition: opacity 0.2s;
    .job-card:hover & {
      opacity: 1;
    }
  `,

  /* Task Dialog */
  dialogOverlay: css`
    position: fixed;
    inset: 0;
    z-index: 50;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
  `,
  dialogCard: css`
    width: 100%;
    max-width: 512px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    border-radius: 24px;
    border: none;
    box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
    background: #f3f1e9;
    overflow: hidden;
    [data-theme='dark'] & {
      background: ${token.colorBgContainer};
    }
  `,
  dialogHeader: css`
    display: flex;
    flex-direction: row;
    align-items: flex-start;
    justify-content: space-between;
    padding: 24px;
    padding-bottom: 8px;
    flex-shrink: 0;
  `,
  dialogTitle: css`
    font-size: 14px;
    font-family: Georgia, Cambria, 'Times New Roman', Times, serif;
    font-weight: 400;
  `,
  dialogDesc: css`
    font-size: 14px;
    margin-top: 4px;
    color: rgba(0,0,0,0.7);
    [data-theme='dark'] & {
      color: rgba(255,255,255,0.7);
    }
  `,
  dialogBody: css`
    display: flex;
    flex-direction: column;
    gap: 24px;
    padding: 16px 24px 24px;
    overflow-y: auto;
    flex: 1;
  `,
  dialogField: css`
    display: flex;
    flex-direction: column;
    gap: 10px;
  `,
  dialogLabel: css`
    font-size: 14px;
    color: rgba(0,0,0,0.8);
    font-weight: 700;
    [data-theme='dark'] & {
      color: rgba(255,255,255,0.8);
    }
  `,
  presetGrid: css`
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  `,
  scheduleFooter: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 8px;
  `,
  schedulePreview: css`
    font-size: 12px;
    color: rgba(0,0,0,0.6);
    font-weight: 500;
    [data-theme='dark'] & {
      color: rgba(255,255,255,0.6);
    }
  `,
  enableRow: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: #eeece3;
    padding: 16px;
    border-radius: 16px;
    box-shadow: 0 1px 2px rgba(0,0,0,0.04);
    border: 1px solid rgba(0,0,0,0.05);
    [data-theme='dark'] & {
      background: ${token.colorFillTertiary};
      border-color: rgba(255,255,255,0.05);
    }
  `,
  enableLabel: css`
    font-size: 14px;
    color: rgba(0,0,0,0.8);
    font-weight: 700;
    [data-theme='dark'] & {
      color: rgba(255,255,255,0.8);
    }
  `,
  enableDesc: css`
    font-size: 13px;
    color: ${token.colorTextSecondary};
    margin-top: 2px;
  `,
  dialogFooter: css`
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding-top: 16px;
  `,

  /* Dialog button/input overrides */
  dialogCloseBtn: css`
    border-radius: 9999px;
    height: 32px;
    width: 32px;
    margin-right: -8px;
    margin-top: -8px;
    color: ${token.colorTextSecondary};
    &:hover {
      color: ${token.colorText};
      background: rgba(0, 0, 0, 0.05);
    }
    [data-theme='dark'] & {
      &:hover {
        background: rgba(255, 255, 255, 0.05);
      }
    }
  `,
  dialogInput: css`
    height: 44px;
    border-radius: 12px;
    font-family: monospace;
    font-size: 13px;
    background: #eeece3;
    border-color: rgba(0, 0, 0, 0.1);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
    transition: all 0.2s;
    [data-theme='dark'] & {
      background: ${token.colorFillSecondary};
      border-color: rgba(255, 255, 255, 0.1);
    }
  `,
  dialogTextarea: css`
    border-radius: 12px;
    font-family: monospace;
    font-size: 13px;
    background: #eeece3;
    border-color: rgba(0, 0, 0, 0.1);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
    transition: all 0.2s;
    resize: none;
    [data-theme='dark'] & {
      background: ${token.colorFillSecondary};
      border-color: rgba(255, 255, 255, 0.1);
    }
  `,
  toggleCustomBtn: css`
    font-size: 12px;
    height: 28px;
    padding: 0 8px;
    color: rgba(0, 0, 0, 0.6);
    border-radius: 8px;
    &:hover {
      color: ${token.colorText};
      background: rgba(0, 0, 0, 0.05);
    }
    [data-theme='dark'] & {
      color: rgba(255, 255, 255, 0.6);
      &:hover {
        background: rgba(255, 255, 255, 0.05);
      }
    }
  `,
  presetBtnBase: css`
    justify-content: flex-start;
    height: 40px;
    border-radius: 12px;
    font-weight: 500;
    font-size: 13px;
    transition: all 0.2s;
  `,
  presetBtnActive: css`
    background: ${token.colorPrimary};
    color: #fff;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    border-color: transparent;
    &:hover {
      background: ${token.colorPrimaryHover};
    }
  `,
  presetBtnInactive: css`
    background: #eeece3;
    border-color: rgba(0, 0, 0, 0.1);
    color: rgba(0, 0, 0, 0.8);
    &:hover {
      background: rgba(0, 0, 0, 0.05);
      color: ${token.colorText};
    }
    [data-theme='dark'] & {
      background: ${token.colorFillSecondary};
      border-color: rgba(255, 255, 255, 0.1);
      color: rgba(255, 255, 255, 0.8);
      &:hover {
        background: rgba(255, 255, 255, 0.05);
      }
    }
  `,
  dialogCancelBtn: css`
    border-radius: 9999px;
    padding: 0 24px;
    height: 42px;
    font-size: 13px;
    font-weight: 600;
    border-color: rgba(0, 0, 0, 0.2);
    background: transparent;
    color: rgba(0, 0, 0, 0.8);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
    &:hover {
      background: rgba(0, 0, 0, 0.05);
      color: ${token.colorText};
    }
    [data-theme='dark'] & {
      border-color: rgba(255, 255, 255, 0.2);
      color: rgba(255, 255, 255, 0.8);
      &:hover {
        background: rgba(255, 255, 255, 0.05);
      }
    }
  `,
  dialogSubmitBtn: css`
    border-radius: 9999px;
    padding: 0 24px;
    height: 42px;
    font-size: 13px;
    font-weight: 600;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    border: 1px solid transparent;
    transition: all 0.2s;
  `,
  jobCardTriggerBtn: css`
    height: 32px;
    padding: 0 12px;
    color: rgba(0, 0, 0, 0.7);
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
    transition: all 0.2s;
    &:hover {
      color: ${token.colorText};
      background: rgba(0, 0, 0, 0.05);
    }
    [data-theme='dark'] & {
      color: rgba(255, 255, 255, 0.7);
      &:hover {
        background: rgba(255, 255, 255, 0.05);
      }
    }
  `,
  jobCardDeleteBtn: css`
    height: 32px;
    padding: 0 12px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
    transition: all 0.2s;
    color: ${token.colorError};
    opacity: 0.7;
    &:hover {
      opacity: 1;
      color: ${token.colorError};
      background: rgba(255, 77, 79, 0.1);
    }
  `,
  headerRefreshBtn: css`
    height: 36px;
    font-size: 13px;
    font-weight: 500;
    border-radius: 9999px;
    padding: 0 16px;
    border-color: rgba(0, 0, 0, 0.1);
    background: transparent;
    box-shadow: none;
    color: rgba(0, 0, 0, 0.8);
    transition: all 0.2s;
    &:hover {
      background: rgba(0, 0, 0, 0.05);
      color: ${token.colorText};
    }
    [data-theme='dark'] & {
      border-color: rgba(255, 255, 255, 0.1);
      color: rgba(255, 255, 255, 0.8);
      &:hover {
        background: rgba(255, 255, 255, 0.05);
      }
    }
  `,
  headerNewTaskBtn: css`
    height: 36px;
    font-size: 13px;
    font-weight: 500;
    border-radius: 9999px;
    padding: 0 16px;
    box-shadow: none;
  `,
  emptyCreateBtn: css`
    border-radius: 9999px;
    padding: 0 24px;
    height: 40px;
  `,
}));
