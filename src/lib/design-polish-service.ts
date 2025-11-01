// Design Polish Service
// Comprehensive UI/UX enhancements for the Send module

export interface DesignTheme {
  primary: string
  secondary: string
  accent: string
  background: string
  surface: string
  text: string
  textSecondary: string
  border: string
  success: string
  warning: string
  error: string
  info: string
}

export interface AnimationConfig {
  duration: number
  easing: string
  stagger: number
}

export interface LoadingState {
  type: 'spinner' | 'skeleton' | 'pulse' | 'progress'
  message?: string
  progress?: number
  size?: 'sm' | 'md' | 'lg'
}

export interface FeedbackConfig {
  showToasts: boolean
  showProgressBars: boolean
  showSuccessAnimations: boolean
  autoHideDelay: number
  soundEnabled: boolean
}

export class DesignPolishService {
  private static theme: DesignTheme = {
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

  private static animations: Record<string, AnimationConfig> = {
    fadeIn: { duration: 300, easing: 'ease-out', stagger: 50 },
    slideIn: { duration: 400, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', stagger: 100 },
    scaleIn: { duration: 200, easing: 'ease-out', stagger: 0 },
    bounce: { duration: 600, easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)', stagger: 0 }
  }

  /**
   * Apply smooth transitions to elements
   */
  static applyTransitions(element: HTMLElement, type: 'fade' | 'slide' | 'scale' = 'fade'): void {
    const config = this.animations[type + 'In']

    element.style.transition = `all ${config.duration}ms ${config.easing}`

    switch (type) {
      case 'fade':
        element.style.opacity = '0'
        requestAnimationFrame(() => {
          element.style.opacity = '1'
        })
        break
      case 'slide':
        element.style.transform = 'translateY(20px)'
        element.style.opacity = '0'
        requestAnimationFrame(() => {
          element.style.transform = 'translateY(0)'
          element.style.opacity = '1'
        })
        break
      case 'scale':
        element.style.transform = 'scale(0.95)'
        element.style.opacity = '0'
        requestAnimationFrame(() => {
          element.style.transform = 'scale(1)'
          element.style.opacity = '1'
        })
        break
    }
  }

  /**
   * Create staggered animations for lists
   */
  static staggerAnimation(
    elements: NodeListOf<HTMLElement> | HTMLElement[],
    type: 'fade' | 'slide' | 'scale' = 'fade'
  ): void {
    const config = this.animations[type + 'In']

    Array.from(elements).forEach((element, index) => {
      setTimeout(() => {
        this.applyTransitions(element, type)
      }, index * config.stagger)
    })
  }

  /**
   * Enhanced loading states
   */
  static createLoadingState(config: LoadingState): HTMLElement {
    const container = document.createElement('div')
    container.className = 'flex items-center justify-center p-8'

    switch (config.type) {
      case 'spinner':
        container.innerHTML = `
          <div class="text-center">
            <div class="animate-spin rounded-full h-${config.size === 'lg' ? '12' : config.size === 'sm' ? '6' : '8'} w-${config.size === 'lg' ? '12' : config.size === 'sm' ? '6' : '8'} border-b-2 border-blue-600 mx-auto mb-4"></div>
            ${config.message ? `<p class="text-gray-600 text-sm">${config.message}</p>` : ''}
          </div>
        `
        break

      case 'skeleton':
        container.innerHTML = `
          <div class="w-full space-y-3 animate-pulse">
            <div class="h-4 bg-gray-200 rounded w-3/4"></div>
            <div class="h-4 bg-gray-200 rounded w-1/2"></div>
            <div class="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        `
        break

      case 'pulse':
        container.innerHTML = `
          <div class="animate-pulse bg-gray-200 rounded-lg w-full h-32"></div>
        `
        break

      case 'progress':
        container.innerHTML = `
          <div class="w-full">
            <div class="flex justify-between items-center mb-2">
              <span class="text-sm text-gray-600">${config.message || 'Loading...'}</span>
              <span class="text-sm text-gray-600">${config.progress || 0}%</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2">
              <div class="bg-blue-600 h-2 rounded-full transition-all duration-300" style="width: ${config.progress || 0}%"></div>
            </div>
          </div>
        `
        break
    }

    return container
  }

  /**
   * Enhanced error states with recovery options
   */
  static createErrorState(
    message: string,
    onRetry?: () => void,
    onSupport?: () => void
  ): HTMLElement {
    const container = document.createElement('div')
    container.className = 'text-center py-8 px-4'

    container.innerHTML = `
      <div class="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
        <svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
        </svg>
      </div>
      <h3 class="text-lg font-medium text-gray-900 mb-2">Something went wrong</h3>
      <p class="text-gray-600 mb-6 max-w-md mx-auto">${message}</p>
      <div class="flex flex-col sm:flex-row gap-3 justify-center">
        ${onRetry ? `
          <button class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Try Again
          </button>
        ` : ''}
        ${onSupport ? `
          <button class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
            Contact Support
          </button>
        ` : ''}
      </div>
    `

    // Add event listeners
    if (onRetry) {
      const retryBtn = container.querySelector('button')
      retryBtn?.addEventListener('click', onRetry)
    }

    if (onSupport) {
      const supportBtn = container.querySelectorAll('button')[1]
      supportBtn?.addEventListener('click', onSupport)
    }

    return container
  }

  /**
   * Enhanced empty states with call-to-action
   */
  static createEmptyState(
    title: string,
    description: string,
    actionText?: string,
    onAction?: () => void,
    icon?: string
  ): HTMLElement {
    const container = document.createElement('div')
    container.className = 'text-center py-12 px-4'

    const iconSvg = icon || `
      <svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
      </svg>
    `

    container.innerHTML = `
      <div class="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        ${iconSvg}
      </div>
      <h3 class="text-lg font-medium text-gray-900 mb-2">${title}</h3>
      <p class="text-gray-600 mb-6 max-w-md mx-auto">${description}</p>
      ${actionText && onAction ? `
        <button class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
          ${actionText}
        </button>
      ` : ''}
    `

    if (actionText && onAction) {
      const actionBtn = container.querySelector('button')
      actionBtn?.addEventListener('click', onAction)
    }

    return container
  }

  /**
   * Success animations
   */
  static showSuccessAnimation(element: HTMLElement, message?: string): void {
    const overlay = document.createElement('div')
    overlay.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'

    overlay.innerHTML = `
      <div class="bg-white rounded-lg p-8 text-center transform scale-0 transition-transform duration-300">
        <div class="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
        </div>
        <h3 class="text-lg font-medium text-gray-900 mb-2">Success!</h3>
        ${message ? `<p class="text-gray-600">${message}</p>` : ''}
      </div>
    `

    document.body.appendChild(overlay)

    // Animate in
    requestAnimationFrame(() => {
      const content = overlay.querySelector('div')
      if (content) {
        content.style.transform = 'scale(1)'
      }
    })

    // Auto remove after 2 seconds
    setTimeout(() => {
      overlay.style.opacity = '0'
      setTimeout(() => {
        document.body.removeChild(overlay)
      }, 300)
    }, 2000)
  }

  /**
   * Enhanced tooltips
   */
  static addTooltip(element: HTMLElement, text: string, position: 'top' | 'bottom' | 'left' | 'right' = 'top'): void {
    element.style.position = 'relative'

    const tooltip = document.createElement('div')
    tooltip.className = `absolute z-50 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 pointer-events-none transition-opacity duration-200`
    tooltip.textContent = text

    // Position tooltip
    switch (position) {
      case 'top':
        tooltip.className += ' bottom-full left-1/2 transform -translate-x-1/2 mb-1'
        break
      case 'bottom':
        tooltip.className += ' top-full left-1/2 transform -translate-x-1/2 mt-1'
        break
      case 'left':
        tooltip.className += ' right-full top-1/2 transform -translate-y-1/2 mr-1'
        break
      case 'right':
        tooltip.className += ' left-full top-1/2 transform -translate-y-1/2 ml-1'
        break
    }

    element.appendChild(tooltip)

    element.addEventListener('mouseenter', () => {
      tooltip.style.opacity = '1'
    })

    element.addEventListener('mouseleave', () => {
      tooltip.style.opacity = '0'
    })
  }

  /**
   * Smooth scroll to element
   */
  static scrollToElement(element: HTMLElement, offset: number = 0): void {
    const elementPosition = element.offsetTop - offset

    window.scrollTo({
      top: elementPosition,
      behavior: 'smooth'
    })
  }

  /**
   * Enhanced focus management
   */
  static manageFocus(container: HTMLElement): void {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )

    if (focusableElements.length === 0) return

    const firstElement = focusableElements[0] as HTMLElement
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

    // Focus first element
    firstElement.focus()

    // Trap focus within container
    container.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault()
            lastElement.focus()
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault()
            firstElement.focus()
          }
        }
      }
    })
  }

  /**
   * Responsive breakpoint detection
   */
  static getBreakpoint(): 'sm' | 'md' | 'lg' | 'xl' | '2xl' {
    const width = window.innerWidth

    if (width >= 1536) return '2xl'
    if (width >= 1280) return 'xl'
    if (width >= 1024) return 'lg'
    if (width >= 768) return 'md'
    return 'sm'
  }

  /**
   * Debounced resize handler
   */
  static onResize(callback: () => void, delay: number = 250): () => void {
    let timeoutId: NodeJS.Timeout

    const handler = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(callback, delay)
    }

    window.addEventListener('resize', handler)

    return () => {
      window.removeEventListener('resize', handler)
      clearTimeout(timeoutId)
    }
  }

  /**
   * Enhanced accessibility
   */
  static enhanceAccessibility(element: HTMLElement): void {
    // Add ARIA labels where missing
    const buttons = element.querySelectorAll('button:not([aria-label]):not([aria-labelledby])')
    buttons.forEach(button => {
      const text = button.textContent?.trim()
      if (text) {
        button.setAttribute('aria-label', text)
      }
    })

    // Add focus indicators
    const focusableElements = element.querySelectorAll('button, [href], input, select, textarea')
    focusableElements.forEach(el => {
      el.addEventListener('focus', () => {
        el.classList.add('ring-2', 'ring-blue-500', 'ring-offset-2')
      })

      el.addEventListener('blur', () => {
        el.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-2')
      })
    })
  }

  /**
   * Apply design system theme
   */
  static applyTheme(customTheme?: Partial<DesignTheme>): void {
    if (customTheme) {
      this.theme = { ...this.theme, ...customTheme }
    }

    const root = document.documentElement
    Object.entries(this.theme).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value)
    })
  }

  /**
   * Get current theme
   */
  static getTheme(): DesignTheme {
    return { ...this.theme }
  }
}
