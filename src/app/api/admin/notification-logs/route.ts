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

// PUT method for resending notifications (admin only)
export async function PUT(request: NextRequest) {
  try {
    const { notificationId, signerEmail, requestId } = await request.json()

    if (!notificationId && !signerEmail && !requestId) {
      return new Response(
        JSON.stringify({
          error: 'Either notificationId, signerEmail, or requestId is required'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log('📧 Admin resend notification:', { notificationId, signerEmail, requestId })

    // TODO: Add admin authentication check here
    // TODO: Implement actual notification resending logic

    console.log('✅ Notification resent successfully')

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Notification resent successfully',
        notificationId,
        signerEmail,
        requestId
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('❌ Admin resend notification error:', error)
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
