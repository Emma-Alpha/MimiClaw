import { createStyles, cssVar } from 'antd-style';
import { Sparkles } from 'lucide-react';
import { memo, useCallback, useEffect, useRef, useState } from 'react';

import type { MarketplacePlugin } from '@/types/claude-plugin';
import { HERO_PROMPTS } from '@/stores/plugins';

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

  /* layer 1: aurora gradient */
  bg: css`
    pointer-events: none;
    position: absolute;
    inset: 0;
    background:
      radial-gradient(ellipse 80% 60% at 20% 80%, rgba(180, 140, 255, 0.35) 0%, transparent 70%),
      radial-gradient(ellipse 60% 80% at 80% 20%, rgba(140, 180, 255, 0.3) 0%, transparent 70%),
      radial-gradient(ellipse 90% 50% at 50% 50%, rgba(200, 160, 255, 0.2) 0%, transparent 80%),
      linear-gradient(135deg, #e8dff5 0%, #f0eaf8 30%, #e0d8f0 60%, #d8d0ea 100%);
  `,

  /* layer 2: surface overlay */
  overlay: css`
    pointer-events: none;
    position: absolute;
    inset: 0;
    background: color-mix(in srgb, ${cssVar.colorBgLayout} 70%, transparent);
  `,

  /* sliding area — only prompt cards slide */
  slideArea: css`
    position: absolute;
    inset: 0;
    bottom: 60px;
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
    padding: 0 48px;
  `,

  /* prompt card (frosted glass) */
  promptCard: css`
    max-width: 77%;
    border-radius: 16px;
    background: color-mix(in srgb, ${cssVar.colorBgLayout} 75%, transparent);
    backdrop-filter: blur(12px);
    padding: 10px 16px;
    box-shadow: 0 0 0 1px ${token.colorBorderSecondary};
    font-size: 14px;
    color: ${cssVar.colorText};
    word-break: break-word;
    line-height: 1.6;
    z-index: 1;
  `,
  promptBadge: css`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    border-radius: 6px;
    background: ${token.colorSuccessBg};
    color: ${token.colorSuccess};
    font-size: 12px;
    font-weight: 500;
    margin-inline-end: 8px;
    vertical-align: middle;
  `,

  /* CTA button — fixed at bottom center */
  cta: css`
    position: absolute;
    bottom: 16px;
    left: 50%;
    transform: translateX(-50%);
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 20px;
    border-radius: 999px;
    border: none;
    background: ${cssVar.colorText};
    color: ${cssVar.colorBgLayout};
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    z-index: 1;
    transition: opacity 0.15s;
    white-space: nowrap;

    &:hover {
      opacity: 0.85;
    }
  `,

  /* dots — fixed at right center */
  dots: css`
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
  onTryInChat?: (plugin: MarketplacePlugin) => void;
  plugins: MarketplacePlugin[];
}

const HeroCarousel = memo<HeroCarouselProps>(({ plugins, onTryInChat }) => {
  const { styles, cx } = useStyles();
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const count = plugins.length;
  const activePlugin = plugins[activeIndex];

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
    const onVisChange = () => setPaused(document.hidden);
    document.addEventListener('visibilitychange', onVisChange);
    return () => document.removeEventListener('visibilitychange', onVisChange);
  }, []);

  if (count === 0) return null;

  return (
    <div
      className={styles.root}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Layer 1: bg */}
      <div className={styles.bg} />
      {/* Layer 2: overlay */}
      <div className={styles.overlay} />

      {/* Sliding prompt cards only */}
      <div className={styles.slideArea}>
        <div
          className={styles.slideTrack}
          style={{ transform: `translateY(-${activeIndex * 100}%)` }}
        >
          {plugins.map((plugin) => {
            const prompt = HERO_PROMPTS[plugin.id] ?? plugin.description;
            return (
              <div key={plugin.id} className={styles.slide}>
                <div className={styles.promptCard}>
                  <span className={styles.promptBadge}>
                    🎨 {plugin.name}
                  </span>
                  {prompt}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Fixed CTA button */}
      <button
        type="button"
        className={styles.cta}
        onClick={() => activePlugin && onTryInChat?.(activePlugin)}
      >
        <Sparkles size={14} />
        在对话中试用
      </button>

      {/* Fixed dots */}
      {count > 1 && (
        <div className={styles.dots}>
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
