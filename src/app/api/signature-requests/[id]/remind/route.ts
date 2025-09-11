import { NextRequest } from 'next/server'
import { getAuthTokensFromRequest } from '@/lib/auth-cookies'
import { verifyAccessToken } from '@/lib/jwt-utils'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { resendSignatureRequest } from '@/lib/email-service'
// Temporarily disabled database functions until SQL is executed
// import {
//   canSendReminder,
//   logReminderActivity,
//   getPendingSigners,
//   getReminderRestrictionMessage
// } from '@/lib/reminder-utils'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params to fix Next.js async API warning
    const resolvedParams = await params
    const requestId = resolvedParams.id

    // Get access token from cookies
    const { accessToken } = getAuthTokensFromRequest(request)

    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Verify access token
    const payload = await verifyAccessToken(accessToken)
    const userId = payload.userId
    const userEmail = payload.email

    console.log('📧 Checking reminder restrictions for signature request:', requestId)

    // Simple 24-hour check (fallback until database functions are set up)
    // Get signature request first to check restrictions
    const { data: signatureRequest, error: fetchError } = await supabaseAdmin
      .from('signing_requests')
      .select(`
        *,
        signers:signing_request_signers(*),
        document:documents!document_template_id(id, title, pdf_url, file_url),
        sender:user_profiles!initiated_by(full_name, email)
      `)
      .eq('id', requestId)
      .eq('initiated_by', userId)
      .single()

    if (fetchError || !signatureRequest) {
      return new Response(
        JSON.stringify({ error: 'Signature request not found or access denied' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Simple restriction check
    const simpleReminderCheck = (request: any) => {
      // Check if document is completed
      if (request.status === 'completed') {
        return { allowed: false, message: 'Document is already completed' }
      }

      // Check if document is expired
      if (request.expires_at && new Date(request.expires_at) < new Date()) {
        return { allowed: false, message: 'Document has expired' }
      }

      // Simple 24-hour check based on last update
      const lastUpdate = new Date(request.updated_at || request.created_at)
      const now = new Date()
      const hoursSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60)

      if (hoursSinceUpdate < 24) {
        const hoursRemaining = 24 - hoursSinceUpdate
        return {
          allowed: false,
          message: `Must wait ${Math.ceil(hoursRemaining)} more hours before sending another reminder`
        }
      }

      return { allowed: true, message: 'Reminder can be sent' }
    }

    const restriction = simpleReminderCheck(signatureRequest)

    if (!restriction.allowed) {
      console.log('❌ Reminder not allowed:', restriction.message)
      return new Response(
        JSON.stringify({ error: restriction.message }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ Reminder allowed, proceeding to send')

    // Get pending signers (those who haven't signed yet)
    const pendingSigners = signatureRequest.signers
      .filter((signer: any) => signer.signer_status === 'initiated' || signer.signer_status === 'viewed')
      .map((signer: any) => ({
        email: signer.signer_email,
        name: signer.signer_name,
        status: signer.signer_status
      }))

    if (pendingSigners.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No pending signers to remind' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log(`📧 Sending reminders to ${pendingSigners.length} pending signers`)

    // Send reminder emails
    const emailResults = []
    const senderName = signatureRequest.sender?.full_name || userEmail

    for (const signer of pendingSigners) {
      try {
        const result = await resendSignatureRequest(
          requestId,
          signer.email,
          signatureRequest.title,
          senderName
        )

        emailResults.push({
          email: signer.email,
          success: result.success,
          error: result.error
        })

        if (result.success) {
          console.log(`✅ Reminder sent to: ${signer.email}`)
        } else {
          console.error(`❌ Failed to send reminder to ${signer.email}:`, result.error)
        }

        // Add delay between emails to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (error) {
        console.error(`❌ Error sending reminder to ${signer.email}:`, error)
        emailResults.push({
          email: signer.email,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // Count successful sends
    const successCount = emailResults.filter(r => r.success).length
    const failureCount = emailResults.filter(r => !r.success).length

    // Update the signing request with last reminder timestamp
    const { error: updateError } = await supabaseAdmin
      .from('signing_requests')
      .update({
        updated_at: new Date().toISOString(),
        last_reminder_sent: new Date().toISOString()
      })
      .eq('id', requestId)

    if (updateError) {
      console.error('Error updating reminder timestamp:', updateError)
    } else {
      console.log('✅ Reminder timestamp updated')
    }

    const responseMessage = successCount > 0
      ? `Reminder sent successfully to ${successCount} signer${successCount > 1 ? 's' : ''}${failureCount > 0 ? ` (${failureCount} failed)` : ''}`
      : 'Failed to send reminders to all signers'

    return new Response(
      JSON.stringify({
        success: successCount > 0,
        message: responseMessage,
        results: {
          total: pendingSigners.length,
          successful: successCount,
          failed: failureCount,
          details: emailResults
        }
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error sending reminder:', error)

    if (error instanceof Error && error.message.includes('token')) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
