import { NextRequest } from 'next/server'
import { ErrorRecoveryService } from '@/lib/error-recovery-service'

export async function POST(request: NextRequest) {
  try {
    const { requestId } = await request.json()

    if (!requestId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Request ID is required' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log('🔄 Admin retry PDF generation for request:', requestId)

    // Use the error recovery service to retry PDF generation
    const result = await ErrorRecoveryService.retryPDFGeneration(requestId)

    if (result.success) {
      console.log('✅ PDF generation retry successful:', result.finalPdfUrl)
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'PDF generation retry successful',
          finalPdfUrl: result.finalPdfUrl
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    } else {
      console.error('❌ PDF generation retry failed:', result.error)
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: result.error || 'PDF generation retry failed'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    console.error('❌ Error in retry PDF generation API:', error)

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
