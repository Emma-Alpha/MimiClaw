import { createStyles } from 'antd-style';

export const useStyles = createStyles(({ css }) => ({
  root: css`
    display: flex;
    height: 100vh;
    flex-direction: column;
    overflow: hidden;
    background: #ededed;
    color: #111111;
  `,
  titleBar: css`
    position: relative;
    display: flex;
    height: 56px;
    align-items: center;
    justify-content: space-between;
    padding: 0 16px;
    background: #ededed;
    z-index: 10;
  `,
  titleCenter: css`
    flex: 1;
    display: flex;
    justify-content: center;
  `,
  titleText: css`
    font-size: 14px;
    font-weight: 500;
    color: #111111;
  `,
  closeBtn: css`
    position: absolute;
    right: 16px;
    display: flex;
    height: 32px;
    width: 32px;
    align-items: center;
    justify-content: center;
    border-radius: 9999px;
    border: none;
    background: transparent;
    color: #111111;
    opacity: 0.6;
    cursor: pointer;
    transition: opacity 0.2s;
    &:hover {
      opacity: 1;
    }
  `,
  body: css`
    display: flex;
    flex: 1;
    flex-direction: column;
    padding: 0 16px 32px;
    position: relative;
  `,
  mainArea: css`
    display: flex;
    flex: 1;
    flex-direction: column;
    align-items: center;
    min-height: 0;
    padding: 8px 8px 100px;
  `,
  innerWrap: css`
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    max-width: 340px;
    min-height: 0;
    flex: 1;
  `,
  rippleWrap: css`
    position: absolute;
    left: 50%;
    top: 60px;
    display: flex;
    transform: translateX(-50%);
    align-items: center;
    justify-content: center;
  `,
  avatarWrap: css`
    position: relative;
    z-index: 10;
    display: flex;
    height: 120px;
    width: 120px;
    align-items: center;
    justify-content: center;
    border-radius: 9999px;
    background: #ffffff;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
    overflow: hidden;
    border: 2px solid rgba(16, 185, 129, 0.2);
    flex-shrink: 0;
  `,
  avatarVideo: css`
    height: 100px;
    width: 100px;
    object-fit: contain;
  `,
  stageLabel: css`
    margin-top: 24px;
    min-height: 30px;
    text-align: center;
    font-size: 14px;
    color: rgba(17, 17, 17, 0.6);
    letter-spacing: 0.05em;
  `,
  transcriptArea: css`
    margin-top: 12px;
    width: 100%;
    flex: 1;
    min-height: 0;
  `,
  transcriptScroll: css`
    margin: 0 auto;
    display: flex;
    height: 100%;
    max-height: 160px;
    width: 100%;
    max-width: 280px;
    align-items: flex-start;
    justify-content: center;
    overflow-y: auto;
    padding: 0 8px;
    text-align: center;
  `,
  transcriptInner: css`
    margin: auto 0;
    width: 100%;
    word-break: break-word;
  `,
  assistantText: css`
    font-size: 14px;
    font-weight: 500;
    line-height: 1.6;
    color: #111111;
  `,
  userText: css`
    font-size: 14px;
    line-height: 1.6;
    color: rgba(17, 17, 17, 0.7);
  `,
  waveformWrap: css`
    margin-top: 16px;
    display: flex;
    height: 40px;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    opacity: 0.8;
  `,
  voiceBarsCanvas: css`
    height: 52px;
    width: 180px;
  `,

  /* error panel */
  errorPanel: css`
    position: absolute;
    top: 16px;
    left: 16px;
    right: 16px;
    z-index: 50;
    border-radius: 12px;
    background: #ffffff;
    padding: 16px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
    border: 1px solid rgba(239, 68, 68, 0.2);
  `,
  errorInner: css`
    display: flex;
    align-items: flex-start;
    gap: 12px;
  `,
  errorIcon: css`
    margin-top: 2px;
    flex-shrink: 0;
    color: #ef4444;
  `,
  errorContent: css`
    min-width: 0;
    flex: 1;
  `,
  errorTitle: css`
    font-weight: 500;
    color: #111111;
  `,
  errorMessage: css`
    margin-top: 4px;
    font-size: 13px;
    line-height: 20px;
    color: rgba(17, 17, 17, 0.6);
  `,
  errorActions: css`
    margin-top: 12px;
    display: flex;
    gap: 12px;
  `,
  errorBtnRetry: css`
    flex: 1;
    border-radius: 8px;
    background: #07c160;
    padding: 8px 0;
    font-size: 14px;
    font-weight: 500;
    color: #fff;
    border: none;
    cursor: pointer;
    transition: background 0.2s;
    &:hover {
      background: #06ad56;
    }
  `,
  errorBtnSettings: css`
    flex: 1;
    border-radius: 8px;
    background: #f2f2f2;
    padding: 8px 0;
    font-size: 14px;
    font-weight: 500;
    color: #111111;
    border: none;
    cursor: pointer;
    transition: background 0.2s;
    &:hover {
      background: #e5e5e5;
    }
  `,

  /* controls */
  controls: css`
    position: absolute;
    bottom: 32px;
    left: 0;
    right: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 24px;
    padding: 0 16px;
  `,
  controlItem: css`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  `,
  controlLabel: css`
    font-size: 12px;
    color: rgba(17, 17, 17, 0.5);
  `,
  ctrlBtnMuted: css`
    display: flex;
    height: 56px;
    width: 56px;
    align-items: center;
    justify-content: center;
    border-radius: 9999px;
    border: none;
    cursor: pointer;
    background: #ffffff;
    color: #111111;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
    transition: all 0.3s;
  `,
  ctrlBtnActive: css`
    display: flex;
    height: 56px;
    width: 56px;
    align-items: center;
    justify-content: center;
    border-radius: 9999px;
    border: none;
    cursor: pointer;
    background: rgba(7, 193, 96, 0.1);
    color: #07c160;
    transition: all 0.3s;
    &:hover {
      background: rgba(7, 193, 96, 0.2);
    }
  `,
  callBtnStart: css`
    display: flex;
    height: 64px;
    width: 64px;
    align-items: center;
    justify-content: center;
    border-radius: 9999px;
    border: none;
    cursor: pointer;
    background: #07c160;
    color: #fff;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    transition: transform 0.2s;
    &:hover {
      transform: scale(1.05);
    }
    &:active {
      transform: scale(0.95);
    }
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `,
  callBtnStartDisabled: css`
    background: rgba(7, 193, 96, 0.5);
  `,
  callBtnHangup: css`
    display: flex;
    height: 64px;
    width: 64px;
    align-items: center;
    justify-content: center;
    border-radius: 9999px;
    border: none;
    cursor: pointer;
    background: #fa5151;
    color: #fff;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    transition: transform 0.2s;
    &:hover {
      transform: scale(1.05);
    }
    &:active {
      transform: scale(0.95);
    }
  `,
}));
