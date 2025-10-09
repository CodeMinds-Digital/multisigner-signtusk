import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params

    // Get job status from database
    const { data: job, error } = await supabaseAdmin
      .from('send_export_jobs')
      .select('*')
      .eq('id', jobId)
      .single()

    if (error || !job) {
      return NextResponse.json(
        { error: 'Export job not found' },
        { status: 404 }
      )
    }

    // Transform database record to ExportJob format
    const exportJob = {
      id: job.id,
      documentId: job.document_id,
      config: job.config,
      status: job.status,
      progress: job.progress,
      downloadUrl: job.download_url,
      error: job.error,
      createdAt: job.created_at,
      completedAt: job.completed_at,
      expiresAt: job.expires_at
    }

    return NextResponse.json({
      success: true,
      job: exportJob
    })

  } catch (error: any) {
    console.error('Export status error:', error)
    return NextResponse.json(
      { error: 'Failed to get export status' },
      { status: 500 }
    )
  }
}
