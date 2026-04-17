import { createStyles } from 'antd-style';

export const useSkillsStyles = createStyles(({ token, css }) => ({
  pageRoot: css`
    display: flex;
    flex-direction: column;
    width: 100%;
    min-width: 0;
    box-sizing: border-box;
    height: 100%;
    overflow: hidden;
  `,
  pageInner: css`
    width: min(80rem, 100%);
    max-width: 100%;
    min-width: 0;
    box-sizing: border-box;
    margin-left: auto;
    margin-right: auto;
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 40px 32px 32px;
    padding-top: 64px;
    overflow-y: auto;
    @media (max-width: 992px) {
      padding: 24px 20px 24px;
      padding-top: 44px;
    }
    @media (max-width: 640px) {
      padding: 20px 12px 20px;
      padding-top: 32px;
    }
  `,
  skillsPageRoot: css`
    display: flex;
    flex-direction: column;
    width: 100%;
    min-width: 0;
    box-sizing: border-box;
    height: 100%;
    overflow: hidden;
  `,
  skillsPageInner: css`
    width: 100%;
    max-width: 100%;
    min-width: 0;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 12px;
    height: 100%;
    padding: 0 32px;
    overflow: hidden;
    @media (max-width: 992px) {
      padding: 0 20px;
    }
    @media (max-width: 640px) {
      padding: 0 12px;
    }
  `,
  skillsPageContent: css`
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding-bottom: 40px;
    @media (max-width: 992px) {
      padding-bottom: 28px;
    }
    @media (max-width: 640px) {
      padding-bottom: 20px;
    }
  `,
  loadingWrapper: css`
    display: flex;
    flex-direction: column;
    margin: -24px;
    min-height: calc(100vh - 2.5rem);
    align-items: center;
    justify-content: center;
  `,

  /* Header */
  header: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  `,
  headerTitle: css`
    font-size: 24px;
    line-height: 1.2;
    color: ${token.colorText};
    font-weight: 700;
    margin: 0;
  `,
  headerSubtitle: css`
    display: none;
  `,
  headerActions: css`
    display: flex;
    align-items: center;
    gap: 8px;
  `,
  folderButton: css`
    cursor: pointer;
    transition: background 0.2s;
    flex-shrink: 0;
    font-size: 13px;
    font-weight: 500;
    padding: 0 16px;
    height: 32px;
    border-radius: 9999px;
    border: 1px solid rgba(0, 0, 0, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgba(0, 0, 0, 0.8);
    background: transparent;
    &:hover {
      background: rgba(0, 0, 0, 0.05);
      color: ${token.colorText};
    }
    [data-theme='dark'] & {
      border-color: rgba(255, 255, 255, 0.1);
      color: rgba(255, 255, 255, 0.8);
      &:hover {
        background: rgba(255, 255, 255, 0.05);
      }
    }
  `,

  /* Gateway Warning */
  gatewayWarning: css`
    margin-bottom: 12px;
    padding: 16px;
    border-radius: ${token.borderRadiusLG}px;
    border: 1px solid rgba(234, 179, 8, 0.5);
    background: rgba(234, 179, 8, 0.1);
    display: flex;
    align-items: center;
    gap: 12px;
  `,
  gatewayWarningIcon: css`
    color: #ca8a04;
    [data-theme='dark'] & {
      color: #facc15;
    }
  `,
  gatewayWarningText: css`
    color: #a16207;
    font-size: 14px;
    font-weight: 500;
    [data-theme='dark'] & {
      color: #facc15;
    }
  `,

  /* Sub Navigation */
  subNav: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
    gap: 12px;
  `,
  filterGroup: css`
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 16px;
    font-size: 14px;
  `,
  filterButtons: css`
    display: flex;
    align-items: center;
    gap: 24px;
  `,
  filterBtn: css`
    font-weight: 500;
    transition: color 0.2s;
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    background: none;
    border: none;
    padding: 0;
    color: ${token.colorTextSecondary};
    &:hover {
      color: ${token.colorText};
    }
  `,
  filterBtnActive: css`
    color: ${token.colorText};
  `,
  actionButtons: css`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  `,

  /* Content Area */
  contentArea: css`
    flex: 1;
    overflow-y: auto;
    padding-right: 8px;
    padding-bottom: 40px;
    min-height: 0;
    margin-right: -8px;
  `,

  /* Error Banner */
  errorBanner: css`
    margin-bottom: 16px;
    padding: 16px;
    border-radius: ${token.borderRadiusLG}px;
    border: 1px solid rgba(255, 77, 79, 0.5);
    background: rgba(255, 77, 79, 0.1);
    color: ${token.colorError};
    font-size: 14px;
    font-weight: 500;
    display: flex;
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 8px;
  `,

  /* Section headers (lobe-chat style) */
  sectionHeader: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 0;
  `,
  sectionTitle: css`
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: ${token.colorTextTertiary};
  `,
  sectionCount: css`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 16px;
    height: 16px;
    padding: 0 4px;
    border-radius: 8px;
    font-size: 10px;
    font-weight: 600;
    background: ${token.colorFillSecondary};
    color: ${token.colorTextSecondary};
    letter-spacing: 0;
    text-transform: none;
  `,
  sectionActions: css`
    display: flex;
    align-items: center;
    gap: 6px;
  `,
  sectionDivider: css`
    display: none;
  `,

  /* Skill List */
  skillList: css`
    display: flex;
    flex-direction: column;
  `,
  lobeListContainer: css`
    display: flex;
    flex-direction: column;
    gap: 0;
    padding-top: 18px;
  `,
  lobeListToolbar: css`
    display: flex;
    align-items: center;
    justify-content: flex-end;
    margin-bottom: 4px;
  `,
  emptyState: css`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 80px 0;
    color: ${token.colorTextSecondary};
  `,
  skillRow: css`
    display: grid;
    grid-template-columns: 48px minmax(0, 1fr) auto;
    width: 100%;
    box-sizing: border-box;
    align-items: center;
    gap: 16px;
    padding: 14px 0;
    border-radius: ${token.borderRadius}px;
    transition: background 0.15s;
    cursor: pointer;
    min-width: 0;
    @media (max-width: 768px) {
      grid-template-columns: 40px minmax(0, 1fr);
      column-gap: 12px;
      row-gap: 8px;
      align-items: flex-start;
    }
    &:hover {
      background: transparent;
    }
  `,
  skillIcon: css`
    flex-shrink: 0;
    grid-column: 1;
    width: 48px;
    height: 48px;
    border-radius: 12px;
    background: ${token.colorFillTertiary};
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    transition: opacity 0.2s;
    @media (max-width: 768px) {
      grid-row: 1 / span 2;
      width: 40px;
      height: 40px;
      border-radius: 10px;
      font-size: 20px;
    }
  `,
  skillInfo: css`
    display: flex;
    align-items: flex-start;
    gap: 16px;
    flex: 1;
    overflow: hidden;
    padding-right: 16px;
  `,
  skillMeta: css`
    display: flex;
    flex-direction: column;
    grid-column: 2;
    flex: 1;
    width: 100%;
    overflow: hidden;
    min-width: 0;
  `,
  skillNameRow: css`
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    min-width: 0;
    gap: 8px;
    margin-bottom: 4px;
  `,
  skillName: css`
    flex: 1 1 auto;
    min-width: 0;
    font-size: 15px;
    font-weight: 500;
    color: ${token.colorText};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    cursor: pointer;
    transition: color 0.15s;
    &:hover {
      color: ${token.colorPrimary};
    }
  `,
  skillSlug: css`
    font-size: 11px;
    font-family: monospace;
    padding: 2px 6px;
    border-radius: 4px;
    border: 1px solid rgba(0, 0, 0, 0.1);
    color: ${token.colorTextSecondary};
    [data-theme='dark'] & {
      border-color: rgba(255, 255, 255, 0.1);
    }
  `,
  skillDescription: css`
    font-size: 13px;
    color: ${token.colorTextSecondary};
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
    line-height: 1.5;
  `,
  skillTagRow: css`
    margin-top: 4px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    color: rgba(0, 0, 0, 0.55);
    [data-theme='dark'] & {
      color: rgba(255, 255, 255, 0.55);
    }
  `,
  skillBaseDirMono: css`
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: monospace;
  `,
  skillControls: css`
    display: flex;
    grid-column: 3;
    justify-self: end;
    align-items: center;
    gap: 12px;
    flex-shrink: 0;
    @media (max-width: 768px) {
      grid-column: 2;
      width: 100%;
      justify-content: space-between;
      gap: 10px;
    }
  `,
  skillStateText: css`
    font-size: 14px;
    color: ${token.colorTextTertiary};
    white-space: nowrap;
    min-width: 60px;
    text-align: right;
    @media (max-width: 768px) {
      min-width: auto;
      text-align: left;
      font-size: 13px;
    }
  `,
  skillStateInstalled: css`
    color: ${token.colorSuccess};
    font-weight: 500;
  `,
  skillStateDisabled: css`
    color: ${token.colorTextTertiary};
    font-weight: 500;
  `,
  skillActionMenuBtn: css`
    width: 38px;
    height: 38px;
    border-radius: 10px;
    border: 1px solid rgba(0, 0, 0, 0.1);
    background: transparent;
    color: ${token.colorTextSecondary};
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background 0.2s, color 0.2s, border-color 0.2s;
    &:hover {
      background: ${token.colorFillTertiary};
      color: ${token.colorText};
      border-color: rgba(0, 0, 0, 0.16);
    }
    [data-theme='dark'] & {
      border-color: rgba(255, 255, 255, 0.12);
      &:hover {
        border-color: rgba(255, 255, 255, 0.2);
      }
    }
  `,
  skillVersion: css`
    font-size: 13px;
    font-family: monospace;
    color: ${token.colorTextSecondary};
  `,
  iconBtn: css`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: ${token.borderRadius}px;
    border: none;
    background: transparent;
    cursor: pointer;
    color: ${token.colorTextSecondary};
    transition: background 0.15s, color 0.15s;
    &:hover {
      background: ${token.colorFillSecondary};
      color: ${token.colorText};
    }
    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  `,
  skillSourceTag: css`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    height: 20px;
    padding: 0 6px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 500;
    color: #22a055;
    background: #e9f7ee;
  `,
  skillSourceDot: css`
    width: 8px;
    height: 8px;
    border-radius: 50%;
    border: 1.5px solid #22a055;
    display: inline-block;
    box-sizing: border-box;
  `,

  /* Install Sheet */
  sheetHeader: css`
    padding: 24px 28px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
    [data-theme='dark'] & {
      border-color: rgba(255, 255, 255, 0.1);
    }
  `,
  sheetTitle: css`
    font-size: 14px;
    font-family: Georgia, Cambria, 'Times New Roman', Times, serif;
    color: ${token.colorText};
    font-weight: 400;
    letter-spacing: -0.025em;
  `,
  sheetSubtitle: css`
    margin-top: 4px;
    font-size: 13px;
    color: rgba(0, 0, 0, 0.7);
    [data-theme='dark'] & {
      color: rgba(255, 255, 255, 0.7);
    }
  `,
  sheetSearchRow: css`
    margin-top: 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    @media (min-width: 768px) {
      flex-direction: row;
    }
  `,
  sheetContent: css`
    flex: 1;
    overflow-y: auto;
    padding: 16px 24px;
  `,
  marketplaceEmptyState: css`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 80px 0;
    color: ${token.colorTextSecondary};
  `,
  marketplaceSearching: css`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 80px 0;
    color: ${token.colorTextSecondary};
  `,
  marketplaceList: css`
    display: flex;
    flex-direction: column;
    gap: 4px;
  `,
  marketplaceRow: css`
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    padding: 14px 12px;
    border-radius: ${token.borderRadiusLG}px;
    transition: background 0.2s;
    cursor: pointer;
    border-bottom: 1px solid rgba(0, 0, 0, 0.05);
    &:last-child {
      border-bottom: none;
    }
    &:hover {
      background: rgba(0, 0, 0, 0.05);
    }
    [data-theme='dark'] & {
      border-color: rgba(255, 255, 255, 0.05);
      &:hover {
        background: rgba(255, 255, 255, 0.05);
      }
    }
  `,
  marketplaceControls: css`
    display: flex;
    align-items: center;
    gap: 16px;
    flex-shrink: 0;
  `,
  marketplaceVersion: css`
    font-size: 13px;
    font-family: monospace;
    color: ${token.colorTextSecondary};
    margin-right: 8px;
  `,

  /* Skill Detail Sheet */
  detailScrollArea: css`
    flex: 1;
    overflow-y: auto;
    padding: 28px 32px;
  `,
  detailIconWrapper: css`
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 32px;
  `,
  detailIconCircle: css`
    width: 64px;
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: white;
    border: 1px solid rgba(0, 0, 0, 0.05);
    flex-shrink: 0;
    margin-bottom: 16px;
    position: relative;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    [data-theme='dark'] & {
      background: ${token.colorFillTertiary};
      border-color: rgba(255, 255, 255, 0.05);
    }
  `,
  detailCoreLock: css`
    position: absolute;
    bottom: -4px;
    right: -4px;
    background: #f3f1e9;
    border-radius: 50%;
    padding: 4px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    border: 1px solid rgba(0, 0, 0, 0.05);
    [data-theme='dark'] & {
      background: ${token.colorBgContainer};
      border-color: rgba(255, 255, 255, 0.05);
    }
  `,
  detailName: css`
    font-size: 14px;
    font-family: Georgia, Cambria, 'Times New Roman', Times, serif;
    color: ${token.colorText};
    font-weight: 400;
    margin-bottom: 12px;
    text-align: center;
    letter-spacing: -0.025em;
  `,
  detailBadgeRow: css`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    margin-bottom: 24px;
    opacity: 0.8;
  `,
  detailDescription: css`
    font-size: 14px;
    color: rgba(0, 0, 0, 0.7);
    font-weight: 500;
    line-height: 1.6;
    text-align: center;
    padding: 0 16px;
    [data-theme='dark'] & {
      color: rgba(255, 255, 255, 0.7);
    }
  `,
  detailSection: css`
    display: flex;
    flex-direction: column;
    gap: 28px;
    padding: 0 4px;
  `,
  detailSectionGroup: css`
    display: flex;
    flex-direction: column;
    gap: 8px;
  `,
  detailSectionTitle: css`
    font-size: 13px;
    font-weight: 700;
    color: rgba(0, 0, 0, 0.8);
    [data-theme='dark'] & {
      color: rgba(255, 255, 255, 0.8);
    }
  `,
  detailSectionTitleRow: css`
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 700;
    color: rgba(0, 0, 0, 0.8);
    [data-theme='dark'] & {
      color: rgba(255, 255, 255, 0.8);
    }
  `,
  detailPathRow: css`
    display: flex;
    align-items: center;
    gap: 8px;
  `,
  detailBadgesWrap: css`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  `,
  detailApiKeyDesc: css`
    font-size: 12px;
    color: rgba(0, 0, 0, 0.5);
    margin-top: 8px;
    font-weight: 500;
    [data-theme='dark'] & {
      color: rgba(255, 255, 255, 0.5);
    }
  `,
  detailEnvHeader: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
  `,
  detailEnvHeaderLeft: css`
    display: flex;
    align-items: center;
    gap: 8px;
  `,
  detailEnvVarList: css`
    display: flex;
    flex-direction: column;
    gap: 8px;
  `,
  detailEnvEmpty: css`
    font-size: 13px;
    color: rgba(0, 0, 0, 0.5);
    font-weight: 500;
    font-style: italic;
    display: flex;
    align-items: center;
    background: #eeece3;
    border: 1px solid rgba(0, 0, 0, 0.05);
    border-radius: ${token.borderRadiusLG}px;
    padding: 12px 16px;
    box-shadow: 0 1px 2px rgba(0,0,0,0.04);
    [data-theme='dark'] & {
      background: ${token.colorFillTertiary};
      border-color: rgba(255, 255, 255, 0.05);
      color: rgba(255, 255, 255, 0.5);
    }
  `,
  detailEnvRow: css`
    display: flex;
    align-items: center;
    gap: 12px;
  `,
  detailExternalLinks: css`
    display: flex;
    gap: 8px;
    justify-content: center;
    padding-top: 32px;
  `,
  detailFooter: css`
    padding: 28px 8px 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
    width: 100%;
    max-width: 340px;
    margin: 0 auto;
  `,

  /* Sheet panel overrides */
  skillDetailModal: css`
    & .ant-modal-content {
      padding: 0;
      border-radius: 16px;
      overflow: hidden;
      background: #f3f1e9;
      box-shadow: 0 18px 48px rgba(0, 0, 0, 0.22);
    }
    & .ant-modal-header {
      margin: 0;
      padding: 14px 56px 14px 56px;
      border-bottom: 1px solid rgba(0, 0, 0, 0.08);
      background: transparent;
      text-align: center;
    }
    & .ant-modal-title {
      font-size: 28px;
      font-weight: 700;
      color: ${token.colorText};
      line-height: 1.2;
      letter-spacing: 0.02em;
    }
    & .ant-modal-body {
      padding: 0;
    }
    & .ant-modal-close {
      top: 10px;
      right: 10px;
    }
    [data-theme='dark'] & .ant-modal-content {
      background: ${token.colorBgContainer};
    }
    [data-theme='dark'] & .ant-modal-header {
      border-bottom-color: rgba(255, 255, 255, 0.1);
    }
  `,
  skillDetailModalBody: css`
    display: flex;
    flex-direction: column;
    max-height: min(76vh, 820px);
  `,
  sheetSkillDetail: css`
    width: 100%;
    max-width: 450px;
    padding: 0;
    display: flex;
    flex-direction: column;
    border-left: 1px solid rgba(0, 0, 0, 0.1);
    background: #f3f1e9;
    box-shadow: 0 0 40px rgba(0, 0, 0, 0.2);
    [data-theme='dark'] & {
      border-color: rgba(255, 255, 255, 0.1);
      background: ${token.colorBgContainer};
    }
  `,
  sheetInstallPanel: css`
    width: 100%;
    max-width: 560px;
    padding: 0;
    display: flex;
    flex-direction: column;
    border-left: 1px solid rgba(0, 0, 0, 0.1);
    background: #f3f1e9;
    box-shadow: 0 0 40px rgba(0, 0, 0, 0.2);
    [data-theme='dark'] & {
      border-color: rgba(255, 255, 255, 0.1);
      background: ${token.colorBgContainer};
    }
  `,

  /* Badge overrides */
  detailBadgePill: css`
    font-family: monospace;
    font-size: 11px;
    font-weight: 500;
    padding: 2px 12px;
    border-radius: 9999px;
    background: rgba(0, 0, 0, 0.04);
    border: none;
    box-shadow: none;
    color: rgba(0, 0, 0, 0.7);
    transition: background 0.2s;
    &:hover {
      background: rgba(0, 0, 0, 0.08);
    }
    [data-theme='dark'] & {
      background: rgba(255, 255, 255, 0.08);
      color: rgba(255, 255, 255, 0.7);
      &:hover {
        background: rgba(255, 255, 255, 0.12);
      }
    }
  `,
  skillSourceBadge: css`
    padding: 0 6px;
    height: 20px;
    font-size: 10px;
    font-weight: 500;
    background: rgba(0, 0, 0, 0.05);
    border: none;
    box-shadow: none;
    [data-theme='dark'] & {
      background: rgba(255, 255, 255, 0.1);
    }
  `,
  envCountBadge: css`
    margin-left: 8px;
    padding: 0 6px;
    height: 20px;
    font-size: 10px;
    background: rgba(0, 0, 0, 0.1);
    border: none;
    color: ${token.colorText};
    [data-theme='dark'] & {
      background: rgba(255, 255, 255, 0.1);
    }
  `,

  /* Input overrides */
  pathInput: css`
    height: 38px;
    font-family: monospace;
    font-size: 12px;
    background: #eeece3;
    border-color: rgba(0, 0, 0, 0.1);
    border-radius: 12px;
    color: rgba(0, 0, 0, 0.7);
    [data-theme='dark'] & {
      background: ${token.colorFillSecondary};
      border-color: rgba(255, 255, 255, 0.1);
      color: rgba(255, 255, 255, 0.7);
    }
  `,
  apiKeyInput: css`
    height: 44px;
    font-family: monospace;
    font-size: 13px;
    background: #eeece3;
    border-color: rgba(0, 0, 0, 0.1);
    border-radius: 12px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
    [data-theme='dark'] & {
      background: ${token.colorFillSecondary};
      border-color: rgba(255, 255, 255, 0.1);
    }
  `,
  envInput: css`
    flex: 1;
    height: 40px;
    font-family: monospace;
    font-size: 13px;
    background: #eeece3;
    border-color: rgba(0, 0, 0, 0.1);
    border-radius: 12px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
    [data-theme='dark'] & {
      background: ${token.colorFillSecondary};
      border-color: rgba(255, 255, 255, 0.1);
    }
  `,

  /* Button overrides */
  envRemoveBtn: css`
    height: 40px;
    width: 40px;
    border-radius: 12px;
    flex-shrink: 0;
    transition: all 0.2s;
    color: ${token.colorError};
    opacity: 0.7;
    &:hover {
      opacity: 1;
      background: rgba(255, 77, 79, 0.1);
    }
  `,
  addEnvBtn: css`
    height: 28px;
    font-size: 12px;
    font-weight: 600;
    gap: 6px;
    padding: 0 10px;
    color: rgba(0, 0, 0, 0.8);
    &:hover {
      background: rgba(0, 0, 0, 0.05);
    }
    [data-theme='dark'] & {
      color: rgba(255, 255, 255, 0.8);
      &:hover {
        background: rgba(255, 255, 255, 0.05);
      }
    }
  `,
  externalLinkBtn: css`
    height: 28px;
    font-size: 11px;
    font-weight: 500;
    padding: 0 12px;
    gap: 6px;
    border-radius: 9999px;
    border-color: rgba(0, 0, 0, 0.1);
    background: transparent;
    box-shadow: none;
    color: rgba(0, 0, 0, 0.7);
    &:hover {
      background: rgba(0, 0, 0, 0.05);
    }
    [data-theme='dark'] & {
      border-color: rgba(255, 255, 255, 0.1);
      color: rgba(255, 255, 255, 0.7);
      &:hover {
        background: rgba(255, 255, 255, 0.05);
      }
    }
  `,
  toggleBtn: css`
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
    background: transparent;
    border-color: rgba(0, 0, 0, 0.2);
    color: rgba(0, 0, 0, 0.8);
    transition: all 0.2s;
    &:hover {
      background: rgba(0, 0, 0, 0.05);
      color: ${token.colorText};
    }
    [data-theme='dark'] & {
      border-color: rgba(255, 255, 255, 0.2);
      color: rgba(255, 255, 255, 0.8);
      &:hover {
        background: rgba(255, 255, 255, 0.05);
      }
    }
  `,
  actionBarBtn: css`
    height: 32px;
    font-size: 13px;
    font-weight: 500;
    border-radius: 6px;
    padding: 0 12px;
    border-color: rgba(0, 0, 0, 0.1);
    background: transparent;
    box-shadow: none;
    &:hover {
      background: rgba(0, 0, 0, 0.05);
    }
    [data-theme='dark'] & {
      border-color: rgba(255, 255, 255, 0.1);
      &:hover {
        background: rgba(255, 255, 255, 0.05);
      }
    }
  `,
  actionBarRefreshBtn: css`
    height: 32px;
    width: 32px;
    margin-left: 4px;
    border-radius: 6px;
    border-color: rgba(0, 0, 0, 0.1);
    background: transparent;
    box-shadow: none;
    color: ${token.colorTextSecondary};
    &:hover {
      background: rgba(0, 0, 0, 0.05);
      color: ${token.colorText};
    }
    [data-theme='dark'] & {
      border-color: rgba(255, 255, 255, 0.1);
      &:hover {
        background: rgba(255, 255, 255, 0.05);
      }
    }
  `,

  /* SearchInput wrappers */
  searchWrapper: css`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-right: 8px;
    border-radius: 9999px;
    border: 1px solid transparent;
    background: rgba(0, 0, 0, 0.05);
    padding: 6px 12px;
    transition: all 0.2s;
    &:focus-within {
      border-color: rgba(0, 0, 0, 0.1);
      background: rgba(0, 0, 0, 0.1);
    }
    [data-theme='dark'] & {
      background: rgba(255, 255, 255, 0.05);
      &:focus-within {
        border-color: rgba(255, 255, 255, 0.1);
      }
    }
  `,
  searchInputEl: css`
    width: 112px;
    font-size: 13px;
    font-weight: 400;
    @media (min-width: 768px) {
      width: 160px;
    }
  `,
  marketplaceSearchWrapper: css`
    flex: 1;
    display: flex;
    align-items: center;
    gap: 8px;
    border-radius: 12px;
    border: 1px solid rgba(0, 0, 0, 0.1);
    background: rgba(0, 0, 0, 0.05);
    padding: 8px 12px;
    [data-theme='dark'] & {
      border-color: rgba(255, 255, 255, 0.1);
      background: rgba(255, 255, 255, 0.05);
    }
  `,
  marketplaceSearchInputEl: css`
    font-size: 13px;
    box-shadow: none;
  `,
  marketplaceSourceBtn: css`
    height: 40px;
    border-radius: 12px;
    border-color: rgba(0, 0, 0, 0.1);
    background: transparent;
    color: ${token.colorTextSecondary};
    [data-theme='dark'] & {
      border-color: rgba(255, 255, 255, 0.1);
    }
  `,
  installBtn: css`
    height: 32px;
    padding: 0 16px;
    border-radius: 9999px;
    box-shadow: none;
    font-weight: 500;
    font-size: 12px;
  `,
  uninstallBtn: css`
    height: 32px;
    box-shadow: none;
  `,
}));
