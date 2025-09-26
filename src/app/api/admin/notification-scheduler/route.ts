import { NextRequest } from 'next/server'
import { NotificationScheduler } from '@/lib/notification-scheduler'

export async function POST(request: NextRequest) {
  try {
    // Basic security check - in production, add proper admin authentication
    const authHeader = request.headers.get('authorization')
    const expectedToken = process.env.SCHEDULER_API_TOKEN || 'dev-scheduler-token'

    if (authHeader !== `Bearer ${expectedToken}`) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const { action, config } = await request.json()

    console.log('🔧 Notification scheduler API called:', action)

    let result: any

    switch (action) {
      case 'check_expired':
        result = await NotificationScheduler.checkExpiredDocuments()
        break

      case 'check_deadline_warnings':
        result = await NotificationScheduler.checkDeadlineWarnings(config)
        break

      case 'send_auto_reminders':
        result = await NotificationScheduler.sendAutoReminders(config)
        break

      case 'run_all':
      default:
        result = await NotificationScheduler.runAllChecks(config)
        break
    }

    return new Response(
      JSON.stringify({
        success: true,
        action,
        result,
        timestamp: new Date().toISOString()
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error in notification scheduler API:', error)
    return new Response(
      JSON.stringify({
        error: 'Scheduler execution failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

// GET endpoint for health check and status
export async function GET() {
  return new Response(
    JSON.stringify({
      service: 'Notification Scheduler',
      status: 'active',
      timestamp: new Date().toISOString(),
      endpoints: {
        'POST /': 'Run scheduler with action parameter',
        'GET /': 'Health check'
      },
      actions: [
        'check_expired',
        'check_deadline_warnings',
        'send_auto_reminders',
        'run_all'
      ]
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  )
}
