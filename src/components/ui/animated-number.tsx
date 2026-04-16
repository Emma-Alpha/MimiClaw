/**
 * AnimatedNumber
 * Smoothly transitions a numeric value with easeOutCubic easing via requestAnimationFrame.
 */
import { memo, useEffect, useRef, useState } from 'react';

interface AnimatedNumberProps {
  value: number;
  duration?: number;
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

    const animate = (now: number) => {
      startTimeRef.current ??= now;
      const progress = Math.min((now - startTimeRef.current) / duration, 1);
      const eased = 1 - (1 - progress) ** 3;
      setDisplayValue(startValue + diff * eased);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        startValueRef.current = value;
        startTimeRef.current = undefined;
      }
    };

    frameRef.current = requestAnimationFrame(animate);
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  }, [value, duration]);

  return <>{formatter ? formatter(displayValue) : displayValue.toString()}</>;
});

AnimatedNumber.displayName = 'AnimatedNumber';

export default AnimatedNumber;
