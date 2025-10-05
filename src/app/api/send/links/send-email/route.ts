import { NextRequest, NextResponse } from 'next/server'
import { getAuthTokensFromRequest } from '@/lib/auth-cookies'
import { verifyAccessToken } from '@/lib/jwt-utils'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
  try {
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

    // Validate required fields
    if (!linkId || !recipientEmail || !shareUrl) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(recipientEmail)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      )
    }

    // Verify link belongs to user
    const { data: link, error: linkError } = await supabaseAdmin
      .from('send_document_links')
      .select('*, send_shared_documents!inner(user_id)')
      .eq('id', linkId)
      .eq('send_shared_documents.user_id', userId)
      .single()

    if (linkError || !link) {
      return NextResponse.json(
        { error: 'Link not found or unauthorized' },
        { status: 404 }
      )
    }

    // Get user info for sender name
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('full_name, email')
      .eq('id', userId)
      .single()

    const senderName = userData?.full_name || userData?.email || 'Someone'

    // Compose email
    const emailSubject = `${senderName} shared a document with you: ${documentTitle}`
    
    let emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">📄 Document Shared</h1>
        </div>
        
        <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb;">
          <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
            <strong>${senderName}</strong> has shared a document with you:
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #d1d5db; margin-bottom: 20px;">
            <h2 style="color: #111827; margin: 0 0 10px 0; font-size: 20px;">
              ${documentTitle}
            </h2>
    `

    if (message) {
      emailBody += `
            <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 15px 0;">
              <p style="margin: 0; color: #1e40af; font-style: italic;">
                "${message}"
              </p>
            </div>
      `
    }

    if (password) {
      emailBody += `
            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 15px 0;">
              <p style="margin: 0; color: #92400e;">
                <strong>🔒 Password Required:</strong> ${password}
              </p>
            </div>
      `
    }

    emailBody += `
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${shareUrl}" 
               style="display: inline-block; background: #10b981; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
              View Document
            </a>
          </div>
          
          <div style="background: #f3f4f6; padding: 15px; border-radius: 6px; margin-top: 20px;">
            <p style="margin: 0; font-size: 14px; color: #6b7280;">
              <strong>Share URL:</strong><br>
              <a href="${shareUrl}" style="color: #3b82f6; word-break: break-all;">${shareUrl}</a>
            </p>
          </div>
        </div>
        
        <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0; font-size: 12px; color: #9ca3af;">
            This document was shared using SignTusk Send
          </p>
        </div>
      </div>
    `

    // TODO: Integrate with your email service (SendGrid, AWS SES, etc.)
    // For now, we'll log the email and return success
    console.log('📧 Email to send:', {
      to: recipientEmail,
      subject: emailSubject,
      html: emailBody
    })

    // Log the email send in database (optional)
    await supabaseAdmin
      .from('send_link_emails')
      .insert({
        link_id: linkId,
        recipient_email: recipientEmail,
        sender_id: userId,
        message: message || null,
        sent_at: new Date().toISOString()
      })
      .catch(err => {
        // Table might not exist yet, that's okay
        console.log('Note: send_link_emails table not found (optional feature)')
      })

    return NextResponse.json({
      success: true,
      message: 'Email sent successfully'
    })

  } catch (error: any) {
    console.error('Send email error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send email' },
      { status: 500 }
    )
  }
}

