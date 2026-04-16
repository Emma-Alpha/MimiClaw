import { createStyles } from 'antd-style';

export const useChannelConfigModalStyles = createStyles(({ token, css }) => ({
  overlay: css`
    position: fixed;
    inset: 0;
    z-index: 50;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
  `,

  card: css`
    width: 100%;
    max-width: 768px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    border-radius: 24px;
    border: 0;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    background: #f3f1e9;
    overflow: hidden;
    [data-theme='dark'] & {
      background: ${token.colorBgContainer};
    }
  `,

  cardHeader: css`
    display: flex;
    flex-direction: row;
    align-items: flex-start;
    justify-content: space-between;
    padding-bottom: 8px;
    flex-shrink: 0;
  `,

  cardTitle: css`
    font-size: ${token.fontSizeSM}px;
    font-family: Georgia, Cambria, "Times New Roman", Times, serif;
    font-weight: 400;
    letter-spacing: -0.015em;
  `,

  cardDescription: css`
    font-size: 14px;
    margin-top: 4px;
    color: ${token.colorTextSecondary};
    opacity: 0.85;
  `,

  closeButton: css`
    border-radius: 9999px;
    height: 32px;
    width: 32px;
    margin-right: -8px;
    margin-top: -8px;
    color: ${token.colorTextSecondary};
    &:hover {
      color: ${token.colorText};
      background: rgba(0, 0, 0, 0.05);
    }
  `,

  cardContent: css`
    display: flex;
    flex-direction: column;
    gap: 24px;
    padding-top: 16px;
    overflow-y: auto;
    flex: 1;
    padding: 24px;
  `,

  /* Channel selector grid */
  channelGrid: css`
    display: grid;
    grid-template-columns: repeat(1, 1fr);
    gap: 16px;
    @media (min-width: 640px) {
      grid-template-columns: repeat(2, 1fr);
    }
  `,

  channelButton: css`
    display: flex;
    align-items: flex-start;
    gap: 16px;
    padding: 16px;
    border-radius: 16px;
    transition: all 0.15s;
    text-align: left;
    border: 1px solid rgba(0, 0, 0, 0.05);
    position: relative;
    overflow: hidden;
    background: #eeece3;
    box-shadow: ${token.boxShadowTertiary};
    cursor: pointer;
    [data-theme='dark'] & {
      background: ${token.colorFillTertiary};
      border-color: rgba(255, 255, 255, 0.1);
    }
    &:hover {
      background: rgba(0, 0, 0, 0.05);
      [data-theme='dark'] & {
        background: rgba(255, 255, 255, 0.05);
      }
    }
  `,

  channelButtonConfigured: css`
    border-color: rgba(34, 197, 94, 0.4);
    background: rgba(34, 197, 94, 0.05);
    [data-theme='dark'] & {
      background: rgba(34, 197, 94, 0.1);
    }
  `,

  channelLogoWrap: css`
    height: 46px;
    width: 46px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: ${token.colorText};
    background: rgba(0, 0, 0, 0.05);
    border: 1px solid rgba(0, 0, 0, 0.05);
    border-radius: 9999px;
    box-shadow: ${token.boxShadowTertiary};
    [data-theme='dark'] & {
      background: rgba(255, 255, 255, 0.05);
      border-color: rgba(255, 255, 255, 0.1);
    }
  `,

  channelInfo: css`
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
    padding-top: 2px;
    margin-top: 4px;
  `,

  channelNameRow: css`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
  `,

  channelName: css`
    font-size: 14px;
    font-weight: 600;
    color: ${token.colorText};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,

  channelDesc: css`
    font-size: 13.5px;
    color: ${token.colorTextSecondary};
    -webkit-line-clamp: 2;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    overflow: hidden;
    line-height: 1.5;
  `,

  channelConnType: css`
    font-size: 12px;
    font-weight: 500;
    color: ${token.colorTextSecondary};
    opacity: 0.8;
    margin-top: 8px;
  `,

  configuredBadge: css`
    position: absolute;
    top: 12px;
    right: 12px;
    font-size: 10px;
    font-weight: 500;
    border-radius: 9999px;
    background: #16a34a;
    color: #fff;
    &:hover {
      background: #16a34a;
    }
  `,

  pluginBadge: css`
    font-family: monospace;
    font-size: 10px;
    font-weight: 500;
    padding: 1px 8px;
    border-radius: 9999px;
    background: rgba(0, 0, 0, 0.04);
    border: 0;
    box-shadow: none;
    color: ${token.colorTextSecondary};
    opacity: 0.9;
    [data-theme='dark'] & {
      background: rgba(255, 255, 255, 0.08);
    }
  `,

  /* QR Code section */
  qrCenter: css`
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: 24px;
    align-items: center;
  `,

  qrBox: css`
    background: #eeece3;
    padding: 16px;
    border-radius: 24px;
    display: inline-block;
    box-shadow: ${token.boxShadowTertiary};
    border: 1px solid rgba(0, 0, 0, 0.1);
    [data-theme='dark'] & {
      background: ${token.colorFillTertiary};
      border-color: rgba(255, 255, 255, 0.1);
    }
  `,

  qrImage: css`
    width: 256px;
    height: 256px;
    object-fit: contain;
    border-radius: 16px;
  `,

  qrFallback: css`
    width: 256px;
    height: 256px;
    background: #fff;
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    [data-theme='dark'] & {
      background: ${token.colorBgContainer};
    }
  `,

  qrDesc: css`
    font-size: 14px;
    color: ${token.colorTextSecondary};
  `,

  qrActions: css`
    display: flex;
    justify-content: center;
    gap: 8px;
  `,

  /* Loading config */
  loadingBox: css`
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px 16px;
    border-radius: 16px;
    background: #eeece3;
    border: 1px solid rgba(0, 0, 0, 0.1);
    [data-theme='dark'] & {
      background: ${token.colorFillTertiary};
      border-color: rgba(255, 255, 255, 0.1);
    }
  `,

  loadingText: css`
    margin-left: 8px;
    font-size: 14px;
    color: ${token.colorTextSecondary};
  `,

  /* Config form area */
  formArea: css`
    display: flex;
    flex-direction: column;
    gap: 24px;
  `,

  existingHint: css`
    background: rgba(59, 130, 246, 0.1);
    color: #2563eb;
    padding: 16px;
    border-radius: 16px;
    font-size: 13.5px;
    display: flex;
    align-items: center;
    gap: 8px;
    border: 1px solid rgba(59, 130, 246, 0.2);
    [data-theme='dark'] & {
      color: #93c5fd;
    }
  `,

  instructionBox: css`
    background: #eeece3;
    padding: 16px;
    border-radius: 16px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    box-shadow: ${token.boxShadowTertiary};
    border: 1px solid rgba(0, 0, 0, 0.1);
    [data-theme='dark'] & {
      background: ${token.colorFillTertiary};
      border-color: rgba(255, 255, 255, 0.1);
    }
  `,

  instructionHeader: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  `,

  instructionLabel: css`
    font-size: 14px;
    color: ${token.colorText};
    opacity: 0.8;
    font-weight: 700;
  `,

  instructionSubtext: css`
    font-size: 13px;
    color: ${token.colorTextSecondary};
    margin-top: 4px;
  `,

  instructionList: css`
    list-style: decimal;
    padding-left: 20px;
    font-size: 13px;
    color: ${token.colorTextSecondary};
    line-height: 1.6;
    & > li + li {
      margin-top: 6px;
    }
  `,

  fieldGroup: css`
    display: flex;
    flex-direction: column;
    gap: 10px;
  `,

  fieldLabel: css`
    font-size: 14px;
    color: ${token.colorText};
    opacity: 0.8;
    font-weight: 700;
  `,

  fieldRequired: css`
    color: ${token.colorError};
    margin-left: 4px;
  `,

  fieldInputRow: css`
    display: flex;
    gap: 8px;
  `,

  fieldDescription: css`
    font-size: 13px;
    color: ${token.colorTextSecondary};
    line-height: 1.6;
  `,

  fieldEnvVar: css`
    font-size: 12px;
    color: ${token.colorTextSecondary};
    opacity: 0.7;
    font-family: monospace;
  `,

  /* Validation result */
  validationBox: css`
    padding: 16px;
    border-radius: 16px;
    font-size: ${token.fontSizeSM}px;
    border: 1px solid;
  `,

  validationSuccess: css`
    background: rgba(34, 197, 94, 0.1);
    color: #15803d;
    border-color: rgba(34, 197, 94, 0.2);
    [data-theme='dark'] & {
      color: #86efac;
    }
  `,

  validationError: css`
    background: rgba(239, 68, 68, 0.1);
    color: ${token.colorError};
    border-color: rgba(239, 68, 68, 0.2);
  `,

  validationInner: css`
    display: flex;
    align-items: flex-start;
    gap: 8px;
  `,

  validationIconWrap: css`
    flex-shrink: 0;
    margin-top: 2px;
  `,

  validationContent: css`
    min-width: 0;
  `,

  validationTitle: css`
    font-weight: 500;
    margin-bottom: 4px;
  `,

  validationList: css`
    list-style: disc;
    list-style-position: inside;
    & > li + li {
      margin-top: 2px;
    }
  `,

  validationWarningBlock: css`
    margin-top: 8px;
    color: #ca8a04;
    [data-theme='dark'] & {
      color: #eab308;
    }
  `,

  validationWarningTitle: css`
    font-weight: 500;
    font-size: 12px;
    text-transform: uppercase;
    margin-bottom: 4px;
  `,

  validationInfoItem: css`
    font-size: 12px;
  `,

  /* Footer actions */
  footerActions: css`
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding-top: 8px;
    @media (min-width: 640px) {
      flex-direction: row;
      justify-content: flex-end;
    }
  `,

  footerButtonGroup: css`
    display: flex;
    flex-direction: column;
    gap: 8px;
    @media (min-width: 640px) {
      flex-direction: row;
    }
  `,

  outlineButton: css`
    height: 36px;
    font-size: 13px;
    font-weight: 500;
    border-radius: 9999px;
    padding: 0 16px;
    border: 1px solid rgba(0, 0, 0, 0.1);
    background: transparent;
    box-shadow: none;
    color: ${token.colorText};
    opacity: 0.8;
    [data-theme='dark'] & {
      border-color: rgba(255, 255, 255, 0.1);
    }
    &:hover {
      background: rgba(0, 0, 0, 0.05);
      opacity: 1;
      [data-theme='dark'] & {
        background: rgba(255, 255, 255, 0.05);
      }
    }
  `,

  outlineButtonSm: css`
    height: 32px;
    padding: 0 12px;
    flex-shrink: 0;
  `,

  primaryButton: css`
    height: 36px;
    font-size: 13px;
    font-weight: 500;
    border-radius: 9999px;
    padding: 0 16px;
    box-shadow: none;
  `,

  /* Config field eye toggle button */
  eyeButton: css`
    height: 44px;
    width: 44px;
    border-radius: 12px;
    background: #eeece3;
    border: 1px solid rgba(0, 0, 0, 0.1);
    color: ${token.colorTextSecondary};
    flex-shrink: 0;
    box-shadow: ${token.boxShadowTertiary};
    [data-theme='dark'] & {
      background: ${token.colorFillTertiary};
      border-color: rgba(255, 255, 255, 0.1);
    }
    &:hover {
      color: ${token.colorText};
    }
  `,

  channelLogoImg: css`
    width: 22px;
    height: 22px;
  `,
}));
