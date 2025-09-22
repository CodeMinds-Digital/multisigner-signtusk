import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * API endpoint to lookup Request ID by Document Sign ID
 * GET /api/verify/lookup?documentSignId=DOC-ABCD123456
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const documentSignId = searchParams.get('documentSignId')

    if (!documentSignId) {
      return NextResponse.json(
        { success: false, error: 'Document Sign ID is required' },
        { status: 400 }
      )
    }

    // Validate Document Sign ID format (basic validation)
    const trimmedId = documentSignId.trim()
    if (trimmedId.length < 3 || trimmedId.length > 50) {
      return NextResponse.json(
        { success: false, error: 'Invalid Document Sign ID format' },
        { status: 400 }
      )
    }

    console.log('🔍 Looking up Request ID for Document Sign ID:', trimmedId)

    // Query the signing_requests table to find the request with this document_sign_id
    const { data: signingRequest, error } = await supabaseAdmin
      .from('signing_requests')
      .select('id, title, status, document_sign_id, initiated_at')
      .eq('document_sign_id', trimmedId)
      .single()

    if (error) {
      console.error('❌ Database error during lookup:', error)
      
      if (error.code === 'PGRST116') {
        // No rows found
        return NextResponse.json(
          { success: false, error: `No document found with Sign ID: ${trimmedId}` },
          { status: 404 }
        )
      }
      
      return NextResponse.json(
        { success: false, error: 'Database error during lookup' },
        { status: 500 }
      )
    }

    if (!signingRequest) {
      return NextResponse.json(
        { success: false, error: `No document found with Sign ID: ${trimmedId}` },
        { status: 404 }
      )
    }

    console.log('✅ Found Request ID:', signingRequest.id, 'for Document Sign ID:', trimmedId)

    // Return the Request ID and basic document info
    return NextResponse.json({
      success: true,
      requestId: signingRequest.id,
      documentInfo: {
        title: signingRequest.title,
        status: signingRequest.status,
        document_sign_id: signingRequest.document_sign_id,
        initiated_at: signingRequest.initiated_at
      },
      message: `Document found: ${signingRequest.title}`
    })

  } catch (error) {
    console.error('❌ Error in Document Sign ID lookup API:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error during lookup'
      },
      { status: 500 }
    )
  }
}
