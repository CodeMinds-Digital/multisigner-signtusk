import { useInView } from 'react-intersection-observer';
import { useEffect, useState } from 'react';

interface UseScrollAnimationOptions {
  threshold?: number;
  triggerOnce?: boolean;
  rootMargin?: string;
  delay?: number;
}

interface UseScrollAnimationReturn {
  ref: (node?: Element | null) => void;
  inView: boolean;
  entry?: IntersectionObserverEntry;
  isVisible: boolean;
}

/**
 * Custom hook for scroll-triggered animations using react-intersection-observer
 * 
 * @param options - Configuration options for the intersection observer
 * @returns Object containing ref, inView state, entry, and isVisible state
 * 
 * @example
 * const { ref, isVisible } = useScrollAnimation({ threshold: 0.3, triggerOnce: true });
 * 
 * <motion.div
 *   ref={ref}
 *   initial={{ opacity: 0, y: 50 }}
 *   animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
 * >
 *   Content
 * </motion.div>
 */
export function useScrollAnimation(
  options: UseScrollAnimationOptions = {}
): UseScrollAnimationReturn {
  const {
    threshold = 0.1,
    triggerOnce = true,
    rootMargin = '0px',
    delay = 0,
  } = options;

  const { ref, inView, entry } = useInView({
    threshold,
    triggerOnce,
    rootMargin,
  });

  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (inView) {
      if (delay > 0) {
        const timer = setTimeout(() => {
          setIsVisible(true);
        }, delay);
        return () => clearTimeout(timer);
      } else {
        setIsVisible(true);
      }
    } else if (!triggerOnce) {
      setIsVisible(false);
    }
  }, [inView, delay, triggerOnce]);

  return {
    ref,
    inView,
    entry,
    isVisible,
  };
}

/**
 * Hook for staggered animations with index-based delay
 * 
 * @param index - Index of the element in a list
 * @param staggerDelay - Delay between each element (in milliseconds)
 * @param options - Additional intersection observer options
 * @returns Object containing ref and isVisible state
 * 
 * @example
 * items.map((item, index) => {
 *   const { ref, isVisible } = useStaggerAnimation(index, 100);
 *   return (
 *     <motion.div
 *       ref={ref}
 *       initial={{ opacity: 0, y: 20 }}
 *       animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
 *     >
 *       {item}
 *     </motion.div>
 *   );
 * });
 */
export function useStaggerAnimation(
  index: number,
  staggerDelay: number = 100,
  options: UseScrollAnimationOptions = {}
) {
  const calculatedDelay = index * staggerDelay;
  
  return useScrollAnimation({
    ...options,
    delay: calculatedDelay,
  });
}

/**
 * Hook for parallax scroll effects
 * 
 * @param speed - Parallax speed multiplier (0.5 = slow, 1 = medium, 2 = fast)
 * @returns Object containing ref and scroll offset
 */
export function useParallax(speed: number = 1) {
  const [offset, setOffset] = useState(0);
  const { ref, entry } = useInView({
    threshold: 0,
    triggerOnce: false,
  });

  useEffect(() => {
    const handleScroll = () => {
      if (entry?.target) {
        const rect = entry.target.getBoundingClientRect();
        const scrolled = window.scrollY;
        const elementTop = rect.top + scrolled;
        const offset = (scrolled - elementTop) * speed;
        setOffset(offset);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [entry, speed]);

  return { ref, offset };
}

