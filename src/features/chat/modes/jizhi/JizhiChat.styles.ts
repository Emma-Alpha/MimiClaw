import { createStyles } from 'antd-style';
import { CHAT_HEADER_HEIGHT } from '@/lib/titlebar-safe-area';
import {
  CODEX_COMPOSER_BOTTOM_PADDING,
  CODEX_COMPOSER_HIGHLIGHT,
  CODEX_COMPOSER_HORIZONTAL_PADDING,
  CODEX_COMPOSER_MIN_HEIGHT,
  CODEX_COMPOSER_RADIUS,
  CODEX_COMPOSER_SUPERELLIPSE_RADIUS,
  CODEX_COMPOSER_TOP_PADDING,
} from '@/features/mainChat/lib/composer-shell';
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
    --jizhi-header-bg: color-mix(
      in srgb,
      ${token.colorBgContainer} 86%,
      transparent
    );
    --jizhi-header-title-color: color-mix(
      in srgb,
      ${token.colorText} 78%,
      ${token.colorTextSecondary}
    );
    display: flex;
    height: 100%;
    min-height: 0;
    flex: 1;
    flex-direction: column;
    background:
      radial-gradient(circle at top, ${token.colorPrimaryBg} 0%, transparent 48%),
      linear-gradient(
        180deg,
        color-mix(in srgb, ${token.colorBgContainer} 96%, ${token.colorFillQuaternary}) 0%,
        color-mix(in srgb, ${token.colorBgContainer} 92%, ${token.colorFillTertiary}) 100%
      );
  `,
  headerWrap: css`
    background: var(--jizhi-header-bg);
    backdrop-filter: saturate(160%) blur(18px);
    -webkit-backdrop-filter: saturate(160%) blur(18px);
    position: relative;
    overflow: visible;
    z-index: 10;

    &::after {
      content: "";
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      height: 32px;
      background: linear-gradient(to bottom, var(--jizhi-header-bg) 0%, transparent 100%);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      mask-image: linear-gradient(to bottom, black 0%, transparent 100%);
      -webkit-mask-image: linear-gradient(to bottom, black 0%, transparent 100%);
      pointer-events: none;
    }
  `,
  headerInner: css`
    margin: 0 auto;
    max-width: 1024px;
    min-height: ${CHAT_HEADER_HEIGHT}px;
    display: flex;
    align-items: center;
    padding: 0 16px;
  `,
  headerCard: css`
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    min-width: 0;
  `,
  headerIcon: css`
    display: flex;
    height: 32px;
    width: 32px;
    align-items: center;
    justify-content: center;
    border-radius: 12px;
    background: linear-gradient(
      180deg,
      color-mix(in srgb, ${token.colorPrimaryBg} 88%, white) 0%,
      color-mix(in srgb, ${token.colorPrimaryBg} 72%, ${token.colorFillSecondary}) 100%
    );
    color: #2667d8;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.86);
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
    font-weight: 480;
    line-height: 1.1;
    letter-spacing: 0;
    color: var(--jizhi-header-title-color);
  `,
  headerBadge: css`
    border-radius: 9999px;
    background: color-mix(in srgb, ${token.colorPrimary} 12%, transparent);
    padding: 3px 8px;
    font-size: ${CHAT_SESSION_META_FONT_SIZE}px;
    font-weight: 500;
    color: #2667d8;
  `,
  headerCategoryBadge: css`
    border-radius: 9999px;
    border: 1px solid color-mix(in srgb, ${token.colorText} 8%, transparent);
    background: color-mix(in srgb, ${token.colorText} 4%, transparent);
    padding: 3px 8px;
    font-size: ${CHAT_SESSION_META_FONT_SIZE}px;
    font-weight: 500;
    color: ${token.colorTextSecondary};
  `,
  headerMeta: css`
    margin-top: 6px;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    font-size: ${CHAT_SESSION_META_FONT_SIZE}px;
    color: ${token.colorTextSecondary};
  `,
  headerDivider: css`
    color: ${token.colorTextQuaternary};
  `,
  headerActionButton: css`
    border-radius: 9999px !important;
    gap: 8px;
    border: none !important;
    box-shadow: none !important;
    background: transparent !important;
    color: ${token.colorTextSecondary} !important;

    &:hover:not(:disabled),
    &:focus-visible:not(:disabled) {
      color: ${token.colorText} !important;
      background: color-mix(in srgb, ${token.colorText} 8%, transparent) !important;
    }
  `,
  syncError: css`
    padding: 0 16px 8px;
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
    padding: 24px 16px;
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
    padding: 10px 16px 12px;
  `,
  composerInner: css`
    margin: 0 auto;
    display: flex;
    width: 100%;
    max-width: 800px;
    flex-direction: column;
    gap: 6px;
  `,
  composerShell: css`
    border-radius: ${CODEX_COMPOSER_RADIUS}px !important;
    padding: ${CODEX_COMPOSER_TOP_PADDING}px ${CODEX_COMPOSER_HORIZONTAL_PADDING}px ${CODEX_COMPOSER_BOTTOM_PADDING}px !important;
    min-height: ${CODEX_COMPOSER_MIN_HEIGHT}px !important;
    background: ${token.colorBgContainer} !important;
    border-color: transparent !important;
    box-shadow:
      ${CODEX_COMPOSER_HIGHLIGHT},
      0 0 0 0.5px var(--composer-ring-color, ${token.colorBorder}) !important;

    @supports (corner-shape: superellipse(1.5)) {
      border-radius: ${CODEX_COMPOSER_SUPERELLIPSE_RADIUS}px !important;
      corner-shape: superellipse(1.5);
    }

    &:focus-within {
      border-color: transparent !important;
      box-shadow:
        ${CODEX_COMPOSER_HIGHLIGHT},
        0 0 0 0.5px var(
          --composer-ring-color-focus,
          var(--composer-ring-color, ${token.colorBorder})
        ) !important;
    }
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
