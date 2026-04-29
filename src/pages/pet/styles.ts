import { createStyles } from 'antd-style';

export const useStyles = createStyles(({ css }) => ({
  root: css`
    position: relative;
    display: flex;
    height: 100vh;
    width: 100vw;
    align-items: flex-end;
    justify-content: center;
    overflow: visible;
    background: transparent;
  `,
  interactiveArea: css`
    position: relative;
    z-index: 10;
    cursor: pointer;
    border: none;
    background: transparent;
    padding: 0;
    user-select: none;
  `,
  thinkingBubble: css`
    pointer-events: none;
    position: absolute;
    top: 16%;
    left: 50%;
    z-index: 20;
    display: flex;
    height: 34px;
    min-width: 120px;
    transform: translateX(-50%) scale(0.65);
    transform-origin: center bottom;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    border-radius: 9999px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    padding: 0 16px;
    font-size: 14px;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.6);
    box-shadow: 0 6px 24px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.04);
    backdrop-filter: blur(24px);
  `,
  thinkingBubbleText: css`
    position: relative;
    z-index: 10;
  `,
  thinkingBubbleShimmer: css`
    position: absolute;
    inset: 0;
  `,
  recordingBubble: css`
    pointer-events: auto;
    position: absolute;
    top: 16%;
    left: 50%;
    z-index: 20;
    display: flex;
    transform: translateX(-50%) scale(0.65);
    transform-origin: center bottom;
    align-items: center;
    gap: 4px;
    border-radius: 9999px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    padding: 4px;
    box-shadow: 0 6px 24px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.04);
    backdrop-filter: blur(24px);
  `,
  recordingCancelBtn: css`
    display: flex;
    height: 24px;
    width: 24px;
    align-items: center;
    justify-content: center;
    border-radius: 9999px;
    border: none;
    background: rgba(255, 255, 255, 0.22);
    color: rgba(255, 255, 255, 0.9);
    cursor: pointer;
    transition: all 0.15s;
    &:hover {
      background: rgba(255, 255, 255, 0.35);
      color: #fff;
    }
  `,
  recordingInner: css`
    display: flex;
    min-width: 0;
    align-items: center;
    gap: 8px;
    padding: 0 4px;
  `,
  recordingTranscript: css`
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 13px;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.8);
  `,
  recordingConfirmBtn: css`
    display: flex;
    height: 24px;
    width: 24px;
    align-items: center;
    justify-content: center;
    border-radius: 9999px;
    border: none;
    background: #fff;
    color: #111;
    cursor: pointer;
    transition: all 0.15s;
    &:hover {
      background: #e8e8e8;
    }
  `,
  waveformCanvas: css`
    display: block;
    height: 24px;
    width: 56px;
    flex-shrink: 0;
  `,
  petVideo: css`
    height: 200px;
    width: 200px;
    object-fit: contain;
    pointer-events: none;
  `,
}));
