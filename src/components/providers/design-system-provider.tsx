'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { DesignPolishService, DesignTheme } from '@/lib/design-polish-service'
import { toast } from 'sonner'

interface DesignSystemContextType {
  theme: DesignTheme
  updateTheme: (updates: Partial<DesignTheme>) => void
  resetTheme: () => void
  breakpoint: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  showSuccessAnimation: (message?: string) => void
  enhanceAccessibility: (element: HTMLElement) => void
}

const DesignSystemContext = createContext<DesignSystemContextType | undefined>(undefined)

export function useDesignSystem() {
  const context = useContext(DesignSystemContext)
  if (!context) {
    throw new Error('useDesignSystem must be used within a DesignSystemProvider')
  }
  return context
}

interface DesignSystemProviderProps {
  children: React.ReactNode
  customTheme?: Partial<DesignTheme>
}

export function DesignSystemProvider({ 
  children, 
  customTheme 
}: DesignSystemProviderProps) {
  const [theme, setTheme] = useState<DesignTheme>(DesignPolishService.getTheme())
  const [breakpoint, setBreakpoint] = useState<'sm' | 'md' | 'lg' | 'xl' | '2xl'>('md')

  // Initialize theme and breakpoint detection
  useEffect(() => {
    // Apply custom theme if provided
    if (customTheme) {
      DesignPolishService.applyTheme(customTheme)
      setTheme(DesignPolishService.getTheme())
    }

    // Set initial breakpoint
    setBreakpoint(DesignPolishService.getBreakpoint())

    // Setup resize listener for breakpoint detection
    const cleanup = DesignPolishService.onResize(() => {
      setBreakpoint(DesignPolishService.getBreakpoint())
    })

    return cleanup
  }, [customTheme])

  // Apply global design enhancements
  useEffect(() => {
    // Enhance accessibility for the entire document
    DesignPolishService.enhanceAccessibility(document.body)

    // Add global CSS variables for the design system
    const style = document.createElement('style')
    style.textContent = `
      :root {
        --animation-duration-fast: 150ms;
        --animation-duration-normal: 300ms;
        --animation-duration-slow: 500ms;
        --animation-easing: cubic-bezier(0.4, 0, 0.2, 1);
        --border-radius-sm: 0.375rem;
        --border-radius-md: 0.5rem;
        --border-radius-lg: 0.75rem;
        --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
        --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
        --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
      }

      /* Enhanced focus styles */
      .focus-visible {
        outline: 2px solid var(--color-primary);
        outline-offset: 2px;
      }

      /* Smooth transitions for all interactive elements */
      button, a, input, select, textarea {
        transition: all var(--animation-duration-normal) var(--animation-easing);
      }

      /* Enhanced hover states */
      .hover-lift:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-lg);
      }

      /* Loading states */
      .loading-shimmer {
        background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
        background-size: 200% 100%;
        animation: shimmer 2s infinite;
      }

      @keyframes shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }

      /* Stagger animations */
      .stagger-children > * {
        animation: fadeInUp var(--animation-duration-normal) var(--animation-easing) both;
      }

      .stagger-children > *:nth-child(1) { animation-delay: 0ms; }
      .stagger-children > *:nth-child(2) { animation-delay: 50ms; }
      .stagger-children > *:nth-child(3) { animation-delay: 100ms; }
      .stagger-children > *:nth-child(4) { animation-delay: 150ms; }
      .stagger-children > *:nth-child(5) { animation-delay: 200ms; }
      .stagger-children > *:nth-child(6) { animation-delay: 250ms; }

      @keyframes fadeInUp {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      /* Enhanced scrollbars */
      ::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }

      ::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 4px;
      }

      ::-webkit-scrollbar-thumb {
        background: #c1c1c1;
        border-radius: 4px;
        transition: background var(--animation-duration-normal);
      }

      ::-webkit-scrollbar-thumb:hover {
        background: #a1a1a1;
      }

      /* Responsive typography */
      @media (max-width: 640px) {
        .responsive-text-lg { font-size: 1rem; }
        .responsive-text-xl { font-size: 1.125rem; }
        .responsive-text-2xl { font-size: 1.25rem; }
      }

      /* Print styles */
      @media print {
        .no-print { display: none !important; }
        .print-break-before { page-break-before: always; }
        .print-break-after { page-break-after: always; }
      }

      /* High contrast mode support */
      @media (prefers-contrast: high) {
        button, input, select, textarea {
          border-width: 2px;
        }
      }

      /* Reduced motion support */
      @media (prefers-reduced-motion: reduce) {
        *, *::before, *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
      }
    `
    document.head.appendChild(style)

    return () => {
      document.head.removeChild(style)
    }
  }, [])

  const updateTheme = (updates: Partial<DesignTheme>) => {
    DesignPolishService.applyTheme(updates)
    setTheme(DesignPolishService.getTheme())
    
    toast.success('Theme updated', {
      description: 'Your design preferences have been applied'
    })
  }

  const resetTheme = () => {
    const defaultTheme = {
      primary: '#3B82F6',
      secondary: '#6B7280',
      accent: '#10B981',
      background: '#F9FAFB',
      surface: '#FFFFFF',
      text: '#111827',
      textSecondary: '#6B7280',
      border: '#E5E7EB',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
      info: '#3B82F6'
    }
    
    DesignPolishService.applyTheme(defaultTheme)
    setTheme(DesignPolishService.getTheme())
    
    toast.success('Theme reset', {
      description: 'Design preferences have been reset to default'
    })
  }

  const showSuccessAnimation = (message?: string) => {
    // Create a temporary element for the animation
    const tempElement = document.createElement('div')
    document.body.appendChild(tempElement)
    
    DesignPolishService.showSuccessAnimation(tempElement, message)
    
    // Clean up after animation
    setTimeout(() => {
      if (document.body.contains(tempElement)) {
        document.body.removeChild(tempElement)
      }
    }, 3000)
  }

  const enhanceAccessibility = (element: HTMLElement) => {
    DesignPolishService.enhanceAccessibility(element)
  }

  const value: DesignSystemContextType = {
    theme,
    updateTheme,
    resetTheme,
    breakpoint,
    showSuccessAnimation,
    enhanceAccessibility
  }

  return (
    <DesignSystemContext.Provider value={value}>
      <div className="design-system-root">
        {children}
      </div>
    </DesignSystemContext.Provider>
  )
}

// Hook for responsive design
export function useResponsive() {
  const { breakpoint } = useDesignSystem()
  
  return {
    breakpoint,
    isMobile: breakpoint === 'sm',
    isTablet: breakpoint === 'md',
    isDesktop: ['lg', 'xl', '2xl'].includes(breakpoint),
    isLarge: ['xl', '2xl'].includes(breakpoint)
  }
}

// Hook for theme customization
export function useTheme() {
  const { theme, updateTheme, resetTheme } = useDesignSystem()
  
  return {
    theme,
    updateTheme,
    resetTheme,
    isDark: theme.background === '#111827', // Simple dark mode detection
    toggleDarkMode: () => {
      const isDark = theme.background === '#111827'
      updateTheme(isDark ? {
        background: '#F9FAFB',
        surface: '#FFFFFF',
        text: '#111827',
        textSecondary: '#6B7280',
        border: '#E5E7EB'
      } : {
        background: '#111827',
        surface: '#1F2937',
        text: '#F9FAFB',
        textSecondary: '#D1D5DB',
        border: '#374151'
      })
    }
  }
}

// Hook for animations
export function useAnimations() {
  const { showSuccessAnimation } = useDesignSystem()
  
  return {
    showSuccess: showSuccessAnimation,
    applyStagger: (container: HTMLElement) => {
      container.classList.add('stagger-children')
    },
    applyHoverLift: (element: HTMLElement) => {
      element.classList.add('hover-lift')
    }
  }
}
