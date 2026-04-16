import { createStyles } from 'antd-style';

export const useStyles = createStyles(({ css }) => ({
  root: css`
    display: grid;
    min-height: 100vh;
    max-height: 100vh;
    overflow: hidden;
    background: #ffffff;
    color: #0f172a;
    grid-template-columns: 1fr;
    @media (min-width: 1024px) {
      grid-template-columns: 55% 45%;
    }
  `,
  leftSection: css`
    position: relative;
    display: none;
    flex-direction: column;
    background: linear-gradient(180deg, #f7f1e7 0%, #f4efe5 34%, #eef6f1 100%);
    padding: 48px;
    padding-top: 80px;
    @media (min-width: 1024px) {
      display: flex;
    }
  `,
  logoWrap: css`
    position: relative;
    z-index: 20;
    display: flex;
    align-items: center;
    gap: 14px;
  `,
  logoImg: css`
    height: 48px;
    width: 48px;
    object-fit: contain;
  `,
  logoText: css`
    font-size: 14px;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: #0f172a;
  `,
  charactersWrap: css`
    position: relative;
    z-index: 20;
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: center;
  `,
  decorBlur1: css`
    position: absolute;
    left: -10%;
    top: -10%;
    height: 480px;
    width: 480px;
    border-radius: 9999px;
    background: rgba(247, 216, 191, 0.4);
    filter: blur(64px);
    pointer-events: none;
  `,
  decorBlur2: css`
    position: absolute;
    right: -5%;
    top: 20%;
    height: 400px;
    width: 400px;
    border-radius: 9999px;
    background: rgba(211, 234, 220, 0.5);
    filter: blur(64px);
    pointer-events: none;
  `,
  rightSection: css`
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 32px;
    padding-top: 80px;
    background: #ffffff;
  `,
  formContainer: css`
    width: 100%;
    max-width: 400px;
  `,
  mobileLogoWrap: css`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 14px;
    margin-bottom: 40px;
    @media (min-width: 1024px) {
      display: none;
    }
  `,
  header: css`
    margin-bottom: 32px;
  `,
  headerTitle: css`
    font-size: 14px;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: #0f172a;
    margin: 0 0 8px;
  `,
  tabs: css`
    display: flex;
    gap: 24px;
    border-bottom: 1px solid #e2e8f0;
    margin-bottom: 32px;
  `,
  tabBtnActive: css`
    padding-bottom: 12px;
    font-size: 14px;
    font-weight: 500;
    color: #3478f6;
    background: none;
    border: none;
    cursor: pointer;
    position: relative;
    transition: color 0.2s;
  `,
  tabBtnInactive: css`
    padding-bottom: 12px;
    font-size: 14px;
    font-weight: 500;
    color: #64748b;
    background: none;
    border: none;
    cursor: pointer;
    position: relative;
    transition: color 0.2s;
    &:hover {
      color: #1e293b;
    }
  `,
  tabIndicator: css`
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: #3478f6;
    border-radius: 3px 3px 0 0;
  `,
  tabContent: css`
    position: relative;
    min-height: 240px;
  `,
  tabPane: css`
    position: absolute;
    inset: 0;
    padding: 8px 0;
  `,
  oauthBtn: css`
    display: flex;
    width: 100%;
    height: 48px;
    align-items: center;
    justify-content: center;
    gap: 8px;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    color: #334155;
    cursor: pointer;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    transition: all 0.2s;
    &:hover {
      background: #f8fafc;
    }
    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  `,
  errorBox: css`
    margin-top: 16px;
    border-radius: 8px;
    border: 1px solid #fecaca;
    background: #fef2f2;
    padding: 12px 16px;
    font-size: 14px;
    color: #dc2626;
  `,
  noticeBox: css`
    margin-top: 16px;
    border-radius: 8px;
    border: 1px solid #bae6fd;
    background: #f0f9ff;
    padding: 12px 16px;
    font-size: 14px;
    color: #0369a1;
  `,
  form: css`
    display: flex;
    flex-direction: column;
    gap: 24px;
  `,
  inputGroup: css`
    display: flex;
    flex-direction: column;
    gap: 16px;
  `,
  inputWrap: css`
    position: relative;
  `,
  passwordToggle: css`
    position: absolute;
    right: 16px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    color: #94a3b8;
    cursor: pointer;
    transition: color 0.2s;
    &:hover {
      color: #475569;
    }
    &:disabled {
      cursor: not-allowed;
    }
  `,
  submitBtn: css`
    display: flex;
    width: 100%;
    height: 48px;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    background: #3478f6;
    font-size: 14px;
    font-weight: 500;
    color: #fff;
    border: none;
    cursor: pointer;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    transition: all 0.2s;
    &:hover {
      background: #2b66d3;
    }
    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  `,
}));
