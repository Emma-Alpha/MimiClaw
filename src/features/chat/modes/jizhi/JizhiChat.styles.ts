import { createStyles } from 'antd-style';
import {
  CHAT_SESSION_META_FONT_SIZE,
  CHAT_SESSION_TITLE_FONT_SIZE,
} from '@/styles/typography-tokens';

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
    font-size: ${CHAT_SESSION_TITLE_FONT_SIZE}px;
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
  headerWrap: css`
    padding: 16px 24px;
  `,
  headerInner: css`
    margin: 0 auto;
    max-width: 1024px;
  `,
  headerCard: css`
    display: flex;
    align-items: center;
    gap: 16px;
    border-radius: 28px;
    border: 1px solid rgba(0, 0, 0, 0.06);
    background: rgba(255, 255, 255, 0.72);
    padding: 16px;
    box-shadow: 0 16px 44px rgba(15, 23, 42, 0.06);
    backdrop-filter: blur(12px);
  `,
  headerIcon: css`
    display: flex;
    height: 48px;
    width: 48px;
    align-items: center;
    justify-content: center;
    border-radius: 18px;
    background: linear-gradient(180deg, #eef5ff 0%, #e2eeff 100%);
    color: #2667d8;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9);
    flex-shrink: 0;
  `,
  headerContent: css`
    min-width: 0;
    flex: 1;
  `,
  headerTitleRow: css`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  `,
  headerTitle: css`
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: ${CHAT_SESSION_TITLE_FONT_SIZE}px;
    font-weight: 600;
    letter-spacing: 0.01em;
    color: ${token.colorText};
  `,
  headerBadge: css`
    border-radius: 9999px;
    background: #e8f2ff;
    padding: 4px 10px;
    font-size: ${CHAT_SESSION_META_FONT_SIZE}px;
    font-weight: 500;
    color: #2667d8;
  `,
  headerCategoryBadge: css`
    border-radius: 9999px;
    border: 1px solid rgba(0, 0, 0, 0.06);
    background: rgba(0, 0, 0, 0.03);
    padding: 4px 10px;
    font-size: ${CHAT_SESSION_META_FONT_SIZE}px;
    font-weight: 500;
    color: rgba(0, 0, 0, 0.6);
  `,
  headerMeta: css`
    margin-top: 6px;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    font-size: ${CHAT_SESSION_META_FONT_SIZE}px;
    color: rgba(0, 0, 0, 0.45);
  `,
  headerDivider: css`
    color: rgba(0, 0, 0, 0.25);
  `,
  syncError: css`
    padding: 0 24px 8px;
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
    gap: 24px;
    padding-bottom: 16px;
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
  loadingRow: css`
    display: flex;
    align-items: center;
    gap: 8px;
  `,
  composerWrap: css`
    border-top: 1px solid rgba(0, 0, 0, 0.05);
    padding: 16px 24px;
  `,
  composerInner: css`
    margin: 0 auto;
    display: flex;
    width: 100%;
    max-width: 800px;
    flex-direction: column;
    gap: 12px;
  `,

  /* ---- UserBubble ---- */
  userAvatarText: css`
    display: flex;
    height: 100%;
    width: 100%;
    align-items: center;
    justify-content: center;
    font-size: ${token.fontSizeSM}px;
    font-weight: 600;
    color: #2667d8;
  `,
  userAbove: css`
    margin-bottom: 8px;
    display: flex;
    justify-content: flex-end;
    padding: 0 4px;
    font-size: 11px;
    color: rgba(75, 110, 168, 0.7);
  `,

  /* ---- AssistantBubble ---- */
  assistantGroupWrap: css`
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 100%;
  `,
  assistantAvatarText: css`
    display: flex;
    height: 100%;
    width: 100%;
    align-items: center;
    justify-content: center;
    font-size: ${token.fontSizeSM}px;
    font-weight: 600;
    color: rgba(0, 0, 0, 0.75);
  `,
  assistantAbove: css`
    margin-bottom: 8px;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    padding: 0 4px;
    font-size: 11px;
    color: rgba(0, 0, 0, 0.45);
  `,
  assistantStatusBadge: css`
    border-radius: 9999px;
    background: rgba(0, 0, 0, 0.05);
    padding: 2px 6px;
  `,
  assistantActions: css`
    margin-left: 48px;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    padding-top: 4px;
  `,
  versionSwitcher: css`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    border-radius: 9999px;
    background: rgba(0, 0, 0, 0.05);
    padding: 4px;
  `,
  versionBtn: css`
    display: flex;
    height: 28px;
    min-width: 28px;
    align-items: center;
    justify-content: center;
    border-radius: 9999px;
    padding: 0 8px;
    font-size: 11px;
    transition: all 0.2s;
    border: none;
    background: transparent;
    cursor: pointer;
    color: rgba(0, 0, 0, 0.55);
    &:hover {
      color: ${token.colorText};
    }
  `,
  versionBtnActive: css`
    background: #ffffff;
    color: ${token.colorText};
    box-shadow: ${token.boxShadowTertiary};
  `,

  /* ---- MessageRow ---- */
  assistantMessageGroup: css`
    display: flex;
    flex-direction: column;
    gap: 16px;
  `,
}));
