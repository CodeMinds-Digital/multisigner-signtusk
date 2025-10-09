'use client'

import { useEffect, useState, useRef } from 'react'
import { EnhancedWatermarkService, EnhancedWatermarkConfig, WatermarkContext } from '@/lib/enhanced-watermark-service'

interface EnhancedWatermarkProps {
  config: EnhancedWatermarkConfig
  context: WatermarkContext
  children: React.ReactNode
}

export function EnhancedWatermark({ config, context, children }: EnhancedWatermarkProps) {
  const [watermarkText, setWatermarkText] = useState('')
  const [patternWatermarks, setPatternWatermarks] = useState<Array<{ id: string; text: string; style: React.CSSProperties }>>([])
  const [isVisible, setIsVisible] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)
  const animationFrameRef = useRef<number | null>(null)

  // Generate watermark text and styles
  useEffect(() => {
    if (!config.enabled) return

    const text = EnhancedWatermarkService.generateWatermarkText(config.template, context)
    setWatermarkText(text)

    // Generate pattern watermarks if enabled
    if (config.pattern?.enabled) {
      const patterns = EnhancedWatermarkService.generatePatternWatermarks(config, context)
      setPatternWatermarks(patterns)
    }
  }, [config, context])

  // Screenshot protection
  useEffect(() => {
    if (!config.security?.hideOnScreenshot) return

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsVisible(false)
        // Hide watermark when tab is hidden (potential screenshot)
        setTimeout(() => setIsVisible(true), 100)
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // Detect common screenshot shortcuts
      if (
        (e.metaKey || e.ctrlKey) &&
        (e.shiftKey && (e.key === '3' || e.key === '4' || e.key === '5')) ||
        e.key === 'PrintScreen'
      ) {
        setIsVisible(false)
        setTimeout(() => setIsVisible(true), 200)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [config.security?.hideOnScreenshot])

  // Dynamic position randomization
  useEffect(() => {
    if (!config.security?.randomizePosition) return

    const randomizePosition = () => {
      if (containerRef.current) {
        const elements = containerRef.current.querySelectorAll('.watermark-text')
        elements.forEach((element) => {
          const htmlElement = element as HTMLElement
          const randomX = Math.random() * 20 - 10 // -10% to +10%
          const randomY = Math.random() * 20 - 10
          htmlElement.style.transform += ` translate(${randomX}%, ${randomY}%)`
        })
      }
    }

    const interval = setInterval(randomizePosition, 5000) // Randomize every 5 seconds
    return () => clearInterval(interval)
  }, [config.security?.randomizePosition])

  // Animation frame for dynamic opacity
  useEffect(() => {
    if (!config.security?.dynamicOpacity) return

    const updateOpacity = () => {
      if (containerRef.current) {
        const elements = containerRef.current.querySelectorAll('.watermark-text')
        elements.forEach((element) => {
          const htmlElement = element as HTMLElement
          const opacityVariation = Math.random() * 0.1 - 0.05 // ±0.05
          const newOpacity = Math.max(0.1, Math.min(1, config.opacity + opacityVariation))
          htmlElement.style.opacity = newOpacity.toString()
        })
      }
      animationFrameRef.current = requestAnimationFrame(updateOpacity)
    }

    animationFrameRef.current = requestAnimationFrame(updateOpacity)
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [config.security?.dynamicOpacity, config.opacity])

  if (!config.enabled || !isVisible) {
    return <>{children}</>
  }

  const { containerStyle, textStyle, animationClass } = EnhancedWatermarkService.generateWatermarkStyles(config, context)

  return (
    <>
      {/* Inject animation CSS */}
      <style jsx global>{`
        ${EnhancedWatermarkService.generateAnimationCSS()}
      `}</style>

      {/* Main content */}
      {children}

      {/* Watermark overlay */}
      <div ref={containerRef} style={containerStyle}>
        {config.pattern?.enabled ? (
          // Pattern watermarks
          patternWatermarks.map((watermark) => (
            <div
              key={watermark.id}
              className={`watermark-text ${animationClass || ''} ${config.security?.hideOnScreenshot ? 'watermark-screenshot-protection' : ''
                }`}
              style={watermark.style}
            >
              {watermark.text}
            </div>
          ))
        ) : (
          // Single watermark
          <div
            className={`watermark-text ${animationClass || ''} ${config.security?.hideOnScreenshot ? 'watermark-screenshot-protection' : ''
              }`}
            style={textStyle}
          >
            {watermarkText}
          </div>
        )}
      </div>
    </>
  )
}

// Hook for easy watermark integration
export function useEnhancedWatermark(
  config: EnhancedWatermarkConfig,
  context: Partial<WatermarkContext>
) {
  const [fullContext, setFullContext] = useState<WatermarkContext>({
    timestamp: new Date().toISOString(),
    linkId: '',
    ...context
  })

  useEffect(() => {
    // Update context with current timestamp and any missing data
    setFullContext(prev => ({
      ...prev,
      timestamp: new Date().toISOString(),
      ...context
    }))
  }, [context])

  const WatermarkComponent = ({ children }: { children: React.ReactNode }) => (
    <EnhancedWatermark config={config} context={fullContext}>
      {children}
    </EnhancedWatermark>
  )

  return {
    WatermarkComponent,
    context: fullContext,
    updateContext: (newContext: Partial<WatermarkContext>) => {
      setFullContext(prev => ({ ...prev, ...newContext }))
    }
  }
}

// Default configurations for common use cases
export const WatermarkPresets = {
  basic: {
    enabled: true,
    template: '{{user_email}} - {{date}} {{time}}',
    opacity: 0.3,
    color: '#000000',
    position: 'bottom-right' as const,
    fontSize: 12,
    rotation: 0,
    fontFamily: 'Arial, sans-serif'
  },

  confidential: {
    enabled: true,
    template: 'CONFIDENTIAL - {{user_email}} - {{timestamp}}',
    opacity: 0.5,
    color: '#ff0000',
    position: 'diagonal' as const,
    fontSize: 16,
    rotation: -45,
    fontFamily: 'Arial, sans-serif',
    pattern: {
      enabled: true,
      spacing: 300,
      stagger: true
    }
  },

  security: {
    enabled: true,
    template: 'ID: {{fingerprint}} | {{user_email}} | {{time}}',
    opacity: 0.4,
    color: '#333333',
    position: 'center' as const,
    fontSize: 14,
    rotation: 0,
    fontFamily: 'monospace',
    security: {
      hideOnScreenshot: true,
      randomizePosition: true,
      dynamicOpacity: true
    },
    animation: {
      enabled: true,
      type: 'fade' as const,
      duration: 3000
    }
  }
} as const
