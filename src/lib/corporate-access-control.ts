import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface DomainAdminUser {
  id: string
  email: string
  domain: string
  role: 'domain_admin' | 'domain_manager'
  isVerified: boolean
  companyName: string
}

export interface AccessControlResult {
  hasAccess: boolean
  user?: DomainAdminUser
  error?: string
}

/**
 * Check if user has domain administrator access
 */
export async function checkDomainAdminAccess(
  authToken: string
): Promise<AccessControlResult> {
  try {
    // Verify user authentication
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(authToken)

    if (authError || !user) {
      return { hasAccess: false, error: 'Invalid authentication token' }
    }

    // Extract domain from email
    const userDomain = user.email?.split('@')[1]
    if (!userDomain) {
      return { hasAccess: false, error: 'Invalid email domain' }
    }

    // Check if user is a domain administrator
    const { data: domainAdmin, error: adminError } = await supabaseAdmin
      .from('domain_administrators')
      .select(`
        role,
        is_verified,
        domain
      `)
      .eq('admin_user_id', user.id)
      .eq('domain', userDomain)
      .single()

    if (adminError || !domainAdmin) {
      return { hasAccess: false, error: 'User is not a domain administrator' }
    }

    // Get user profile for additional info
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('company_name')
      .eq('id', user.id)
      .single()

    const domainAdminUser: DomainAdminUser = {
      id: user.id,
      email: user.email!,
      domain: userDomain,
      role: domainAdmin.role,
      isVerified: domainAdmin.is_verified,
      companyName: profile?.company_name || userDomain
    }

    return { hasAccess: true, user: domainAdminUser }

  } catch (error) {
    console.error('Error checking domain admin access:', error)
    return { hasAccess: false, error: 'Internal server error' }
  }
}

/**
 * Check if user can manage another user in the same domain
 */
export async function canManageUser(
  adminToken: string,
  targetUserEmail: string
): Promise<boolean> {
  try {
    const accessResult = await checkDomainAdminAccess(adminToken)
    if (!accessResult.hasAccess || !accessResult.user) {
      return false
    }

    const targetDomain = targetUserEmail.split('@')[1]
    return accessResult.user.domain === targetDomain

  } catch (error) {
    console.error('Error checking user management permission:', error)
    return false
  }
}

/**
 * Get all users in the same domain as the admin
 */
export async function getDomainUsers(
  adminToken: string,
  page: number = 1,
  limit: number = 50
): Promise<{ users: any[], total: number, error?: string }> {
  try {
    const accessResult = await checkDomainAdminAccess(adminToken)
    if (!accessResult.hasAccess || !accessResult.user) {
      return { users: [], total: 0, error: 'Access denied' }
    }

    const domain = accessResult.user.domain
    const offset = (page - 1) * limit

    // Get users with the same domain
    const { data: users, error: usersError, count } = await supabaseAdmin
      .from('user_profiles')
      .select(`
        id,
        email,
        first_name,
        last_name,
        company_name,
        job_title,
        department,
        account_type,
        email_verified,
        created_at,
        last_sign_in_at
      `, { count: 'exact' })
      .eq('company_domain', domain)
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false })

    if (usersError) {
      return { users: [], total: 0, error: usersError.message }
    }

    // Get domain roles for these users
    const userIds = users?.map(u => u.id) || []
    const { data: roles } = await supabaseAdmin
      .from('domain_user_roles')
      .select('user_id, role, department, is_active')
      .in('user_id', userIds)

    // Merge user data with roles
    const usersWithRoles = users?.map(user => {
      const userRole = roles?.find(r => r.user_id === user.id)
      return {
        ...user,
        domainRole: userRole?.role || 'corporate_user',
        isActive: userRole?.is_active ?? true
      }
    }) || []

    return { users: usersWithRoles, total: count || 0 }

  } catch (error) {
    console.error('Error getting domain users:', error)
    return { users: [], total: 0, error: 'Internal server error' }
  }
}

/**
 * Create domain administrator for a new corporate user
 */
export async function createDomainAdmin(
  userId: string,
  email: string,
  _role: 'domain_admin' | 'domain_manager' = 'domain_admin'
): Promise<boolean> {
  try {
    const domain = email.split('@')[1]
    if (!domain) {
      return false
    }

    // Check if domain admin already exists
    const { data: existingAdmin } = await supabaseAdmin
      .from('domain_administrators')
      .select('id')
      .eq('domain', domain)
      .eq('role', 'domain_admin')
      .single()

    // If no domain admin exists, make this user the domain admin
    // If domain admin exists, make this user a domain manager
    const adminRole = existingAdmin ? 'domain_manager' : 'domain_admin'

    // Insert domain administrator record
    const { error: adminError } = await supabaseAdmin
      .from('domain_administrators')
      .insert({
        domain,
        admin_user_id: userId,
        role: adminRole,
        is_verified: false
      })

    if (adminError) {
      console.error('Error creating domain admin:', adminError)
      return false
    }

    // Create domain settings if they don't exist
    const { error: settingsError } = await supabaseAdmin
      .from('domain_settings')
      .upsert({
        domain,
        created_at: new Date().toISOString()
      }, {
        onConflict: 'domain',
        ignoreDuplicates: true
      })

    if (settingsError) {
      console.error('Error creating domain settings:', settingsError)
    }

    // Add user to domain user roles
    await supabaseAdmin
      .from('domain_user_roles')
      .upsert({
        domain,
        user_id: userId,
        role: adminRole,
        is_active: true
      }, {
        onConflict: 'domain,user_id'
      })

    return true

  } catch (error) {
    console.error('Error creating domain admin:', error)
    return false
  }
}

/**
 * Check if a domain has any administrators
 */
export async function hasDomainAdmin(domain: string): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin
      .from('domain_administrators')
      .select('id')
      .eq('domain', domain)
      .eq('role', 'domain_admin')
      .limit(1)

    return !error && data && data.length > 0

  } catch (error) {
    console.error('Error checking domain admin:', error)
    return false
  }
}

/**
 * Promote first corporate user to domain admin
 */
export async function promoteFirstUserToDomainAdmin(
  userId: string,
  email: string
): Promise<boolean> {
  try {
    const domain = email.split('@')[1]
    if (!domain) {
      return false
    }

    // Check if this is the first user from this domain
    const hasAdmin = await hasDomainAdmin(domain)
    if (hasAdmin) {
      return false // Domain already has an admin
    }

    return await createDomainAdmin(userId, email, 'domain_admin')

  } catch (error) {
    console.error('Error promoting first user to domain admin:', error)
    return false
  }
}

/**
 * Middleware function for API routes requiring domain admin access
 */
export function withDomainAdminAuth(handler: (...args: any[]) => Promise<Response>) {
  return async (request: Request, ...args: any[]) => {
    try {
      const authHeader = request.headers.get('authorization')
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: 'Authorization header required' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        )
      }

      const token = authHeader.replace('Bearer ', '')
      const accessResult = await checkDomainAdminAccess(token)

      if (!accessResult.hasAccess) {
        return new Response(
          JSON.stringify({ error: accessResult.error || 'Access denied' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        )
      }

      // Add domain admin user to request context
      ; (request as any).domainAdmin = accessResult.user

      return handler(request, ...args)

    } catch (error) {
      console.error('Domain admin auth middleware error:', error)
      return new Response(
        JSON.stringify({ error: 'Internal server error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }
  }
}
