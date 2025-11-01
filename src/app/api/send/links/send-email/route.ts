import { NextRequest, NextResponse } from 'next/server'
import { getAuthTokensFromRequest } from '@/lib/auth-cookies'
import { verifyAccessToken } from '@/lib/jwt-utils'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendDocumentShareEmail } from '@/lib/send-document-email-service'

export async function POST(request: NextRequest) {
  try {
    console.log('📧 Send email API called')

    // Authenticate user
    const { accessToken } = getAuthTokensFromRequest(request)
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const payload = await verifyAccessToken(accessToken)
    const userId = payload.userId

    // Parse request body
    const body = await request.json()
    const {
      linkId,
      recipientEmail,
      message,
      documentTitle,
      shareUrl,
      password
    } = body

    console.log('📧 Email request data:', { linkId, recipientEmail, documentTitle, shareUrl })

    // Validate required fields
    if (!linkId || !recipientEmail || !shareUrl) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get user information for sender name
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('first_name, last_name, email, full_name')
      .eq('id', userId)
      .single()

    const senderName = userData
      ? userData.full_name || `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || userData.email
      : 'Document Owner'

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(recipientEmail)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      )
    }

    // Verify link belongs to user (linkId is the string identifier, not UUID)
    const { data: link, error: linkError } = await supabaseAdmin
      .from('send_document_links')
      .select('*, send_shared_documents!inner(user_id)')
      .eq('link_id', linkId)
      .eq('send_shared_documents.user_id', userId)
      .single()

    if (linkError || !link) {
      return NextResponse.json(
        { error: 'Link not found or unauthorized' },
        { status: 404 }
      )
    }

    // Get user's branding settings
    const { data: brandingData } = await supabaseAdmin
      .from('send_branding_settings')
      .select('*')
      .eq('user_id', userId)
      .single()

    // Prepare email data for the new service
    const emailData = {
      to: recipientEmail,
      documentTitle: documentTitle || 'Document',
      shareUrl,
      senderName,
      message,
      password,
      expiresAt: link.expires_at,
      viewLimit: link.max_views,
      requiresEmail: link.require_email,
      requiresNda: link.require_nda,
      customBranding: brandingData ? {
        logoUrl: brandingData.logo_url,
        brandColor: brandingData.brand_color,
        companyName: brandingData.company_name
      } : undefined
    }

    // Send email using the comprehensive email service
    const emailResult = await sendDocumentShareEmail(emailData)

    // Log the email send in database
    const emailLogData = {
      link_id: link.id, // Use the UUID id, not the string linkId
      recipient_email: recipientEmail,
      sender_id: userId,
      message: message || null,
      sent_at: new Date().toISOString(),
      status: emailResult.success ? 'sent' : 'failed',
      message_id: emailResult.messageId || null,
      error_message: emailResult.error || null
    }

    try {
      await supabaseAdmin
        .from('send_link_emails')
        .insert(emailLogData)
    } catch (dbError) {
      console.error('Failed to log email in database:', dbError)
      // Don't fail the request if logging fails
    }

    if (!emailResult.success) {
      return NextResponse.json({
        success: false,
        error: emailResult.error || 'Failed to send email'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Email sent successfully',
      messageId: emailResult.messageId
    })

  } catch (error: any) {
    console.error('Send email error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send email' },
      { status: 500 }
    )
  }
}

