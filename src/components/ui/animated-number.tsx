/**
 * AnimatedNumber
 * Ported from lobe-chat — zero external dependencies.
 * Smoothly transitions a numeric value with easeOutCubic easing.
 *
 * Usage:
 *   <AnimatedNumber value={totalTokens} duration={1500}
 *     formatter={(v) => Math.round(v).toLocaleString()} />
 */
import { memo, useEffect, useRef, useState } from 'react';

interface AnimatedNumberProps {
  /** Target value to animate toward */
  value: number;
  /** Animation duration in ms (default: 1500) */
  duration?: number;
  /** Optional formatter applied to the current display value */
  formatter?: (value: number) => string;
}

const AnimatedNumber = memo<AnimatedNumberProps>(({ value, duration = 1500, formatter }) => {
  const [displayValue, setDisplayValue] = useState(value);
  const frameRef = useRef<number>(undefined);
  const startTimeRef = useRef<number>(undefined);
  const startValueRef = useRef(value);

  useEffect(() => {
    const startValue = startValueRef.current;
    const diff = value - startValue;

    if (diff === 0) return;

    const animate = (currentTime: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = currentTime;
      }

      const elapsed = currentTime - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);

      // easeOutCubic
      const easeProgress = 1 - (1 - progress) ** 3;
      const current = startValue + diff * easeProgress;

      setDisplayValue(current);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        startValueRef.current = value;
        startTimeRef.current = undefined;
      }
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [value, duration]);

  return <>{formatter ? formatter(displayValue) : displayValue.toString()}</>;
});

AnimatedNumber.displayName = 'AnimatedNumber';

export default AnimatedNumber;
