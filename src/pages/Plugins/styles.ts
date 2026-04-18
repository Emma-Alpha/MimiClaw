import { createStyles } from 'antd-style';

export const usePluginsStyles = createStyles(({ token, css }) => ({
  noticeBanner: css`
    margin-bottom: 24px;
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 16px 18px;
    border-radius: ${token.borderRadiusLG}px;
    border: 1px solid ${token.colorBorderSecondary};
    background: ${token.colorFillQuaternary};
    color: ${token.colorTextSecondary};
    font-size: 13px;
    line-height: 1.6;
  `,
  noticeIcon: css`
    margin-top: 2px;
    flex-shrink: 0;
    color: ${token.colorPrimary};
  `,
  sectionBlock: css`
    & + & {
      margin-top: 28px;
    }
  `,
  sectionDescription: css`
    margin-top: 6px;
    font-size: 13px;
    color: ${token.colorTextSecondary};
    line-height: 1.6;
  `,
  pluginRow: css`
    cursor: default !important;
  `,
  metaFooter: css`
    margin-top: 6px;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    min-width: 0;
    font-size: 12px;
    color: ${token.colorTextTertiary};
  `,
  pathText: css`
    display: inline-block;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: monospace;
  `,
  actionRow: css`
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 8px;
  `,
  rowActionButton: css`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    height: 34px;
    padding: 0 14px;
    border-radius: 999px;
    border: 1px solid ${token.colorBorderSecondary};
    background: transparent;
    color: ${token.colorTextSecondary};
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;

    &:hover {
      border-color: ${token.colorBorder};
      background: ${token.colorFillTertiary};
      color: ${token.colorText};
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.55;
    }
  `,
  rowActionPrimary: css`
    border-color: ${token.colorPrimaryBorder};
    background: ${token.colorPrimary};
    color: ${token.colorTextLightSolid};

    &:hover {
      border-color: ${token.colorPrimaryHover};
      background: ${token.colorPrimaryHover};
      color: ${token.colorTextLightSolid};
    }
  `,
  headerActions: css`
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
  `,
  headerButton: css`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    height: 38px;
    padding: 0 16px;
    border-radius: 999px;
    border: 1px solid ${token.colorBorderSecondary};
    background: transparent;
    color: ${token.colorTextSecondary};
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;

    &:hover {
      border-color: ${token.colorBorder};
      background: ${token.colorFillTertiary};
      color: ${token.colorText};
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.55;
    }
  `,
}));
