// Enhanced Dynamic Watermarking Service
// Provides advanced watermarking with user info, timestamps, and dynamic content

export interface EnhancedWatermarkConfig {
  enabled: boolean
  template: string // Template with placeholders like {{user_email}}, {{timestamp}}, {{ip_address}}
  opacity: number
  color: string
  position: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'diagonal' | 'pattern'
  fontSize: number
  rotation: number
  fontFamily: string
  pattern?: {
    enabled: boolean
    spacing: number // Distance between watermarks in pattern mode
    stagger: boolean // Stagger pattern for better coverage
  }
  animation?: {
    enabled: boolean
    type: 'fade' | 'slide' | 'pulse'
    duration: number
  }
  security?: {
    hideOnScreenshot: boolean
    randomizePosition: boolean
    dynamicOpacity: boolean
  }
}

export interface WatermarkContext {
  userEmail?: string
  userName?: string
  userIP?: string
  timestamp: string
  documentTitle?: string
  linkId: string
  sessionId?: string
  viewerFingerprint?: string
  customData?: Record<string, string>
}

export class EnhancedWatermarkService {
  /**
   * Generate watermark text from template with dynamic data
   */
  static generateWatermarkText(template: string, context: WatermarkContext): string {
    let text = template

    // Replace placeholders with actual values
    const replacements = {
      '{{user_email}}': context.userEmail || 'Anonymous',
      '{{user_name}}': context.userName || 'Anonymous User',
      '{{ip_address}}': context.userIP || 'Unknown IP',
      '{{timestamp}}': context.timestamp,
      '{{date}}': new Date(context.timestamp).toLocaleDateString(),
      '{{time}}': new Date(context.timestamp).toLocaleTimeString(),
      '{{document_title}}': context.documentTitle || 'Document',
      '{{link_id}}': context.linkId,
      '{{session_id}}': context.sessionId || 'Unknown Session',
      '{{fingerprint}}': context.viewerFingerprint?.substring(0, 8) || 'Unknown',
      '{{year}}': new Date().getFullYear().toString(),
      '{{month}}': (new Date().getMonth() + 1).toString().padStart(2, '0'),
      '{{day}}': new Date().getDate().toString().padStart(2, '0')
    }

    // Add custom data replacements
    if (context.customData) {
      Object.entries(context.customData).forEach(([key, value]) => {
        (replacements as any)[`{{${key}}}`] = value
      })
    }

    // Replace all placeholders
    Object.entries(replacements).forEach(([placeholder, value]) => {
      text = text.replace(new RegExp(placeholder, 'g'), value)
    })

    return text
  }

  /**
   * Generate CSS styles for watermark based on configuration
   */
  static generateWatermarkStyles(config: EnhancedWatermarkConfig, context: WatermarkContext): {
    containerStyle: React.CSSProperties
    textStyle: React.CSSProperties
    animationClass?: string
  } {
    const baseContainerStyle: React.CSSProperties = {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      pointerEvents: 'none',
      userSelect: 'none',
      zIndex: 9999,
      overflow: 'hidden'
    }

    const baseTextStyle: React.CSSProperties = {
      fontFamily: config.fontFamily || 'Arial, sans-serif',
      fontSize: `${config.fontSize}px`,
      color: config.color,
      opacity: config.opacity,
      fontWeight: 'bold',
      textShadow: '1px 1px 2px rgba(255,255,255,0.5)',
      userSelect: 'none',
      pointerEvents: 'none',
      whiteSpace: 'nowrap'
    }

    // Position-specific styles
    let positionStyle: React.CSSProperties = {}

    switch (config.position) {
      case 'center':
        positionStyle = {
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: `translate(-50%, -50%) rotate(${config.rotation}deg)`
        }
        break
      case 'top-left':
        positionStyle = {
          position: 'absolute',
          top: '20px',
          left: '20px',
          transform: `rotate(${config.rotation}deg)`
        }
        break
      case 'top-right':
        positionStyle = {
          position: 'absolute',
          top: '20px',
          right: '20px',
          transform: `rotate(${config.rotation}deg)`
        }
        break
      case 'bottom-left':
        positionStyle = {
          position: 'absolute',
          bottom: '20px',
          left: '20px',
          transform: `rotate(${config.rotation}deg)`
        }
        break
      case 'bottom-right':
        positionStyle = {
          position: 'absolute',
          bottom: '20px',
          right: '20px',
          transform: `rotate(${config.rotation}deg)`
        }
        break
      case 'diagonal':
        positionStyle = {
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: `translate(-50%, -50%) rotate(-45deg)`
        }
        break
    }

    // Security enhancements
    if (config.security?.randomizePosition) {
      const randomX = Math.random() * 20 - 10 // -10% to +10%
      const randomY = Math.random() * 20 - 10
      positionStyle.transform += ` translate(${randomX}%, ${randomY}%)`
    }

    if (config.security?.dynamicOpacity) {
      const opacityVariation = Math.random() * 0.2 - 0.1 // ±0.1
      baseTextStyle.opacity = Math.max(0.1, Math.min(1, config.opacity + opacityVariation))
    }

    return {
      containerStyle: baseContainerStyle,
      textStyle: { ...baseTextStyle, ...positionStyle },
      animationClass: config.animation?.enabled ? `watermark-${config.animation.type}` : undefined
    }
  }

  /**
   * Generate pattern watermark (multiple watermarks across the screen)
   */
  static generatePatternWatermarks(config: EnhancedWatermarkConfig, context: WatermarkContext): Array<{
    id: string
    text: string
    style: React.CSSProperties
  }> {
    if (!config.pattern?.enabled) return []

    const watermarks: Array<{ id: string; text: string; style: React.CSSProperties }> = []
    const spacing = config.pattern.spacing || 200
    const stagger = config.pattern.stagger || false

    // Calculate grid dimensions
    const cols = Math.ceil(window.innerWidth / spacing)
    const rows = Math.ceil(window.innerHeight / spacing)

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = col * spacing + (stagger && row % 2 ? spacing / 2 : 0)
        const y = row * spacing

        const watermarkText = this.generateWatermarkText(config.template, context)

        watermarks.push({
          id: `watermark-${row}-${col}`,
          text: watermarkText,
          style: {
            position: 'absolute',
            left: `${x}px`,
            top: `${y}px`,
            transform: `rotate(${config.rotation}deg)`,
            fontFamily: config.fontFamily || 'Arial, sans-serif',
            fontSize: `${config.fontSize}px`,
            color: config.color,
            opacity: config.opacity,
            fontWeight: 'bold',
            textShadow: '1px 1px 2px rgba(255,255,255,0.5)',
            userSelect: 'none',
            pointerEvents: 'none',
            whiteSpace: 'nowrap'
          }
        })
      }
    }

    return watermarks
  }

  /**
   * Get default watermark templates
   */
  static getDefaultTemplates(): Array<{ name: string; template: string; description: string }> {
    return [
      {
        name: 'Basic User Info',
        template: '{{user_email}} - {{date}} {{time}}',
        description: 'Shows user email and current date/time'
      },
      {
        name: 'Confidential',
        template: 'CONFIDENTIAL - {{user_email}} - {{timestamp}}',
        description: 'Confidential marking with user and timestamp'
      },
      {
        name: 'Document Tracking',
        template: '{{document_title}} - Viewed by {{user_name}} - {{date}}',
        description: 'Document title with viewer name and date'
      },
      {
        name: 'Security Tracking',
        template: 'ID: {{fingerprint}} | IP: {{ip_address}} | {{time}}',
        description: 'Security information with fingerprint and IP'
      },
      {
        name: 'Simple Timestamp',
        template: 'Accessed: {{date}} {{time}}',
        description: 'Simple timestamp watermark'
      },
      {
        name: 'Full Context',
        template: '{{user_email}} | {{document_title}} | {{date}} {{time}} | Session: {{session_id}}',
        description: 'Complete context information'
      }
    ]
  }

  /**
   * Validate watermark configuration
   */
  static validateConfig(config: EnhancedWatermarkConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (config.opacity < 0 || config.opacity > 1) {
      errors.push('Opacity must be between 0 and 1')
    }

    if (config.fontSize < 8 || config.fontSize > 72) {
      errors.push('Font size must be between 8 and 72 pixels')
    }

    if (!config.template || config.template.trim().length === 0) {
      errors.push('Watermark template cannot be empty')
    }

    if (config.pattern?.enabled && (!config.pattern.spacing || config.pattern.spacing < 50)) {
      errors.push('Pattern spacing must be at least 50 pixels')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * Generate CSS animations for watermarks
   */
  static generateAnimationCSS(): string {
    return `
      @keyframes watermark-fade {
        0%, 100% { opacity: var(--watermark-opacity, 0.5); }
        50% { opacity: calc(var(--watermark-opacity, 0.5) * 0.7); }
      }

      @keyframes watermark-slide {
        0% { transform: translateX(-10px); }
        50% { transform: translateX(10px); }
        100% { transform: translateX(-10px); }
      }

      @keyframes watermark-pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
      }

      .watermark-fade {
        animation: watermark-fade 3s ease-in-out infinite;
      }

      .watermark-slide {
        animation: watermark-slide 4s ease-in-out infinite;
      }

      .watermark-pulse {
        animation: watermark-pulse 2s ease-in-out infinite;
      }

      /* Screenshot protection styles */
      .watermark-screenshot-protection {
        filter: blur(0.5px);
        transition: filter 0.1s ease;
      }

      .watermark-screenshot-protection:hover {
        filter: blur(0px);
      }
    `
  }
}
