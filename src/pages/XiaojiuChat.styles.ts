import { createStyles } from 'antd-style';

export const useStyles = createStyles(({ css, token }) => ({
  emptyRoot: css`
    display: flex;
    height: 100%;
    min-height: 0;
    flex: 1;
    align-items: center;
    justify-content: center;
    background: radial-gradient(circle at top, #f4f8ff, transparent 45%),
      linear-gradient(180deg, #fbfcfe 0%, #f5f7fb 100%);
  `,
  emptyCard: css`
    max-width: 448px;
    border-radius: 28px;
    border: 1px solid rgba(0, 0, 0, 0.05);
    background: rgba(255, 255, 255, 0.8);
    padding: 32px;
    text-align: center;
    box-shadow: 0 20px 60px rgba(15, 23, 42, 0.08);
    backdrop-filter: blur(8px);
  `,
  emptyIcon: css`
    margin: 0 auto 16px;
    display: flex;
    height: 64px;
    width: 64px;
    align-items: center;
    justify-content: center;
    border-radius: 22px;
    background: #edf4ff;
    color: #2667d8;
  `,
  emptyTitle: css`
    font-size: ${token.fontSizeSM}px;
    font-weight: 600;
    color: ${token.colorText};
  `,
  emptyDesc: css`
    margin-top: 8px;
    font-size: ${token.fontSizeSM}px;
    line-height: 24px;
    color: rgba(0, 0, 0, 0.45);
  `,
  root: css`
    display: flex;
    height: 100%;
    min-height: 0;
    flex: 1;
    flex-direction: column;
    background: linear-gradient(180deg, #fbfcfe 0%, #f6f8fc 100%);
  `,
  header: css`
    border-bottom: 1px solid rgba(0, 0, 0, 0.05);
    padding: 16px 24px;
  `,
  headerInner: css`
    margin: 0 auto;
    display: flex;
    width: 100%;
    max-width: 1024px;
    align-items: center;
    gap: 16px;
  `,
  avatar: css`
    height: 44px;
    width: 44px;
    border-radius: 16px;
    object-fit: cover;
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.05);
    flex-shrink: 0;
  `,
  avatarFallback: css`
    display: flex;
    height: 44px;
    width: 44px;
    align-items: center;
    justify-content: center;
    border-radius: 16px;
    background: #e8f2ff;
    color: #2667d8;
    flex-shrink: 0;
  `,
  headerContent: css`
    min-width: 0;
    flex: 1;
  `,
  headerTitleRow: css`
    display: flex;
    align-items: center;
    gap: 8px;
  `,
  headerTitle: css`
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: ${token.fontSizeSM}px;
    font-weight: 600;
    color: ${token.colorText};
  `,
  headerBadge: css`
    border-radius: 9999px;
    background: #e8f2ff;
    padding: 2px 8px;
    font-size: 11px;
    font-weight: 500;
    color: #2667d8;
  `,
  unreadBadge: css`
    border-radius: 9999px;
    background: #fef2f2;
    padding: 2px 8px;
    font-size: 11px;
    font-weight: 500;
    color: #d92d20;
  `,
  headerMeta: css`
    margin-top: 4px;
    font-size: 12px;
    color: rgba(0, 0, 0, 0.45);
  `,
  syncErrorBar: css`
    border-bottom: 1px solid #f5c2c7;
    background: #fff1f3;
    padding: 8px 24px;
    font-size: ${token.fontSizeSM}px;
    color: #b42318;
  `,
  syncErrorInner: css`
    margin: 0 auto;
    max-width: 1024px;
  `,
  messageList: css`
    min-height: 0;
    flex: 1;
    overflow-y: auto;
    padding: 24px;
  `,
  messageListInner: css`
    margin: 0 auto;
    display: flex;
    width: 100%;
    max-width: 1024px;
    flex-direction: column;
    gap: 20px;
  `,
  loadMoreRow: css`
    display: flex;
    justify-content: center;
    font-size: 12px;
    color: rgba(0, 0, 0, 0.45);
  `,
  loadMoreInner: css`
    display: flex;
    align-items: center;
    gap: 8px;
  `,
  emptyMessageBox: css`
    display: flex;
    min-height: 240px;
    align-items: center;
    justify-content: center;
    border-radius: 28px;
    border: 1px dashed rgba(0, 0, 0, 0.1);
    background: rgba(255, 255, 255, 0.6);
    font-size: ${token.fontSizeSM}px;
    color: rgba(0, 0, 0, 0.45);
  `,
  loadingInner: css`
    display: flex;
    align-items: center;
    gap: 8px;
  `,

  /* ---- AttachmentCard ---- */
  imageAttachment: css`
    display: block;
    overflow: hidden;
    border-radius: 16px;
    border: 1px solid rgba(0, 0, 0, 0.1);
    background: ${token.colorBgContainer};
    box-shadow: ${token.boxShadowTertiary};
    transition: transform 0.2s;
    &:hover {
      transform: scale(1.01);
    }
  `,
  imageAttachmentImg: css`
    max-height: 288px;
    width: 100%;
    object-fit: cover;
  `,
  fileAttachment: css`
    display: flex;
    align-items: center;
    gap: 12px;
    border-radius: 16px;
    border: 1px solid rgba(0, 0, 0, 0.1);
    background: ${token.colorBgContainer};
    padding: 8px 12px;
    font-size: ${token.fontSizeSM}px;
    color: rgba(0, 0, 0, 0.8);
    box-shadow: ${token.boxShadowTertiary};
  `,
  fileAttachmentIcon: css`
    display: flex;
    height: 36px;
    width: 36px;
    align-items: center;
    justify-content: center;
    border-radius: 12px;
    background: rgba(0, 0, 0, 0.05);
    flex-shrink: 0;
  `,
  fileAttachmentName: css`
    min-width: 0;
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,

  /* ---- MessageBubble ---- */
  bubbleAboveLeft: css`
    margin-bottom: 8px;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    padding: 0 4px;
    font-size: 11px;
    color: rgba(0, 0, 0, 0.45);
    justify-content: flex-start;
  `,
  bubbleAboveRight: css`
    margin-bottom: 8px;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    padding: 0 4px;
    font-size: 11px;
    color: rgba(0, 0, 0, 0.45);
    justify-content: flex-end;
  `,
  typeBadge: css`
    border-radius: 9999px;
    background: rgba(0, 0, 0, 0.05);
    padding: 2px 6px;
  `,
  avatarSelf: css`
    display: flex;
    height: 100%;
    width: 100%;
    align-items: center;
    justify-content: center;
    font-size: ${token.fontSizeSM}px;
    font-weight: 600;
    color: #2667d8;
  `,
  avatarOther: css`
    display: flex;
    height: 100%;
    width: 100%;
    align-items: center;
    justify-content: center;
    font-size: ${token.fontSizeSM}px;
    font-weight: 600;
    color: rgba(0, 0, 0, 0.7);
  `,
  attachmentGrid: css`
    margin-top: 12px;
    display: grid;
    width: 100%;
    gap: 8px;
  `,
  textMessage: css`
    white-space: pre-wrap;
    word-break: break-word;
    font-size: 14px;
    line-height: 24px;
    color: ${token.colorText};
  `,
  attachmentHint: css`
    font-size: 13px;
    color: rgba(0, 0, 0, 0.55);
  `,
  rawMessageWrap: css`
    display: flex;
    flex-direction: column;
    gap: 8px;
    text-align: left;
  `,
  rawMessageHint: css`
    font-size: 13px;
    color: rgba(0, 0, 0, 0.55);
  `,
  rawDetails: css`
    border-radius: 16px;
    background: rgba(0, 0, 0, 0.03);
    padding: 12px;
  `,
  rawSummary: css`
    cursor: pointer;
    user-select: none;
    font-size: 12px;
    color: rgba(0, 0, 0, 0.6);
  `,
  rawPre: css`
    margin-top: 8px;
    overflow-x: auto;
    white-space: pre-wrap;
    word-break: break-all;
    font-size: 11px;
    line-height: 20px;
    color: rgba(0, 0, 0, 0.7);
  `,
}));
