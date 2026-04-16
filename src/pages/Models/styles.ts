import { createStyles } from 'antd-style';

export const useModelsStyles = createStyles(({ token, css }) => ({
  pageRoot: css`
    display: flex;
    flex-direction: column;
    margin: -24px;
    height: calc(100vh - 2.5rem);
    overflow: hidden;
    [data-theme='dark'] & {
      background: ${token.colorBgContainer};
    }
  `,

  inner: css`
    width: 100%;
    max-width: 1024px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 40px 40px 40px 40px;
    padding-top: 64px;
  `,

  headerRow: css`
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    margin-bottom: 48px;
    flex-shrink: 0;
    gap: 16px;
    @media (min-width: 768px) {
      flex-direction: row;
      align-items: flex-start;
    }
  `,

  pageTitle: css`
    font-size: ${token.fontSizeSM}px;
    font-family: Georgia, Cambria, "Times New Roman", Times, serif;
    color: ${token.colorText};
    margin-bottom: 12px;
    font-weight: 400;
    letter-spacing: -0.015em;
  `,

  pageSubtitle: css`
    font-size: 14px;
    color: ${token.colorText};
    opacity: 0.7;
    font-weight: 500;
  `,

  scrollArea: css`
    flex: 1;
    overflow-y: auto;
    padding-right: 8px;
    padding-bottom: 40px;
    min-height: 0;
    margin-right: -8px;
    display: flex;
    flex-direction: column;
    gap: 48px;
  `,

  sectionTitle: css`
    font-size: ${token.fontSizeSM}px;
    font-family: Georgia, Cambria, "Times New Roman", Times, serif;
    color: ${token.colorText};
    margin-bottom: 24px;
    font-weight: 400;
    letter-spacing: -0.015em;
  `,

  /* Usage empty/loading states */
  usageStateBox: css`
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 48px 16px;
    color: ${token.colorTextSecondary};
    background: rgba(0, 0, 0, 0.05);
    border-radius: 24px;
    border: 1px dashed transparent;
    [data-theme='dark'] & {
      background: rgba(255, 255, 255, 0.05);
    }
  `,

  /* Usage controls row */
  usageControls: css`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  `,

  usageControlsLeft: css`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;
  `,

  usageToggleGroup: css`
    display: flex;
    border-radius: 12px;
    background: transparent;
    padding: 4px;
    border: 1px solid rgba(0, 0, 0, 0.1);
    [data-theme='dark'] & {
      border-color: rgba(255, 255, 255, 0.1);
    }
  `,

  usageToggleActive: css`
    border-radius: 8px;
    background: rgba(0, 0, 0, 0.05);
    color: ${token.colorText};
    [data-theme='dark'] & {
      background: rgba(255, 255, 255, 0.1);
    }
  `,

  usageToggleInactive: css`
    border-radius: 8px;
    color: ${token.colorTextSecondary};
  `,

  usageCountText: css`
    font-size: 13px;
    font-weight: 500;
    color: ${token.colorTextSecondary};
  `,

  /* Usage entry list */
  usageEntryList: css`
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding-top: 8px;
  `,

  usageEntry: css`
    border-radius: 16px;
    background: transparent;
    border: 1px solid rgba(0, 0, 0, 0.1);
    padding: 20px;
    transition: background 0.15s;
    cursor: default;
    [data-theme='dark'] & {
      border-color: rgba(255, 255, 255, 0.1);
    }
    &:hover {
      background: rgba(0, 0, 0, 0.05);
      [data-theme='dark'] & {
        background: rgba(255, 255, 255, 0.05);
      }
    }
  `,

  usageEntryTop: css`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  `,

  usageEntryLeft: css`
    min-width: 0;
  `,

  usageEntryModel: css`
    font-weight: 600;
    font-size: 14px;
    color: ${token.colorText};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,

  usageEntryMeta: css`
    font-size: 13px;
    color: ${token.colorTextSecondary};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    margin-top: 2px;
  `,

  usageEntryRight: css`
    text-align: right;
    flex-shrink: 0;
  `,

  usageEntryTotal: css`
    font-weight: 700;
    font-size: 14px;
  `,

  usageEntryTime: css`
    font-size: 12px;
    color: ${token.colorTextSecondary};
    margin-top: 2px;
  `,

  usageTokenDetails: css`
    margin-top: 12px;
    display: flex;
    flex-wrap: wrap;
    gap: 16px 16px;
    row-gap: 6px;
    font-size: 12.5px;
    font-weight: 500;
    color: ${token.colorTextSecondary};
  `,

  tokenDetailItem: css`
    display: flex;
    align-items: center;
    gap: 6px;
  `,

  tokenDotSky: css`
    width: 8px;
    height: 8px;
    border-radius: 9999px;
    background: #0ea5e9;
  `,

  tokenDotViolet: css`
    width: 8px;
    height: 8px;
    border-radius: 9999px;
    background: #8b5cf6;
  `,

  tokenDotAmber: css`
    width: 8px;
    height: 8px;
    border-radius: 9999px;
    background: #f59e0b;
  `,

  costBadge: css`
    display: flex;
    align-items: center;
    gap: 6px;
    margin-left: auto;
    color: ${token.colorText};
    opacity: 0.8;
    background: rgba(0, 0, 0, 0.05);
    padding: 2px 8px;
    border-radius: 6px;
    [data-theme='dark'] & {
      background: rgba(255, 255, 255, 0.05);
    }
  `,

  viewContentBtn: css`
    height: 24px;
    border-radius: 9999px;
    padding: 0 10px;
    font-size: 11.5px;
    border: 1px solid rgba(0, 0, 0, 0.1);
    [data-theme='dark'] & {
      border-color: rgba(255, 255, 255, 0.1);
    }
  `,

  /* Pagination */
  paginationRow: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding-top: 8px;
  `,

  paginationText: css`
    font-size: 13px;
    font-weight: 500;
    color: ${token.colorTextSecondary};
  `,

  paginationButtons: css`
    display: flex;
    align-items: center;
    gap: 8px;
  `,

  paginationBtn: css`
    border-radius: 9999px;
    padding: 0 16px;
    height: 36px;
    border: 1px solid rgba(0, 0, 0, 0.1);
    background: transparent;
    [data-theme='dark'] & {
      border-color: rgba(255, 255, 255, 0.1);
    }
    &:hover {
      background: rgba(0, 0, 0, 0.05);
      [data-theme='dark'] & {
        background: rgba(255, 255, 255, 0.05);
      }
    }
  `,

  /* Bar chart */
  chartContainer: css`
    display: flex;
    flex-direction: column;
    gap: 16px;
    background: transparent;
    padding: 20px;
    border-radius: 16px;
    border: 1px solid rgba(0, 0, 0, 0.1);
    [data-theme='dark'] & {
      border-color: rgba(255, 255, 255, 0.1);
    }
  `,

  chartLegend: css`
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    font-size: 13px;
    font-weight: 500;
    color: ${token.colorTextSecondary};
    margin-bottom: 8px;
  `,

  chartLegendItem: css`
    display: inline-flex;
    align-items: center;
    gap: 8px;
  `,

  chartLegendDotSky: css`
    height: 10px;
    width: 10px;
    border-radius: 9999px;
    background: #0ea5e9;
    display: inline-block;
  `,

  chartLegendDotViolet: css`
    height: 10px;
    width: 10px;
    border-radius: 9999px;
    background: #8b5cf6;
    display: inline-block;
  `,

  chartLegendDotAmber: css`
    height: 10px;
    width: 10px;
    border-radius: 9999px;
    background: #f59e0b;
    display: inline-block;
  `,

  chartRow: css`
    display: flex;
    flex-direction: column;
    gap: 6px;
  `,

  chartRowHeader: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    font-size: 13.5px;
  `,

  chartLabel: css`
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 600;
    color: ${token.colorText};
  `,

  chartTotal: css`
    color: ${token.colorTextSecondary};
    font-weight: 500;
  `,

  chartTrack: css`
    height: 14px;
    overflow: hidden;
    border-radius: 9999px;
    background: rgba(0, 0, 0, 0.05);
    [data-theme='dark'] & {
      background: rgba(255, 255, 255, 0.05);
    }
  `,

  chartFill: css`
    display: flex;
    height: 100%;
    overflow: hidden;
    border-radius: 9999px;
  `,

  chartSegmentSky: css`
    height: 100%;
    background: #0ea5e9;
  `,

  chartSegmentViolet: css`
    height: 100%;
    background: #8b5cf6;
  `,

  chartSegmentAmber: css`
    height: 100%;
    background: #f59e0b;
  `,

  chartEmpty: css`
    border-radius: 16px;
    border: 1px dashed rgba(0, 0, 0, 0.1);
    padding: 32px;
    text-align: center;
    font-size: 14px;
    font-weight: 500;
    color: ${token.colorTextSecondary};
    [data-theme='dark'] & {
      border-color: rgba(255, 255, 255, 0.1);
    }
  `,

  /* Content popup */
  popupOverlay: css`
    position: fixed;
    inset: 0;
    z-index: 50;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.5);
    padding: 0 16px;
  `,

  popupCard: css`
    width: 100%;
    max-width: 768px;
    border-radius: 16px;
    border: 1px solid rgba(0, 0, 0, 0.1);
    background: ${token.colorBgContainer};
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
    [data-theme='dark'] & {
      border-color: rgba(255, 255, 255, 0.1);
    }
  `,

  popupHeader: css`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
    padding: 16px 20px;
    [data-theme='dark'] & {
      border-color: rgba(255, 255, 255, 0.1);
    }
  `,

  popupHeaderLeft: css`
    min-width: 0;
  `,

  popupTitle: css`
    font-size: ${token.fontSizeSM}px;
    font-weight: 600;
    color: ${token.colorText};
  `,

  popupSubtitle: css`
    font-size: 12px;
    color: ${token.colorTextSecondary};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    margin-top: 2px;
  `,

  popupCloseBtn: css`
    height: 32px;
    width: 32px;
    border-radius: 9999px;
  `,

  popupBody: css`
    max-height: 65vh;
    overflow-y: auto;
    padding: 16px 20px;
  `,

  popupPre: css`
    white-space: pre-wrap;
    word-break: break-words;
    font-size: ${token.fontSizeSM}px;
    color: ${token.colorText};
    font-family: monospace;
  `,

  popupFooter: css`
    display: flex;
    justify-content: flex-end;
    border-top: 1px solid rgba(0, 0, 0, 0.1);
    padding: 12px 20px;
    [data-theme='dark'] & {
      border-color: rgba(255, 255, 255, 0.1);
    }
  `,
}));
