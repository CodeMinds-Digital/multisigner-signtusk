import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    // Get user from session
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Extract domain from user email
    const userDomain = user.email?.split('@')[1]
    if (!userDomain) {
      return NextResponse.json({ error: 'Invalid email domain' }, { status: 400 })
    }

    // Check if user is a domain administrator
    const { data: domainAdmin, error: adminError } = await supabaseAdmin
      .from('domain_administrators')
      .select('*')
      .eq('admin_user_id', user.id)
      .eq('domain', userDomain)
      .single()

    if (adminError || !domainAdmin) {
      return NextResponse.json({ error: 'Not a domain administrator' }, { status: 403 })
    }

    // Get user profile for company name
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('company_name, account_type')
      .eq('id', user.id)
      .single()

    // Get domain statistics
    const { data: userCount } = await supabaseAdmin
      .from('user_profiles')
      .select('id', { count: 'exact' })
      .eq('company_domain', userDomain)

    const { data: activeUserCount } = await supabaseAdmin
      .from('user_profiles')
      .select('id', { count: 'exact' })
      .eq('company_domain', userDomain)
      .gte('last_sign_in_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

    // Get domain settings to check verification status
    const { data: _domainSettings } = await supabaseAdmin
      .from('domain_settings')
      .select('*')
      .eq('domain', userDomain)
      .single()

    const domainInfo = {
      domain: userDomain,
      companyName: profile?.company_name || userDomain,
      isVerified: domainAdmin.is_verified,
      totalUsers: userCount?.length || 0,
      activeUsers: activeUserCount?.length || 0,
      plan: 'enterprise', // This would come from billing system
      adminRole: domainAdmin.role
    }

    return NextResponse.json(domainInfo)

  } catch (error) {
    console.error('Error fetching domain info:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    // Get user from session
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const userDomain = user.email?.split('@')[1]
    if (!userDomain) {
      return NextResponse.json({ error: 'Invalid email domain' }, { status: 400 })
    }

    // Verify domain admin privileges
    const { data: domainAdmin } = await supabaseAdmin
      .from('domain_administrators')
      .select('role')
      .eq('admin_user_id', user.id)
      .eq('domain', userDomain)
      .single()

    if (!domainAdmin) {
      return NextResponse.json({ error: 'Not a domain administrator' }, { status: 403 })
    }

    switch (action) {
      case 'verify_domain':
        return await verifyDomain(userDomain, user.id)

      case 'update_company_info':
        return await updateCompanyInfo(userDomain, user.id, body.companyInfo)

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

  } catch (error) {
    console.error('Error in domain info POST:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function verifyDomain(domain: string, adminUserId: string) {
  try {
    // Generate verification token
    const verificationToken = Math.random().toString(36).substring(2, 15)

    // Update domain administrator with verification token
    const { error } = await supabaseAdmin
      .from('domain_administrators')
      .update({
        verification_token: verificationToken,
        verification_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      })
      .eq('admin_user_id', adminUserId)
      .eq('domain', domain)

    if (error) {
      return NextResponse.json({ error: 'Failed to generate verification token' }, { status: 500 })
    }

    // In a real implementation, you would:
    // 1. Send verification email with DNS record instructions
    // 2. Or provide a file to upload to domain root
    // 3. Or integrate with domain registrar APIs

    return NextResponse.json({
      success: true,
      verificationToken,
      instructions: `Add this TXT record to your DNS: signtusk-verification=${verificationToken}`
    })

  } catch (error) {
    console.error('Error verifying domain:', error)
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }
}

async function updateCompanyInfo(domain: string, adminUserId: string, companyInfo: any) {
  try {
    // Update domain settings
    const { error: settingsError } = await supabaseAdmin
      .from('domain_settings')
      .upsert({
        domain,
        company_logo_url: companyInfo.logoUrl,
        primary_color: companyInfo.primaryColor,
        secondary_color: companyInfo.secondaryColor,
        updated_at: new Date().toISOString()
      })

    if (settingsError) {
      return NextResponse.json({ error: 'Failed to update domain settings' }, { status: 500 })
    }

    // Log audit trail
    await supabaseAdmin
      .from('domain_audit_logs')
      .insert({
        domain,
        admin_user_id: adminUserId,
        action: 'update_company_info',
        target_type: 'setting',
        target_id: 'company_branding',
        new_values: companyInfo
      })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error updating company info:', error)
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }
}
