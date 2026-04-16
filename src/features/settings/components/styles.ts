import { createStyles } from 'antd-style';

export const useProviderStyles = createStyles(({ token, css }) => ({
  // Layout
  container: css`
    display: flex;
    flex-direction: column;
    gap: 24px;
  `,
  headerRow: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
  `,
  sectionTitle: css`
    font-size: 13px;
    font-family: Georgia, Cambria, "Times New Roman", Times, serif;
    color: ${token.colorText};
    font-weight: 400;
    letter-spacing: -0.02em;
  `,

  // Provider list
  providerList: css`
    display: flex;
    flex-direction: column;
    gap: 12px;
  `,

  // Empty / Loading states
  loadingState: css`
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 48px 0;
    color: ${token.colorTextSecondary};
    background: rgba(0,0,0,0.05);
    border-radius: 24px;
    border: 1px dashed transparent;
  `,
  emptyState: css`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 80px 0;
    color: ${token.colorTextSecondary};
    background: rgba(0,0,0,0.05);
    border-radius: 24px;
    border: 1px dashed transparent;
  `,
  emptyIcon: css`
    margin-bottom: 16px;
    opacity: 0.5;
  `,
  emptyTitle: css`
    font-size: 14px;
    font-weight: 500;
    margin-bottom: 4px;
    color: ${token.colorText};
  `,
  emptyDesc: css`
    font-size: 13px;
    text-align: center;
    margin-bottom: 24px;
    max-width: 384px;
  `,

  // Provider Card
  providerCard: css`
    display: flex;
    flex-direction: column;
    padding: 16px;
    border-radius: 16px;
    transition: all 0.2s;
    position: relative;
    overflow: hidden;
    border: 1px solid transparent;
    &:hover {
      background: rgba(0,0,0,0.05);
    }
  `,
  providerCardDefault: css`
    background: rgba(0,0,0,0.04);
    border: 1px solid transparent;
  `,

  cardTopRow: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
  `,
  cardLeft: css`
    display: flex;
    align-items: center;
    gap: 16px;
  `,
  providerIcon: css`
    height: 42px;
    width: 42px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: ${token.colorText};
    border: 1px solid rgba(0,0,0,0.05);
    border-radius: 50%;
    background: rgba(0,0,0,0.05);
    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    transition: transform 0.2s;
    &:hover {
      transform: scale(1.05);
    }
  `,
  providerIconImg: css`
    height: 20px;
    width: 20px;
  `,
  providerInfo: css`
    display: flex;
    flex-direction: column;
  `,
  providerNameRow: css`
    display: flex;
    align-items: center;
    gap: 8px;
  `,
  providerName: css`
    font-weight: 600;
    font-size: 14px;
  `,
  defaultBadge: css`
    display: flex;
    align-items: center;
    gap: 4px;
    font-family: monospace;
    font-size: 10px;
    font-weight: 500;
    padding: 2px 8px;
    border-radius: 9999px;
    background: rgba(0,0,0,0.04);
    color: rgba(0,0,0,0.7);
    border: none;
    box-shadow: none;
  `,
  providerMeta: css`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 2px;
    font-size: 13px;
    color: ${token.colorTextSecondary};
  `,
  metaDot: css`
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: rgba(0,0,0,0.2);
    flex-shrink: 0;
  `,
  metaTruncate: css`
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 200px;
  `,
  statusDot: css`
    width: 6px;
    height: 6px;
    border-radius: 50%;
    display: inline-block;
    margin-right: 4px;
  `,
  statusDotGreen: css`
    background: #22c55e;
  `,
  statusDotRed: css`
    background: #ef4444;
  `,

  // Card action buttons
  cardActions: css`
    display: flex;
    align-items: center;
    gap: 4px;
    opacity: 0;
    transition: opacity 0.2s;
    .group:hover & {
      opacity: 1;
    }
  `,

  // Edit area
  editArea: css`
    display: flex;
    flex-direction: column;
    gap: 24px;
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid rgba(0,0,0,0.05);
  `,
  editSection: css`
    display: flex;
    flex-direction: column;
    gap: 12px;
  `,
  editSubSection: css`
    display: flex;
    flex-direction: column;
    gap: 6px;
  `,
  sectionLabel: css`
    font-size: 14px;
    font-weight: 700;
    color: rgba(0,0,0,0.8);
  `,
  fieldLabel: css`
    font-size: 14px;
    color: rgba(0,0,0,0.8);
    font-weight: 700;
  `,
  fieldLabelLight: css`
    font-size: 13px;
    color: ${token.colorTextSecondary};
  `,

  // Inputs
  monoInput: css`
    height: 44px;
    border-radius: 12px;
    font-family: monospace;
    font-size: 13px;
    background: #eeece3;
    border: 1px solid rgba(0,0,0,0.1);
    transition: all 0.2s;
    color: ${token.colorText};
    &:focus {
      border-color: #3b82f6;
      box-shadow: 0 0 0 2px rgba(59,130,246,0.25);
    }
    &::placeholder {
      color: rgba(0,0,0,0.4);
    }
  `,
  monoInputDefault: css`
    height: 40px;
    border-radius: 12px;
    font-family: monospace;
    font-size: 13px;
    background: white;
    border: 1px solid rgba(0,0,0,0.1);
    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    &:focus {
      box-shadow: 0 0 0 2px rgba(59,130,246,0.25);
    }
  `,

  // Segmented toggle buttons
  segmentGroup: css`
    display: flex;
    gap: 8px;
    font-size: 13px;
  `,
  segmentBtn: css`
    flex: 1;
    padding: 6px 12px;
    border-radius: 8px;
    border: 1px solid transparent;
    transition: all 0.2s;
    cursor: pointer;
    background: rgba(0,0,0,0.05);
    color: ${token.colorTextSecondary};
    &:hover {
      background: rgba(0,0,0,0.1);
    }
  `,
  segmentBtnActive: css`
    background: white;
    border-color: rgba(0,0,0,0.2);
    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    font-weight: 500;
    color: ${token.colorText};
  `,

  // Fallback section
  fallbackToggle: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    font-size: 14px;
    font-weight: 700;
    color: rgba(0,0,0,0.8);
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    transition: color 0.15s;
    &:hover {
      color: ${token.colorText};
    }
  `,
  fallbackContent: css`
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding-top: 8px;
  `,
  fallbackTextarea: css`
    min-height: 96px;
    width: 100%;
    border-radius: 12px;
    border: 1px solid rgba(0,0,0,0.1);
    background: #eeece3;
    padding: 8px 12px;
    font-size: 13px;
    font-family: monospace;
    outline: none;
    transition: all 0.2s;
    color: ${token.colorText};
    &:focus {
      box-shadow: 0 0 0 2px rgba(59,130,246,0.25);
      border-color: #3b82f6;
    }
    &::placeholder {
      color: rgba(0,0,0,0.4);
    }
  `,
  fallbackTextareaDefault: css`
    min-height: 96px;
    width: 100%;
    border-radius: 12px;
    border: 1px solid rgba(0,0,0,0.1);
    background: white;
    padding: 8px 12px;
    font-size: 13px;
    font-family: monospace;
    outline: none;
    &:focus {
      box-shadow: 0 0 0 2px rgba(59,130,246,0.25);
    }
  `,
  checkboxList: css`
    border-radius: 12px;
    border: 1px solid rgba(0,0,0,0.1);
    background: #eeece3;
    padding: 12px;
    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    display: flex;
    flex-direction: column;
    gap: 8px;
  `,
  checkboxListDefault: css`
    border-radius: 12px;
    border: 1px solid rgba(0,0,0,0.1);
    background: white;
    padding: 12px;
    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    display: flex;
    flex-direction: column;
    gap: 8px;
  `,
  checkboxRow: css`
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 13px;
    cursor: pointer;
  `,

  // Key input row
  keyInputRow: css`
    display: flex;
    gap: 8px;
  `,
  keyInputWrap: css`
    position: relative;
    flex: 1;
  `,
  eyeBtn: css`
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: ${token.colorTextSecondary};
    background: none;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    &:hover {
      color: ${token.colorText};
    }
  `,
  configuredBadge: css`
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    font-weight: 500;
    color: #16a34a;
    background: rgba(34,197,94,0.1);
    padding: 4px 8px;
    border-radius: 6px;
  `,
  helpText: css`
    font-size: 12px;
    color: ${token.colorTextSecondary};
  `,
  linkBlue: css`
    font-size: 12px;
    color: #3b82f6;
    font-weight: 500;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    text-decoration: none;
    &:hover {
      color: #2563eb;
    }
  `,
  linkBlue13: css`
    font-size: 13px;
    color: #3b82f6;
    font-weight: 500;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    text-decoration: none;
    &:hover {
      color: #2563eb;
    }
  `,

  // Add Provider Dialog
  dialogOverlay: css`
    position: fixed;
    inset: 0;
    z-index: 50;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
  `,
  dialogCard: css`
    width: 100%;
    max-width: 672px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    border-radius: 24px;
    border: none;
    box-shadow: 0 25px 50px rgba(0,0,0,0.25);
    background: #f3f1e9;
    overflow: hidden;
  `,
  dialogHeader: css`
    position: relative;
    padding: 24px 24px 8px;
    flex-shrink: 0;
  `,
  dialogTitle: css`
    font-size: 13px;
    font-family: Georgia, Cambria, "Times New Roman", Times, serif;
    font-weight: 400;
  `,
  dialogDesc: css`
    font-size: 14px;
    margin-top: 4px;
    color: rgba(0,0,0,0.7);
  `,
  dialogCloseBtn: css`
    position: absolute;
    right: 16px;
    top: 16px;
  `,
  dialogBody: css`
    overflow-y: auto;
    flex: 1;
    padding: 24px;
  `,

  // Provider type grid
  typeGrid: css`
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    @media (min-width: 768px) {
      grid-template-columns: repeat(3, 1fr);
    }
  `,
  typeBtn: css`
    padding: 16px;
    border-radius: 16px;
    border: 1px solid rgba(0,0,0,0.05);
    background: none;
    cursor: pointer;
    text-align: center;
    transition: all 0.15s;
    &:hover {
      background: rgba(0,0,0,0.05);
    }
  `,
  typeBtnIcon: css`
    height: 48px;
    width: 48px;
    margin: 0 auto 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0,0,0,0.05);
    border-radius: 12px;
    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    border: 1px solid rgba(0,0,0,0.05);
    transition: transform 0.15s;
    .typeBtn:hover & {
      transform: scale(1.05);
    }
  `,
  typeBtnName: css`
    font-weight: 500;
    font-size: 13px;
  `,

  // Selected provider header in dialog
  selectedProviderHeader: css`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
    border-radius: 16px;
    background: white;
    border: 1px solid rgba(0,0,0,0.05);
    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
  `,
  selectedProviderIcon: css`
    height: 40px;
    width: 40px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0,0,0,0.05);
    border-radius: 12px;
  `,

  // Auth mode toggle
  authModeToggle: css`
    display: flex;
    border-radius: 12px;
    border: 1px solid rgba(0,0,0,0.1);
    overflow: hidden;
    font-size: 13px;
    font-weight: 500;
    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    background: #eeece3;
    padding: 4px;
    gap: 4px;
  `,
  authModeBtn: css`
    flex: 1;
    padding: 8px 12px;
    border-radius: 8px;
    transition: all 0.15s;
    background: none;
    border: none;
    cursor: pointer;
    color: ${token.colorTextSecondary};
    &:hover {
      background: rgba(0,0,0,0.05);
    }
  `,
  authModeBtnActive: css`
    background: rgba(0,0,0,0.05);
    color: ${token.colorText};
  `,

  // OAuth flow
  oauthBox: css`
    border-radius: 12px;
    background: rgba(59,130,246,0.1);
    border: 1px solid rgba(59,130,246,0.2);
    padding: 20px;
    text-align: center;
  `,
  oauthFlowArea: css`
    margin-top: 16px;
    padding: 20px;
    border: 1px solid rgba(0,0,0,0.1);
    border-radius: 16px;
    background: white;
    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    position: relative;
    overflow: hidden;
  `,
  oauthFlowInner: css`
    position: relative;
    z-index: 10;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    gap: 20px;
  `,
  userCodeBox: css`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 16px;
    background: #eeece3;
    border: 1px solid rgba(0,0,0,0.05);
    border-radius: 12px;
    box-shadow: inset 0 1px 2px rgba(0,0,0,0.05);
  `,

  // Separator
  separator: css`
    height: 1px;
    background: rgba(0,0,0,0.1);
    margin: 0;
  `,

  // Dialog footer
  dialogFooter: css`
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding-top: 8px;
  `,

  // Form fields spacing
  formGroup: css`
    display: flex;
    flex-direction: column;
    gap: 8px;
  `,
  formGroupHalf: css`
    display: flex;
    flex-direction: column;
    gap: 10px;
  `,
  twoColGrid: css`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    @media (max-width: 640px) {
      grid-template-columns: 1fr;
    }
  `,
  errorText: css`
    font-size: 13px;
    color: #ef4444;
    font-weight: 500;
  `,
  inputWithEye: css`
    position: relative;
  `,
  sectionGap6: css`
    display: flex;
    flex-direction: column;
    gap: 24px;
  `,
}));
