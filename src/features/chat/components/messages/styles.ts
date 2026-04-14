import { createStyles } from 'antd-style';

export const useMessageStyles = createStyles(({ token, css }) => ({
  messageRow: css`
    display: flex;
    gap: 12px;
    position: relative;
  `,
  messageRowUser: css`
    flex-direction: row-reverse;
  `,
  assistantItem: css`
    width: 100%;
  `,
  contentCol: css`
    display: flex;
    flex-direction: column;
    width: 100%;
    min-width: 0;
    max-width: 80%;
    gap: 8px;
  `,
  contentColUser: css`
    align-items: flex-end;
  `,
  contentColAssistant: css`
    align-items: flex-start;
  `,
  assistantSection: css`
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 100%;
  `,
  mediaRow: css`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  `,
  assistantRender: css`
    position: relative;
    min-height: 1.5em;
  `,
  bubbleUser: css`
    position: relative;
    border-radius: 16px;
    padding: 12px 16px;
    background: #f3f4f6;
    color: ${token.colorText};
    word-break: break-word;
    font-size: var(--mimi-font-size-base);
    white-space: pre-wrap;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
  `,
  bubbleAssistant: css`
    position: relative;
    border-radius: 16px;
    padding: 12px 16px;
    background: #ffffff;
    color: ${token.colorText};
    width: 100%;
    word-break: break-word;
    font-size: var(--mimi-font-size-base);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
    border: 1px solid rgba(0, 0, 0, 0.04);
  `,
  toolCard: css`
    border-radius: ${token.borderRadiusLG}px;
    border: 1px solid ${token.colorBorderSecondary};
    background: ${token.colorFillQuaternary};
    font-size: var(--mimi-font-size-base);
    overflow: hidden;
  `,
  toolCardHeader: css`
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 6px 12px;
    color: ${token.colorTextSecondary};
    cursor: pointer;
    background: none;
    border: none;
    transition: color 0.2s;

    &:hover {
      color: ${token.colorText};
    }
  `,
  toolCardBody: css`
    padding: 0 12px 8px;
    font-size: var(--mimi-font-size-sm);
    color: ${token.colorTextSecondary};
    overflow-x: auto;
  `,
  toolStatusBar: css`
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 4px;
  `,
  toolStatusItem: css`
    display: flex;
    align-items: center;
    gap: 8px;
    border-radius: ${token.borderRadius}px;
    border: 1px solid ${token.colorBorderSecondary};
    padding: 6px 12px;
    font-size: var(--mimi-font-size-sm);
    transition: background 0.2s;
  `,
  toolStatusRunning: css`
    border-color: ${token.colorPrimaryBorder};
    background: ${token.colorPrimaryBg};
    color: ${token.colorText};
  `,
  toolStatusDone: css`
    border-color: ${token.colorBorderSecondary};
    background: ${token.colorFillQuaternary};
    color: ${token.colorTextSecondary};
  `,
  toolStatusError: css`
    border-color: ${token.colorErrorBorder};
    background: ${token.colorErrorBg};
    color: ${token.colorError};
  `,
  fileCard: css`
    display: flex;
    align-items: center;
    gap: 12px;
    border-radius: ${token.borderRadiusLG}px;
    border: 1px solid ${token.colorBorderSecondary};
    padding: 8px 12px;
    background: ${token.colorFillQuaternary};
    max-width: 220px;
    cursor: pointer;
    transition: background 0.2s;

    &:hover {
      background: ${token.colorFillTertiary};
    }
  `,
  imageThumbnail: css`
    position: relative;
    width: 144px;
    height: 144px;
    border-radius: ${token.borderRadiusLG}px;
    border: 1px solid ${token.colorBorderSecondary};
    overflow: hidden;
    cursor: zoom-in;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .overlay {
      position: absolute;
      inset: 0;
      background: transparent;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s;

      svg {
        opacity: 0;
        color: white;
        transition: opacity 0.2s;
      }
    }

    &:hover .overlay {
      background: rgba(0, 0, 0, 0.25);

      svg {
        opacity: 1;
      }
    }
  `,
  imagePreviewCard: css`
    position: relative;
    max-width: 320px;
    border-radius: ${token.borderRadiusLG}px;
    border: 1px solid ${token.colorBorderSecondary};
    overflow: hidden;
    cursor: zoom-in;

    img {
      display: block;
      width: 100%;
    }

    .overlay {
      position: absolute;
      inset: 0;
      background: transparent;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s;

      svg {
        opacity: 0;
        color: white;
        transition: opacity 0.2s;
      }
    }

    &:hover .overlay {
      background: rgba(0, 0, 0, 0.2);

      svg {
        opacity: 1;
      }
    }
  `,
  streamCursor: css`
    display: inline-block;
    width: 8px;
    height: 16px;
    background: ${token.colorTextSecondary};
    opacity: 0.5;
    margin-left: 2px;
    animation: blink 1s step-end infinite;

    @keyframes blink {
      50% {
        opacity: 0;
      }
    }
  `,
  videoItem: css`
    position: relative;
    max-width: 320px;
    border-radius: ${token.borderRadiusLG}px;
    border: 1px solid ${token.colorBorderSecondary};
    overflow: hidden;
    background: ${token.colorFillQuaternary};

    video {
      display: block;
      width: 100%;
      max-height: 280px;
      object-fit: contain;
      background: #000;
    }
  `,
  videoFooter: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 5px 10px;
    border-top: 1px solid ${token.colorBorderSecondary};
  `,
  videoFileName: css`
    font-size: var(--mimi-font-size-xs);
    color: ${token.colorTextSecondary};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  `,
  videoFolderBtn: css`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    padding: 2px;
    color: ${token.colorTextTertiary};
    background: none;
    border: none;
    cursor: pointer;
    border-radius: ${token.borderRadius}px;
    transition: color 0.15s;

    &:hover {
      color: ${token.colorTextSecondary};
    }
  `,
  videoPlaceholder: css`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    height: 120px;
    color: ${token.colorTextTertiary};
    font-size: var(--mimi-font-size-sm);
  `,
  toolInputSummary: css`
    font-size: var(--mimi-font-size-xs);
    opacity: 0.5;
    font-family: monospace;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 200px;
  `,
  toolResultCard: css`
    border-radius: ${token.borderRadius}px;
    border: 1px dashed ${token.colorBorderSecondary};
    background: transparent;
    overflow: hidden;
  `,
  toolResultCardError: css`
    border-color: ${token.colorErrorBorder};
  `,
  toolResultHeader: css`
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    padding: 4px 10px;
    color: ${token.colorTextTertiary};
    background: none;
    border: none;
    text-align: left;
    transition: color 0.15s;

    &:hover {
      color: ${token.colorTextSecondary};
    }
  `,
  toolResultBody: css`
    padding: 0 10px 6px;
    font-size: var(--mimi-font-size-xs);
    color: ${token.colorTextTertiary};
    overflow-x: auto;
    max-height: 400px;
    overflow-y: auto;
    white-space: pre-wrap;
    word-break: break-word;
    margin: 0;
    line-height: 1.5;
    border-top: 1px dashed ${token.colorBorderSecondary};
  `,
}));
