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
    console.log('📧 User ID:', userId)

    // First, let's check if the request exists at all (without user restriction)
    const { data: requestCheck, error: checkError } = await supabaseAdmin
      .from('signing_requests')
      .select('id, initiated_by, title, status')
      .eq('id', requestId)
      .single()

    console.log('📧 Request check result:', { requestCheck, checkError })

    if (checkError || !requestCheck) {
      console.log('❌ Request not found in database:', { requestId, error: checkError })
      return new Response(
        JSON.stringify({ error: 'Signature request not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Check if user has access to this request
    if (requestCheck.initiated_by !== userId) {
      console.log('❌ Access denied - user does not own this request:', {
        requestInitiatedBy: requestCheck.initiated_by,
        currentUserId: userId
      })
      return new Response(
        JSON.stringify({ error: 'Access denied - you can only send reminders for your own requests' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Get the full request data with separate queries to avoid foreign key issues
    const { data: signatureRequest, error: fetchError } = await supabaseAdmin
      .from('signing_requests')
      .select('*')
      .eq('id', requestId)
      .single()

    if (fetchError || !signatureRequest) {
      console.log('❌ Error fetching signature request:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Error fetching signature request details' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Get signers separately
    const { data: signers, error: signersError } = await supabaseAdmin
      .from('signing_request_signers')
      .select('*')
      .eq('signing_request_id', requestId)

    if (signersError) {
      console.log('❌ Error fetching signers:', signersError)
      return new Response(
        JSON.stringify({ error: 'Error fetching signers data' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Get document details separately
    const { data: document, error: documentError } = await supabaseAdmin
      .from('documents')
      .select('id, title, pdf_url, file_url')
      .eq('id', signatureRequest.document_template_id)
      .single()

    if (documentError) {
      console.log('⚠️ Warning: Could not fetch document details:', documentError)
    }

    // Get sender details separately (optional)
    const { data: sender, error: senderError } = await supabaseAdmin
      .from('user_profiles')
      .select('full_name, email, first_name, last_name')
      .eq('id', signatureRequest.initiated_by)
      .single()

    if (senderError) {
      console.log('⚠️ Warning: Could not fetch sender details:', senderError)
    }

    // Combine the data
    const combinedRequest = {
      ...signatureRequest,
      signers: signers || [],
      document: document || null,
      sender: sender || null
    }

    console.log('✅ Found signature request:', {
      id: combinedRequest.id,
      title: combinedRequest.title,
      status: combinedRequest.status,
      signersCount: combinedRequest.signers?.length || 0
    })

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

    const restriction = simpleReminderCheck(combinedRequest)

    if (!restriction.allowed) {
      console.log('❌ Reminder not allowed:', restriction.message)
      return new Response(
        JSON.stringify({ error: restriction.message }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ Reminder allowed, proceeding to send')

    // Get pending signers (those who haven't signed yet)
    // Status can be: 'initiated', 'viewed', 'signed', 'declined'
    const pendingSigners = combinedRequest.signers
      .filter((signer: any) => {
        const status = signer.signer_status || signer.status
        console.log(`📧 Signer ${signer.signer_email || signer.email}: status = ${status}`)

        // Only send reminders to signers who haven't signed or declined
        return status === 'initiated' || status === 'viewed' || status === 'pending'
      })
      .map((signer: any) => ({
        email: signer.signer_email || signer.email,
        name: signer.signer_name || signer.name,
        status: signer.signer_status || signer.status,
        id: signer.id
      }))

    console.log(`📧 Found ${combinedRequest.signers?.length || 0} total signers`)
    console.log(`📧 Found ${pendingSigners.length} pending signers:`,
      pendingSigners.map(s => ({ email: s.email, status: s.status })))

    if (pendingSigners.length === 0) {
      return new Response(
        JSON.stringify({
          error: 'No pending signers to remind - all signers have either signed or declined',
          totalSigners: combinedRequest.signers?.length || 0,
          signedSigners: combinedRequest.signers?.filter((s: any) =>
            (s.signer_status || s.status) === 'signed').length || 0
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log(`📧 Sending reminders to ${pendingSigners.length} pending signers`)

    // Send reminder emails
    const emailResults = []
    const senderName = combinedRequest.sender?.full_name || userEmail

    console.log(`📧 Starting to send ${pendingSigners.length} reminder emails...`)
    console.log(`📧 Sender: ${senderName}`)
    console.log(`📧 Document: ${combinedRequest.title}`)

    for (const signer of pendingSigners) {
      try {
        console.log(`📧 Sending reminder to: ${signer.email} (status: ${signer.status})`)

        const result = await resendSignatureRequest(
          requestId,
          signer.email,
          combinedRequest.title,
          senderName,
          1 // reminder count
        )

        emailResults.push({
          email: signer.email,
          name: signer.name,
          status: signer.status,
          success: result.success,
          error: result.error,
          messageId: result.messageId
        })

        if (result.success) {
          console.log(`✅ Reminder sent successfully to: ${signer.email} (Message ID: ${result.messageId})`)

          // Update reminder count in database
          try {
            const { error: updateError } = await supabaseAdmin
              .from('signing_request_signers')
              .update({
                reminder_count: (signer.reminder_count || 0) + 1,
                last_reminder_sent: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('id', signer.id)

            if (updateError) {
              console.warn(`⚠️ Failed to update reminder count for ${signer.email}:`, updateError)
            }
          } catch (dbError) {
            console.warn(`⚠️ Database update error for ${signer.email}:`, dbError)
          }
        } else {
          console.error(`❌ Failed to send reminder to ${signer.email}:`, result.error)
        }

        // Add delay between emails to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200))
      } catch (error) {
        console.error(`❌ Error sending reminder to ${signer.email}:`, error)
        emailResults.push({
          email: signer.email,
          name: signer.name,
          status: signer.status,
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

    console.log(`📧 Reminder sending completed:`, {
      total: pendingSigners.length,
      successful: successCount,
      failed: failureCount,
      document: combinedRequest.title
    })

    return new Response(
      JSON.stringify({
        success: successCount > 0,
        message: responseMessage,
        document: {
          id: requestId,
          title: combinedRequest.title,
          status: combinedRequest.status
        },
        results: {
          total: pendingSigners.length,
          successful: successCount,
          failed: failureCount,
          details: emailResults
        },
        summary: {
          totalSigners: combinedRequest.signers?.length || 0,
          pendingSigners: pendingSigners.length,
          signedSigners: combinedRequest.signers?.filter((s: any) =>
            (s.signer_status || s.status) === 'signed').length || 0,
          remindersSent: successCount
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
