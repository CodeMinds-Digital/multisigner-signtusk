import { NextRequest } from 'next/server'
import { 
  getMultiSignatureRequests, 
  getMultiSignatureStats,
  searchMultiSignatureRequests 
} from '@/lib/admin-multi-signature-service'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const searchTerm = searchParams.get('search') || ''
    const statusFilter = searchParams.get('status') || 'all'
    const modeFilter = searchParams.get('mode') || 'all'
    const includeStats = searchParams.get('includeStats') === 'true'

    console.log('🔍 Admin API: Fetching multi-signature requests', {
      searchTerm,
      statusFilter,
      modeFilter,
      includeStats
    })

    let requests
    let stats = null

    // Get requests based on filters
    if (searchTerm || statusFilter !== 'all' || modeFilter !== 'all') {
      requests = await searchMultiSignatureRequests(searchTerm, statusFilter, modeFilter)
    } else {
      requests = await getMultiSignatureRequests()
    }

    // Get stats if requested
    if (includeStats) {
      stats = await getMultiSignatureStats()
    }

    console.log(`✅ Admin API: Returning ${requests.length} requests`, stats ? 'with stats' : 'without stats')

    return new Response(
      JSON.stringify({ 
        success: true,
        requests,
        stats,
        total: requests.length
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error in admin multi-signature requests API:', error)

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        requests: [],
        stats: null,
        total: 0
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
