import { NextRequest } from 'next/server'
import { ErrorRecoveryService } from '@/lib/error-recovery-service'

export async function POST(request: NextRequest) {
  try {
    const { requestId, signerEmail } = await request.json()

    if (!requestId || !signerEmail) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Request ID and signer email are required'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log('🔄 Admin reset signer:', signerEmail, 'for request:', requestId)

    // Use the error recovery service to reset the signer
    const result = await ErrorRecoveryService.resetSigner(requestId, signerEmail, 'admin@signtusk.com')

    if (result.success) {
      console.log('✅ Signer reset successful')

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Signer reset successful'
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    } else {
      console.error('❌ Signer reset failed:', result.error)

      return new Response(
        JSON.stringify({
          success: false,
          error: result.error || 'Signer reset failed'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    console.error('❌ Error in reset signer API:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
