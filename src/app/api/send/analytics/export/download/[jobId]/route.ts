import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get job details
    const { data: job, error: jobError } = await supabaseAdmin
      .from('send_export_jobs')
      .select('*')
      .eq('id', jobId)
      .eq('user_id', user.id)
      .single()

    if (jobError || !job) {
      return NextResponse.json(
        { error: 'Export job not found' },
        { status: 404 }
      )
    }

    if (job.status !== 'completed') {
      return NextResponse.json(
        { error: 'Export not completed yet' },
        { status: 400 }
      )
    }

    if (!job.download_url) {
      return NextResponse.json(
        { error: 'Download URL not available' },
        { status: 400 }
      )
    }

    // Check if export has expired
    if (new Date(job.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Export has expired' },
        { status: 410 }
      )
    }

    // Extract file path from download URL
    const urlParts = job.download_url.split('/')
    const fileName = urlParts[urlParts.length - 1]

    // Download file from Supabase storage
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from('send-exports')
      .download(`exports/${fileName}`)

    if (downloadError || !fileData) {
      console.error('Download error:', downloadError)
      return NextResponse.json(
        { error: 'Failed to download file' },
        { status: 500 }
      )
    }

    // Determine content type and filename based on format
    const format = job.config.format
    let contentType: string
    let downloadFileName: string

    switch (format) {
      case 'csv':
        contentType = 'text/csv'
        downloadFileName = `analytics-export-${jobId}.csv`
        break
      case 'excel':
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        downloadFileName = `analytics-export-${jobId}.xlsx`
        break
      case 'pdf':
        contentType = 'application/pdf'
        downloadFileName = `analytics-export-${jobId}.pdf`
        break
      case 'json':
        contentType = 'application/json'
        downloadFileName = `analytics-export-${jobId}.json`
        break
      default:
        contentType = 'application/octet-stream'
        downloadFileName = `analytics-export-${jobId}.txt`
    }

    // Convert blob to array buffer
    const arrayBuffer = await fileData.arrayBuffer()

    // Return file with appropriate headers
    return new NextResponse(arrayBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${downloadFileName}"`,
        'Content-Length': arrayBuffer.byteLength.toString()
      }
    })

  } catch (error: any) {
    console.error('Export download error:', error)
    return NextResponse.json(
      { error: 'Failed to download export' },
      { status: 500 }
    )
  }
}
