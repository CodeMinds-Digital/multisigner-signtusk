// Theme and customization service - standalone theming and branding

export interface ThemeColors {
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

export interface ThemeTypography {
  fontFamily: string
  fontSize: {
    xs: string
    sm: string
    base: string
    lg: string
    xl: string
    '2xl': string
    '3xl': string
    '4xl': string
  }
  fontWeight: {
    light: number
    normal: number
    medium: number
    semibold: number
    bold: number
  }
  lineHeight: {
    tight: number
    normal: number
    relaxed: number
  }
}

export interface ThemeSpacing {
  xs: string
  sm: string
  md: string
  lg: string
  xl: string
  '2xl': string
  '3xl': string
  '4xl': string
}

export interface ThemeBranding {
  logo?: string
  logoLight?: string
  logoDark?: string
  favicon?: string
  companyName: string
  tagline?: string
  primaryColor: string
  secondaryColor: string
}

export interface CustomTheme {
  id: string
  name: string
  description?: string
  colors: ThemeColors
  typography: ThemeTypography
  spacing: ThemeSpacing
  branding: ThemeBranding
  isDark: boolean
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

export interface UserPreferences {
  userId: string
  themeId: string
  customizations: {
    sidebarCollapsed: boolean
    compactMode: boolean
    animations: boolean
    soundEffects: boolean
    notifications: {
      email: boolean
      browser: boolean
      desktop: boolean
    }
    language: string
    timezone: string
    dateFormat: string
    timeFormat: '12h' | '24h'
  }
  dashboardLayout: {
    widgets: Array<{
      id: string
      position: { x: number; y: number }
      size: { width: number; height: number }
      visible: boolean
    }>
  }
}

export class ThemeCustomizationService {
  private static themes: CustomTheme[] = []
  private static userPreferences: UserPreferences[] = []
  private static currentTheme: CustomTheme | null = null
  private static currentUserId: string | null = null

  /**
   * Initialize theme service
   */
  static initialize(): void {
    this.loadDefaultThemes()
    this.loadFromStorage()
    
    // Apply saved theme
    const savedThemeId = this.getSavedThemeId()
    if (savedThemeId) {
      this.applyTheme(savedThemeId)
    } else {
      this.applyTheme('default-light')
    }

    console.log('Theme Customization Service initialized')
  }

  /**
   * Load default themes
   */
  private static loadDefaultThemes(): void {
    const defaultLightColors: ThemeColors = {
      primary: '#3b82f6',
      secondary: '#64748b',
      accent: '#8b5cf6',
      background: '#ffffff',
      surface: '#f8fafc',
      text: '#1e293b',
      textSecondary: '#64748b',
      border: '#e2e8f0',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#06b6d4'
    }

    const defaultDarkColors: ThemeColors = {
      primary: '#60a5fa',
      secondary: '#94a3b8',
      accent: '#a78bfa',
      background: '#0f172a',
      surface: '#1e293b',
      text: '#f1f5f9',
      textSecondary: '#94a3b8',
      border: '#334155',
      success: '#34d399',
      warning: '#fbbf24',
      error: '#f87171',
      info: '#22d3ee'
    }

    const defaultTypography: ThemeTypography = {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: {
        xs: '0.75rem',
        sm: '0.875rem',
        base: '1rem',
        lg: '1.125rem',
        xl: '1.25rem',
        '2xl': '1.5rem',
        '3xl': '1.875rem',
        '4xl': '2.25rem'
      },
      fontWeight: {
        light: 300,
        normal: 400,
        medium: 500,
        semibold: 600,
        bold: 700
      },
      lineHeight: {
        tight: 1.25,
        normal: 1.5,
        relaxed: 1.75
      }
    }

    const defaultSpacing: ThemeSpacing = {
      xs: '0.25rem',
      sm: '0.5rem',
      md: '1rem',
      lg: '1.5rem',
      xl: '2rem',
      '2xl': '3rem',
      '3xl': '4rem',
      '4xl': '6rem'
    }

    const defaultBranding: ThemeBranding = {
      companyName: 'SignTusk',
      tagline: 'Digital Document Signing Made Simple',
      primaryColor: '#3b82f6',
      secondaryColor: '#64748b'
    }

    this.themes = [
      {
        id: 'default-light',
        name: 'Default Light',
        description: 'Clean and modern light theme',
        colors: defaultLightColors,
        typography: defaultTypography,
        spacing: defaultSpacing,
        branding: defaultBranding,
        isDark: false,
        isDefault: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'default-dark',
        name: 'Default Dark',
        description: 'Sleek dark theme for low-light environments',
        colors: defaultDarkColors,
        typography: defaultTypography,
        spacing: defaultSpacing,
        branding: defaultBranding,
        isDark: true,
        isDefault: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]
  }

  /**
   * Apply theme
   */
  static applyTheme(themeId: string): boolean {
    const theme = this.themes.find(t => t.id === themeId)
    if (!theme) return false

    this.currentTheme = theme
    this.applyThemeToDOM(theme)
    this.saveThemeId(themeId)

    // Dispatch theme change event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('themeChanged', { detail: theme }))
    }

    return true
  }

  /**
   * Apply theme to DOM
   */
  private static applyThemeToDOM(theme: CustomTheme): void {
    if (typeof document === 'undefined') return

    const root = document.documentElement

    // Apply CSS custom properties
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value)
    })

    // Apply typography
    root.style.setProperty('--font-family', theme.typography.fontFamily)
    Object.entries(theme.typography.fontSize).forEach(([key, value]) => {
      root.style.setProperty(`--font-size-${key}`, value)
    })

    // Apply spacing
    Object.entries(theme.spacing).forEach(([key, value]) => {
      root.style.setProperty(`--spacing-${key}`, value)
    })

    // Apply dark/light class
    if (theme.isDark) {
      document.body.classList.add('dark')
      document.body.classList.remove('light')
    } else {
      document.body.classList.add('light')
      document.body.classList.remove('dark')
    }
  }

  /**
   * Create custom theme
   */
  static createCustomTheme(
    name: string,
    baseThemeId: string,
    customizations: Partial<Pick<CustomTheme, 'colors' | 'typography' | 'spacing' | 'branding'>>
  ): CustomTheme | null {
    const baseTheme = this.themes.find(t => t.id === baseThemeId)
    if (!baseTheme) return null

    const customTheme: CustomTheme = {
      id: this.generateId(),
      name,
      description: `Custom theme based on ${baseTheme.name}`,
      colors: { ...baseTheme.colors, ...customizations.colors },
      typography: { ...baseTheme.typography, ...customizations.typography },
      spacing: { ...baseTheme.spacing, ...customizations.spacing },
      branding: { ...baseTheme.branding, ...customizations.branding },
      isDark: baseTheme.isDark,
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    this.themes.push(customTheme)
    this.saveToStorage()

    return customTheme
  }

  /**
   * Update theme
   */
  static updateTheme(
    themeId: string,
    updates: Partial<Pick<CustomTheme, 'name' | 'description' | 'colors' | 'typography' | 'spacing' | 'branding'>>
  ): boolean {
    const theme = this.themes.find(t => t.id === themeId)
    if (!theme || theme.isDefault) return false

    Object.assign(theme, updates, { updatedAt: new Date().toISOString() })
    this.saveToStorage()

    // Reapply if it's the current theme
    if (this.currentTheme?.id === themeId) {
      this.applyThemeToDOM(theme)
    }

    return true
  }

  /**
   * Delete custom theme
   */
  static deleteTheme(themeId: string): boolean {
    const themeIndex = this.themes.findIndex(t => t.id === themeId)
    if (themeIndex === -1 || this.themes[themeIndex].isDefault) return false

    this.themes.splice(themeIndex, 1)
    this.saveToStorage()

    // Switch to default if deleting current theme
    if (this.currentTheme?.id === themeId) {
      this.applyTheme('default-light')
    }

    return true
  }

  /**
   * Get all themes
   */
  static getThemes(): CustomTheme[] {
    return [...this.themes]
  }

  /**
   * Get current theme
   */
  static getCurrentTheme(): CustomTheme | null {
    return this.currentTheme
  }

  /**
   * Set user preferences
   */
  static setUserPreferences(userId: string, preferences: Partial<UserPreferences['customizations']>): void {
    this.currentUserId = userId
    
    let userPref = this.userPreferences.find(p => p.userId === userId)
    if (!userPref) {
      userPref = {
        userId,
        themeId: 'default-light',
        customizations: {
          sidebarCollapsed: false,
          compactMode: false,
          animations: true,
          soundEffects: false,
          notifications: {
            email: true,
            browser: true,
            desktop: false
          },
          language: 'en',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          dateFormat: 'MM/DD/YYYY',
          timeFormat: '12h'
        },
        dashboardLayout: {
          widgets: []
        }
      }
      this.userPreferences.push(userPref)
    }

    Object.assign(userPref.customizations, preferences)
    this.saveToStorage()
  }

  /**
   * Get user preferences
   */
  static getUserPreferences(userId: string): UserPreferences | null {
    return this.userPreferences.find(p => p.userId === userId) || null
  }

  /**
   * Toggle dark mode
   */
  static toggleDarkMode(): void {
    const currentIsDark = this.currentTheme?.isDark
    const newThemeId = currentIsDark ? 'default-light' : 'default-dark'
    this.applyTheme(newThemeId)
  }

  /**
   * Generate theme CSS
   */
  static generateThemeCSS(themeId: string): string {
    const theme = this.themes.find(t => t.id === themeId)
    if (!theme) return ''

    let css = ':root {\n'
    
    // Colors
    Object.entries(theme.colors).forEach(([key, value]) => {
      css += `  --color-${key}: ${value};\n`
    })

    // Typography
    css += `  --font-family: ${theme.typography.fontFamily};\n`
    Object.entries(theme.typography.fontSize).forEach(([key, value]) => {
      css += `  --font-size-${key}: ${value};\n`
    })

    // Spacing
    Object.entries(theme.spacing).forEach(([key, value]) => {
      css += `  --spacing-${key}: ${value};\n`
    })

    css += '}\n'

    return css
  }

  /**
   * Export theme
   */
  static exportTheme(themeId: string): string | null {
    const theme = this.themes.find(t => t.id === themeId)
    if (!theme) return null

    return JSON.stringify(theme, null, 2)
  }

  /**
   * Import theme
   */
  static importTheme(themeData: string): CustomTheme | null {
    try {
      const theme = JSON.parse(themeData) as CustomTheme
      
      // Validate theme structure
      if (!theme.id || !theme.name || !theme.colors || !theme.typography) {
        throw new Error('Invalid theme structure')
      }

      // Generate new ID to avoid conflicts
      theme.id = this.generateId()
      theme.isDefault = false
      theme.createdAt = new Date().toISOString()
      theme.updatedAt = new Date().toISOString()

      this.themes.push(theme)
      this.saveToStorage()

      return theme
    } catch (error) {
      console.error('Error importing theme:', error)
      return null
    }
  }

  /**
   * Private helper methods
   */
  private static saveThemeId(themeId: string): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('signtusk_theme_id', themeId)
    }
  }

  private static getSavedThemeId(): string | null {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('signtusk_theme_id')
    }
    return null
  }

  private static saveToStorage(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('signtusk_custom_themes', JSON.stringify(this.themes.filter(t => !t.isDefault)))
      localStorage.setItem('signtusk_user_preferences', JSON.stringify(this.userPreferences))
    }
  }

  private static loadFromStorage(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        const customThemes = localStorage.getItem('signtusk_custom_themes')
        if (customThemes) {
          const themes = JSON.parse(customThemes) as CustomTheme[]
          this.themes.push(...themes)
        }

        const userPreferences = localStorage.getItem('signtusk_user_preferences')
        if (userPreferences) {
          this.userPreferences = JSON.parse(userPreferences)
        }
      } catch (error) {
        console.error('Error loading from storage:', error)
      }
    }
  }

  private static generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36)
  }
}
