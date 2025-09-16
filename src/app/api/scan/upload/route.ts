import { NextRequest, NextResponse } from 'next/server'
import { QRPDFService } from '@/lib/qr-pdf-service'

export async function POST(request: NextRequest) {
  try {
    console.log('📤 PDF upload for QR scanning received')

    // Get the uploaded file
    const formData = await request.formData()
    const file = formData.get('pdf') as File

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No PDF file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { success: false, error: 'File must be a PDF' },
        { status: 400 }
      )
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'PDF file too large (max 10MB)' },
        { status: 400 }
      )
    }

    console.log(`📄 Processing PDF: ${file.name} (${file.size} bytes)`)

    // Convert file to bytes
    const arrayBuffer = await file.arrayBuffer()
    const pdfBytes = new Uint8Array(arrayBuffer)

    // Extract QR code from PDF
    const extractionResult = await QRPDFService.extractQRFromPDF(pdfBytes)

    if (!extractionResult.success) {
      return NextResponse.json({
        success: false,
        error: extractionResult.error,
        requiresManualInput: extractionResult.error === 'QR_DETECTION_NEEDED'
      })
    }

    // If QR code was found and decoded
    if (extractionResult.requestId) {
      console.log('✅ QR code extracted, verifying document...')
      
      // Verify the document
      const verificationResult = await QRPDFService.verifyQRCode(extractionResult.requestId)
      
      return NextResponse.json({
        success: true,
        data: {
          extraction: extractionResult,
          verification: verificationResult
        }
      })
    }

    // QR structure detected but needs manual input
    return NextResponse.json({
      success: true,
      requiresManualInput: true,
      message: 'QR-enhanced PDF detected. Please provide the verification URL or request ID.'
    })

  } catch (error) {
    console.error('❌ Error processing PDF upload:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process PDF file' 
      },
      { status: 500 }
    )
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
