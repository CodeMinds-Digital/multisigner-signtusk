// Secure authentication configuration following industry best practices

export const AUTH_CONFIG = {
  // Short-lived access tokens (5-15 minutes)
  ACCESS_TOKEN_LIFETIME: 15 * 60, // 15 minutes in seconds

  // Long-lived refresh tokens (7-30 days)
  REFRESH_TOKEN_LIFETIME: 7 * 24 * 60 * 60, // 7 days in seconds

  // Refresh threshold (refresh 2 minutes before expiry)
  REFRESH_THRESHOLD: 2 * 60, // 2 minutes in seconds

  // Cookie settings
  COOKIES: {
    ACCESS_TOKEN: {
      name: 'access_token',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_APP_URL?.includes('localhost'),
      sameSite: 'lax' as const,
      maxAge: 15 * 60, // 15 minutes
      path: '/',
    },
    REFRESH_TOKEN: {
      name: 'refresh_token',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_APP_URL?.includes('localhost'),
      sameSite: 'lax' as const,
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    }
  },

  // Protected routes that require authentication
  PROTECTED_ROUTES: [
    '/dashboard',
    '/drive',
    '/sign-inbox',
    '/signatures',
    '/settings',
    '/api/documents',
    '/api/signing-requests',
  ],

  // Public routes that don't require authentication
  PUBLIC_ROUTES: [
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/',
    '/pricing',
    '/about',
  ],
}

export const JWT_CONFIG = {
  // Use environment variable for JWT secret
  secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',

  // Algorithm for JWT signing
  algorithm: 'HS256' as const,

  // Issuer
  issuer: 'signtusk-app',

  // Audience
  audience: 'signtusk-users',
}

// Supabase configuration for secure token management
export const SUPABASE_AUTH_CONFIG = {
  // Configure Supabase to use shorter access tokens
  auth: {
    // Store tokens in HttpOnly cookies instead of localStorage
    storage: {
      getItem: () => null, // Disable client-side storage
      setItem: () => { }, // Disable client-side storage
      removeItem: () => { }, // Disable client-side storage
    },

    // Disable auto refresh on client (we'll handle server-side)
    autoRefreshToken: false,

    // Don't persist session in browser storage
    persistSession: false,

    // Disable session detection in URL
    detectSessionInUrl: false,
  },
}

// Error messages
export const AUTH_ERRORS = {
  INVALID_TOKEN: 'Invalid or expired token',
  MISSING_TOKEN: 'Authentication token required',
  REFRESH_FAILED: 'Failed to refresh authentication',
  UNAUTHORIZED: 'Unauthorized access',
  SESSION_EXPIRED: 'Session has expired, please log in again',
} as const

// Helper functions
export function isProtectedRoute(pathname: string): boolean {
  return AUTH_CONFIG.PROTECTED_ROUTES.some(route =>
    pathname.startsWith(route)
  )
}

export function isPublicRoute(pathname: string): boolean {
  return AUTH_CONFIG.PUBLIC_ROUTES.some(route =>
    pathname === route || (route !== '/' && pathname.startsWith(route))
  )
}

export function shouldRefreshToken(expiresAt: number): boolean {
  const now = Math.floor(Date.now() / 1000)
  const timeUntilExpiry = expiresAt - now
  return timeUntilExpiry <= AUTH_CONFIG.REFRESH_THRESHOLD
}
