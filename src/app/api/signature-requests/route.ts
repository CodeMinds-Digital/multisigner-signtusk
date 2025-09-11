import { NextRequest } from 'next/server'
import { getAuthTokensFromRequest } from '@/lib/auth-cookies'
import { verifyAccessToken } from '@/lib/jwt-utils'
import { SigningWorkflowService } from '@/lib/signing-workflow-service'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendBulkSignatureRequests } from '@/lib/email-service'

export async function GET(request: NextRequest) {
  try {
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

    console.log('📋 Fetching signing requests for user:', userId)

    // Get signing requests initiated by this user using admin client (bypasses RLS)
    const { data: sentRequests, error: sentError } = await supabaseAdmin
      .from('signing_requests')
      .select(`
        *,
        signers:signing_request_signers(*),
        document:documents!document_template_id(id, title, pdf_url, file_url)
      `)
      .eq('initiated_by', userId)
      .order('created_at', { ascending: false })

    console.log('📄 Sent requests with document info:', {
      count: sentRequests?.length || 0,
      error: sentError,
      sampleDocument: sentRequests?.[0]?.document || null,
      sampleDocumentTemplateId: sentRequests?.[0]?.document_template_id || null
    })

    // Test: Check if document exists separately
    if (sentRequests?.[0]?.document_template_id) {
      const { data: testDoc, error: testDocError } = await supabaseAdmin
        .from('documents')
        .select('id, title, pdf_url, file_url')
        .eq('id', sentRequests[0].document_template_id)
        .single()

      console.log('🔍 Direct document lookup:', {
        documentId: sentRequests[0].document_template_id,
        found: !!testDoc,
        error: testDocError,
        document: testDoc
      })
    }

    if (sentError) {
      console.error('Error fetching sent requests:', sentError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch sent requests' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Get signing requests where this user is a signer
    const { data: signerRecords, error: signerError } = await supabaseAdmin
      .from('signing_request_signers')
      .select('signing_request_id, status, viewed_at, signed_at')
      .eq('signer_email', userEmail)

    let receivedRequests = []
    if (!signerError && signerRecords && signerRecords.length > 0) {
      const requestIds = signerRecords.map((s: any) => s.signing_request_id)

      const { data: requests, error: requestError } = await supabaseAdmin
        .from('signing_requests')
        .select(`
          *,
          signers:signing_request_signers(*),
          document:documents!document_template_id(id, title, pdf_url, file_url)
        `)
        .in('id', requestIds)
        .order('created_at', { ascending: false })

      if (!requestError && requests) {
        // Get unique sender IDs to fetch sender names
        const senderIds = [...new Set(requests.map((r: any) => r.initiated_by))]

        // Fetch sender information from users table
        const { data: senders, error: sendersError } = await supabaseAdmin
          .from('user_profiles')
          .select('id, first_name, last_name, email')
          .in('id', senderIds)

        console.log('📤 Fetched sender info for received requests:', {
          senderIds,
          sendersCount: senders?.length || 0,
          sendersError
        })

        console.log('📄 Received requests with document info:', {
          count: requests?.length || 0,
          sampleDocument: requests?.[0]?.document || null
        })

        receivedRequests = requests.map((request: any) => {
          const userSigner = signerRecords.find((s: any) => s.signing_request_id === request.id)
          const sender = senders?.find((s: any) => s.id === request.initiated_by)

          let senderName = 'Unknown Sender'
          if (sender) {
            if (sender.first_name && sender.last_name) {
              senderName = `${sender.first_name} ${sender.last_name}`
            } else if (sender.first_name) {
              senderName = sender.first_name
            } else if (sender.email) {
              senderName = sender.email.split('@')[0] // Use email username as fallback
            }
          }

          return {
            ...request,
            user_signer_status: userSigner?.status || 'pending',
            sender_name: senderName
          }
        })
      }
    }

    // Transform data to match UI expectations with enhanced status tracking
    const transformToListItem = (request: any, isReceived = false) => {
      const { total_signers, viewed_count, signed_count, document_status } = request

      let displayStatus = 'Initiated'
      let canSign = false
      let declineReason = null

      // Use document_status for overall status
      if (document_status === 'completed') {
        displayStatus = 'Completed'
      } else if (document_status === 'declined') {
        displayStatus = 'Declined'
        declineReason = request.decline_reason
      } else if (document_status === 'partially_signed') {
        displayStatus = `Signed (${signed_count}/${total_signers})`
      } else if (viewed_count > 0) {
        displayStatus = `Viewed (${viewed_count}/${total_signers})`
      }

      // For received requests, use the user's signer status if available
      if (isReceived && request.user_signer_status) {
        const userSigner = request.signers?.find((s: any) => s.signer_email === userEmail)
        if (userSigner) {
          switch (userSigner.signer_status) {
            case 'initiated':
              displayStatus = 'Pending'
              canSign = true
              break
            case 'viewed':
              displayStatus = 'Viewed'
              canSign = true
              break
            case 'signed':
              displayStatus = 'Signed'
              canSign = false
              break
            case 'declined':
              displayStatus = 'Declined'
              canSign = false
              declineReason = userSigner.decline_reason
              break
          }
        }
      }

      const calculateDaysRemaining = (expiresAt?: string): number | undefined => {
        if (!expiresAt) return undefined
        const now = new Date()
        const expiry = new Date(expiresAt)
        const diffTime = expiry.getTime() - now.getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        return diffDays > 0 ? diffDays : 0
      }

      // Create context-aware display text for From/To field
      let contextDisplay = ''
      if (isReceived) {
        // For received requests: "From [Sender Name]"
        contextDisplay = `From ${request.sender_name || 'Unknown Sender'}`
      } else {
        // For sent requests: "To [Signer Names]"
        const signerNames = (request.signers || [])
          .map((s: any) => s.signer_name)
          .filter(Boolean)

        if (signerNames.length === 1) {
          contextDisplay = `To ${signerNames[0]}`
        } else if (signerNames.length === 2) {
          contextDisplay = `To ${signerNames[0]} & ${signerNames[1]}`
        } else if (signerNames.length > 2) {
          contextDisplay = `To ${signerNames[0]} & ${signerNames.length - 1} others`
        } else {
          contextDisplay = `To ${request.total_signers} signer${request.total_signers !== 1 ? 's' : ''}`
        }
      }

      return {
        id: request.id,
        title: request.title,
        status: displayStatus,
        document_status: request.document_status,
        can_sign: canSign,
        decline_reason: declineReason,
        progress: {
          viewed: request.viewed_count || 0,
          signed: request.signed_count || 0,
          total: request.total_signers || 0
        },
        signers: (request.signers || []).map((signer: any) => ({
          name: signer.signer_name,
          email: signer.signer_email,
          status: signer.signer_status || signer.status,
          viewed_at: signer.viewed_at,
          signed_at: signer.signed_at,
          decline_reason: signer.decline_reason
        })),
        initiated_at: request.initiated_at,
        expires_at: request.expires_at,
        days_remaining: calculateDaysRemaining(request.expires_at),
        initiated_by_name: request.sender_name, // For received requests
        context_display: contextDisplay, // New field for better UX
        document_url: request.document?.pdf_url || request.document?.file_url, // Document URL for opening
        document_id: request.document?.id, // Document ID for reference
        final_pdf_url: request.final_pdf_url, // Final signed PDF if completed
        document_type: 'Document', // Default type - will be enhanced later
        document_category: 'General' // Default category - will be enhanced later
      }
    }

    // Get query parameters to determine what to return
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'sent', 'received', or null for all

    const sentRequestsFormatted = (sentRequests || []).map((req: any) => transformToListItem(req, false))
    const receivedRequestsFormatted = receivedRequests.map((req: any) => transformToListItem(req, true))

    let responseData
    if (type === 'received') {
      responseData = receivedRequestsFormatted
    } else if (type === 'sent') {
      responseData = sentRequestsFormatted
    } else {
      // Return all requests (for unified list)
      responseData = [...sentRequestsFormatted, ...receivedRequestsFormatted]
    }

    console.log('✅ Successfully fetched signing requests:', {
      sent: sentRequestsFormatted.length,
      received: receivedRequestsFormatted.length,
      returned: responseData.length,
      type: type || 'all'
    })

    return new Response(
      JSON.stringify({ success: true, data: responseData }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error fetching signing requests:', error)

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

export async function POST(request: NextRequest) {
  try {
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

    // Get request body
    const body = await request.json()
    const {
      documentId,
      documentTitle,
      signers,
      signingOrder = 'sequential',
      message = 'Please review and sign this document.',
      dueDate
    } = body

    if (!documentId || !documentTitle || !signers || signers.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: documentId, documentTitle, and signers' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Validate signers
    for (const signer of signers) {
      if (!signer.email || !signer.name) {
        return new Response(
          JSON.stringify({ error: 'All signers must have name and email' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }
    }

    // Calculate expiration date
    const expiresAt = dueDate ? new Date(dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days default

    // Handle mock document IDs by creating a real document record first
    let realDocumentId = documentId
    if (documentId.startsWith('mock-')) {
      console.log('🔄 Creating real document record for mock document:', documentId)

      const { data: newDocument, error: docError } = await supabaseAdmin
        .from('documents')
        .insert({
          title: documentTitle,
          description: `Document created from template: ${documentTitle}`,
          status: 'draft',
          user_id: userId,
          user_email: userEmail,
          signers: JSON.stringify(signers.map(s => ({ name: s.name, email: s.email }))),
          signature_fields: JSON.stringify([]),
          settings: JSON.stringify({ signing_order: signingOrder || 'sequential' })
        })
        .select()
        .single()

      if (docError) {
        console.error('Error creating document record:', docError)
        return new Response(
          JSON.stringify({ error: 'Failed to create document record' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
      }

      realDocumentId = newDocument.id
      console.log('✅ Created real document record:', realDocumentId)
    }

    // Create signature request in database
    const now = new Date().toISOString()
    const { data: signatureRequest, error: requestError } = await supabaseAdmin
      .from('signing_requests')
      .insert({
        document_template_id: realDocumentId,
        title: documentTitle,
        initiated_by: userId,
        initiated_at: now,
        expires_at: expiresAt.toISOString(),
        status: 'in_progress',
        total_signers: signers.length,
        completed_signers: 0,
        viewed_signers: 0,
        created_at: now,
        updated_at: now
      })
      .select()
      .single()

    if (requestError) {
      console.error('Error creating signature request:', requestError)
      return new Response(
        JSON.stringify({ error: 'Failed to create signature request' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Create signer records
    const signerInserts = signers.map((signer: any, index: number) => ({
      signing_request_id: signatureRequest.id,
      signer_email: signer.email.trim(),
      signer_name: signer.name.trim(),
      signing_order: index + 1
    }))

    const { error: signersError } = await supabaseAdmin
      .from('signing_request_signers')
      .insert(signerInserts)

    if (signersError) {
      console.error('Error creating signers:', signersError)
      // Rollback: delete the signature request
      await supabaseAdmin
        .from('signing_requests')
        .delete()
        .eq('id', signatureRequest.id)

      return new Response(
        JSON.stringify({ error: 'Failed to create signature request signers' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Send emails using Resend
    try {
      const emailResult = await sendBulkSignatureRequests(
        documentTitle,
        userEmail, // sender name (use email for now)
        signers.map((signer: any) => ({ name: signer.name, email: signer.email })),
        {
          message,
          dueDate: dueDate || expiresAt.toISOString(),
          documentId: signatureRequest.id // Use signature request ID for signing URL
        }
      )

      console.log('Email sending results:', emailResult)

      // Update signature request status based on email results
      if (emailResult.success && emailResult.errors.length === 0) {
        // All emails sent successfully - status is already set to in_progress
        console.log('All emails sent successfully')
      } else if (emailResult.errors.length > 0) {
        // Some emails failed
        console.warn('Some emails failed to send:', emailResult.errors)
      }

    } catch (emailError) {
      console.error('Error sending emails:', emailError)
      // Don't fail the request creation, just log the error
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          id: signatureRequest.id,
          status: signatureRequest.status,
          created_at: signatureRequest.created_at
        }
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error creating signature request:', error)

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

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
