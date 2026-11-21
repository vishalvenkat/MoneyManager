import React, { useEffect, useRef, useState } from 'react';
import './ScrollReveal.css';

export interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  animation?: 'fade-up' | 'fade-in' | 'slide-up' | 'scale-up';
  delay?: number; // Delay in milliseconds
  threshold?: number;
}

/**
 * ScrollReveal wrapper component that triggers a hardware-accelerated entry animation
 * when the element scrolls into view (or on initial load).
 */
export const ScrollReveal: React.FC<ScrollRevealProps> = ({
  children,
  className = '',
  animation = 'fade-up',
  delay = 0,
  threshold = 0.08,
}) => {
  const [isRevealed, setIsRevealed] = useState(false);
  const domRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // If user prefers reduced motion, reveal instantly
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setIsRevealed(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsRevealed(true);
            if (domRef.current) observer.unobserve(domRef.current);
          }
        });
      },
      { threshold, rootMargin: '0px 0px -20px 0px' }
    );

    const currentEl = domRef.current;
    if (currentEl) {
      observer.observe(currentEl);
    }

    return () => {
      if (currentEl) observer.unobserve(currentEl);
    };
  }, [threshold]);

  return (
    <div
      ref={domRef}
      className={`scroll-reveal-item ${animation} ${isRevealed ? 'is-revealed' : ''} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};
