import { Variants, Transition } from 'framer-motion';

/**
 * Check if user prefers reduced motion
 * This is used to conditionally disable animations
 */
const prefersReducedMotion = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

// Transition Presets
export const transitions = {
  spring: {
    type: 'spring',
    stiffness: 100,
    damping: 15,
  } as Transition,
  smooth: {
    duration: 0.5,
    ease: 'easeOut',
  } as Transition,
  fast: {
    duration: 0.2,
    ease: 'easeOut',
  } as Transition,
  slow: {
    duration: 0.8,
    ease: 'easeOut',
  } as Transition,
};

// Basic Animation Variants
export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const fadeInUp: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 20 },
};

export const fadeInDown: Variants = {
  initial: { opacity: 0, y: -20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

export const scaleIn: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

export const slideInLeft: Variants = {
  initial: { opacity: 0, x: -50 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -50 },
};

export const slideInRight: Variants = {
  initial: { opacity: 0, x: 50 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 50 },
};

// Stagger Configurations
export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

export const staggerItem: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

// Complex Animation Variants
export const floatAnimation: Variants = {
  initial: { y: 0 },
  animate: {
    y: [-10, 10, -10],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

export const glowAnimation: Variants = {
  initial: { boxShadow: '0 0 20px rgba(59, 130, 246, 0.5)' },
  animate: {
    boxShadow: [
      '0 0 20px rgba(59, 130, 246, 0.5)',
      '0 0 30px rgba(59, 130, 246, 0.8)',
      '0 0 20px rgba(59, 130, 246, 0.5)',
    ],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

// Card Hover Animation
export const cardHover: Variants = {
  initial: { scale: 1, y: 0 },
  hover: {
    scale: 1.05,
    y: -5,
    transition: transitions.spring,
  },
};

// Button Hover Animation
export const buttonHover: Variants = {
  initial: { scale: 1 },
  hover: {
    scale: 1.05,
    transition: transitions.fast,
  },
  tap: {
    scale: 0.95,
  },
};

// Page Transition Variants
export const pageTransition: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: transitions.smooth,
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: transitions.fast,
  },
};

// Utility function to create custom stagger
export const createStagger = (staggerDelay: number = 0.1, delayChildren: number = 0) => ({
  initial: {},
  animate: {
    transition: {
      staggerChildren: staggerDelay,
      delayChildren,
    },
  },
});

// Utility function to create custom fade in with delay
export const createFadeIn = (delay: number = 0, duration: number = 0.5) => ({
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: {
      delay,
      duration,
      ease: 'easeOut',
    },
  },
});

// Utility function to create custom slide in
export const createSlideIn = (
  direction: 'up' | 'down' | 'left' | 'right',
  distance: number = 50,
  delay: number = 0
) => {
  const axis = direction === 'up' || direction === 'down' ? 'y' : 'x';
  const value = direction === 'up' || direction === 'left' ? distance : -distance;

  return {
    initial: { opacity: 0, [axis]: value },
    animate: {
      opacity: 1,
      [axis]: 0,
      transition: {
        delay,
        ...transitions.smooth,
      },
    },
  };
};

