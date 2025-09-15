import { NextRequest, NextResponse } from 'next/server'
import { QRPDFService } from '@/lib/qr-pdf-service'

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

    console.log('🔍 Verifying QR code for request:', requestId)

    // Verify the QR code and get document information
    const verificationResult = await QRPDFService.verifyQRCode(requestId)

    if (!verificationResult.success) {
      console.log('❌ Verification failed:', verificationResult.error)
      return NextResponse.json(
        {
          success: false,
          error: verificationResult.error || 'Document verification failed'
        },
        { status: 404 }
      )
    }

    console.log('✅ Document verified successfully')

    // Return verification results
    return NextResponse.json({
      success: true,
      data: verificationResult.data,
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

    if (verificationType === 'hash_verification' && documentHash) {
      // Verify document hash matches stored hash
      const verificationResult = await QRPDFService.verifyQRCode(requestId)

      if (!verificationResult.success) {
        return NextResponse.json(
          { success: false, error: 'Document not found' },
          { status: 404 }
        )
      }

      const storedHash = verificationResult.data?.qr_verification?.document_hash
      const hashMatches = storedHash === documentHash

      return NextResponse.json({
        success: true,
        data: {
          ...verificationResult.data,
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
    const verificationResult = await QRPDFService.verifyQRCode(requestId)

    return NextResponse.json({
      success: verificationResult.success,
      data: verificationResult.data,
      error: verificationResult.error,
      message: verificationResult.success ? 'Document verified successfully' : 'Verification failed'
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
