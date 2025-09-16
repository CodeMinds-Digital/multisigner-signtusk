
export interface AdminUser {
  id: string
  email: string
  role: 'super_admin' | 'support' | 'auditor'
  name: string
  created_at: string
  last_login: string
  is_active: boolean
  two_fa_enabled: boolean
}

export interface AdminSession {
  user: AdminUser
  token: string
  expires_at: string
}

// Admin authentication storage keys
const ADMIN_SESSION_KEY = 'signtusk_admin_session'


// Predefined admin users (in production, this would be in a secure database)
const ADMIN_USERS: Record<string, { password: string; user: Omit<AdminUser, 'id' | 'last_login'> }> = {
  'admin@signtusk.com': {
    password: 'admin123!', // In production, this would be hashed
    user: {
      email: 'admin@signtusk.com',
      role: 'super_admin',
      name: 'Super Administrator',
      created_at: '2024-01-01T00:00:00Z',
      is_active: true,
      two_fa_enabled: false
    }
  },
  'support@signtusk.com': {
    password: 'support123!',
    user: {
      email: 'support@signtusk.com',
      role: 'support',
      name: 'Support Team',
      created_at: '2024-01-01T00:00:00Z',
      is_active: true,
      two_fa_enabled: false
    }
  },
  'auditor@signtusk.com': {
    password: 'auditor123!',
    user: {
      email: 'auditor@signtusk.com',
      role: 'auditor',
      name: 'System Auditor',
      created_at: '2024-01-01T00:00:00Z',
      is_active: true,
      two_fa_enabled: false
    }
  }
}

// Admin login function
export async function adminLogin(email: string, password: string): Promise<{ success: boolean; session?: AdminSession; error?: string }> {
  try {
    const adminData = ADMIN_USERS[email.toLowerCase()]

    if (!adminData) {
      return { success: false, error: 'Invalid credentials' }
    }

    if (!adminData.user.is_active) {
      return { success: false, error: 'Account is deactivated' }
    }

    // Simple password check (in production, use proper hashing)
    if (adminData.password !== password) {
      return { success: false, error: 'Invalid credentials' }
    }

    // Create session
    const session: AdminSession = {
      user: {
        ...adminData.user,
        id: `admin_${Date.now()}`,
        last_login: new Date().toISOString()
      },
      token: `admin_token_${Date.now()}_${Math.random().toString(36).substring(2)}`,
      expires_at: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString() // 8 hours
    }

    // Store session
    localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session))



    return { success: true, session }

  } catch (e) {
    console.error('Admin login error:', e)
    return { success: false, error: 'Invalid credentials' }
  }
}

// Get current admin session
export function getAdminSession(): AdminSession | null {
  try {
    const stored = localStorage.getItem(ADMIN_SESSION_KEY)
    if (!stored) return null

    const session: AdminSession = JSON.parse(stored)

    // Check if session is expired
    if (new Date(session.expires_at) < new Date()) {
      localStorage.removeItem(ADMIN_SESSION_KEY)
      return null
    }

    return session

  } catch (e) {
    console.error('Admin session parse error:', e)
    localStorage.removeItem(ADMIN_SESSION_KEY)
    return null
  }
}

// Admin logout
export async function adminLogout(): Promise<void> {
  localStorage.removeItem(ADMIN_SESSION_KEY)
}

// Check admin permissions
export function hasAdminPermission(permission: string, userRole?: string): boolean {
  const session = getAdminSession()
  if (!session) return false

  const role = userRole || session.user.role

  const permissions: Record<string, string[]> = {
    'super_admin': ['*'], // All permissions
    'support': ['view_users', 'view_documents', 'manage_api_keys', 'view_reports'],
    'auditor': ['view_users', 'view_documents', 'view_reports']
  }

  const userPermissions = permissions[role] || []
  return userPermissions.includes('*') || userPermissions.includes(permission)
}



// Validate admin session middleware
export function requireAdminAuth(): AdminSession | null {
  const session = getAdminSession()
  if (!session) {
    window.location.href = '/admin/login'
    return null
  }
  return session
}

// Get admin users list (for user management)
export function getAdminUsers(): AdminUser[] {
  return Object.entries(ADMIN_USERS).map(([_unusedEmail, data], index) => ({
    ...data.user,
    id: `admin_${index + 1}`,
    last_login: '2024-01-15T10:30:00Z' // Mock data
  }))
}

// Update admin user
export async function updateAdminUser(): Promise<{ success: boolean; error?: string }> {
  try {
    const session = getAdminSession()
    if (!session) {
      return { success: false, error: 'Not authenticated' }
    }

    if (!hasAdminPermission('manage_admins')) {
      return { success: false, error: 'Insufficient permissions' }
    }

    // In production, this would update the database

    return { success: true }

  } catch (e) {
    console.error('Admin user update error:', e)
    return { success: false, error: 'Failed to update admin user' }
  }
}

// Create new admin user
export async function createAdminUser(): Promise<{ success: boolean; error?: string }> {
  try {
    const session = getAdminSession()
    if (!session) {
      return { success: false, error: 'Not authenticated' }
    }

    if (!hasAdminPermission('manage_admins')) {
      return { success: false, error: 'Insufficient permissions' }
    }

    // In production, this would create in database

    return { success: true }

  } catch (error) {
    console.error('Admin user create error:', error)
    return { success: false, error: 'Failed to create admin user' }
  }
}
