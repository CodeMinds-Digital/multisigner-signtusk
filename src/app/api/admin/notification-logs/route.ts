import { NextRequest } from 'next/server'
import { 
  getNotificationLogs, 
  getNotificationStats,
  getEmailTemplates,
  searchNotificationLogs 
} from '@/lib/admin-notification-service'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const searchTerm = searchParams.get('search') || ''
    const statusFilter = searchParams.get('status') || 'all'
    const typeFilter = searchParams.get('type') || 'all'
    const includeStats = searchParams.get('includeStats') === 'true'
    const includeTemplates = searchParams.get('includeTemplates') === 'true'

    console.log('📧 Admin API: Fetching notification logs', {
      searchTerm,
      statusFilter,
      typeFilter,
      includeStats,
      includeTemplates
    })

    let logs
    let stats = null
    let templates = null

    // Get logs based on filters
    if (searchTerm || statusFilter !== 'all' || typeFilter !== 'all') {
      logs = await searchNotificationLogs(searchTerm, statusFilter, typeFilter)
    } else {
      logs = await getNotificationLogs()
    }

    // Get stats if requested
    if (includeStats) {
      stats = await getNotificationStats()
    }

    // Get templates if requested
    if (includeTemplates) {
      templates = await getEmailTemplates()
    }

    console.log(`✅ Admin API: Returning ${logs.length} logs`, 
      stats ? 'with stats' : 'without stats',
      templates ? `and ${templates.length} templates` : 'without templates'
    )

    return new Response(
      JSON.stringify({ 
        success: true,
        logs,
        stats,
        templates,
        total: logs.length
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error in admin notification logs API:', error)

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        logs: [],
        stats: null,
        templates: null,
        total: 0
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
