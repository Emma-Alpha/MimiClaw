import { createStyles, cssVar } from 'antd-style';
import { memo, useCallback, useEffect, useRef, useState } from 'react';

import PluginAvatar from '@/components/Plugins/PluginAvatar';
import type { MarketplacePlugin } from '@/types/claude-plugin';

const CAROUSEL_HEIGHT = 275;
const AUTO_ROTATE_MS = 5000;

const useStyles = createStyles(({ css, token }) => ({
  root: css`
    position: relative;
    height: ${CAROUSEL_HEIGHT}px;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: inset 0 0 0 1px ${token.colorBorderSecondary};
  `,
  bgGradient: css`
    position: absolute;
    inset: 0;
    background: linear-gradient(
      135deg,
      ${token.colorPrimaryBg} 0%,
      ${token.colorBgLayout} 50%,
      ${token.colorPrimaryBgHover} 100%
    );
  `,
  bgOverlay: css`
    position: absolute;
    inset: 0;
    background: color-mix(in srgb, ${cssVar.colorBgLayout} 70%, transparent);
  `,
  slidesWrapper: css`
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
  `,
  slideTrack: css`
    display: flex;
    flex-direction: column;
    height: 100%;
    transition: transform 0.3s ease-out;
  `,
  slide: css`
    flex: 0 0 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px 32px;
  `,
  slideContent: css`
    max-width: 640px;
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 12px;
    z-index: 1;
  `,
  pluginName: css`
    font-size: 18px;
    font-weight: 600;
    color: ${cssVar.colorText};
  `,
  pluginDesc: css`
    font-size: 13px;
    color: ${cssVar.colorTextSecondary};
    line-height: 1.5;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  `,
  ctaButton: css`
    margin-top: 4px;
    padding: 8px 20px;
    border-radius: 8px;
    border: none;
    background: ${token.colorPrimary};
    color: ${token.colorWhite};
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: opacity 0.15s;

    &:hover {
      opacity: 0.9;
    }
  `,
  dotsDesktop: css`
    position: absolute;
    right: 16px;
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    flex-direction: column;
    gap: 6px;
    z-index: 2;
  `,
  dot: css`
    width: 5px;
    height: 5px;
    border-radius: 50%;
    border: none;
    padding: 0;
    cursor: pointer;
    transition: background-color 0.15s;
  `,
  dotActive: css`
    background: ${cssVar.colorText};
  `,
  dotInactive: css`
    background: color-mix(in srgb, ${cssVar.colorText} 30%, transparent);

    &:hover {
      background: color-mix(in srgb, ${cssVar.colorText} 50%, transparent);
    }
  `,
}));

interface HeroCarouselProps {
  plugins: MarketplacePlugin[];
  onTryInChat?: (plugin: MarketplacePlugin) => void;
}

const HeroCarousel = memo<HeroCarouselProps>(({ plugins, onTryInChat }) => {
  const { styles, cx } = useStyles();
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const count = plugins.length;

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (paused || count <= 1) {
      clearTimer();
      return;
    }
    timerRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % count);
    }, AUTO_ROTATE_MS);
    return clearTimer;
  }, [paused, count, clearTimer]);

  useEffect(() => {
    const onVisibilityChange = () => setPaused(document.hidden);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () =>
      document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  if (count === 0) return null;

  return (
    <div
      className={styles.root}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className={styles.bgGradient} />
      <div className={styles.bgOverlay} />

      <div className={styles.slidesWrapper}>
        <div
          className={styles.slideTrack}
          style={{ transform: `translateY(-${activeIndex * 100}%)` }}
        >
          {plugins.map((plugin) => (
            <div key={plugin.id} className={styles.slide}>
              <div className={styles.slideContent}>
                <PluginAvatar
                  avatar={plugin.icon || 'MCP_AVATAR'}
                  size={56}
                  style={{ borderRadius: 12 }}
                />
                <span className={styles.pluginName}>{plugin.name}</span>
                <span className={styles.pluginDesc}>
                  {plugin.description}
                </span>
                {onTryInChat && (
                  <button
                    type="button"
                    className={styles.ctaButton}
                    onClick={() => onTryInChat(plugin)}
                  >
                    在对话中试用
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {count > 1 && (
        <div className={styles.dotsDesktop}>
          {plugins.map((_, i) => (
            <button
              key={i}
              type="button"
              className={cx(
                styles.dot,
                i === activeIndex ? styles.dotActive : styles.dotInactive,
              )}
              onClick={() => setActiveIndex(i)}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
});

export default HeroCarousel;
