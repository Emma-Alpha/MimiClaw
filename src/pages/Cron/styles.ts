import { createStyles } from 'antd-style';

export const useCronStyles = createStyles(({ css, token }) => ({
  pageRoot: css`
    position: relative;
    flex: 1;
    overflow: auto;
    background:
      radial-gradient(circle at top left, rgba(var(--ant-color-primary-rgb, 22, 119, 255), 0.12), transparent 24%),
      linear-gradient(180deg, ${token.colorBgLayout} 0%, ${token.colorBgContainer} 24%);
  `,
  pageInner: css`
    position: relative;
    z-index: 1;
    margin: 0 auto;
    display: flex;
    width: 100%;
    max-width: 1280px;
    flex-direction: column;
    gap: 20px;
    padding: 24px;

    @media (max-width: 768px) {
      padding: 16px;
    }
  `,
  loadingWrapper: css`
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: center;
  `,

  heroCard: css`
    position: relative;
    overflow: hidden;
    border: 1px solid rgba(0, 0, 0, 0.08);
    border-radius: 28px;
    background:
      linear-gradient(135deg, rgba(var(--ant-color-primary-rgb, 22, 119, 255), 0.09) 0%, transparent 42%),
      ${token.colorBgElevated};
    box-shadow: ${token.boxShadowSecondary};
    backdrop-filter: blur(24px);

    &::after {
      content: '';
      position: absolute;
      right: -120px;
      bottom: -140px;
      width: 320px;
      height: 320px;
      background: radial-gradient(circle, rgba(var(--ant-color-primary-rgb, 22, 119, 255), 0.18), transparent 72%);
      pointer-events: none;
    }

    [data-theme='dark'] & {
      border-color: rgba(255, 255, 255, 0.08);
      background:
        linear-gradient(135deg, rgba(var(--ant-color-primary-rgb, 22, 119, 255), 0.18) 0%, transparent 44%),
        ${token.colorBgContainer};
    }
  `,
  heroGrid: css`
    position: relative;
    z-index: 1;
    display: grid;
    gap: 24px;
    padding: 28px;

    @media (min-width: 1080px) {
      grid-template-columns: minmax(0, 1.2fr) minmax(320px, 0.8fr);
      align-items: stretch;
    }

    @media (max-width: 768px) {
      padding: 20px;
    }
  `,
  heroContent: css`
    display: flex;
    flex-direction: column;
    gap: 28px;
  `,
  heroCopyBlock: css`
    display: flex;
    flex-direction: column;
    gap: 18px;
  `,
  heroEyebrowRow: css`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;
  `,
  heroEyebrow: css`
    padding: 6px 12px;
    border-radius: 999px;
    background: rgba(var(--ant-color-primary-rgb, 22, 119, 255), 0.1);
    color: ${token.colorPrimary};
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.04em;
  `,
  heroStatusBadge: css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: 999px;
    border: 1px solid transparent;
    font-size: 12px;
    font-weight: 600;
  `,
  heroStatusReady: css`
    border-color: rgba(34, 197, 94, 0.22);
    background: rgba(34, 197, 94, 0.1);
    color: #15803d;

    [data-theme='dark'] & {
      color: #4ade80;
    }
  `,
  heroStatusIssue: css`
    border-color: rgba(245, 158, 11, 0.24);
    background: rgba(245, 158, 11, 0.1);
    color: #b45309;

    [data-theme='dark'] & {
      color: #fbbf24;
    }
  `,
  heroStatusOffline: css`
    border-color: rgba(239, 68, 68, 0.22);
    background: rgba(239, 68, 68, 0.1);
    color: ${token.colorError};
  `,
  heroHeadingBlock: css`
    display: flex;
    flex-direction: column;
    gap: 10px;
    max-width: 44rem;
  `,
  heroTitle: css`
    margin: 0;
    font-size: clamp(28px, 4vw, 40px);
    font-weight: 700;
    letter-spacing: -0.04em;
    line-height: 1.05;
    color: ${token.colorText};
  `,
  heroSubtitle: css`
    margin: 0;
    font-size: 14px;
    line-height: 1.75;
    color: ${token.colorTextSecondary};
  `,
  heroActionRow: css`
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  `,
  secondaryActionButton: css`
    height: 40px;
    border-radius: 999px;
    border-color: rgba(0, 0, 0, 0.1);
    background: rgba(255, 255, 255, 0.56);
    box-shadow: none;
    color: ${token.colorText};
    font-weight: 600;

    &:hover {
      border-color: rgba(var(--ant-color-primary-rgb, 22, 119, 255), 0.22);
      background: rgba(var(--ant-color-primary-rgb, 22, 119, 255), 0.06) !important;
      color: ${token.colorPrimary} !important;
    }

    [data-theme='dark'] & {
      border-color: rgba(255, 255, 255, 0.1);
      background: rgba(255, 255, 255, 0.04);
    }
  `,
  primaryActionButton: css`
    height: 40px;
    border: none;
    border-radius: 999px;
    padding-inline: 18px;
    background: linear-gradient(135deg, ${token.colorPrimary}, ${token.colorPrimaryHover});
    box-shadow: 0 12px 24px rgba(var(--ant-color-primary-rgb, 22, 119, 255), 0.24);
    font-weight: 600;
  `,

  statsGrid: css`
    display: grid;
    gap: 12px;
    grid-template-columns: repeat(2, minmax(0, 1fr));

    @media (min-width: 900px) {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
  `,
  statCard: css`
    display: flex;
    align-items: center;
    gap: 14px;
    min-height: 96px;
    border: 1px solid rgba(0, 0, 0, 0.07);
    border-radius: 20px;
    background: rgba(255, 255, 255, 0.7);
    padding: 16px;
    backdrop-filter: blur(14px);

    [data-theme='dark'] & {
      border-color: rgba(255, 255, 255, 0.08);
      background: rgba(255, 255, 255, 0.04);
    }
  `,
  statIconWrap: css`
    display: inline-flex;
    height: 44px;
    width: 44px;
    align-items: center;
    justify-content: center;
    border-radius: 14px;
  `,
  statIconPrimary: css`
    background: rgba(var(--ant-color-primary-rgb, 22, 119, 255), 0.12);
    color: ${token.colorPrimary};
  `,
  statIconSuccess: css`
    background: rgba(34, 197, 94, 0.12);
    color: #16a34a;
  `,
  statIconWarning: css`
    background: rgba(245, 158, 11, 0.12);
    color: #d97706;
  `,
  statIconDanger: css`
    background: rgba(239, 68, 68, 0.12);
    color: ${token.colorError};
  `,
  statContent: css`
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 4px;
  `,
  statValue: css`
    font-size: 26px;
    font-weight: 700;
    line-height: 1;
    color: ${token.colorText};
  `,
  statLabel: css`
    font-size: 12px;
    color: ${token.colorTextSecondary};
  `,

  heroAside: css`
    display: grid;
    gap: 16px;
  `,
  spotlightCard: css`
    display: flex;
    min-height: 150px;
    flex-direction: column;
    justify-content: center;
    gap: 10px;
    border: 1px solid rgba(0, 0, 0, 0.07);
    border-radius: 22px;
    background: rgba(255, 255, 255, 0.78);
    padding: 20px;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.3);
    backdrop-filter: blur(14px);

    [data-theme='dark'] & {
      border-color: rgba(255, 255, 255, 0.08);
      background: rgba(255, 255, 255, 0.04);
      box-shadow: none;
    }
  `,
  spotlightLabel: css`
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: ${token.colorTextSecondary};
  `,
  spotlightTitle: css`
    font-size: 16px;
    font-weight: 600;
    color: ${token.colorText};
  `,
  spotlightValue: css`
    font-size: 18px;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: ${token.colorText};
  `,
  spotlightMeta: css`
    font-size: 13px;
    line-height: 1.65;
    color: ${token.colorTextSecondary};
  `,
  spotlightEmpty: css`
    font-size: 13px;
    line-height: 1.7;
    color: ${token.colorTextSecondary};
  `,
  spotlightRow: css`
    display: flex;
    align-items: center;
    gap: 10px;
  `,
  spotlightStateDot: css`
    width: 10px;
    height: 10px;
    flex-shrink: 0;
    border-radius: 50%;
  `,
  spotlightStateSuccess: css`
    background: #22c55e;
  `,
  spotlightStateError: css`
    background: ${token.colorError};
  `,

  noticeCard: css`
    display: flex;
    align-items: center;
    gap: 12px;
    border-radius: 18px;
    border: 1px solid transparent;
    padding: 14px 16px;
    font-size: 13px;
    line-height: 1.6;
  `,
  noticeWarning: css`
    border-color: rgba(245, 158, 11, 0.2);
    background: rgba(245, 158, 11, 0.1);
    color: #b45309;

    [data-theme='dark'] & {
      color: #fbbf24;
    }
  `,
  noticeError: css`
    border-color: rgba(239, 68, 68, 0.22);
    background: rgba(239, 68, 68, 0.1);
    color: ${token.colorError};
  `,
  noticeIcon: css`
    width: 18px;
    height: 18px;
    flex-shrink: 0;
  `,
  noticeText: css`
    font-weight: 500;
  `,

  sectionHeader: css`
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    justify-content: space-between;
    gap: 12px;
  `,
  sectionTitle: css`
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: ${token.colorText};
  `,
  sectionDesc: css`
    margin: 6px 0 0;
    max-width: 40rem;
    font-size: 13px;
    line-height: 1.75;
    color: ${token.colorTextSecondary};
  `,

  emptyStateCard: css`
    display: flex;
    align-items: center;
    flex-direction: column;
    justify-content: center;
    gap: 14px;
    border: 1px solid rgba(0, 0, 0, 0.07);
    border-radius: 24px;
    background: ${token.colorBgElevated};
    padding: 56px 24px;
    text-align: center;

    [data-theme='dark'] & {
      border-color: rgba(255, 255, 255, 0.08);
    }
  `,
  emptyIconWrap: css`
    display: inline-flex;
    height: 64px;
    width: 64px;
    align-items: center;
    justify-content: center;
    border-radius: 20px;
    background: rgba(var(--ant-color-primary-rgb, 22, 119, 255), 0.1);
    color: ${token.colorPrimary};
  `,
  emptyTitle: css`
    margin: 0;
    font-size: 20px;
    font-weight: 700;
    color: ${token.colorText};
  `,
  emptyDesc: css`
    max-width: 36rem;
    margin: 0;
    font-size: 14px;
    line-height: 1.75;
    color: ${token.colorTextSecondary};
  `,
  emptyCreateBtn: css`
    height: 42px;
    margin-top: 4px;
    border-radius: 999px;
    padding-inline: 18px;
    font-weight: 600;
  `,

  jobGrid: css`
    display: grid;
    gap: 16px;

    @media (min-width: 900px) {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  `,
  jobCard: css`
    overflow: hidden;
    border: 1px solid rgba(0, 0, 0, 0.07);
    border-radius: 24px;
    background:
      linear-gradient(180deg, rgba(var(--ant-color-primary-rgb, 22, 119, 255), 0.02), transparent 42%),
      ${token.colorBgElevated};
    box-shadow: ${token.boxShadowTertiary};
    cursor: pointer;
    transition:
      transform 0.2s ease,
      box-shadow 0.2s ease,
      border-color 0.2s ease;

    &:hover {
      transform: translateY(-2px);
      border-color: rgba(var(--ant-color-primary-rgb, 22, 119, 255), 0.18);
      box-shadow: ${token.boxShadowSecondary};
    }

    [data-theme='dark'] & {
      border-color: rgba(255, 255, 255, 0.08);
      background:
        linear-gradient(180deg, rgba(var(--ant-color-primary-rgb, 22, 119, 255), 0.08), transparent 42%),
        ${token.colorBgContainer};
    }
  `,
  jobCardFailed: css`
    border-color: rgba(239, 68, 68, 0.18);
    background:
      linear-gradient(180deg, rgba(239, 68, 68, 0.06), transparent 44%),
      ${token.colorBgElevated};
  `,
  jobCardPaused: css`
    background:
      linear-gradient(180deg, rgba(148, 163, 184, 0.06), transparent 44%),
      ${token.colorBgElevated};
  `,
  jobCardShell: css`
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 20px;
  `,
  jobCardHeader: css`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
  `,
  jobCardIdentity: css`
    display: flex;
    min-width: 0;
    align-items: flex-start;
    gap: 14px;
  `,
  jobCardIcon: css`
    display: inline-flex;
    height: 44px;
    width: 44px;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    border-radius: 14px;
  `,
  jobCardIconActive: css`
    background: rgba(var(--ant-color-primary-rgb, 22, 119, 255), 0.12);
    color: ${token.colorPrimary};
  `,
  jobCardIconPaused: css`
    background: rgba(148, 163, 184, 0.16);
    color: ${token.colorTextSecondary};
  `,
  jobCardIconFailed: css`
    background: rgba(239, 68, 68, 0.12);
    color: ${token.colorError};
  `,
  jobCardTitleBlock: css`
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 8px;
  `,
  jobCardNameRow: css`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  `,
  jobCardName: css`
    margin: 0;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 17px;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: ${token.colorText};
  `,
  jobCardStatus: css`
    display: inline-flex;
    align-items: center;
    padding: 4px 10px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.02em;
  `,
  jobCardStatusActive: css`
    background: rgba(34, 197, 94, 0.12);
    color: #15803d;

    [data-theme='dark'] & {
      color: #4ade80;
    }
  `,
  jobCardStatusPaused: css`
    background: rgba(148, 163, 184, 0.14);
    color: ${token.colorTextSecondary};
  `,
  jobCardStatusFailed: css`
    background: rgba(239, 68, 68, 0.12);
    color: ${token.colorError};
  `,
  jobCardSchedule: css`
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 0;
    font-size: 13px;
    color: ${token.colorTextSecondary};
  `,
  jobCardSwitchWrap: css`
    flex-shrink: 0;
  `,
  jobCardMessageBlock: css`
    display: flex;
    align-items: flex-start;
    gap: 10px;
    border-radius: 18px;
    background: rgba(0, 0, 0, 0.035);
    padding: 14px;
    color: ${token.colorTextSecondary};

    [data-theme='dark'] & {
      background: rgba(255, 255, 255, 0.04);
    }
  `,
  jobCardMessage: css`
    margin: 0;
    display: -webkit-box;
    overflow: hidden;
    font-size: 13px;
    line-height: 1.75;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
  `,
  jobMetaRow: css`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  `,
  jobMetaPill: css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border-radius: 999px;
    border: 1px solid rgba(0, 0, 0, 0.08);
    background: rgba(255, 255, 255, 0.7);
    padding: 7px 11px;
    font-size: 12px;
    color: ${token.colorTextSecondary};

    [data-theme='dark'] & {
      border-color: rgba(255, 255, 255, 0.08);
      background: rgba(255, 255, 255, 0.03);
    }
  `,
  jobErrorBox: css`
    display: flex;
    align-items: flex-start;
    gap: 8px;
    border: 1px solid rgba(239, 68, 68, 0.16);
    border-radius: 16px;
    background: rgba(239, 68, 68, 0.08);
    padding: 12px 14px;
    color: ${token.colorError};
  `,
  jobErrorText: css`
    display: -webkit-box;
    overflow: hidden;
    margin: 0;
    font-size: 12px;
    line-height: 1.7;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
  `,
  jobActionRow: css`
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 4px;
  `,
  jobRunButton: css`
    height: 34px;
    border-radius: 999px;
    border-color: rgba(0, 0, 0, 0.08);
    font-size: 12px;
    font-weight: 600;
    box-shadow: none;

    &:hover {
      border-color: rgba(var(--ant-color-primary-rgb, 22, 119, 255), 0.22);
      color: ${token.colorPrimary} !important;
    }

    [data-theme='dark'] & {
      border-color: rgba(255, 255, 255, 0.08);
      background: rgba(255, 255, 255, 0.03);
    }
  `,
  jobDeleteButton: css`
    height: 34px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 600;
    color: ${token.colorError};

    &:hover {
      color: ${token.colorError} !important;
      background: rgba(239, 68, 68, 0.08) !important;
    }
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
    background:
      linear-gradient(180deg, rgba(var(--ant-color-primary-rgb, 22, 119, 255), 0.06), transparent 34%),
      ${token.colorBgElevated};
    box-shadow: ${token.boxShadowSecondary};

    [data-theme='dark'] & {
      border-color: rgba(255, 255, 255, 0.08);
      background:
        linear-gradient(180deg, rgba(var(--ant-color-primary-rgb, 22, 119, 255), 0.12), transparent 34%),
        ${token.colorBgContainer};
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
