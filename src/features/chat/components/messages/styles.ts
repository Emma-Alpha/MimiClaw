import { createStyles } from 'antd-style';

export const useMessageStyles = createStyles(({ token, css }) => {
  const unifiedCardRadius = token.borderRadiusLG + 2;
  const unifiedCardBorder = token.colorBorderSecondary;
  const unifiedCardBackground = token.colorBgContainer;
  const unifiedCardBackgroundHover = token.colorFillQuaternary;

  return {
  chatItem: css`
    width: 100%;
    animation: chatSlideIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    transform-origin: bottom center;

    @keyframes chatSlideIn {
      0% {
        opacity: 0;
        transform: translateY(12px) scale(0.98);
      }
      100% {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }
  `,
  assistantChatItem: css`
    :global {
      .lobe-chat-item {
        width: 100%;
        gap: 8px !important;
        padding: 8px 0 !important;
        align-items: flex-start !important;
      }

      .lobe-chat-item-message {
        margin-left: 0 !important;
        margin-right: 0 !important;
        align-items: flex-start !important;
        gap: 12px !important;
        width: 100%;
      }

      .lobe-chat-item-message-item {
        width: 100% !important;
        max-width: 100% !important;
        padding: 0 !important;
        background: transparent !important;
        border: none !important;
        box-shadow: none !important;
      }
    }
  `,
  userChatItem: css`
    :global {
      .lobe-chat-item {
        width: 100%;
        gap: 6px !important;
        padding: 8px 0 !important;
      }

      .lobe-chat-item-message {
        margin-left: 0 !important;
        margin-right: 0 !important;
        align-items: flex-end !important;
        gap: 6px !important;
      }
    }
  `,
  userTurn: css`
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 6px;
  `,
  userMediaSection: css`
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 8px;
  `,
  userMediaSectionWithText: css`
    margin-bottom: 6px;
  `,
  userMediaRow: css`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: flex-end;
  `,
  userMessageText: css`
    font-size: 13px;
    line-height: 1.5;
    color: ${token.colorText};
    white-space: pre-wrap;
    word-break: break-word;
  `,
  messageMetaRow: css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin: 0 0 8px 2px;
    min-height: 20px;
  `,
  messageMetaAvatar: css`
    border-radius: 999px;
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: ${token.colorBgContainer};
  `,
  messageMetaLabel: css`
    font-size: var(--mimi-font-size-sm);
    font-weight: var(--mimi-font-weight-semibold);
    letter-spacing: 0.01em;
    color: ${token.colorTextSecondary};
  `,
  messageMetaDot: css`
    font-size: var(--mimi-font-size-xs);
    color: ${token.colorTextQuaternary};
  `,
  messageMetaTime: css`
    font-size: var(--mimi-font-size-xs);
    color: ${token.colorTextTertiary};
    font-variant-numeric: tabular-nums;
  `,
  messageMetaStreaming: css`
    font-size: var(--mimi-font-size-xs);
    font-weight: var(--mimi-font-weight-medium);
    padding: 2px 7px;
    border-radius: 999px;
    color: ${token.colorPrimary};
    background: ${token.colorPrimaryBg};
  `,
  userAvatar: css`
    width: 20px;
    height: 20px;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: 600;
    color: ${token.colorTextSecondary};
    border: 1px solid ${token.colorBorderSecondary};
    background: ${token.colorBgElevated};
  `,
  assistantRender: css`
    position: relative;
    min-height: 1.5em;
    width: 100%;
    max-width: 100%;
    font-size: var(--mimi-font-size-base);
    line-height: var(--mimi-line-height-relaxed);
    color: ${token.colorText};
    overflow-wrap: anywhere;
    word-break: break-word;

    > *:first-child {
      margin-top: 0 !important;
    }

    > *:last-child {
      margin-bottom: 0 !important;
    }

    p {
      margin: 0;
    }

    p + p {
      margin-top: 0.9em;
    }

    h1,
    h2,
    h3,
    h4 {
      margin-top: 1.35em;
      margin-bottom: 0.55em;
      line-height: var(--mimi-line-height-base);
      font-weight: var(--mimi-font-weight-semibold);
      letter-spacing: -0.01em;
      color: ${token.colorText};
    }

    h1 {
      font-size: var(--mimi-font-size-xl);
    }

    h2 {
      font-size: calc(var(--mimi-font-size-lg) + 1px);
    }

    h3 {
      font-size: var(--mimi-font-size-lg);
    }

    h4 {
      font-size: var(--mimi-font-size-base);
    }

    ul,
    ol {
      margin: 0.45em 0 0;
      padding-left: 1.35em;
    }

    li {
      margin: 0.22em 0;
      padding-left: 0.1em;
    }

    li > ul,
    li > ol {
      margin-top: 0.35em;
    }

    blockquote {
      margin: 1em 0;
      padding: 0.2em 0 0.2em 1em;
      border-left: 3px solid ${token.colorBorderSecondary};
      color: ${token.colorTextSecondary};
    }

    hr {
      margin: 1.1em 0;
      border: 0;
      border-top: 1px solid ${token.colorBorderSecondary};
    }

    a {
      color: ${token.colorPrimary};
    }

    strong {
      font-weight: var(--mimi-font-weight-semibold);
    }

    pre {
      margin: 1em 0 !important;
      border-radius: ${token.borderRadiusLG}px;
      overflow: hidden;
    }

    :not(pre) > code {
      padding: 0.15em 0.4em;
      border-radius: ${token.borderRadiusSM}px;
      background: ${token.colorFillTertiary};
      font-family: ${token.fontFamilyCode};
      font-size: 0.92em;
    }

    table {
      margin: 1em 0;
      width: 100%;
      display: block;
      overflow-x: auto;
    }
  `,
  mediaRow: css`
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: flex-start;
  `,
  mediaPlaceholder: css`
    width: 152px;
    height: 152px;
    border-radius: ${unifiedCardRadius}px;
    border: 1px dashed ${unifiedCardBorder};
    background: ${unifiedCardBackgroundHover};
    display: flex;
    align-items: center;
    justify-content: center;
    color: ${token.colorTextTertiary};
  `,
  assistantSection: css`
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 100%;
  `,
  assistantToolStack: css`
    display: flex;
    flex-direction: column;
    gap: 6px;
    width: 100%;
  `,
  activityElapsed: css`
    font-size: var(--mimi-font-size-sm);
    color: ${token.colorTextTertiary};
  `,
  assistantActions: css`
    display: flex;
    align-items: center;
    opacity: 0.92;

    :global(button) {
      border-radius: 999px !important;
      color: ${token.colorTextSecondary} !important;
      transition: background 0.18s ease, color 0.18s ease, transform 0.18s ease;
    }

    :global(button:hover) {
      color: ${token.colorText} !important;
      background: ${token.colorFillTertiary} !important;
      transform: translateY(-1px);
    }
  `,
  toolCard: css`
    border-radius: ${unifiedCardRadius}px;
    border: 1px solid ${unifiedCardBorder};
    background: ${unifiedCardBackground};
    overflow: hidden;
  `,
  toolCardHeader: css`
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 8px 12px;
    color: ${token.colorTextSecondary};
    cursor: pointer;
    background: none;
    border: none;
    text-align: left;
    transition: color 0.2s ease, background 0.2s ease;

    &:hover {
      color: ${token.colorText};
      background: ${unifiedCardBackgroundHover};
    }
  `,
  toolLabel: css`
    font-family: ${token.fontFamilyCode};
    font-size: var(--mimi-font-size-sm);
    font-weight: var(--mimi-font-weight-medium);
  `,
  toolCardBody: css`
    margin: 0;
    padding: 0 12px 12px;
    border-top: 1px solid ${unifiedCardBorder};
    background: ${unifiedCardBackgroundHover};
    font-family: ${token.fontFamilyCode};
    font-size: var(--mimi-font-size-xs);
    line-height: var(--mimi-line-height-relaxed);
    color: ${token.colorTextSecondary};
    overflow-x: auto;
    white-space: pre-wrap;
    word-break: break-word;
  `,
  toolStatusBar: css`
    width: 100%;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  `,
  toolStatusItem: css`
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    max-width: 100%;
    padding: 6px 10px;
    border-radius: 999px;
    border: 1px solid ${unifiedCardBorder};
    background: ${unifiedCardBackground};
    font-size: var(--mimi-font-size-sm);
    transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
  `,
  toolStatusRunning: css`
    border-color: ${token.colorPrimaryBorder};
    background: ${token.colorPrimaryBg};
    color: ${token.colorText};
  `,
  toolStatusDone: css`
    border-color: ${unifiedCardBorder};
    background: ${unifiedCardBackground};
    color: ${token.colorTextSecondary};
  `,
  toolStatusError: css`
    border-color: ${token.colorErrorBorder};
    background: ${token.colorErrorBg};
    color: ${token.colorError};
  `,
  toolStatusText: css`
    font-size: var(--mimi-font-size-sm);
    font-weight: var(--mimi-font-weight-medium);
    white-space: nowrap;
  `,
  toolStatusDuration: css`
    font-size: var(--mimi-font-size-xs);
    color: ${token.colorTextTertiary};
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  `,
  toolStatusSummary: css`
    font-size: var(--mimi-font-size-xs);
    color: ${token.colorTextSecondary};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  fileCard: css`
    display: flex;
    align-items: center;
    gap: 12px;
    border-radius: ${unifiedCardRadius}px;
    border: 1px solid ${unifiedCardBorder};
    padding: 9px 12px;
    background: ${unifiedCardBackground};
    max-width: 260px;
    cursor: pointer;
    transition: border-color 0.18s ease, background 0.18s ease;

    &:hover {
      border-color: ${token.colorBorder};
      background: ${unifiedCardBackgroundHover};
    }
  `,
  fileCardMeta: css`
    min-width: 0;
    overflow: hidden;
  `,
  fileCardName: css`
    font-size: var(--mimi-font-size-sm);
    font-weight: var(--mimi-font-weight-medium);
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: ${token.colorText};
  `,
  fileCardSize: css`
    font-size: var(--mimi-font-size-2xs);
    margin: 2px 0 0;
    color: ${token.colorTextTertiary};
  `,
  imageThumbnail: css`
    position: relative;
    width: 152px;
    height: 152px;
    border-radius: ${unifiedCardRadius}px;
    border: 1px solid ${unifiedCardBorder};
    overflow: hidden;
    cursor: zoom-in;
    background: ${unifiedCardBackground};

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
      transition: background 0.2s ease;

      svg {
        opacity: 0;
        color: white;
        transition: opacity 0.2s ease;
      }
    }

    &:hover .overlay {
      background: rgba(0, 0, 0, 0.22);

      svg {
        opacity: 1;
      }
    }
  `,
  imagePreviewCard: css`
    position: relative;
    max-width: 360px;
    border-radius: ${unifiedCardRadius}px;
    border: 1px solid ${unifiedCardBorder};
    overflow: hidden;
    cursor: zoom-in;
    background: ${unifiedCardBackground};

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
      transition: background 0.2s ease;

      svg {
        opacity: 0;
        color: white;
        transition: opacity 0.2s ease;
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
    width: 2px;
    height: 1em;
    background: ${token.colorTextTertiary};
    opacity: 0.75;
    margin-left: 2px;
    vertical-align: text-bottom;
    animation: blink 1s step-end infinite;

    @keyframes blink {
      50% {
        opacity: 0;
      }
    }
  `,
  videoList: css`
    display: flex;
    flex-direction: column;
    gap: 10px;
  `,
  videoItem: css`
    position: relative;
    max-width: 360px;
    border-radius: ${unifiedCardRadius}px;
    border: 1px solid ${unifiedCardBorder};
    overflow: hidden;
    background: ${unifiedCardBackground};

    video {
      display: block;
      width: 100%;
      max-height: 300px;
      object-fit: contain;
      background: #000;
    }
  `,
  videoFooter: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 8px 12px;
    border-top: 1px solid ${token.colorBorderSecondary};
    background: ${token.colorFillQuaternary};
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
    width: 24px;
    height: 24px;
    color: ${token.colorTextTertiary};
    background: none;
    border: none;
    cursor: pointer;
    border-radius: 999px;
    transition: color 0.15s ease, background 0.15s ease;

    &:hover {
      color: ${token.colorText};
      background: ${token.colorFillSecondary};
    }
  `,
  videoPlaceholder: css`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    height: 132px;
    color: ${token.colorTextTertiary};
    font-size: var(--mimi-font-size-sm);
    background: ${token.colorFillQuaternary};
  `,
  toolInputSummary: css`
    font-size: var(--mimi-font-size-xs);
    color: ${token.colorTextTertiary};
    font-family: ${token.fontFamilyCode};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 220px;
  `,
  toolResultCard: css`
    border-radius: ${unifiedCardRadius}px;
    border: 1px solid ${unifiedCardBorder};
    background: ${unifiedCardBackground};
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
    padding: 8px 12px;
    color: ${token.colorTextSecondary};
    background: none;
    border: none;
    text-align: left;
    transition: color 0.15s ease, background 0.15s ease;

    &:hover {
      color: ${token.colorText};
      background: ${unifiedCardBackgroundHover};
    }
  `,
  toolResultBody: css`
    padding: 10px 12px 12px;
    font-family: ${token.fontFamilyCode};
    font-size: var(--mimi-font-size-xs);
    color: ${token.colorTextSecondary};
    overflow-x: auto;
    max-height: 400px;
    overflow-y: auto;
    white-space: pre-wrap;
    word-break: break-word;
    margin: 0;
    line-height: var(--mimi-line-height-relaxed);
    border-top: 1px solid ${unifiedCardBorder};
    background: ${unifiedCardBackgroundHover};
  `,
  };
});
