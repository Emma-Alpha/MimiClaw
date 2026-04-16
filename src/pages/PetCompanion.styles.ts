import { createStyles } from 'antd-style';

export const useStyles = createStyles(({ css }) => ({
  root: css`
    position: relative;
    height: 100vh;
    width: 100vw;
    overflow: hidden;
    background: #f4f7fb;
    color: #1e293b;
    display: flex;
    flex-direction: column;
    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'PingFang SC', sans-serif;
    user-select: none;
    border: 1px solid #e2e8f0;
  `,
  auraLayer: css`
    position: absolute;
    inset: 0;
    z-index: 0;
    pointer-events: none;
    overflow: hidden;
  `,
  auraGradient: css`
    position: absolute;
    inset: 0;
  `,
  auraCenter: css`
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(ellipse at center, rgba(255, 255, 255, 0.5) 0%, transparent 50%);
    mix-blend-mode: overlay;
  `,
  auraCrown: css`
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 140vw;
    height: 140vw;
    display: flex;
    align-items: center;
    justify-content: center;
    mix-blend-mode: overlay;
    opacity: 0.1;
    filter: blur(4px);
  `,
  headerBar: css`
    position: relative;
    z-index: 20;
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    height: 40px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
    -webkit-app-region: drag;
    transition: background 1s, border-color 1s;
  `,
  headerBarNormal: css`
    background: #ffffff;
    border-bottom: 1px solid #e2e8f0;
  `,
  headerBarSpecial: css`
    background: rgba(255, 255, 255, 0.4);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.5);
  `,
  headerTitle: css`
    font-size: 14px;
    display: flex;
    align-items: center;
    gap: 6px;
    font-weight: 900;
    letter-spacing: 0.1em;
    transition: all 1s;
  `,
  headerTitleNormal: css`
    color: #1e293b;
  `,
  seedLabel: css`
    font-size: 10px;
    font-family: monospace;
    font-weight: 900;
    position: relative;
    top: 1px;
    letter-spacing: normal;
    padding: 0 4px;
    border-radius: 4px;
  `,
  seedLabelNormal: css`
    color: #cbd5e1;
    background: #f8fafc;
  `,
  seedLabelSpecial: css`
    color: rgba(255, 255, 255, 0.9);
    background: rgba(0, 0, 0, 0.05);
  `,
  closeBtn: css`
    position: absolute;
    right: 12px;
    top: 8px;
    display: inline-flex;
    height: 24px;
    width: 24px;
    align-items: center;
    justify-content: center;
    border-radius: 9999px;
    border: none;
    cursor: pointer;
    transition: all 0.2s;
    -webkit-app-region: no-drag;
    &:hover {
      background: #3b82f6;
      color: #fff;
    }
  `,
  closeBtnNormal: css`
    background: #f1f5f9;
    color: #94a3b8;
  `,
  closeBtnSpecial: css`
    background: rgba(0, 0, 0, 0.05);
    color: #64748b;
  `,
  content: css`
    flex: 1;
    padding: 0 16px 8px;
    padding-top: 0;
    z-index: 10;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    max-width: 384px;
    margin: 0 auto;
  `,
  cardGrid: css`
    margin-top: 10px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    padding: 0 4px;
  `,
  statsWrap: css`
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    margin-top: 8px;
    padding: 0 4px;
    min-height: 0;
  `,
  actionGrid: css`
    margin-top: 10px;
    display: grid;
    flex-shrink: 0;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    padding: 0 4px 4px;
  `,
  loadingWrap: css`
    display: flex;
    height: 100%;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    color: #60a5fa;
  `,
  loadingText: css`
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.1em;
  `,

  /* CompanionStats */
  statsList: css`
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 100%;
    max-width: 384px;
    margin: 0 auto;
    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    justify-content: center;
    margin-top: 10px;
  `,
  statRow: css`
    position: relative;
    width: 100%;
  `,
  statIconBubble: css`
    position: absolute;
    left: -4px;
    top: 0;
    height: 32px;
    width: 32px;
    border-radius: 9999px;
    border: 2.5px solid #ffffff;
    z-index: 20;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
    overflow: hidden;
    background-size: cover;
    background-position: center;
  `,
  statIconImg: css`
    width: 100%;
    height: 100%;
    object-fit: cover;
    transform: scale(1.12);
  `,
  statBarContainer: css`
    position: relative;
    margin-left: 18px;
    height: 32px;
    border-radius: 20px 16px 16px 20px;
    background: #f1f5f9;
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.05);
    overflow: hidden;
    border: 1px solid #e2e8f0;
  `,
  statBarFill: css`
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    border-radius: 20px 16px 16px 20px;
    border-right-width: 2px;
    border-right-style: solid;
    transition: width 1s ease-out;
  `,
  statBarHighlight: css`
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 6px;
    background: linear-gradient(to bottom, rgba(255, 255, 255, 0.4), transparent);
    border-radius: 16px 16px 0 0;
  `,
  statLabel: css`
    position: absolute;
    left: 20px;
    top: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    color: #fff;
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.6));
    z-index: 10;
    width: 200px;
  `,
  statName: css`
    font-weight: 800;
    font-size: 12px;
    letter-spacing: 0.05em;
  `,
  statDesc: css`
    margin-left: 6px;
    font-size: 10px;
    color: rgba(255, 255, 255, 0.95);
    transform: scale(0.9);
    transform-origin: left center;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    width: 140px;
    display: none;
    @media (min-width: 640px) {
      display: inline-block;
    }
  `,
  statValue: css`
    position: absolute;
    right: 12px;
    top: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    color: #64748b;
    font-weight: 800;
    font-style: italic;
    z-index: 0;
    font-size: 13px;
  `,
}));
