import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const { requestId } = await params

    if (!requestId) {
      return NextResponse.json(
        { success: false, error: 'Request ID is required' },
        { status: 400 }
      )
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(requestId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid request ID format' },
        { status: 400 }
      )
    }

    console.log('🔍 Verifying document for request:', requestId)

    // Get signing request with related data
    const { data: signingRequest, error: signingError } = await supabaseAdmin
      .from('signing_requests')
      .select(`
        *,
        document:documents(*),
        signers:signing_request_signers(*)
      `)
      .eq('id', requestId)
      .single()

    if (signingError || !signingRequest) {
      console.log('❌ Signing request not found:', signingError)
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 }
      )
    }

    // Get user information separately if initiated_by exists
    let userInfo = null
    if (signingRequest.initiated_by) {
      const { data: userData } = await supabaseAdmin
        .from('user_profiles')
        .select('id, email, full_name, first_name, last_name')
        .eq('id', signingRequest.initiated_by)
        .single()

      if (userData) {
        userInfo = {
          id: userData.id,
          email: userData.email,
          name: userData.full_name || `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || null
        }
      }
    }

    // If no user found, use fallback (but this should rarely happen now)
    if (!userInfo) {
      userInfo = {
        id: signingRequest.initiated_by,
        email: 'Unknown Requester',
        name: null
      }
    }

    // Check if there's a QR verification record
    const { data: qrVerification } = await supabaseAdmin
      .from('qr_verifications')
      .select('*')
      .eq('signature_request_id', requestId)
      .single()

    console.log('✅ Document found and verified successfully')

    // Return verification results with user information
    return NextResponse.json({
      success: true,
      data: {
        signing_request: {
          ...signingRequest,
          user: userInfo
        },
        qr_verification: qrVerification,
        verification_status: 'verified',
        verified_at: new Date().toISOString()
      },
      message: 'Document verified successfully'
    })

  } catch (error) {
    console.error('❌ Error in verification API:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error during verification'
      },
      { status: 500 }
    )
  }
}

// Handle POST requests for batch verification or additional verification methods
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const { requestId } = await params
    const body = await request.json()

    if (!requestId) {
      return NextResponse.json(
        { success: false, error: 'Request ID is required' },
        { status: 400 }
      )
    }

    console.log('🔍 POST verification for request:', requestId)

    // Handle different verification types
    const { verificationType, documentHash } = body

    // Get signing request with related data
    const { data: signingRequest, error: signingError } = await supabaseAdmin
      .from('signing_requests')
      .select(`
        *,
        document:documents(*),
        signers:signing_request_signers(*)
      `)
      .eq('id', requestId)
      .single()

    if (signingError || !signingRequest) {
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 }
      )
    }

    // Get user information separately if initiated_by exists
    let userInfo = null
    if (signingRequest.initiated_by) {
      const { data: userData } = await supabaseAdmin
        .from('user_profiles')
        .select('id, email, full_name, first_name, last_name')
        .eq('id', signingRequest.initiated_by)
        .single()

      if (userData) {
        userInfo = {
          id: userData.id,
          email: userData.email,
          name: userData.full_name || `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || null
        }
      }
    }

    // If no user found, use fallback (but this should rarely happen now)
    if (!userInfo) {
      userInfo = {
        id: signingRequest.initiated_by,
        email: 'Unknown Requester',
        name: null
      }
    }

    // Check if there's a QR verification record
    const { data: qrVerification } = await supabaseAdmin
      .from('qr_verifications')
      .select('*')
      .eq('signature_request_id', requestId)
      .single()

    if (verificationType === 'hash_verification' && documentHash) {
      const storedHash = qrVerification?.document_hash
      const hashMatches = storedHash === documentHash

      return NextResponse.json({
        success: true,
        data: {
          signing_request: {
            ...signingRequest,
            user: userInfo
          },
          qr_verification: qrVerification,
          hash_verification: {
            matches: hashMatches,
            provided_hash: documentHash,
            stored_hash: storedHash
          }
        },
        message: hashMatches ? 'Document hash verified' : 'Document hash mismatch'
      })
    }

    // Default to standard verification
    return NextResponse.json({
      success: true,
      data: {
        signing_request: {
          ...signingRequest,
          user: userInfo
        },
        qr_verification: qrVerification,
        verification_status: 'verified',
        verified_at: new Date().toISOString()
      },
      message: 'Document verified successfully'
    })

  } catch (error) {
    console.error('❌ Error in POST verification API:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error during verification'
      },
      { status: 500 }
    )
  }
}
