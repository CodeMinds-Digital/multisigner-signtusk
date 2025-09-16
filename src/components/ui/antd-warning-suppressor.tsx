'use client'

import { useEffect, ReactNode } from 'react'

interface AntdWarningSuppressorProps {
  children: ReactNode
}

export function AntdWarningSuppressor({ children }: AntdWarningSuppressorProps) {
  useEffect(() => {
    // Store original console methods
    const originalWarn = console.warn
    const originalError = console.error

    // Patterns to suppress
    const suppressedPatterns = [
      /antd v5 support React is 16 ~ 18/,
      /\[antd: compatible\]/,
      /see https:\/\/u\.ant\.design\/v5-for-19 for compatible/
    ]

    // Override console methods
    console.warn = (...args: any[]) => {
      const message = args.join(' ')
      if (!suppressedPatterns.some(pattern => pattern.test(message))) {
        originalWarn.apply(console, args)
      }
    }

    console.error = (...args: any[]) => {
      const message = args.join(' ')
      if (!suppressedPatterns.some(pattern => pattern.test(message))) {
        originalError.apply(console, args)
      }
    }

    // Cleanup
    return () => {
      console.warn = originalWarn
      console.error = originalError
    }
  }, [])

  return <>{children}</>
}

// Higher-order component version
export function withAntdWarningSuppression<P extends object>(
  Component: React.ComponentType<P>
) {
  return function WrappedComponent(props: P) {
    return (
      <AntdWarningSuppressor>
        <Component {...props} />
      </AntdWarningSuppressor>
    )
  }
}
