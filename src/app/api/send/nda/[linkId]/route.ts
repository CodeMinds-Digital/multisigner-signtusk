import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { OneClickNDAService } from '@/lib/one-click-nda-service'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ linkId: string }> }
) {
  try {
    const { linkId } = await params

    // Fetch link details with document info
    const { data: link, error: linkError } = await supabaseAdmin
      .from('send_document_links')
      .select(`
        *,
        document:send_shared_documents(*)
      `)
      .eq('link_id', linkId)
      .single()

    if (linkError || !link) {
      return NextResponse.json(
        { error: 'NDA link not found' },
        { status: 404 }
      )
    }

    // Check if link is active
    if (!link.is_active) {
      return NextResponse.json(
        { error: 'This NDA link has been deactivated' },
        { status: 403 }
      )
    }

    // Check if link has expired
    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'This NDA link has expired' },
        { status: 403 }
      )
    }

    // Check if NDA is required
    if (!link.require_nda) {
      return NextResponse.json(
        { error: 'NDA is not required for this document' },
        { status: 400 }
      )
    }

    // Get or create default NDA configuration
    let ndaConfig = link.nda_config || {
      enabled: true,
      templateId: 'basic-nda',
      requireSignature: false,
      requireFullName: true,
      requireWitness: false,
      autoAcceptDomains: [],
      customVariables: {
        company_name: 'Your Company'
      },
      acceptanceMessage: 'Thank you for accepting the NDA. You can now access the document.',
      emailNotifications: {
        notifyOwner: true,
        notifyAcceptor: true,
        notifyWitness: false
      }
    }

    return NextResponse.json({
      link: {
        id: link.id,
        linkId: link.link_id,
        title: link.title,
        ndaConfig
      },
      document: link.document
    })

  } catch (error: any) {
    console.error('NDA link fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to load NDA information' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ linkId: string }> }
) {
  try {
    const { linkId } = await params
    const body = await request.json()
    const {
      action,
      email,
      name,
      ndaTemplateId,
      ndaContent,
      signature,
      witnessEmail,
      userAgent,
      fingerprint
    } = body

    if (action !== 'accept-nda-v2') {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      )
    }

    // Get client IP
    const clientIp = request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown'

    // Fetch link details
    const { data: link, error: linkError } = await supabaseAdmin
      .from('send_document_links')
      .select('id, document_id, title, require_nda, nda_config')
      .eq('link_id', linkId)
      .single()

    if (linkError || !link) {
      return NextResponse.json(
        { error: 'Link not found' },
        { status: 404 }
      )
    }

    if (!link.require_nda) {
      return NextResponse.json(
        { error: 'NDA is not required for this document' },
        { status: 400 }
      )
    }

    // Validate acceptance data
    const validation = OneClickNDAService.validateAcceptance({
      acceptorEmail: email,
      ndaContent,
      ipAddress: clientIp,
      userAgent
    })

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.errors.join(', ') },
        { status: 400 }
      )
    }

    // Generate digital signature if required
    let digitalSignature = signature
    if (!digitalSignature && ndaContent) {
      digitalSignature = OneClickNDAService.generateDigitalSignature(
        { email, name, ipAddress: clientIp, userAgent },
        ndaContent
      )
    }

    // Check if NDA already accepted by this email
    const { data: existingNDA } = await supabaseAdmin
      .from('send_document_ndas')
      .select('id')
      .eq('link_id', link.id)
      .eq('acceptor_email', email)
      .single()

    if (existingNDA) {
      return NextResponse.json(
        { error: 'NDA already accepted by this email address' },
        { status: 409 }
      )
    }

    // Create NDA acceptance record
    const { data: ndaAcceptance, error: ndaError } = await supabaseAdmin
      .from('send_document_ndas')
      .insert({
        link_id: link.id,
        nda_text: ndaContent,
        acceptor_name: name || email,
        acceptor_email: email,
        acceptor_ip: clientIp,
        signature_data: digitalSignature,
        accepted_at: new Date().toISOString(),
        legal_binding: true,
        user_agent: userAgent,
        nda_template_id: ndaTemplateId,
        witness_email: witnessEmail || null,
        fingerprint: fingerprint,
        metadata: {
          template_id: ndaTemplateId,
          acceptance_method: 'one_click',
          user_agent: userAgent
        }
      })
      .select()
      .single()

    if (ndaError) {
      console.error('NDA insert error:', ndaError)
      return NextResponse.json(
        { error: 'Failed to record NDA acceptance' },
        { status: 500 }
      )
    }

    // Send notifications if configured
    const ndaConfig = link.nda_config || { emailNotifications: { notifyOwner: false, notifyAcceptor: false } }

    if (ndaConfig.emailNotifications?.notifyOwner || ndaConfig.emailNotifications?.notifyAcceptor) {
      try {
        await OneClickNDAService.sendAcceptanceNotifications(
          {
            id: ndaAcceptance.id,
            linkId: linkId,
            documentId: link.document_id,
            acceptorEmail: email,
            acceptorName: name,
            ndaTemplateId,
            ndaContent,
            acceptedAt: ndaAcceptance.accepted_at,
            ipAddress: clientIp,
            userAgent,
            signature: digitalSignature,
            fingerprint,
            legallyBinding: true,
            witnessEmail,
            metadata: ndaAcceptance.metadata
          },
          ndaConfig,
          link.title,
          'owner@company.com' // This would come from the document owner
        )
      } catch (notificationError) {
        console.error('Failed to send NDA notifications:', notificationError)
        // Don't fail the request if notifications fail
      }
    }

    // Update link statistics
    await supabaseAdmin
      .from('send_document_links')
      .update({
        nda_acceptances_count: `COALESCE(nda_acceptances_count, 0) + 1`,
        last_nda_acceptance: new Date().toISOString()
      })
      .eq('id', link.id)

    return NextResponse.json({
      success: true,
      message: 'NDA accepted successfully',
      acceptanceId: ndaAcceptance.id,
      certificate: OneClickNDAService.generateAcceptanceCertificate({
        id: ndaAcceptance.id,
        linkId: linkId,
        documentId: link.document_id,
        acceptorEmail: email,
        acceptorName: name,
        ndaTemplateId,
        ndaContent,
        acceptedAt: ndaAcceptance.accepted_at,
        ipAddress: clientIp,
        userAgent,
        signature: digitalSignature,
        fingerprint,
        legallyBinding: true,
        witnessEmail,
        metadata: ndaAcceptance.metadata
      })
    })

  } catch (error: any) {
    console.error('NDA acceptance error:', error)
    return NextResponse.json(
      { error: 'Failed to process NDA acceptance' },
      { status: 500 }
    )
  }
}
