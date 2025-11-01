'use client';

import React from 'react';
import { motion, Variants } from 'framer-motion';
import { useScrollAnimation } from '@/hooks/use-scroll-animation';
import { cn } from '@/lib/utils';

export type AnimationVariant = 'fadeIn' | 'slideUp' | 'slideDown' | 'scaleIn';

interface AnimatedSectionProps {
  children: React.ReactNode;
  variant?: AnimationVariant;
  staggerChildren?: number;
  delay?: number;
  duration?: number;
  className?: string;
  threshold?: number;
  triggerOnce?: boolean;
}

const animationVariants: Record<AnimationVariant, Variants> = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
  },
  slideUp: {
    initial: { opacity: 0, y: 50 },
    animate: { opacity: 1, y: 0 },
  },
  slideDown: {
    initial: { opacity: 0, y: -50 },
    animate: { opacity: 1, y: 0 },
  },
  scaleIn: {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
  },
};

/**
 * AnimatedSection - A wrapper component for scroll-triggered section animations
 * 
 * @param children - Content to animate
 * @param variant - Animation type: 'fadeIn', 'slideUp', 'slideDown', 'scaleIn'
 * @param staggerChildren - Delay between child animations (in seconds)
 * @param delay - Initial delay before animation starts (in seconds)
 * @param duration - Animation duration (in seconds)
 * @param className - Additional CSS classes
 * @param threshold - Intersection observer threshold (0-1)
 * @param triggerOnce - Whether to trigger animation only once
 * 
 * @example
 * <AnimatedSection variant="slideUp" staggerChildren={0.1}>
 *   <div>Item 1</div>
 *   <div>Item 2</div>
 *   <div>Item 3</div>
 * </AnimatedSection>
 */
export function AnimatedSection({
  children,
  variant = 'fadeIn',
  staggerChildren = 0,
  delay = 0,
  duration = 0.5,
  className,
  threshold = 0.1,
  triggerOnce = true,
}: AnimatedSectionProps) {
  const { ref, isVisible } = useScrollAnimation({
    threshold,
    triggerOnce,
  });

  const selectedVariant = animationVariants[variant];

  const containerVariants: Variants = {
    initial: selectedVariant.initial,
    animate: {
      ...selectedVariant.animate,
      transition: {
        duration,
        delay,
        ease: 'easeOut',
        ...(staggerChildren > 0 && {
          staggerChildren,
          delayChildren: delay,
        }),
      },
    },
  };

  return (
    <motion.div
      ref={ref}
      initial="initial"
      animate={isVisible ? 'animate' : 'initial'}
      variants={containerVariants}
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
}

/**
 * AnimatedItem - A child component to be used within AnimatedSection for staggered animations
 * 
 * @example
 * <AnimatedSection variant="slideUp" staggerChildren={0.1}>
 *   <AnimatedItem>Item 1</AnimatedItem>
 *   <AnimatedItem>Item 2</AnimatedItem>
 *   <AnimatedItem>Item 3</AnimatedItem>
 * </AnimatedSection>
 */
export function AnimatedItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const itemVariants: Variants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
  };

  return (
    <motion.div variants={itemVariants} className={cn(className)}>
      {children}
    </motion.div>
  );
}

