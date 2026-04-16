import { createStyles } from 'antd-style';

export const useStyles = createStyles(({ css, token }) => ({
  root: css`
    display: flex;
    height: 100%;
    min-height: 0;
    width: 100%;
    flex: 1;
    flex-direction: column;
    background: ${token.colorBgContainer};
  `,
  webview: css`
    min-height: 0;
    flex: 1;
    width: 100%;
    border: none;
    display: flex;
  `,
}));
