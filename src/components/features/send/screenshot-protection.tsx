'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

interface ScreenshotProtectionProps {
  linkId: string
  sessionId: string
  enabled: boolean
  watermarkConfig?: {
    enabled: boolean
    text: string
    opacity: number
    color: string
    position: string
    fontSize?: number
    rotation?: number
  }
  printProtection?: boolean
  rightClickProtection?: boolean
  children: React.ReactNode
}

export function ScreenshotProtection({
  linkId,
  sessionId,
  enabled,
  watermarkConfig,
  printProtection = false,
  rightClickProtection = false,
  children
}: ScreenshotProtectionProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDevToolsOpen, setIsDevToolsOpen] = useState(false)

  // Log protection event
  const logProtectionEvent = async (eventType: string, metadata: any = {}) => {
    try {
      await fetch('/api/send/protection/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          link_id: linkId,
          session_id: sessionId,
          event_type: eventType,
          metadata
        })
      })
    } catch (error) {
      console.error('Failed to log protection event:', error)
    }
  }

  // Detect developer tools
  useEffect(() => {
    if (!enabled) return

    let devtools = {
      open: false,
      orientation: null as string | null
    }

    const threshold = 160

    const detectDevTools = () => {
      if (
        window.outerHeight - window.innerHeight > threshold ||
        window.outerWidth - window.innerWidth > threshold
      ) {
        if (!devtools.open) {
          devtools.open = true
          setIsDevToolsOpen(true)
          logProtectionEvent('devtools_detected', {
            window_dimensions: {
              outer: { width: window.outerWidth, height: window.outerHeight },
              inner: { width: window.innerWidth, height: window.innerHeight }
            }
          })
          toast.error('Developer tools detected. Document access may be restricted.')
        }
      } else {
        if (devtools.open) {
          devtools.open = false
          setIsDevToolsOpen(false)
        }
      }
    }

    const interval = setInterval(detectDevTools, 500)
    window.addEventListener('resize', detectDevTools)

    return () => {
      clearInterval(interval)
      window.removeEventListener('resize', detectDevTools)
    }
  }, [enabled, linkId, sessionId])

  // Keyboard shortcuts protection
  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent common screenshot shortcuts
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === 's' || e.key === 'S' || // Save
          e.key === 'p' || e.key === 'P' || // Print
          e.shiftKey && (e.key === 's' || e.key === 'S')) // Screenshot on some systems
      ) {
        e.preventDefault()
        logProtectionEvent('keyboard_shortcut_blocked', {
          key: e.key,
          ctrl: e.ctrlKey,
          meta: e.metaKey,
          shift: e.shiftKey
        })
        toast.warning('This action is not allowed')
        return false
      }

      // Prevent F12 (DevTools)
      if (e.key === 'F12') {
        e.preventDefault()
        logProtectionEvent('devtools_shortcut_blocked')
        toast.warning('Developer tools access is restricted')
        return false
      }

      // Prevent Ctrl+Shift+I (DevTools)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'I') {
        e.preventDefault()
        logProtectionEvent('devtools_shortcut_blocked')
        toast.warning('Developer tools access is restricted')
        return false
      }

      // Prevent Ctrl+U (View Source)
      if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
        e.preventDefault()
        logProtectionEvent('view_source_blocked')
        toast.warning('View source is not allowed')
        return false
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [enabled, linkId, sessionId])

  // Right-click protection
  useEffect(() => {
    if (!rightClickProtection) return

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault()
      logProtectionEvent('right_click_blocked', {
        target: (e.target as Element)?.tagName || 'unknown'
      })
      toast.warning('Right-click is disabled for this document')
      return false
    }

    document.addEventListener('contextmenu', handleContextMenu)
    return () => document.removeEventListener('contextmenu', handleContextMenu)
  }, [rightClickProtection, linkId, sessionId])

  // Print protection
  useEffect(() => {
    if (!printProtection) return

    const handleBeforePrint = () => {
      logProtectionEvent('print_blocked')
      toast.error('Printing is not allowed for this document')
      return false
    }

    window.addEventListener('beforeprint', handleBeforePrint)
    return () => window.removeEventListener('beforeprint', handleBeforePrint)
  }, [printProtection, linkId, sessionId])

  // Screenshot detection (experimental)
  useEffect(() => {
    if (!enabled) return

    const detectScreenshot = () => {
      // This is a basic detection method - not foolproof
      if (document.hidden || document.visibilityState === 'hidden') {
        logProtectionEvent('screenshot_attempt', {
          method: 'visibility_change',
          timestamp: Date.now()
        })
      }
    }

    document.addEventListener('visibilitychange', detectScreenshot)
    return () => document.removeEventListener('visibilitychange', detectScreenshot)
  }, [enabled, linkId, sessionId])

  // Generate watermark style
  const getWatermarkStyle = () => {
    if (!watermarkConfig?.enabled) return {}

    const { text, opacity, color, position, fontSize = 16, rotation = -45 } = watermarkConfig

    return {
      position: 'fixed' as const,
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      pointerEvents: 'none' as const,
      zIndex: 9999,
      background: `repeating-linear-gradient(
        ${rotation}deg,
        transparent,
        transparent 100px,
        ${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')} 100px,
        ${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')} 200px
      )`,
      fontSize: `${fontSize}px`,
      fontFamily: 'Arial, sans-serif',
      fontWeight: 'bold',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: color,
      opacity: opacity,
      transform: `rotate(${rotation}deg)`,
      userSelect: 'none' as const,
      WebkitUserSelect: 'none' as const,
      MozUserSelect: 'none' as const,
      msUserSelect: 'none' as const
    }
  }

  return (
    <div
      ref={containerRef}
      className={`relative ${enabled ? 'select-none' : ''}`}
      style={{
        userSelect: enabled ? 'none' : 'auto',
        WebkitUserSelect: enabled ? 'none' : 'auto',
        MozUserSelect: enabled ? 'none' : 'auto',
        msUserSelect: enabled ? 'none' : 'text',
        WebkitTouchCallout: enabled ? 'none' : 'inherit',
        WebkitUserDrag: enabled ? 'none' : 'auto',
        KhtmlUserSelect: enabled ? 'none' : 'auto'
      } as any}
    >
      {children}

      {/* Watermark overlay */}
      {watermarkConfig?.enabled && (
        <div style={getWatermarkStyle()}>
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              whiteSpace: 'nowrap',
              fontSize: `${watermarkConfig.fontSize || 16}px`,
              color: watermarkConfig.color,
              opacity: watermarkConfig.opacity,
              fontWeight: 'bold',
              textShadow: '1px 1px 2px rgba(255,255,255,0.5)',
              userSelect: 'none',
              pointerEvents: 'none'
            }}
          >
            {watermarkConfig.text}
          </div>
        </div>
      )}

      {/* Protection overlay when dev tools detected */}
      {isDevToolsOpen && enabled && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            fontSize: '24px',
            fontWeight: 'bold'
          }}
        >
          <div className="text-center">
            <div className="mb-4">🔒</div>
            <div>Developer Tools Detected</div>
            <div className="text-lg mt-2">Please close developer tools to continue</div>
          </div>
        </div>
      )}

      {/* CSS-based protection styles */}
      {enabled && (
        <style jsx>{`
          * {
            -webkit-user-select: none !important;
            -moz-user-select: none !important;
            -ms-user-select: none !important;
            user-select: none !important;
            -webkit-touch-callout: none !important;
            -webkit-user-drag: none !important;
            -khtml-user-select: none !important;
          }
          
          img {
            -webkit-user-drag: none !important;
            -khtml-user-drag: none !important;
            -moz-user-drag: none !important;
            -o-user-drag: none !important;
            user-drag: none !important;
            pointer-events: none !important;
          }
          
          @media print {
            body {
              display: none !important;
            }
          }
        `}</style>
      )}
    </div>
  )
}
