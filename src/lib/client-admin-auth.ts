// =====================================================
// CLIENT-SIDE ADMIN AUTHENTICATION
// Handles session management on the client side
// =====================================================

export interface ClientAdminSession {
  token: string
  expires_at: string
  user: {
    id: string
    email: string
    name: string
    role: string
    is_active: boolean
    two_fa_enabled: boolean
    created_at: string
  }
}

/**
 * Store admin session token in localStorage
 */
export function storeAdminSessionToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('admin_session_token', token)
  }
}

/**
 * Get admin session token from localStorage
 */
export function getAdminSessionToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('admin_session_token')
  }
  return null
}

/**
 * Remove admin session token from localStorage
 */
export function removeAdminSessionToken(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('admin_session_token')
  }
}

/**
 * Get current admin session (client-side only)
 * This makes an API call to validate the session
 */
export async function getCurrentAdminSession(): Promise<ClientAdminSession | null> {
  try {
    const token = getAdminSessionToken()
    if (!token) {
      return null
    }

    // Validate session with API
    const response = await fetch('/api/admin/auth/validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })

    if (!response.ok) {
      // Session is invalid, remove token
      removeAdminSessionToken()
      return null
    }

    const data = await response.json()
    return data.session

  } catch (error) {
    console.error('Error validating admin session:', error)
    removeAdminSessionToken()
    return null
  }
}

/**
 * Login admin user (client-side)
 */
export async function loginAdmin(email: string, password: string): Promise<{
  success: boolean
  session?: ClientAdminSession
  error?: string
  requiresTwoFA?: boolean
}> {
  try {
    const response = await fetch('/api/admin/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    })

    const result = await response.json()

    if (result.success && result.session) {
      // Store session token
      storeAdminSessionToken(result.session.token)
      return {
        success: true,
        session: result.session
      }
    }

    return {
      success: false,
      error: result.error,
      requiresTwoFA: result.requiresTwoFA
    }

  } catch (error) {
    console.error('Error logging in admin:', error)
    return {
      success: false,
      error: 'Network error occurred'
    }
  }
}

/**
 * Logout admin user (client-side)
 */
export async function logoutAdmin(): Promise<boolean> {
  try {
    const token = getAdminSessionToken()
    if (!token) {
      return true
    }

    // Call logout API
    const response = await fetch('/api/admin/auth/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })

    // Remove token regardless of API response
    removeAdminSessionToken()

    return response.ok

  } catch (error) {
    console.error('Error logging out admin:', error)
    // Remove token even if API call fails
    removeAdminSessionToken()
    return false
  }
}

/**
 * Check if user is admin (client-side)
 */
export async function isAdmin(): Promise<boolean> {
  const session = await getCurrentAdminSession()
  return session !== null
}

/**
 * Get admin user info (client-side)
 */
export async function getAdminUser(): Promise<ClientAdminSession['user'] | null> {
  const session = await getCurrentAdminSession()
  return session?.user || null
}

/**
 * Check admin permission (client-side)
 */
export function hasAdminPermission(permission: string, role: string): boolean {
  const permissions = {
    super_admin: [
      'view_users', 'manage_users', 'delete_users',
      'view_documents', 'manage_documents', 'delete_documents',
      'view_analytics', 'manage_analytics',
      'view_settings', 'manage_settings',
      'view_features', 'manage_features',
      'view_billing', 'manage_billing',
      'view_audit_logs', 'manage_audit_logs'
    ],
    support: [
      'view_users', 'manage_users',
      'view_documents', 'manage_documents',
      'view_analytics',
      'view_settings',
      'view_features'
    ],
    auditor: [
      'view_users',
      'view_documents',
      'view_analytics',
      'view_settings',
      'view_features',
      'view_audit_logs'
    ]
  }

  const rolePermissions = permissions[role as keyof typeof permissions] || []
  return rolePermissions.includes(permission)
}

/**
 * Make authenticated admin API request (client-side helper)
 */
export async function makeAdminAPIRequest(endpoint: string, options: RequestInit = {}) {
  const token = getAdminSessionToken()
  if (!token) {
    throw new Error('No admin session token')
  }

  const response = await fetch(endpoint, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers
    }
  })

  if (response.status === 401) {
    // Session expired, remove token and redirect to login
    removeAdminSessionToken()
    window.location.href = '/admin/login'
    throw new Error('Session expired')
  }

  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`)
  }

  return response.json()
}
