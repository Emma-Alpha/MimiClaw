import { createStyles } from 'antd-style';

export const useSettingsStyles = createStyles(({ token, css }) => ({
  // Main layout
  pageRoot: css`
    display: flex;
    height: 100%;
    width: 100%;
    overflow: hidden;
  `,

  // Left sidebar
  sidebar: css`
    width: 216px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    background: ${token.colorBgLayout};
    border-right: 1px solid ${token.colorBorderSecondary};
  `,
  sidebarNav: css`
    padding: 4px 12px;
  `,
  navItem: css`
    width: 100%;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 7px 12px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
    transition: all 0.15s;
    text-align: left;
    background: none;
    border: none;
    cursor: pointer;
    color: ${token.colorTextSecondary};
    &:hover {
      color: ${token.colorText};
      background: ${token.colorFillTertiary};
    }
  `,
  navItemActive: css`
    background: ${token.colorFillSecondary};
    color: ${token.colorText};
  `,

  // Right content area
  contentArea: css`
    flex: 1;
    overflow-y: auto;
  `,
  contentInner: css`
    max-width: 768px;
    padding: 40px 32px 64px;
    --setting-header-bleed: 32px;
  `,

  // Section containers
  section: css`
    display: flex;
    flex-direction: column;
    gap: 16px;
  `,
  sectionGap6: css`
    display: flex;
    flex-direction: column;
    gap: 24px;
  `,
  sectionGap8: css`
    display: flex;
    flex-direction: column;
    gap: 32px;
  `,

  // Settings row (label + control)
  settingRow: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
  `,
  settingRowSmCol: css`
    display: flex;
    flex-direction: column;
    gap: 16px;
    @media (min-width: 640px) {
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
    }
  `,
  settingLabel: css`
    font-size: 14px;
    font-weight: 500;
    color: ${token.colorText};
  `,
  settingLabelMuted: css`
    font-size: 14px;
    font-weight: 500;
    color: ${token.colorText};
  `,
  settingDesc: css`
    font-size: 13px;
    color: ${token.colorTextSecondary};
    margin-top: 4px;
  `,
  settingDescSmall: css`
    font-size: 12px;
    color: ${token.colorTextSecondary};
    margin-top: 2px;
  `,

  // ThemePicker & LanguagePicker
  pickerWrap: css`
    display: inline-flex;
    gap: 4px;
    background: ${token.colorFillQuaternary};
    padding: 4px;
    border-radius: 16px;
    border: 1px solid ${token.colorBorderSecondary};
    box-shadow: inset 0 1px 2px color-mix(in srgb, ${token.colorText} 6%, transparent);
  `,
  pickerBtn: css`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 8px 20px;
    font-size: 13px;
    font-weight: 500;
    border-radius: 12px;
    transition: all 0.3s;
    border: none;
    background: none;
    cursor: pointer;
    color: ${token.colorTextSecondary};
    &:hover {
      color: ${token.colorText};
      background: ${token.colorFillTertiary};
    }
  `,
  pickerBtnActive: css`
    background: ${token.colorBgContainer};
    color: ${token.colorText};
    box-shadow: 0 1px 2px color-mix(in srgb, ${token.colorText} 10%, transparent);
  `,
  langPickerBtn: css`
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 8px 24px;
    font-size: 13px;
    font-weight: 500;
    border-radius: 12px;
    transition: all 0.3s;
    border: none;
    background: none;
    cursor: pointer;
    color: ${token.colorTextSecondary};
    &:hover {
      color: ${token.colorText};
      background: ${token.colorFillTertiary};
    }
  `,

  // Gateway status
  statusBadge: css`
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 500;
    border: 1px solid transparent;
  `,
  statusRunning: css`
    background: rgba(34,197,94,0.1);
    color: #16a34a;
    border-color: rgba(34,197,94,0.2);
  `,
  statusError: css`
    background: rgba(239,68,68,0.1);
    color: #dc2626;
    border-color: rgba(239,68,68,0.2);
  `,
  statusDefault: css`
    background: rgba(0,0,0,0.05);
    color: ${token.colorTextSecondary};
    border-color: transparent;
  `,
  statusDot: css`
    width: 6px;
    height: 6px;
    border-radius: 50%;
  `,
  statusDotGreen: css`
    background: #22c55e;
  `,
  statusDotRed: css`
    background: #ef4444;
  `,
  statusDotGray: css`
    background: ${token.colorTextSecondary};
  `,

  buttonGroup: css`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  `,

  // Log panel
  logPanel: css`
    padding: 16px;
    border-radius: 16px;
    background: ${token.colorFillQuaternary};
    border: 1px solid ${token.colorBorderSecondary};
  `,
  logPanelHeader: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  `,
  logPanelTitle: css`
    font-weight: 500;
    font-size: 14px;
  `,
  logContent: css`
    font-size: 12px;
    color: ${token.colorTextSecondary};
    background: ${token.colorBgContainer};
    padding: 16px;
    border-radius: 12px;
    max-height: 240px;
    overflow: auto;
    white-space: pre-wrap;
    font-family: monospace;
    border: 1px solid ${token.colorBorderSecondary};
    box-shadow: inset 0 1px 2px color-mix(in srgb, ${token.colorText} 6%, transparent);
  `,

  // Panel / card areas
  infoPanel: css`
    display: flex;
    flex-direction: column;
    gap: 12px;
    border-radius: 24px;
    background: ${token.colorFillQuaternary};
    padding: 24px;
    border: 1px solid ${token.colorBorderSecondary};
  `,
  infoPanelHeader: css`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
  `,

  // Form inputs
  monoInput: css`
    height: 40px;
    border-radius: 12px;
    background: ${token.colorFillQuaternary};
    border: 1px solid ${token.colorBorderSecondary};
    font-family: monospace;
    font-size: 13px;
  `,
  monoInputFull: css`
    height: 40px;
    border-radius: 12px;
    background: ${token.colorFillQuaternary};
    border: 1px solid ${token.colorBorderSecondary};
    font-family: monospace;
    font-size: 13px;
    flex: 1;
    min-width: 200px;
  `,
  inputWithEye: css`
    position: relative;
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

  // Cloud gateway state colors
  cloudStateRunning: css`
    font-size: 13px;
    font-weight: 500;
    color: #16a34a;
  `,
  cloudStateStarting: css`
    font-size: 13px;
    font-weight: 500;
    color: #ca8a04;
  `,
  cloudStateError: css`
    font-size: 13px;
    font-weight: 500;
    color: #dc2626;
  `,
  cloudStateStopped: css`
    font-size: 13px;
    font-weight: 500;
    color: ${token.colorTextSecondary};
  `,

  // Reset section
  resetSection: css`
    padding-top: 8px;
    border-top: 1px solid ${token.colorBorderSecondary};
  `,
  destructiveLabel: css`
    font-size: 14px;
    font-weight: 500;
    color: ${token.colorError};
  `,

  // Badge row
  badgeRow: css`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    font-size: 12px;
  `,

  // Doctor / code agent output panel
  outputPanel: css`
    display: flex;
    flex-direction: column;
    gap: 12px;
    border-radius: 16px;
    border: 1px solid ${token.colorBorderSecondary};
    padding: 20px;
    background: ${token.colorFillQuaternary};
  `,
  outputGrid2: css`
    display: grid;
    gap: 12px;
    @media (min-width: 768px) {
      grid-template-columns: 1fr 1fr;
    }
  `,
  outputLabel: css`
    font-size: 12px;
    font-weight: 600;
    color: ${token.colorText};
  `,
  outputPre: css`
    max-height: 288px;
    overflow: auto;
    border-radius: 12px;
    border: 1px solid ${token.colorBorderSecondary};
    background: ${token.colorBgContainer};
    padding: 12px;
    font-size: 11px;
    font-family: monospace;
    white-space: pre-wrap;
    word-break: break-words;
  `,
  outputPreSmall: css`
    max-height: 160px;
    overflow: auto;
    border-radius: 12px;
    border: 1px solid ${token.colorBorderSecondary};
    background: ${token.colorBgContainer};
    padding: 12px;
    font-size: 11px;
    font-family: monospace;
    white-space: pre-wrap;
    word-break: break-words;
  `,
  outputPreDark: css`
    max-height: 288px;
    overflow: auto;
    border-radius: 12px;
    border: 1px solid ${token.colorBorderSecondary};
    background: ${token.colorFillQuaternary};
    padding: 12px;
    font-size: 11px;
    font-family: monospace;
    white-space: pre-wrap;
    word-break: break-words;
  `,
  metaText: css`
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 12px;
    color: ${token.colorTextSecondary};
    font-family: monospace;
    word-break: break-all;
  `,

  // Code agent card
  codeAgentCard: css`
    border-radius: 16px;
    border: 1px solid ${token.colorBorderSecondary};
    padding: 20px;
    background: ${token.colorFillQuaternary};
    display: flex;
    flex-direction: column;
    gap: 16px;
  `,
  codeAgentInnerCard: css`
    border-radius: 12px;
    border: 1px solid ${token.colorBorderSecondary};
    background: ${token.colorBgContainer};
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  `,
  grid2: css`
    display: grid;
    gap: 16px;
    @media (min-width: 768px) {
      grid-template-columns: 1fr 1fr;
    }
  `,
  grid12: css`
    display: grid;
    gap: 16px;
    @media (min-width: 768px) {
      grid-template-columns: 1.2fr 1.8fr;
    }
  `,
  gridSmall: css`
    display: grid;
    gap: 16px;
    @media (min-width: 640px) {
      grid-template-columns: 1fr 1fr;
    }
  `,
  formField: css`
    display: flex;
    flex-direction: column;
    gap: 8px;
  `,
  fieldLabelSmall: css`
    font-size: 13px;
    color: ${token.colorText};
  `,
  fieldInput: css`
    height: 40px;
    border-radius: 12px;
    background: ${token.colorBgContainer};
    border: 1px solid ${token.colorBorderSecondary};
    font-size: 13px;
  `,
  fieldInputMono: css`
    height: 40px;
    border-radius: 12px;
    background: ${token.colorBgContainer};
    border: 1px solid ${token.colorBorderSecondary};
    font-family: monospace;
    font-size: 13px;
  `,
  fieldSelect: css`
    height: 40px;
    border-radius: 12px;
    border: 1px solid ${token.colorBorderSecondary};
    background: ${token.colorBgContainer};
    font-size: 13px;
  `,
  fieldTextarea: css`
    min-height: 92px;
    border-radius: 12px;
    background: ${token.colorBgContainer};
    border: 1px solid ${token.colorBorderSecondary};
    font-size: 13px;
  `,
  fieldTextareaMono: css`
    min-height: 92px;
    border-radius: 12px;
    background: ${token.colorBgContainer};
    border: 1px solid ${token.colorBorderSecondary};
    font-size: 13px;
    font-family: monospace;
  `,

  // Telemetry viewer
  telemetryPanel: css`
    display: flex;
    flex-direction: column;
    gap: 16px;
    border-radius: 16px;
    border: 1px solid ${token.colorBorderSecondary};
    padding: 20px;
    background: ${token.colorFillQuaternary};
  `,
  telemetryTableWrap: css`
    max-height: 320px;
    overflow: auto;
    border-radius: 12px;
    border: 1px solid ${token.colorBorderSecondary};
    background: ${token.colorBgContainer};
    box-shadow: inset 0 1px 2px color-mix(in srgb, ${token.colorText} 6%, transparent);
  `,
  telemetryAggHeader: css`
    border-bottom: 1px solid ${token.colorBorderSecondary};
    background: ${token.colorFillQuaternary};
    padding: 12px;
  `,
  telemetryAggTitle: css`
    margin-bottom: 12px;
    font-size: 12px;
    font-weight: 600;
    color: ${token.colorTextSecondary};
  `,
  telemetryRow: css`
    display: grid;
    grid-template-columns: minmax(0,1.6fr) 0.7fr 0.9fr 0.8fr 1fr;
    gap: 8px;
    border-radius: 8px;
    border: 1px solid ${token.colorBorderSecondary};
    background: ${token.colorBgContainer};
    padding: 8px 12px;
  `,
  telemetryEntries: css`
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
    font-family: monospace;
    font-size: 12px;
  `,
  telemetryEntry: css`
    border-radius: 8px;
    border: 1px solid ${token.colorBorderSecondary};
    background: ${token.colorFillQuaternary};
    padding: 12px;
  `,
  telemetryEntryHeader: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 8px;
  `,
  telemetryEventName: css`
    font-weight: 600;
    color: ${token.colorText};
  `,
  telemetryTs: css`
    color: ${token.colorTextSecondary};
    font-size: 11px;
  `,

  // About section
  aboutText: css`
    display: flex;
    flex-direction: column;
    gap: 12px;
    font-size: 14px;
    color: ${token.colorTextSecondary};
  `,
  aboutLinks: css`
    display: flex;
    gap: 16px;
    padding-top: 12px;
  `,

  // Speech / voice chat
  speechGrid: css`
    display: grid;
    grid-template-columns: 1fr;
    gap: 20px;
    @media (min-width: 768px) {
      grid-template-columns: 1fr 1fr;
    }
  `,
  speechBtnRow: css`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;
    margin-top: 8px;
  `,

  // WsDiagnostic bordered panel
  borderedPanel: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-radius: 16px;
    border: 1px solid ${token.colorBorderSecondary};
    padding: 20px;
    background: transparent;
  `,

  // Proxy fields
  proxySection: css`
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding-top: 8px;
  `,
  proxyGrid: css`
    display: grid;
    grid-template-columns: 1fr;
    gap: 16px;
    @media (min-width: 640px) {
      grid-template-columns: 1fr 1fr;
    }
  `,

  // Inline flex row
  flexRow: css`
    display: flex;
    align-items: center;
    gap: 12px;
  `,
  flexWrapRow: css`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  `,
  flexWrapRowGap4: css`
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    align-items: center;
  `,

  // Sub-label/hint
  hintText: css`
    font-size: 11px;
    color: ${token.colorTextSecondary};
  `,
  hintText12: css`
    font-size: 12px;
    color: ${token.colorTextSecondary};
  `,
  amberText: css`
    font-size: 12px;
    color: #d97706;
  `,
  monoText: css`
    font-size: 11px;
    font-family: monospace;
    color: ${token.colorTextSecondary};
    word-break: break-all;
  `,
  smallActionButton: css`
    && {
      height: 32px;
      border-radius: 12px;
      padding-inline: 16px;
      font-size: 12px;
      box-shadow: none;
    }
  `,
  smallTextActionButton: css`
    && {
      height: 28px;
      border-radius: 10px;
      padding-inline: 12px;
      font-size: 12px;
    }
  `,
  statusTag: css`
    display: inline-flex;
    align-items: center;
    border-radius: 10px;
    padding: 4px 12px;
    font-size: 12px;
    line-height: 1.2;
  `,
}));
