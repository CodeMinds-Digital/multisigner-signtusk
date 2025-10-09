import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const url = new URL(request.url)
    const documentId = url.searchParams.get('documentId')

    // Build query
    let query = supabaseAdmin
      .from('send_export_jobs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (documentId) {
      query = query.eq('document_id', documentId)
    }

    const { data: jobs, error } = await query

    if (error) {
      console.error('Failed to fetch export history:', error)
      return NextResponse.json(
        { error: 'Failed to fetch export history' },
        { status: 500 }
      )
    }

    // Transform database records to ExportJob format
    const exportJobs = jobs?.map(job => ({
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
    })) || []

    return NextResponse.json({
      success: true,
      exports: exportJobs
    })

  } catch (error: any) {
    console.error('Export history error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch export history' },
      { status: 500 }
    )
  }
}
