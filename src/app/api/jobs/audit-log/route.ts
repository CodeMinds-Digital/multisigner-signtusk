import { NextRequest, NextResponse } from 'next/server'
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs'
import { UpstashJobQueue } from '@/lib/upstash-job-queue'
import { supabaseAdmin } from '@/lib/supabase-admin'

async function handler(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      userId,
      action,
      resourceType,
      resourceId,
      details,
      metadata,
      ipAddress,
      userAgent,
      timestamp = Date.now()
    } = body

    console.log('📝 Processing audit log job:', { userId, action, resourceType, resourceId })

    // Update job status
    const jobId = request.headers.get('upstash-message-id')
    if (jobId) {
      await UpstashJobQueue.updateJobStatus(jobId, 'processing')
    }

    // Create audit log entry
    const { error } = await supabaseAdmin
      .from('audit_logs')
      .insert({
        user_id: userId,
        action,
        resource_type: resourceType,
        resource_id: resourceId,
        details,
        metadata: metadata || {},
        ip_address: ipAddress,
        user_agent: userAgent,
        created_at: new Date(timestamp).toISOString()
      })

    if (error) {
      throw new Error(`Failed to create audit log: ${error.message}`)
    }

    // Update job status
    if (jobId) {
      await UpstashJobQueue.updateJobStatus(jobId, 'completed', {
        auditLogCreated: true,
        timestamp: new Date().toISOString()
      })
    }

    console.log('✅ Audit log created successfully:', { userId, action, resourceType })

    return NextResponse.json({
      success: true,
      auditLogCreated: true,
      timestamp: Date.now()
    })

  } catch (error) {
    console.error('❌ Audit log job failed:', error)

    // Update job status as failed
    const jobId = request.headers.get('upstash-message-id')
    if (jobId) {
      await UpstashJobQueue.updateJobStatus(
        jobId,
        'failed',
        undefined,
        error instanceof Error ? error.message : 'Unknown error'
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now()
      },
      { status: 500 }
    )
  }
}

// Verify QStash signature for security
export const POST = verifySignatureAppRouter(handler)

export async function GET() {
  return NextResponse.json({
    service: 'Audit Log Job Handler',
    status: 'active',
    timestamp: Date.now(),
    supportedActions: [
      'create',
      'update',
      'delete',
      'view',
      'sign',
      'download',
      'share',
      'login',
      'logout',
      'admin_action'
    ],
    supportedResourceTypes: [
      'document',
      'signing_request',
      'user',
      'notification',
      'template',
      'organization',
      'domain_settings'
    ]
  })
}
