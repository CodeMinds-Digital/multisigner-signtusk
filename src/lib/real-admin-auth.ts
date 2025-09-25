import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'

// Create admin Supabase client with service role key (server-side only)
function getAdminSupabase() {
  if (typeof window !== 'undefined') {
    throw new Error('Admin Supabase client can only be used on the server side')
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

// =====================================================
// REAL ADMIN AUTHENTICATION SERVICE
// Replaces mock localStorage auth with database-based auth
// =====================================================

export interface RealAdminUser {
  id: string
  email: string
  name: string
  role: 'super_admin' | 'support' | 'auditor'
  is_active: boolean
  two_fa_enabled: boolean
  last_login: string | null
  created_at: string
}

export interface RealAdminSession {
  id: string
  admin_user_id: string
  token: string
  expires_at: string
  user: RealAdminUser
}

export interface AdminLoginResult {
  success: boolean
  session?: RealAdminSession
  error?: string
  requiresTwoFA?: boolean
}

// =====================================================
// ADMIN AUTHENTICATION FUNCTIONS
// =====================================================

/**
 * Authenticate admin user with email and password
 */
export async function authenticateAdmin(email: string, password: string): Promise<AdminLoginResult> {
  try {
    const adminSupabase = getAdminSupabase()

    // Get admin user from database
    const { data: adminUser, error: userError } = await adminSupabase
      .from('admin_users')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('is_active', true)
      .single()

    if (userError || !adminUser) {
      return { success: false, error: 'Invalid credentials' }
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, adminUser.password_hash)
    if (!isValidPassword) {
      return { success: false, error: 'Invalid credentials' }
    }

    // Check if 2FA is required
    if (adminUser.two_fa_enabled) {
      return {
        success: false,
        requiresTwoFA: true,
        error: 'Two-factor authentication required'
      }
    }

    // Create session
    const session = await createAdminSession(adminUser)
    if (!session) {
      return { success: false, error: 'Failed to create session' }
    }

    // Update last login
    await adminSupabase
      .from('admin_users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', adminUser.id)

    // Log admin login
    await logAdminAction(adminUser.id, 'admin_login', 'session', session.id)

    return { success: true, session }

  } catch (error) {
    console.error('Admin authentication error:', error)
    return { success: false, error: 'Authentication failed' }
  }
}

/**
 * Create admin session in database
 */
async function createAdminSession(adminUser: any): Promise<RealAdminSession | null> {
  try {
    const adminSupabase = getAdminSupabase()
    const token = generateSessionToken()
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000) // 8 hours

    const { data: session, error } = await adminSupabase
      .from('admin_sessions')
      .insert({
        admin_user_id: adminUser.id,
        token,
        expires_at: expiresAt.toISOString(),
        ip_address: '127.0.0.1', // In production, get from request
        user_agent: 'Admin Dashboard' // In production, get from request
      })
      .select()
      .single()

    if (error || !session) {
      console.error('Failed to create admin session:', error)
      return null
    }

    return {
      id: session.id,
      admin_user_id: session.admin_user_id,
      token: session.token,
      expires_at: session.expires_at,
      user: {
        id: adminUser.id,
        email: adminUser.email,
        name: adminUser.name,
        role: adminUser.role,
        is_active: adminUser.is_active,
        two_fa_enabled: adminUser.two_fa_enabled,
        last_login: adminUser.last_login,
        created_at: adminUser.created_at
      }
    }

  } catch (error) {
    console.error('Error creating admin session:', error)
    return null
  }
}

/**
 * Validate admin session token
 */
export async function validateAdminSession(token: string): Promise<RealAdminSession | null> {
  try {
    const adminSupabase = getAdminSupabase()
    const { data: session, error } = await adminSupabase
      .from('admin_sessions')
      .select(`
        *,
        admin_users (*)
      `)
      .eq('token', token)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (error || !session || !session.admin_users) {
      return null
    }

    const adminUser = Array.isArray(session.admin_users)
      ? session.admin_users[0]
      : session.admin_users

    if (!adminUser.is_active) {
      return null
    }

    return {
      id: session.id,
      admin_user_id: session.admin_user_id,
      token: session.token,
      expires_at: session.expires_at,
      user: {
        id: adminUser.id,
        email: adminUser.email,
        name: adminUser.name,
        role: adminUser.role,
        is_active: adminUser.is_active,
        two_fa_enabled: adminUser.two_fa_enabled,
        last_login: adminUser.last_login,
        created_at: adminUser.created_at
      }
    }

  } catch (error) {
    console.error('Error validating admin session:', error)
    return null
  }
}

/**
 * Logout admin user
 */
export async function logoutAdmin(token: string): Promise<boolean> {
  try {
    // Get session info for logging
    const session = await validateAdminSession(token)

    const adminSupabase = getAdminSupabase()
    // Delete session from database
    const { error } = await adminSupabase
      .from('admin_sessions')
      .delete()
      .eq('token', token)

    if (error) {
      console.error('Error deleting admin session:', error)
      return false
    }

    // Log admin logout
    if (session) {
      await logAdminAction(session.user.id, 'admin_logout', 'session', session.id)
    }

    return true

  } catch (error) {
    console.error('Error logging out admin:', error)
    return false
  }
}

/**
 * Get current admin session from localStorage token
 */
export async function getCurrentAdminSession(): Promise<RealAdminSession | null> {
  try {
    const token = localStorage.getItem('admin_session_token')
    if (!token) {
      return null
    }

    return await validateAdminSession(token)

  } catch (error) {
    console.error('Error getting current admin session:', error)
    return null
  }
}

/**
 * Store admin session token in localStorage
 */
export function storeAdminSessionToken(token: string): void {
  localStorage.setItem('admin_session_token', token)
}

/**
 * Clear admin session token from localStorage
 */
export function clearAdminSessionToken(): void {
  localStorage.removeItem('admin_session_token')
}

/**
 * Check admin permissions
 */
export function hasAdminPermission(permission: string, userRole?: string): boolean {
  const permissions: Record<string, string[]> = {
    'super_admin': ['*'], // All permissions
    'support': ['view_users', 'view_documents', 'manage_api_keys', 'view_reports', 'manage_notifications'],
    'auditor': ['view_users', 'view_documents', 'view_reports', 'view_audit_logs']
  }

  const userPermissions = permissions[userRole || ''] || []
  return userPermissions.includes('*') || userPermissions.includes(permission)
}

/**
 * Log admin action for audit trail
 */
export async function logAdminAction(
  adminUserId: string,
  action: string,
  resourceType: string,
  resourceId?: string,
  oldValues?: any,
  newValues?: any
): Promise<void> {
  try {
    const adminSupabase = getAdminSupabase()
    await adminSupabase
      .from('admin_audit_logs')
      .insert({
        admin_user_id: adminUserId,
        action,
        resource_type: resourceType,
        resource_id: resourceId,
        old_values: oldValues,
        new_values: newValues,
        ip_address: '127.0.0.1', // In production, get from request
        user_agent: 'Admin Dashboard' // In production, get from request
      })

  } catch (error) {
    console.error('Error logging admin action:', error)
  }
}

/**
 * Generate secure session token
 */
function generateSessionToken(): string {
  return `admin_${uuidv4()}_${Date.now()}_${Math.random().toString(36).substring(2)}`
}

/**
 * Hash password for storage
 */
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10)
}

/**
 * Create new admin user
 */
export async function createAdminUser(
  email: string,
  password: string,
  name: string,
  role: 'super_admin' | 'support' | 'auditor'
): Promise<{ success: boolean; user?: RealAdminUser; error?: string }> {
  try {
    const adminSupabase = getAdminSupabase()
    const passwordHash = await hashPassword(password)

    const { data: adminUser, error } = await adminSupabase
      .from('admin_users')
      .insert({
        email: email.toLowerCase(),
        password_hash: passwordHash,
        name,
        role,
        is_active: true
      })
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return {
      success: true,
      user: {
        id: adminUser.id,
        email: adminUser.email,
        name: adminUser.name,
        role: adminUser.role,
        is_active: adminUser.is_active,
        two_fa_enabled: adminUser.two_fa_enabled,
        last_login: adminUser.last_login,
        created_at: adminUser.created_at
      }
    }

  } catch (error) {
    console.error('Error creating admin user:', error)
    return { success: false, error: 'Failed to create admin user' }
  }
}

/**
 * Get all admin users
 */
export async function getAllAdminUsers(): Promise<RealAdminUser[]> {
  try {
    const adminSupabase = getAdminSupabase()
    const { data: adminUsers, error } = await adminSupabase
      .from('admin_users')
      .select('id, email, name, role, is_active, two_fa_enabled, last_login, created_at')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching admin users:', error)
      return []
    }

    return adminUsers || []

  } catch (error) {
    console.error('Error getting admin users:', error)
    return []
  }
}
