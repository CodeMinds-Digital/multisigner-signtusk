import { NextRequest } from 'next/server'
import { getAuthTokensFromRequest } from '@/lib/auth-cookies'
import { verifyAccessToken } from '@/lib/jwt-utils'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendBulkSignatureRequests } from '@/lib/email-service'
import { NotificationService } from '@/lib/notification-service'
import { DocumentIdService } from '@/lib/document-id-service'

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
      const { total_signers, viewed_signers, completed_signers, document_status } = request

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
        displayStatus = `Signed (${completed_signers}/${total_signers})`
      } else if (viewed_signers > 0) {
        displayStatus = `Viewed (${viewed_signers}/${total_signers})`
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
        document_sign_id: request.document_sign_id, // NEW: Include Document Sign ID
        progress: {
          viewed: request.viewed_signers || 0,
          signed: request.completed_signers || 0,
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
    console.log('🚨 CRITICAL DEBUG: Signature request creation API called with new logic')
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
      dueDate,
      documentSignId, // NEW: Optional document sign ID
      requireTOTP = false // NEW: TOTP requirement flag
    } = body

    console.log('🔍 SIGNATURE REQUEST CREATION DEBUG:', {
      documentId,
      documentTitle,
      signingOrder,
      signersCount: signers?.length,
      requestedMode: signingOrder || 'sequential (default)',
      documentSignId: documentSignId || 'auto-generate',
      timestamp: new Date().toISOString()
    })

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

    // Generate or validate document sign ID
    let finalDocumentSignId = documentSignId

    if (!finalDocumentSignId) {
      // Auto-generate if not provided (existing behavior)
      finalDocumentSignId = await DocumentIdService.generateDocumentId(userId)
      console.log('🆔 Auto-generated document sign ID:', finalDocumentSignId)
    } else {
      // Validate custom ID if provided (new behavior)
      const validationResult = await DocumentIdService.validateCustomId(documentSignId, userId)
      if (!validationResult.isValid) {
        return new Response(
          JSON.stringify({
            error: validationResult.error || 'Document ID is invalid. Please choose a different ID.',
            field: 'documentSignId'
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }
      console.log('✅ Custom document sign ID validated:', finalDocumentSignId)
    }

    // Calculate expiration date
    const expiresAt = dueDate ? new Date(dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days default

    // Handle mock document IDs by creating a real document record first
    let realDocumentId = documentId

    // BETTER APPROACH: Only create new documents for mock documents
    // Store signing mode in signature request metadata instead of document settings
    const shouldCreateNewDocument = documentId.startsWith('mock-')

    if (shouldCreateNewDocument) {
      const documentType = documentId.startsWith('mock-') ? 'mock document' : 'existing document'
      console.log(`🔄 Creating new document record for ${documentType}:`, documentId)
      console.log('🎯 CRITICAL FIX: Creating separate document to prevent signing mode corruption')

      // If it's an existing document, get the original file URLs
      let originalFileUrl = null
      let originalPdfUrl = null
      if (!documentId.startsWith('mock-')) {
        const { data: originalDoc, error: originalDocError } = await supabaseAdmin
          .from('documents')
          .select('file_url, pdf_url, template_url')
          .eq('id', documentId)
          .single()

        if (!originalDocError && originalDoc) {
          originalFileUrl = originalDoc.file_url
          originalPdfUrl = originalDoc.pdf_url
          console.log('📄 Copying file URLs from original document:', {
            originalDocumentId: documentId,
            fileUrl: originalFileUrl,
            pdfUrl: originalPdfUrl
          })
        }
      }

      const { data: newDocument, error: docError } = await supabaseAdmin
        .from('documents')
        .insert({
          title: `${documentTitle} (${signingOrder || 'sequential'} mode)`,
          description: `Document created for ${signingOrder || 'sequential'} signing mode: ${documentTitle}`,
          status: 'draft',
          user_id: userId,
          user_email: userEmail,
          signers: JSON.stringify(signers.map((s: any) => ({ name: s.name, email: s.email }))),
          signature_fields: JSON.stringify([]),
          settings: JSON.stringify({ signing_order: signingOrder || 'sequential' }),
          file_url: originalFileUrl, // Copy from original document
          pdf_url: originalPdfUrl    // Copy from original document
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

      // CRITICAL DEBUG: Verify document was created with correct settings
      console.log('🔍 DOCUMENT CREATION VERIFICATION:', {
        originalDocumentId: documentId,
        newDocumentId: newDocument.id,
        requestedSigningOrder: signingOrder,
        storedSettings: newDocument.settings,
        parsedStoredSettings: JSON.parse(newDocument.settings || '{}'),
        title: newDocument.title,
        success: 'Document created successfully with signing mode settings'
      })

      realDocumentId = newDocument.id
      console.log('✅ Created new document record:', realDocumentId)
      console.log('🔍 Document settings stored:', {
        documentId: realDocumentId,
        signingOrder: signingOrder || 'sequential',
        settingsStored: JSON.stringify({ signing_order: signingOrder || 'sequential' }),
        documentData: newDocument,
        note: 'Each signature request now gets its own document to prevent mode corruption'
      })
    }

    // Create signature request in database
    const now = new Date().toISOString()
    const signatureRequestData = {
      document_template_id: realDocumentId,
      title: documentTitle,
      document_sign_id: finalDocumentSignId, // NEW: Add document sign ID
      initiated_by: userId,
      initiated_at: now,
      expires_at: expiresAt.toISOString(),
      status: 'initiated',
      total_signers: signers.length,
      completed_signers: 0,
      viewed_signers: 0,
      require_totp: requireTOTP, // NEW: Add TOTP requirement
      // Store signing mode in metadata field as JSON
      metadata: {
        signing_mode: signingOrder || 'sequential',
        message: message,
        created_at: now
      },
      created_at: now,
      updated_at: now
    }

    console.log('🔍 Creating signature request with data (v7 - FINAL):', signatureRequestData)

    // Verify document exists before creating signature request
    const { data: documentCheck, error: docCheckError } = await supabaseAdmin
      .from('documents')
      .select('id, title, status')
      .eq('id', realDocumentId)
      .single()

    if (docCheckError || !documentCheck) {
      console.error('❌ Document not found for signature request:', {
        documentId: realDocumentId,
        error: docCheckError
      })
      return new Response(
        JSON.stringify({
          error: 'Document not found',
          details: `Document ${realDocumentId} does not exist`
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ Document verified:', documentCheck)

    const { data: signatureRequest, error: requestError } = await supabaseAdmin
      .from('signing_requests')
      .insert(signatureRequestData)
      .select()
      .single()

    if (requestError) {
      console.error('❌ Error creating signature request:', requestError)
      console.error('Request data:', signatureRequestData)
      console.error('Error details:', {
        code: requestError.code,
        message: requestError.message,
        details: requestError.details,
        hint: requestError.hint
      })
      return new Response(
        JSON.stringify({
          error: 'Failed to create signature request',
          details: requestError.message || requestError
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (!signatureRequest) {
      console.error('❌ Signature request creation returned no data')
      return new Response(
        JSON.stringify({
          error: 'Failed to create signature request',
          details: 'No data returned from insert operation'
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ Created signature request:', signatureRequest.id)

    // Verify the signature request was actually created
    const { data: verifyRequest, error: verifyError } = await supabaseAdmin
      .from('signing_requests')
      .select('id, title, status')
      .eq('id', signatureRequest.id)
      .single()

    if (verifyError || !verifyRequest) {
      console.error('❌ Failed to verify signature request creation:', {
        id: signatureRequest.id,
        error: verifyError
      })
      return new Response(
        JSON.stringify({
          error: 'Failed to verify signature request creation',
          details: 'Signature request was not found after creation'
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ Verified signature request exists:', verifyRequest)

    // Extract unique signerIds from document schemas to properly map signers
    let schemaSignerIds: string[] = []
    try {
      const { data: documentData, error: docError } = await supabaseAdmin
        .from('documents')
        .select('schemas')
        .eq('id', realDocumentId)
        .single()

      if (!docError && documentData?.schemas) {
        const signatureFields = new Set<string>()

        // Extract unique signer IDs from signature fields
        if (Array.isArray(documentData.schemas)) {
          documentData.schemas.forEach((field: any) => {
            const signerId = field.properties?._originalConfig?.signerId
            if (signerId && (field.type === 'signature' || field.type === 'text')) {
              signatureFields.add(signerId)
            }
          })
        }

        schemaSignerIds = Array.from(signatureFields).sort()
        console.log('📋 Extracted schema signerIds:', schemaSignerIds)
      }
    } catch (error) {
      console.error('❌ Error extracting schema signerIds:', error)
    }

    // Create signer records with proper schema_signer_id mapping
    const signerInserts = signers.map((signer: any, index: number) => {
      // Map signer to schema signerId based on order
      const schemaSigner = schemaSignerIds[index] || `signer_${index + 1}`

      return {
        signing_request_id: signatureRequest.id, // Correct foreign key column
        signer_email: signer.email.trim(),
        signer_name: signer.name.trim(),
        signing_order: index + 1,
        schema_signer_id: schemaSigner, // NEW: Map to schema signerId
        status: 'pending',
        signer_status: 'initiated',
        reminder_count: 0,
        created_at: now,
        updated_at: now
      }
    })

    console.log('🔍 Inserting signers (v7 - FINAL):', signerInserts)

    console.log('🔍 Attempting signer insert (v7 - FINAL)...')
    console.log('🔍 Using correct table: signing_request_signers (FINAL FIX)')
    console.log('🔍 Supabase admin client configured')
    console.log('🔍 First signer data sample:', JSON.stringify(signerInserts[0], null, 2))

    // Test if the signing_request_id exists in signing_requests table
    const { data: testRequest, error: testError } = await supabaseAdmin
      .from('signing_requests')
      .select('id')
      .eq('id', signatureRequest.id)
      .single()

    console.log('🔍 Test signing_request exists:', { found: !!testRequest, error: testError })

    // Test if we can query the signing_request_signers table at all
    const { data: testSigners, error: testSignersError } = await supabaseAdmin
      .from('signing_request_signers')
      .select('id')
      .limit(1)

    console.log('🔍 Test signing_request_signers table access:', {
      canQuery: !testSignersError,
      error: testSignersError,
      count: testSigners?.length || 0
    })

    // Try inserting without foreign key first to test if it's a constraint issue
    const testInsert = {
      signer_email: 'test@example.com',
      signer_name: 'Test User',
      signing_order: 999,
      status: 'pending',
      signer_status: 'initiated',
      reminder_count: 0,
      created_at: now,
      updated_at: now
      // Note: No signing_request_id to avoid foreign key constraint
    }

    console.log('🔍 Testing insert without foreign key...')
    const { data: testInsertData, error: testInsertError } = await supabaseAdmin
      .from('signing_request_signers')
      .insert(testInsert)
      .select()

    console.log('🔍 Test insert result:', {
      success: !testInsertError,
      error: testInsertError,
      insertedId: testInsertData?.[0]?.id
    })

    // Clean up test record if it was created
    if (testInsertData?.[0]?.id) {
      await supabaseAdmin
        .from('signing_request_signers')
        .delete()
        .eq('id', testInsertData[0].id)
      console.log('🔍 Cleaned up test record')
    }

    const { data: signersData, error: signersError } = await supabaseAdmin
      .from('signing_request_signers')
      .insert(signerInserts)
      .select()

    if (signersError) {
      console.error('❌ Error creating signers:', signersError)
      console.error('Signer insert data:', signerInserts)
      console.error('Signature request ID:', signatureRequest.id)
      console.error('Error details:', {
        code: signersError.code,
        message: signersError.message,
        details: signersError.details,
        hint: signersError.hint
      })

      // Rollback: delete the signature request
      console.log('🔄 Rolling back signature request:', signatureRequest.id)
      await supabaseAdmin
        .from('signing_requests')
        .delete()
        .eq('id', signatureRequest.id)

      return new Response(
        JSON.stringify({
          error: 'Failed to create signature request signers',
          details: signersError.message || signersError
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ Created signers:', signersData?.length || 0)

    // Create notifications for each signer
    try {
      console.log('📧 Creating notifications for signers...')

      for (const signerData of signersData || []) {
        // Find the corresponding user ID for this signer email
        const { data: signerUser } = await supabaseAdmin
          .from('user_profiles')
          .select('id')
          .eq('email', signerData.signer_email)
          .single()

        if (signerUser) {
          // Create notification for registered users
          await NotificationService.createNotification(
            signerUser.id,
            'signature_request_received',
            'New Signature Request',
            `You have been requested to sign "${documentTitle}"`,
            {
              request_id: signatureRequest.id,
              document_title: documentTitle,
              signer_email: signerData.signer_email,
              action_url: `/sign/${signatureRequest.id}?signer=${encodeURIComponent(signerData.signer_email)}`
            }
          )
          console.log(`📧 Created notification for registered user: ${signerData.signer_email}`)
        } else {
          console.log(`📧 Skipped notification for unregistered user: ${signerData.signer_email}`)
        }
      }
    } catch (error) {
      console.error('❌ Error creating signer notifications:', error)
      // Don't fail the request if notifications fail
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
          document_sign_id: finalDocumentSignId, // NEW: Include document sign ID in response
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
