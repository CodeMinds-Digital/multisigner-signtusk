import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { Client } from '@upstash/qstash'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

const qstashClient = process.env.QSTASH_TOKEN
  ? new Client({ token: process.env.QSTASH_TOKEN })
  : null

/**
 * GET /api/send/analytics/export/queue
 * Get export job history for a document
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', errorCode: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('documentId')
    const limit = parseInt(searchParams.get('limit') || '10')

    if (!documentId) {
      return NextResponse.json(
        { success: false, error: 'Document ID required', errorCode: 'MISSING_DOCUMENT_ID' },
        { status: 400 }
      )
    }

    // Fetch jobs for this document and user
    const { data: jobs, error } = await supabaseAdmin
      .from('send_analytics_export_history')
      .select('*')
      .eq('document_id', documentId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Failed to fetch jobs:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch jobs', errorCode: 'FETCH_FAILED' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      jobs: jobs || []
    })
  } catch (error: any) {
    console.error('Job history error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch job history', errorCode: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/send/analytics/export/queue
 * Queue a new export job
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', errorCode: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      documentId,
      linkId,
      format,
      includeVisitors,
      includeEvents,
      includePageStats,
      scheduledFor
    } = body

    if (!documentId || !format) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields', errorCode: 'MISSING_FIELDS' },
        { status: 400 }
      )
    }

    // Validate format
    if (!['csv', 'excel', 'pdf', 'json'].includes(format)) {
      return NextResponse.json(
        { success: false, error: 'Invalid format', errorCode: 'INVALID_FORMAT' },
        { status: 400 }
      )
    }

    // Create job record
    const jobId = crypto.randomUUID()
    const { error: insertError } = await supabaseAdmin
      .from('send_analytics_export_history')
      .insert({
        id: jobId,
        document_id: documentId,
        link_id: linkId,
        user_id: user.id,
        format,
        status: scheduledFor ? 'scheduled' : 'pending',
        scheduled_for: scheduledFor,
        created_at: new Date().toISOString()
      })

    if (insertError) {
      console.error('Failed to create job:', insertError)
      return NextResponse.json(
        { success: false, error: 'Failed to create job', errorCode: 'CREATE_FAILED' },
        { status: 500 }
      )
    }

    // Queue job with QStash or fallback to immediate processing
    const workerUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/send/analytics/export/worker`

    if (qstashClient && !scheduledFor) {
      // Use QStash for background processing
      try {
        await qstashClient.publishJSON({
          url: workerUrl,
          body: {
            jobId,
            documentId,
            linkId,
            format,
            includeVisitors,
            includeEvents,
            includePageStats,
            userId: user.id
          }
        })

        console.log(`✅ Job ${jobId} queued with QStash`)
      } catch (qstashError) {
        console.error('QStash error, falling back to direct processing:', qstashError)
        // Fallback: trigger worker directly (non-blocking)
        fetch(workerUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jobId,
            documentId,
            linkId,
            format,
            includeVisitors,
            includeEvents,
            includePageStats,
            userId: user.id
          })
        }).catch(err => console.error('Worker trigger error:', err))
      }
    } else if (scheduledFor) {
      // Schedule for later with QStash
      if (qstashClient) {
        try {
          const scheduleTime = Math.floor(new Date(scheduledFor).getTime() / 1000)
          await qstashClient.publishJSON({
            url: workerUrl,
            body: {
              jobId,
              documentId,
              linkId,
              format,
              includeVisitors,
              includeEvents,
              includePageStats,
              userId: user.id
            },
            notBefore: scheduleTime
          })

          console.log(`✅ Job ${jobId} scheduled for ${scheduledFor}`)
        } catch (qstashError) {
          console.error('QStash scheduling error:', qstashError)
          return NextResponse.json(
            { success: false, error: 'Failed to schedule job', errorCode: 'SCHEDULE_FAILED' },
            { status: 500 }
          )
        }
      } else {
        return NextResponse.json(
          { success: false, error: 'Scheduling not available', errorCode: 'QSTASH_NOT_CONFIGURED' },
          { status: 503 }
        )
      }
    } else {
      // No QStash, trigger worker directly
      fetch(workerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId,
          documentId,
          linkId,
          format,
          includeVisitors,
          includeEvents,
          includePageStats,
          userId: user.id
        })
      }).catch(err => console.error('Worker trigger error:', err))
    }

    return NextResponse.json({
      success: true,
      jobId,
      message: 'Export job queued successfully'
    })
  } catch (error: any) {
    console.error('Export queue error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to queue export job', errorCode: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
