import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isValidDomain, getDNSInstructions } from '@/lib/dns-verification'
import { nanoid } from 'nanoid'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    // Get auth token from header
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    
    // Verify user authentication
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 })
    }

    // Get user's domains
    const { data: domains, error: domainsError } = await supabaseAdmin
      .from('send_custom_domains')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (domainsError) {
      console.error('Error fetching domains:', domainsError)
      return NextResponse.json({ error: 'Failed to fetch domains' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      domains: domains || []
    })

  } catch (error) {
    console.error('Get domains error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get auth token from header
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    
    // Verify user authentication
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 })
    }

    const body = await request.json()
    const { domain } = body

    if (!domain) {
      return NextResponse.json({ error: 'Domain is required' }, { status: 400 })
    }

    // Validate domain format
    if (!isValidDomain(domain)) {
      return NextResponse.json({ error: 'Invalid domain format' }, { status: 400 })
    }

    // Check if domain already exists
    const { data: existingDomain } = await supabaseAdmin
      .from('send_custom_domains')
      .select('id')
      .eq('domain', domain.toLowerCase())
      .single()

    if (existingDomain) {
      return NextResponse.json({ error: 'Domain already exists' }, { status: 409 })
    }

    // Generate verification token
    const verificationToken = nanoid(32)

    // Create domain record
    const { data: newDomain, error: createError } = await supabaseAdmin
      .from('send_custom_domains')
      .insert({
        user_id: user.id,
        domain: domain.toLowerCase(),
        verified: false,
        verification_token: verificationToken,
        ssl_status: 'pending',
        dns_records: {}
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating domain:', createError)
      return NextResponse.json({ error: 'Failed to create domain' }, { status: 500 })
    }

    // Get DNS setup instructions
    const instructions = getDNSInstructions(domain, verificationToken)

    return NextResponse.json({
      success: true,
      domain: newDomain,
      instructions,
      message: 'Domain added successfully. Please configure DNS records to verify ownership.'
    })

  } catch (error) {
    console.error('Add domain error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Get auth token from header
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    
    // Verify user authentication
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const domainId = searchParams.get('id')

    if (!domainId) {
      return NextResponse.json({ error: 'Domain ID is required' }, { status: 400 })
    }

    // Check if domain exists and belongs to user
    const { data: domain, error: domainError } = await supabaseAdmin
      .from('send_custom_domains')
      .select('*')
      .eq('id', domainId)
      .eq('user_id', user.id)
      .single()

    if (domainError || !domain) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 })
    }

    // Check if domain is being used by any links
    const { data: links, error: linksError } = await supabaseAdmin
      .from('send_document_links')
      .select('id')
      .eq('custom_domain', domain.domain)
      .limit(1)

    if (linksError) {
      console.error('Error checking domain usage:', linksError)
      return NextResponse.json({ error: 'Failed to check domain usage' }, { status: 500 })
    }

    if (links && links.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete domain that is currently being used by share links' 
      }, { status: 409 })
    }

    // Delete domain
    const { error: deleteError } = await supabaseAdmin
      .from('send_custom_domains')
      .delete()
      .eq('id', domainId)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('Error deleting domain:', deleteError)
      return NextResponse.json({ error: 'Failed to delete domain' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Domain deleted successfully'
    })

  } catch (error) {
    console.error('Delete domain error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
