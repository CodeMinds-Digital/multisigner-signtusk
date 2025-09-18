import { NextRequest } from 'next/server'
import { ErrorRecoveryService } from '@/lib/error-recovery-service'

export async function POST(request: NextRequest) {
  try {
    const { requestId, newExpirationDate } = await request.json()

    if (!requestId || !newExpirationDate) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Request ID and new expiration date are required' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Validate date format
    const expirationDate = new Date(newExpirationDate)
    if (isNaN(expirationDate.getTime())) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid date format. Please use YYYY-MM-DD format' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Check if date is in the future
    if (expirationDate <= new Date()) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Expiration date must be in the future' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log('📅 Admin extend deadline for request:', requestId, 'to:', newExpirationDate)

    // Use the error recovery service to extend the deadline
    const result = await ErrorRecoveryService.extendDeadline(requestId, expirationDate.toISOString())

    if (result.success) {
      console.log('✅ Deadline extension successful')
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Deadline extended successfully',
          newExpirationDate: expirationDate.toISOString()
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    } else {
      console.error('❌ Deadline extension failed:', result.error)
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: result.error || 'Deadline extension failed'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    console.error('❌ Error in extend deadline API:', error)

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
