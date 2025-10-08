import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyDomainConfiguration, getDNSInstructions } from '@/lib/dns-verification'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ domainId: string }> }
) {
  try {
    const { domainId } = await params
    
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

    // Get domain details
    const { data: domain, error: domainError } = await supabaseAdmin
      .from('send_custom_domains')
      .select('*')
      .eq('id', domainId)
      .eq('user_id', user.id)
      .single()

    if (domainError || !domain) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 })
    }

    // Perform DNS verification
    const verificationResult = await verifyDomainConfiguration({
      domain: domain.domain,
      verificationToken: domain.verification_token,
      expectedCname: 'signtusk.vercel.app'
    })

    // Update domain status based on verification results
    const isVerified = verificationResult.ownershipVerified && verificationResult.dnsConfigured
    const verificationStatus = isVerified ? 'verified' : 'pending'
    
    // Prepare DNS records data
    const dnsRecords = {
      ownership: verificationResult.details.ownership,
      cname: verificationResult.details.cname,
      aRecord: verificationResult.details.aRecord,
      lastChecked: new Date().toISOString()
    }

    // Update domain in database
    const { data: updatedDomain, error: updateError } = await supabaseAdmin
      .from('send_custom_domains')
      .update({
        verified: isVerified,
        dns_records: dnsRecords,
        updated_at: new Date().toISOString()
      })
      .eq('id', domainId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating domain:', updateError)
      return NextResponse.json({ error: 'Failed to update domain status' }, { status: 500 })
    }

    // Get DNS setup instructions
    const instructions = getDNSInstructions(domain.domain, domain.verification_token)

    return NextResponse.json({
      success: true,
      domain: updatedDomain,
      verification: {
        ownershipVerified: verificationResult.ownershipVerified,
        dnsConfigured: verificationResult.dnsConfigured,
        status: verificationStatus,
        details: verificationResult.details
      },
      instructions
    })

  } catch (error) {
    console.error('Domain verification error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ domainId: string }> }
) {
  try {
    const { domainId } = await params
    
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

    // Get domain details
    const { data: domain, error: domainError } = await supabaseAdmin
      .from('send_custom_domains')
      .select('*')
      .eq('id', domainId)
      .eq('user_id', user.id)
      .single()

    if (domainError || !domain) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 })
    }

    // Get DNS setup instructions
    const instructions = getDNSInstructions(domain.domain, domain.verification_token)

    // Get current DNS status from stored records
    const dnsRecords = domain.dns_records || {}
    const lastChecked = dnsRecords.lastChecked

    return NextResponse.json({
      success: true,
      domain,
      instructions,
      lastVerification: {
        ownershipVerified: dnsRecords.ownership?.success || false,
        dnsConfigured: dnsRecords.cname?.success || dnsRecords.aRecord?.success || false,
        lastChecked,
        details: {
          ownership: dnsRecords.ownership,
          cname: dnsRecords.cname,
          aRecord: dnsRecords.aRecord
        }
      }
    })

  } catch (error) {
    console.error('Domain status error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
