import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const requestId = resolvedParams.id

    console.log('🔍 Debug: Checking signature request:', requestId)

    // Check if request exists in signing_requests table (the correct table)
    const { data: signingRequest, error: signingError } = await supabaseAdmin
      .from('signing_requests')
      .select('*')
      .eq('id', requestId)
      .single()

    console.log('🔍 signing_requests result:', { signingRequest, signingError })

    // Check signers for this request
    const { data: signers, error: signersError } = await supabaseAdmin
      .from('signing_request_signers')
      .select('*')
      .eq('signing_request_id', requestId)

    console.log('🔍 signers result:', { signers, signersError })

    return new Response(
      JSON.stringify({
        requestId,
        tables: {
          signing_requests: {
            found: !!signingRequest,
            data: signingRequest,
            error: signingError
          },
          signers: {
            count: signers?.length || 0,
            data: signers,
            error: signersError,
            pendingCount: signers?.filter(s =>
              s.signer_status === 'initiated' ||
              s.signer_status === 'viewed' ||
              s.signer_status === 'pending'
            ).length || 0,
            signedCount: signers?.filter(s => s.signer_status === 'signed').length || 0
          }
        },
        analysis: {
          requestExists: !!signingRequest,
          hasSigners: (signers?.length || 0) > 0,
          canSendReminders: signingRequest && signers && signers.some(s =>
            s.signer_status === 'initiated' ||
            s.signer_status === 'viewed' ||
            s.signer_status === 'pending'
          )
        }
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Debug endpoint error:', error)
    return new Response(
      JSON.stringify({ error: 'Debug endpoint failed', details: error }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
