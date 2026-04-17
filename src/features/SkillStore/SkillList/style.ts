import { createStyles } from 'antd-style';

export const useSkillStoreListStyles = createStyles(({ token, css }) => ({
  grid: css`
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    min-width: 0;
    box-sizing: border-box;
    gap: 12px;
    padding: 0 16px 16px;
    @media (max-width: 900px) {
      grid-template-columns: 1fr;
    }
  `,
  itemTitle: css`
    cursor: pointer;
    overflow: hidden;
    font-size: 14px;
    font-weight: 500;
    color: ${token.colorText};
    text-overflow: ellipsis;
    white-space: nowrap;
    &:hover {
      color: ${token.colorPrimary};
    }
  `,
  itemDescription: css`
    overflow: hidden;
    font-size: 12px;
    color: ${token.colorTextSecondary};
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  itemBadge: css`
    display: inline-flex;
    align-items: center;
    height: 20px;
    padding: 0 8px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 500;
    color: ${token.colorPrimary};
    background: ${token.colorPrimaryBg};
  `,
  listContainer: css`
    width: 100%;
    min-width: 0;
    box-sizing: border-box;
    overflow: auto;
    height: 60vh;
  `,
  emptyWrap: css`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 40px;
    color: ${token.colorTextSecondary};
  `,
  errorWrap: css`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 40px;
    color: ${token.colorError};
  `,
}));
