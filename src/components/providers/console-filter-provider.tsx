'use client'

import { useEffect } from 'react'

export function ConsoleFilterProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return

    // Store original console methods
    const originalWarn = console.warn
    const originalError = console.error

    // List of warning patterns to suppress
    const suppressedWarnings = [
      /antd v5 support React is 16 ~ 18/,
      /\[antd: compatible\]/,
      /see https:\/\/u\.ant\.design\/v5-for-19 for compatible/,
      /Warning: \[antd: compatible\]/,
      /Accessing element\.ref was removed in React 19/,
      /ref is now a regular prop/
    ]

    const suppressedErrors = [
      /Failed to trigger notification.*User not found/,
      /Notification failed \(non-critical\)/
    ]

    // Filter function to check if a message should be suppressed
    function shouldSuppressWarning(message: string): boolean {
      return suppressedWarnings.some(pattern => pattern.test(message))
    }

    function shouldSuppressError(message: string): boolean {
      return suppressedErrors.some(pattern => pattern.test(message))
    }

    // Override console.warn
    console.warn = (...args: any[]) => {
      const message = args.join(' ')
      if (!shouldSuppressWarning(message)) {
        originalWarn.apply(console, args)
      }
    }

    // Override console.error for warnings that come through as errors
    console.error = (...args: any[]) => {
      const message = args.join(' ')
      if (!shouldSuppressError(message)) {
        originalError.apply(console, args)
      }
    }

    // Cleanup function to restore original methods
    return () => {
      console.warn = originalWarn
      console.error = originalError
    }
  }, [])

  return <>{children}</>
}
