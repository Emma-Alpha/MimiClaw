import { createStyles } from 'antd-style';

export const useSetupStyles = createStyles(({ token, css }) => ({
  pageRoot: css`
    display: flex;
    height: 100vh;
    flex-direction: column;
    overflow: hidden;
    background: ${token.colorBgContainer};
    color: ${token.colorText};
    position: relative;
  `,
  bgGradient: css`
    position: absolute;
    inset: 0;
    background: linear-gradient(to bottom right, rgba(${token.colorPrimary}, 0.05), transparent, transparent);
    pointer-events: none;
  `,
  bgBlob1: css`
    position: absolute;
    top: 25%;
    left: 25%;
    width: 384px;
    height: 384px;
    background: rgba(${token.colorPrimary}, 0.1);
    border-radius: 50%;
    filter: blur(120px);
    pointer-events: none;
  `,
  bgBlob2: css`
    position: absolute;
    bottom: 25%;
    right: 25%;
    width: 384px;
    height: 384px;
    background: rgba(59, 130, 246, 0.1);
    border-radius: 50%;
    filter: blur(120px);
    pointer-events: none;
  `,
  centerArea: css`
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 16px;
    z-index: 10;
  `,

  /* Step Progress */
  stepProgress: css`
    margin-bottom: 32px;
    display: flex;
    gap: 8px;
    align-items: center;
  `,
  stepDotActive: css`
    height: 6px;
    width: 32px;
    border-radius: 9999px;
    background: ${token.colorPrimary};
    transition: all 0.5s;
  `,
  stepDotPast: css`
    height: 6px;
    width: 8px;
    border-radius: 9999px;
    background: rgba(${token.colorPrimary}, 0.4);
    transition: all 0.5s;
  `,
  stepDotFuture: css`
    height: 6px;
    width: 8px;
    border-radius: 9999px;
    background: ${token.colorBorderSecondary};
    transition: all 0.5s;
  `,

  /* Setup Card */
  setupCard: css`
    width: 100%;
    max-width: 480px;
    background: rgba(${token.colorBgContainer}, 0.6);
    backdrop-filter: blur(24px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 32px;
    box-shadow: 0 25px 50px -12px rgba(0,0,0,0.05);
    overflow: hidden;
  `,
  stepContent: css`
    padding: 32px;
    display: flex;
    flex-direction: column;
    min-height: 400px;
    @media (min-width: 640px) {
      padding: 40px;
    }
  `,
  stepContentInner: css`
    flex: 1;
    display: flex;
    flex-direction: column;
  `,

  /* Navigation Footer */
  navFooter: css`
    margin-top: 40px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 16px;
    border-top: 1px solid rgba(${token.colorBorder}, 0.4);
  `,
  navLeft: css`
    display: flex;
    gap: 8px;
  `,
  navRight: css`
    display: flex;
    gap: 8px;
    align-items: center;
  `,
  skipButton: css`
    font-size: 12px;
    color: rgba(0,0,0,0.4);
    cursor: pointer;
    padding: 8px;
    background: none;
    border: none;
    transition: color 0.2s;
    &:hover {
      color: ${token.colorTextSecondary};
    }
    [data-theme='dark'] & {
      color: rgba(255,255,255,0.4);
    }
  `,

  /* Welcome Step */
  welcomeRoot: css`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    gap: 32px;
    flex: 1;
    padding: 16px 0;
  `,
  welcomeIconWrapper: css`
    position: relative;
  `,
  welcomeIconGlow: css`
    position: absolute;
    inset: 0;
    background: rgba(${token.colorPrimary}, 0.2);
    filter: blur(24px);
    border-radius: 50%;
  `,
  welcomeIcon: css`
    position: relative;
    height: 96px;
    width: 96px;
    border-radius: 28px;
    object-fit: cover;
    box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
    ring: 1px solid rgba(255,255,255,0.1);
  `,
  welcomeTextGroup: css`
    display: flex;
    flex-direction: column;
    gap: 12px;
  `,
  welcomeTitle: css`
    font-size: 14px;
    font-weight: 600;
    letter-spacing: -0.025em;
  `,
  welcomeDesc: css`
    color: ${token.colorTextSecondary};
    font-size: 14px;
    max-width: 280px;
    margin: 0 auto;
    line-height: 1.6;
  `,
  langSwitcherWrapper: css`
    padding-top: 16px;
    width: 100%;
    max-width: 240px;
  `,
  langSwitcher: css`
    display: flex;
    background: rgba(${token.colorFillTertiary}, 0.5);
    padding: 4px;
    border-radius: 16px;
    border: 1px solid rgba(255, 255, 255, 0.05);
    box-shadow: inset 0 1px 3px rgba(0,0,0,0.1);
  `,
  langBtnActive: css`
    flex: 1;
    padding: 8px 0;
    font-size: 14px;
    font-weight: 500;
    border-radius: 12px;
    transition: all 0.3s;
    background: ${token.colorBgContainer};
    color: ${token.colorText};
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    cursor: pointer;
    border: none;
  `,
  langBtnInactive: css`
    flex: 1;
    padding: 8px 0;
    font-size: 14px;
    font-weight: 500;
    border-radius: 12px;
    transition: all 0.3s;
    color: ${token.colorTextSecondary};
    cursor: pointer;
    background: none;
    border: none;
    &:hover {
      color: ${token.colorText};
      background: rgba(0,0,0,0.05);
    }
    [data-theme='dark'] & {
      &:hover {
        background: rgba(255,255,255,0.05);
      }
    }
  `,

  /* Provider Step */
  providerRoot: css`
    display: flex;
    flex-direction: column;
    height: 100%;
    flex: 1;
  `,
  providerRemoteRoot: css`
    display: flex;
    flex-direction: column;
    height: 100%;
    justify-content: center;
    gap: 24px;
  `,
  providerHeader: css`
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 24px;
  `,
  providerTitle: css`
    font-size: 14px;
    font-weight: 600;
    letter-spacing: -0.025em;
  `,
  providerDesc: css`
    color: ${token.colorTextSecondary};
    font-size: 14px;
  `,
  providerRemoteBox: css`
    border-radius: 16px;
    border: 1px solid rgba(${token.colorPrimary}, 0.2);
    background: rgba(${token.colorPrimary}, 0.05);
    padding: 24px;
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: 12px;
  `,
  providerRemoteTitle: css`
    font-weight: 500;
  `,
  providerRemoteDesc: css`
    font-size: 14px;
    color: ${token.colorTextSecondary};
  `,
  providerFields: css`
    display: flex;
    flex-direction: column;
    gap: 20px;
    flex: 1;
  `,
  providerSelectorWrapper: css`
    display: flex;
    flex-direction: column;
    gap: 8px;
    position: relative;
  `,
  providerFieldLabel: css`
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: ${token.colorTextSecondary};
    font-weight: 600;
  `,
  providerSelector: css`
    width: 100%;
    height: 48px;
    padding: 0 16px;
    border-radius: ${token.borderRadiusLG}px;
    border: 1px solid ${token.colorBorder};
    background: rgba(${token.colorBgContainer}, 0.5);
    transition: background 0.2s;
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: pointer;
    &:hover {
      background: rgba(${token.colorFillTertiary}, 0.5);
    }
  `,
  providerSelectorLeft: css`
    display: flex;
    align-items: center;
    gap: 12px;
  `,
  providerSelectorPlaceholder: css`
    color: ${token.colorTextSecondary};
  `,
  providerDropdown: css`
    position: absolute;
    z-index: 50;
    top: 100%;
    left: 0;
    right: 0;
    margin-top: 8px;
    padding: 8px;
    border-radius: ${token.borderRadiusLG}px;
    border: 1px solid ${token.colorBorderSecondary};
    background: ${token.colorBgElevated};
    box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
    max-height: 224px;
    overflow: auto;
  `,
  providerDropdownItemActive: css`
    width: 100%;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    border-radius: 8px;
    font-size: 14px;
    transition: background 0.15s;
    background: rgba(${token.colorPrimary}, 0.1);
    color: ${token.colorPrimary};
    font-weight: 500;
    cursor: pointer;
    border: none;
    text-align: left;
  `,
  providerDropdownItemInactive: css`
    width: 100%;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    border-radius: 8px;
    font-size: 14px;
    transition: background 0.15s;
    cursor: pointer;
    border: none;
    background: none;
    color: ${token.colorText};
    text-align: left;
    &:hover {
      background: ${token.colorFillTertiary};
    }
  `,
  providerFieldSmallLabel: css`
    font-size: 12px;
    color: ${token.colorTextSecondary};
  `,
  providerKeyRow: css`
    position: relative;
  `,
  providerEyeBtn: css`
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: ${token.colorTextSecondary};
    cursor: pointer;
    background: none;
    border: none;
    padding: 0;
    display: flex;
    align-items: center;
  `,
  providerValidMsg: css`
    font-size: 12px;
    text-align: center;
    font-weight: 500;
  `,
  providerValidMsgOk: css`
    color: #22c55e;
  `,
  providerValidMsgErr: css`
    color: #ef4444;
  `,

  /* Installing Step */
  installingRoot: css`
    display: flex;
    flex-direction: column;
    height: 100%;
    justify-content: center;
    align-items: center;
    text-align: center;
    gap: 32px;
    flex: 1;
  `,
  installingSpinnerWrapper: css`
    position: relative;
  `,
  installingProgressText: css`
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: ${token.colorPrimary};
    font-weight: 500;
    font-size: 14px;
  `,
  installingProgressBarWrapper: css`
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 12px;
  `,
  installingTrack: css`
    height: 4px;
    width: 100%;
    background: ${token.colorFillTertiary};
    border-radius: 9999px;
    overflow: hidden;
  `,
  installingBar: css`
    height: 100%;
    background: ${token.colorPrimary};
    border-radius: 9999px;
  `,
  installingTitle: css`
    font-size: 14px;
    font-weight: 600;
  `,
  installingSubtitle: css`
    color: ${token.colorTextSecondary};
    font-size: 12px;
  `,

  /* Complete State */
  completeRoot: css`
    display: flex;
    flex-direction: column;
    height: 100%;
    justify-content: center;
    align-items: center;
    text-align: center;
    gap: 24px;
    flex: 1;
  `,
  completeIconCircle: css`
    width: 80px;
    height: 80px;
    background: rgba(34, 197, 94, 0.1);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #22c55e;
  `,
  completeTextGroup: css`
    display: flex;
    flex-direction: column;
    gap: 8px;
  `,
  completeTitle: css`
    font-size: 14px;
    font-weight: 600;
    letter-spacing: -0.025em;
  `,
  completeSubtitle: css`
    color: ${token.colorTextSecondary};
    font-size: 14px;
  `,
  completeSummaryBox: css`
    padding: 20px;
    border-radius: 16px;
    background: rgba(${token.colorFillTertiary}, 0.3);
    border: 1px solid rgba(${token.colorBorderSecondary}, 0.5);
    width: 100%;
    text-align: left;
    display: flex;
    flex-direction: column;
    gap: 12px;
  `,
  completeSummaryRow: css`
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 14px;
  `,
  completeSummaryLabel: css`
    color: ${token.colorTextSecondary};
  `,
  completeSummaryValue: css`
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 8px;
  `,
  completeStatusValue: css`
    color: #22c55e;
    font-weight: 500;
  `,

  /* Error State */
  errorRoot: css`
    display: flex;
    flex-direction: column;
    height: 100%;
    justify-content: center;
    align-items: center;
    text-align: center;
    gap: 24px;
    flex: 1;
  `,
  errorIconCircle: css`
    width: 64px;
    height: 64px;
    background: rgba(239, 68, 68, 0.1);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ef4444;
  `,
  errorTextGroup: css`
    display: flex;
    flex-direction: column;
    gap: 8px;
  `,
  errorTitle: css`
    font-size: 14px;
    font-weight: 600;
  `,
  errorDesc: css`
    color: ${token.colorTextSecondary};
    font-size: 12px;
    max-width: 260px;
    margin: 0 auto;
    word-break: break-all;
    line-height: 1.6;
  `,
  errorButtons: css`
    display: flex;
    gap: 12px;
    width: 100%;
  `,
  btnRoundedFull: css`
    border-radius: 9999px;
    padding-left: 24px;
    padding-right: 24px;
    box-shadow: 0 4px 6px rgba(0,0,0,0.07);
  `,
  btnRoundedFullWide: css`
    border-radius: 9999px;
    padding-left: 32px;
    padding-right: 32px;
    box-shadow: 0 4px 6px rgba(0,0,0,0.07);
    width: 100%;
    margin-top: 8px;
  `,
  inputXl: css`
    height: 44px;
    border-radius: 12px;
  `,
  inputXlRight: css`
    height: 44px;
    border-radius: 12px;
    padding-right: 40px;
  `,
  btnWideXl: css`
    width: 100%;
    height: 44px;
    border-radius: 12px;
    margin-top: 16px;
  `,
  btnFlexRounded: css`
    flex: 1;
    border-radius: 12px;
  `,
  btnFlexRoundedMuted: css`
    flex: 1;
    border-radius: 12px;
    color: ${token.colorTextSecondary};
  `,
  btnGhostMuted: css`
    color: ${token.colorTextSecondary};
    &:hover { color: ${token.colorText}; }
  `,
}));
