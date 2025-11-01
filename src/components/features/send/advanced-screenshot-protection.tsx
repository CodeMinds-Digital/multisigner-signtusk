'use client'

import { useEffect, useRef, useState } from 'react'
import { AdvancedScreenshotProtection, AdvancedProtectionConfig } from '@/lib/advanced-screenshot-protection'
import { toast } from 'sonner'

interface AdvancedScreenshotProtectionProps {
  linkId: string
  sessionId: string
  config: AdvancedProtectionConfig
  children: React.ReactNode
}

export function AdvancedScreenshotProtectionComponent({
  linkId,
  sessionId,
  config,
  children
}: AdvancedScreenshotProtectionProps) {
  const protectionRef = useRef<AdvancedScreenshotProtection | null>(null)
  const [isProtected, setIsProtected] = useState(false)
  const [violationCount, setViolationCount] = useState(0)

  useEffect(() => {
    if (!config.enabled) return

    // Initialize advanced protection
    protectionRef.current = new AdvancedScreenshotProtection(config, linkId, sessionId)
    protectionRef.current.initialize()
    setIsProtected(true)

    // Show protection status
    if (config.screenshotDetection.enabled || config.screenRecordingDetection.enabled) {
      toast.info('Advanced content protection is active', {
        description: 'This document is protected against unauthorized capture'
      })
    }

    return () => {
      if (protectionRef.current) {
        protectionRef.current.destroy()
        protectionRef.current = null
      }
      setIsProtected(false)
    }
  }, [config, linkId, sessionId])

  // Monitor for protection violations
  useEffect(() => {
    const handleProtectionViolation = (event: CustomEvent) => {
      setViolationCount(prev => prev + 1)
      
      const { type, severity, method } = event.detail
      
      if (severity === 'high') {
        toast.error('Security violation detected!', {
          description: `Unauthorized ${type} attempt blocked`
        })
      } else if (severity === 'medium') {
        toast.warning('Suspicious activity detected', {
          description: `${type} via ${method}`
        })
      }
    }

    window.addEventListener('protection-violation', handleProtectionViolation as EventListener)
    
    return () => {
      window.removeEventListener('protection-violation', handleProtectionViolation as EventListener)
    }
  }, [])

  // Apply visual protection styles
  const protectionStyles: React.CSSProperties = {
    position: 'relative',
    ...(config.contentProtection?.disableTextSelection && {
      userSelect: 'none',
      WebkitUserSelect: 'none',
      MozUserSelect: 'none',
      msUserSelect: 'none'
    }),
    ...(config.contentProtection?.disableDragDrop && {
      WebkitUserDrag: 'none',
      KhtmlUserDrag: 'none',
      MozUserDrag: 'none',
      OUserDrag: 'none',
      userDrag: 'none'
    })
  }

  return (
    <div style={protectionStyles}>
      {/* Protection Status Indicator */}
      {isProtected && (
        <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-medium">
          🛡️ Protected
          {violationCount > 0 && (
            <span className="ml-2 bg-red-500 px-2 py-0.5 rounded-full">
              {violationCount} violations
            </span>
          )}
        </div>
      )}

      {/* Anti-Screenshot Overlay */}
      {config.visualProtection?.overlayOnDetection && (
        <div 
          className="fixed inset-0 pointer-events-none z-40"
          style={{
            background: `repeating-linear-gradient(
              45deg,
              transparent,
              transparent 10px,
              rgba(255, 0, 0, 0.1) 10px,
              rgba(255, 0, 0, 0.1) 20px
            )`,
            mixBlendMode: 'multiply'
          }}
        />
      )}

      {/* Dynamic Watermark Overlay */}
      {config.visualProtection?.dynamicWatermarks && (
        <DynamicWatermarkOverlay linkId={linkId} sessionId={sessionId} />
      )}

      {/* Main Content */}
      {children}

      {/* Protection CSS */}
      <style jsx>{`
        /* Disable print styles */
        @media print {
          body {
            display: none !important;
          }
        }

        /* Disable screenshot on mobile */
        @media screen and (-webkit-min-device-pixel-ratio: 0) {
          body {
            -webkit-touch-callout: none;
            -webkit-user-select: none;
            -khtml-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
            user-select: none;
          }
        }

        /* Hide content during dev tools detection */
        .protection-blur {
          filter: blur(10px) !important;
          transition: filter 0.3s ease;
        }

        /* Anti-automation styles */
        .protection-active {
          pointer-events: auto;
        }

        .protection-blocked {
          pointer-events: none;
          opacity: 0.5;
        }
      `}</style>
    </div>
  )
}

// Dynamic watermark component for additional protection
function DynamicWatermarkOverlay({ linkId, sessionId }: { linkId: string; sessionId: string }) {
  const [watermarks, setWatermarks] = useState<Array<{ id: string; x: number; y: number; text: string }>>([])

  useEffect(() => {
    const generateWatermarks = () => {
      const newWatermarks = []
      const count = 20 // Number of watermarks
      
      for (let i = 0; i < count; i++) {
        newWatermarks.push({
          id: `wm-${i}`,
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight,
          text: `${linkId.substring(0, 8)} • ${new Date().toLocaleTimeString()}`
        })
      }
      
      setWatermarks(newWatermarks)
    }

    generateWatermarks()
    const interval = setInterval(generateWatermarks, 30000) // Update every 30 seconds

    return () => clearInterval(interval)
  }, [linkId])

  return (
    <div className="fixed inset-0 pointer-events-none z-30">
      {watermarks.map((watermark) => (
        <div
          key={watermark.id}
          className="absolute text-xs text-gray-400 opacity-20 transform -rotate-45 font-mono"
          style={{
            left: watermark.x,
            top: watermark.y,
            userSelect: 'none',
            pointerEvents: 'none'
          }}
        >
          {watermark.text}
        </div>
      ))}
    </div>
  )
}

// Hook for easy integration
export function useAdvancedScreenshotProtection(
  linkId: string,
  sessionId: string,
  config: AdvancedProtectionConfig
) {
  const [isActive, setIsActive] = useState(false)
  const [violations, setViolations] = useState(0)

  useEffect(() => {
    if (config.enabled) {
      setIsActive(true)
    }
  }, [config.enabled])

  const ProtectionComponent = ({ children }: { children: React.ReactNode }) => (
    <AdvancedScreenshotProtectionComponent
      linkId={linkId}
      sessionId={sessionId}
      config={config}
    >
      {children}
    </AdvancedScreenshotProtectionComponent>
  )

  return {
    ProtectionComponent,
    isActive,
    violations,
    config
  }
}

// Default protection configurations
export const ProtectionPresets = {
  basic: {
    enabled: true,
    screenshotDetection: {
      enabled: true,
      methods: ['visibility', 'keyboard'] as const,
      sensitivity: 'medium' as const,
      blockDuration: 2000
    },
    screenRecordingDetection: {
      enabled: false,
      methods: [] as const,
      alertUser: false,
      blockContent: false
    },
    devToolsProtection: {
      enabled: false,
      detectMethods: [] as const,
      blockContent: false,
      redirectOnDetection: false
    },
    contentProtection: {
      disableRightClick: true,
      disableTextSelection: true,
      disableDragDrop: true,
      disablePrint: false,
      disableCopy: true,
      disableInspect: false
    },
    visualProtection: {
      blurOnSuspiciousActivity: false,
      hideOnTabSwitch: true,
      overlayOnDetection: false,
      dynamicWatermarks: false
    },
    behaviorAnalysis: {
      enabled: false,
      trackMousePatterns: false,
      trackKeyboardPatterns: false,
      detectAutomation: false,
      suspiciousActivityThreshold: 5
    }
  },

  enhanced: {
    enabled: true,
    screenshotDetection: {
      enabled: true,
      methods: ['visibility', 'keyboard', 'focus', 'clipboard'] as const,
      sensitivity: 'high' as const,
      blockDuration: 3000
    },
    screenRecordingDetection: {
      enabled: true,
      methods: ['media_devices', 'performance'] as const,
      alertUser: true,
      blockContent: true
    },
    devToolsProtection: {
      enabled: true,
      detectMethods: ['debugger', 'timing'] as const,
      blockContent: true,
      redirectOnDetection: false
    },
    contentProtection: {
      disableRightClick: true,
      disableTextSelection: true,
      disableDragDrop: true,
      disablePrint: true,
      disableCopy: true,
      disableInspect: true
    },
    visualProtection: {
      blurOnSuspiciousActivity: true,
      hideOnTabSwitch: true,
      overlayOnDetection: true,
      dynamicWatermarks: true
    },
    behaviorAnalysis: {
      enabled: true,
      trackMousePatterns: true,
      trackKeyboardPatterns: true,
      detectAutomation: true,
      suspiciousActivityThreshold: 3
    }
  },

  maximum: {
    enabled: true,
    screenshotDetection: {
      enabled: true,
      methods: ['visibility', 'keyboard', 'devtools', 'focus', 'clipboard'] as const,
      sensitivity: 'high' as const,
      blockDuration: 5000
    },
    screenRecordingDetection: {
      enabled: true,
      methods: ['media_devices', 'performance', 'canvas_fingerprint'] as const,
      alertUser: true,
      blockContent: true
    },
    devToolsProtection: {
      enabled: true,
      detectMethods: ['debugger', 'console', 'timing', 'function_toString'] as const,
      blockContent: true,
      redirectOnDetection: true
    },
    contentProtection: {
      disableRightClick: true,
      disableTextSelection: true,
      disableDragDrop: true,
      disablePrint: true,
      disableCopy: true,
      disableInspect: true
    },
    visualProtection: {
      blurOnSuspiciousActivity: true,
      hideOnTabSwitch: true,
      overlayOnDetection: true,
      dynamicWatermarks: true
    },
    behaviorAnalysis: {
      enabled: true,
      trackMousePatterns: true,
      trackKeyboardPatterns: true,
      detectAutomation: true,
      suspiciousActivityThreshold: 2
    }
  }
} as const
