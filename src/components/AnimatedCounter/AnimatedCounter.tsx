import React, { useEffect, useState, useRef } from 'react';

/**
 * Custom hook that animates a numeric value from its current state to a target value
 * using requestAnimationFrame and Out-Quart easing for silky-smooth motion.
 */
export const useAnimatedNumber = (
  targetValue: number,
  duration: number = 750
): number => {
  const [displayValue, setDisplayValue] = useState<number>(() => targetValue);
  const currentValRef = useRef<number>(targetValue);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    // Check for user preference of reduced motion
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplayValue(targetValue);
      currentValRef.current = targetValue;
      return;
    }

    const startVal = currentValRef.current;
    if (startVal === targetValue) {
      setDisplayValue(targetValue);
      return;
    }

    startTimeRef.current = null;
    let animFrame: number;

    // Out-Quart easing: fast acceleration with a gentle, soft landing
    const easeOutQuart = (t: number): number => 1 - Math.pow(1 - t, 4);

    const step = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutQuart(progress);
      const nextValue = startVal + (targetValue - startVal) * eased;

      currentValRef.current = nextValue;
      setDisplayValue(nextValue);

      if (progress < 1) {
        animFrame = requestAnimationFrame(step);
      } else {
        currentValRef.current = targetValue;
        setDisplayValue(targetValue);
      }
    };

    animFrame = requestAnimationFrame(step);
    return () => {
      if (animFrame) cancelAnimationFrame(animFrame);
    };
  }, [targetValue, duration]);

  return displayValue;
};

export interface AnimatedCounterProps {
  value: number;
  duration?: number;
  formatter?: (val: number) => string;
  className?: string;
}

/**
 * Component that smoothly counts up or down to a specified target number.
 */
export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  duration = 750,
  formatter,
  className = '',
}) => {
  const animatedValue = useAnimatedNumber(value, duration);
  const formatted = formatter ? formatter(animatedValue) : animatedValue.toLocaleString('en-IN');

  return <span className={`animated-counter ${className}`}>{formatted}</span>;
};
