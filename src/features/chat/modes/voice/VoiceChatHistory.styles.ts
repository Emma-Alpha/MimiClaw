import { createStyles } from 'antd-style';
import {
  CHAT_SESSION_META_FONT_SIZE,
  CHAT_SESSION_TITLE_FONT_SIZE,
} from '@/styles/typography-tokens';

export const useStyles = createStyles(({ css, token }) => ({
  root: css`
    display: flex;
    height: 100%;
    flex-direction: column;
    background: radial-gradient(circle at top, rgba(40, 72, 110, 0.16), transparent 42%),
      linear-gradient(180deg, rgba(248, 250, 252, 0.98), rgba(241, 245, 249, 0.94));
    padding: 32px;
  `,
  container: css`
    margin: 0 auto;
    display: flex;
    height: 100%;
    width: 100%;
    max-width: 896px;
    flex-direction: column;
    overflow: hidden;
    border-radius: 32px;
    border: 1px solid rgba(0, 0, 0, 0.05);
    background: rgba(255, 255, 255, 0.8);
    box-shadow: 0 24px 80px rgba(15, 23, 42, 0.08);
    backdrop-filter: blur(8px);
  `,
  headerSection: css`
    border-bottom: 1px solid rgba(226, 232, 240, 0.8);
    padding: 24px 32px;
  `,
  headerRow: css`
    display: flex;
    align-items: center;
    gap: 12px;
  `,
  headerIcon: css`
    display: flex;
    height: 48px;
    width: 48px;
    align-items: center;
    justify-content: center;
    border-radius: 16px;
    background: #0f172a;
    color: #fff;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    flex-shrink: 0;
  `,
  headerContent: css`
    min-width: 0;
  `,
  headerTitle: css`
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: ${CHAT_SESSION_TITLE_FONT_SIZE}px;
    font-weight: 600;
    color: #0f172a;
  `,
  headerDesc: css`
    margin-top: 4px;
    font-size: ${token.fontSizeSM}px;
    color: #64748b;
  `,
  metaRow: css`
    margin-top: 16px;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    font-size: ${CHAT_SESSION_META_FONT_SIZE}px;
    color: #64748b;
  `,
  metaBadge: css`
    border-radius: 9999px;
    background: #f1f5f9;
    padding: 4px 12px;
  `,
  body: css`
    flex: 1;
    overflow-y: auto;
    padding: 24px 32px;
  `,
  emptyBox: css`
    display: flex;
    height: 100%;
    align-items: center;
    justify-content: center;
    border-radius: 28px;
    border: 1px dashed #cbd5e1;
    background: rgba(248, 250, 252, 0.8);
    font-size: ${token.fontSizeSM}px;
    color: #64748b;
  `,
  loadingBox: css`
    border-radius: 28px;
    border: 1px solid #e2e8f0;
    background: rgba(255, 255, 255, 0.7);
    padding: 20px 24px;
    font-size: ${token.fontSizeSM}px;
    color: #64748b;
  `,
  errorBox: css`
    border-radius: 28px;
    border: 1px solid #fecdd3;
    background: #fff1f2;
    padding: 20px 24px;
    font-size: ${token.fontSizeSM}px;
    color: #be123c;
  `,
  groupList: css`
    display: flex;
    flex-direction: column;
    gap: 24px;
  `,
  groupSection: css`
    border-radius: 28px;
    border: 1px solid rgba(226, 232, 240, 0.8);
    background: rgba(255, 255, 255, 0.8);
    padding: 20px;
    box-shadow: 0 12px 40px rgba(15, 23, 42, 0.05);
  `,
  groupLabel: css`
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.18em;
    color: #94a3b8;
  `,
  messageList: css`
    display: flex;
    flex-direction: column;
    gap: 16px;
  `,
  messageUser: css`
    border-radius: 24px;
    padding: 12px 16px;
    background: #020617;
    color: #fff;
  `,
  messageAssistant: css`
    border-radius: 24px;
    padding: 12px 16px;
    background: #f1f5f9;
    color: #0f172a;
  `,
  messageMeta: css`
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
  `,
  roleChipUser: css`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    border-radius: 9999px;
    padding: 4px 10px;
    background: rgba(255, 255, 255, 0.12);
    color: rgba(255, 255, 255, 0.88);
  `,
  roleChipAssistant: css`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    border-radius: 9999px;
    padding: 4px 10px;
    background: #fff;
    color: #475569;
  `,
  timeUser: css`
    color: rgba(255, 255, 255, 0.6);
  `,
  timeAssistant: css`
    color: #94a3b8;
  `,
  messageText: css`
    white-space: pre-wrap;
    font-size: 14px;
    line-height: 28px;
  `,
}));
