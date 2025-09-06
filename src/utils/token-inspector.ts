import { supabase } from '@/lib/supabase'

export interface TokenInfo {
  accessToken: {
    token: string
    expiresAt: number
    expiresAtFormatted: string
    timeUntilExpiry: number
    timeUntilExpiryFormatted: string
    isExpired: boolean
    willExpireSoon: boolean // within 5 minutes
  }
  refreshToken: {
    token: string
    // Refresh tokens typically don't have explicit expiry in JWT
    // They expire based on Supabase project settings
  }
  session: {
    userId: string
    email: string
    createdAt: string
    lastSignInAt: string
  }
  supabaseSettings: {
    autoRefreshEnabled: boolean
    refreshThreshold: string
  }
}

/**
 * Inspect current token information and expiry times
 */
export async function inspectTokenInfo(): Promise<TokenInfo | null> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      console.error('Error getting session for token inspection:', error)
      return null
    }

    if (!session) {
      console.log('No active session found')
      return null
    }

    const now = Date.now()
    const expiresAt = session.expires_at! * 1000 // Convert to milliseconds
    const timeUntilExpiry = expiresAt - now
    const isExpired = timeUntilExpiry <= 0
    const willExpireSoon = timeUntilExpiry <= 5 * 60 * 1000 // 5 minutes

    // Parse JWT to get more info (basic parsing, not verification)
    const accessTokenParts = session.access_token.split('.')
    let tokenPayload: any = {}
    try {
      tokenPayload = JSON.parse(atob(accessTokenParts[1]))
    } catch (e) {
      console.warn('Could not parse access token payload')
    }

    return {
      accessToken: {
        token: session.access_token.substring(0, 50) + '...',
        expiresAt,
        expiresAtFormatted: new Date(expiresAt).toLocaleString(),
        timeUntilExpiry,
        timeUntilExpiryFormatted: formatDuration(timeUntilExpiry),
        isExpired,
        willExpireSoon
      },
      refreshToken: {
        token: session.refresh_token.substring(0, 50) + '...'
      },
      session: {
        userId: session.user.id,
        email: session.user.email || 'No email',
        createdAt: session.user.created_at,
        lastSignInAt: session.user.last_sign_in_at || 'Never'
      },
      supabaseSettings: {
        autoRefreshEnabled: true, // We set this in dynamic-supabase.ts
        refreshThreshold: '5 minutes before expiry'
      }
    }
  } catch (error) {
    console.error('Error inspecting token info:', error)
    return null
  }
}

/**
 * Format duration in milliseconds to human readable string
 */
function formatDuration(ms: number): string {
  if (ms <= 0) return 'Expired'
  
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`
  if (hours > 0) return `${hours}h ${minutes % 60}m`
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`
  return `${seconds}s`
}

/**
 * Get Supabase project token settings (these are typically configured in Supabase dashboard)
 */
export function getSupabaseTokenDefaults() {
  return {
    accessTokenLifetime: '1 hour (3600 seconds)', // Default Supabase setting
    refreshTokenLifetime: '30 days (2592000 seconds)', // Default Supabase setting
    autoRefreshThreshold: '10 minutes before expiry', // Default Supabase behavior
    ourRefreshThreshold: '5 minutes before expiry', // Our custom setting
    notes: [
      'Access tokens expire after 1 hour by default',
      'Refresh tokens expire after 30 days by default',
      'Supabase auto-refreshes tokens 10 minutes before expiry',
      'Our app proactively refreshes 5 minutes before expiry',
      'Token lifetimes can be configured in Supabase Dashboard > Authentication > Settings'
    ]
  }
}

/**
 * Log comprehensive token information to console
 */
export async function logTokenInfo() {
  console.group('🔍 Token Information')
  
  const tokenInfo = await inspectTokenInfo()
  if (!tokenInfo) {
    console.log('❌ No token information available (not logged in)')
    console.groupEnd()
    return
  }

  console.log('📋 Access Token:', {
    expiresAt: tokenInfo.accessToken.expiresAtFormatted,
    timeUntilExpiry: tokenInfo.accessToken.timeUntilExpiryFormatted,
    isExpired: tokenInfo.accessToken.isExpired,
    willExpireSoon: tokenInfo.accessToken.willExpireSoon
  })

  console.log('🔄 Refresh Token:', {
    available: !!tokenInfo.refreshToken.token,
    note: 'Refresh tokens typically last 30 days'
  })

  console.log('👤 Session:', {
    userId: tokenInfo.session.userId,
    email: tokenInfo.session.email,
    createdAt: tokenInfo.session.createdAt,
    lastSignIn: tokenInfo.session.lastSignInAt
  })

  console.log('⚙️ Settings:', tokenInfo.supabaseSettings)
  
  const defaults = getSupabaseTokenDefaults()
  console.log('📖 Supabase Defaults:', defaults)

  console.groupEnd()
}

/**
 * Monitor token expiry and log warnings
 */
export function startTokenMonitoring() {
  const checkInterval = 60 * 1000 // Check every minute
  
  const monitor = setInterval(async () => {
    const tokenInfo = await inspectTokenInfo()
    if (!tokenInfo) {
      clearInterval(monitor)
      return
    }

    const { accessToken } = tokenInfo
    
    if (accessToken.isExpired) {
      console.warn('⚠️ Access token has expired!')
    } else if (accessToken.willExpireSoon) {
      console.warn(`⚠️ Access token expires soon: ${accessToken.timeUntilExpiryFormatted}`)
    }
  }, checkInterval)

  console.log('🔍 Started token monitoring (checks every minute)')
  return () => {
    clearInterval(monitor)
    console.log('🛑 Stopped token monitoring')
  }
}
