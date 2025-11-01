import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { AdvancedAnalyticsExport, ExportJob } from '@/lib/advanced-analytics-export'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { job, userId } = body

    if (!job || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Store the export job in the database
    const { error: insertError } = await supabaseAdmin
      .from('send_export_jobs')
      .insert({
        id: job.id,
        document_id: job.documentId,
        user_id: userId,
        config: job.config,
        status: job.status,
        progress: job.progress,
        created_at: job.createdAt,
        expires_at: job.expiresAt
      })

    if (insertError) {
      console.error('Failed to store export job:', insertError)
      return NextResponse.json(
        { error: 'Failed to queue export job' },
        { status: 500 }
      )
    }

    // In a real implementation, this would queue the job for background processing
    // For now, we'll simulate processing by updating the job status
    setTimeout(async () => {
      try {
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 5000))

        // Generate the export data
        let downloadUrl: string | undefined
        let error: string | undefined

        try {
          switch (job.config.format) {
            case 'csv':
              const csvData = await AdvancedAnalyticsExport.generateCSVExport(
                job.documentId,
                job.config
              )
              downloadUrl = await storeExportFile(job.id, csvData, 'text/csv', 'csv')
              break
            
            case 'excel':
              const excelData = await AdvancedAnalyticsExport.generateExcelExport(
                job.documentId,
                job.config
              )
              downloadUrl = await storeExportFile(job.id, excelData, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'xlsx')
              break
            
            case 'pdf':
              const pdfData = await AdvancedAnalyticsExport.generatePDFExport(
                job.documentId,
                job.config
              )
              downloadUrl = await storeExportFile(job.id, pdfData, 'text/html', 'html')
              break
            
            case 'json':
              const jsonData = await AdvancedAnalyticsExport.generateJSONExport(
                job.documentId,
                job.config
              )
              downloadUrl = await storeExportFile(job.id, jsonData, 'application/json', 'json')
              break
            
            default:
              throw new Error(`Unsupported format: ${job.config.format}`)
          }
        } catch (exportError: any) {
          error = exportError.message || 'Export generation failed'
        }

        // Update job status
        await supabaseAdmin
          .from('send_export_jobs')
          .update({
            status: error ? 'failed' : 'completed',
            progress: 100,
            download_url: downloadUrl,
            error: error,
            completed_at: new Date().toISOString()
          })
          .eq('id', job.id)

      } catch (processingError) {
        console.error('Export processing error:', processingError)
        
        // Mark job as failed
        await supabaseAdmin
          .from('send_export_jobs')
          .update({
            status: 'failed',
            error: 'Processing failed',
            completed_at: new Date().toISOString()
          })
          .eq('id', job.id)
      }
    }, 1000) // Start processing after 1 second

    return NextResponse.json({
      success: true,
      jobId: job.id,
      message: 'Export job queued successfully'
    })

  } catch (error: any) {
    console.error('Export queue error:', error)
    return NextResponse.json(
      { error: 'Failed to queue export job' },
      { status: 500 }
    )
  }
}

/**
 * Store export file in Supabase storage
 */
async function storeExportFile(
  jobId: string,
  data: string,
  contentType: string,
  extension: string
): Promise<string> {
  const fileName = `exports/${jobId}.${extension}`
  
  // Convert data to blob
  const blob = new Blob([data], { type: contentType })
  
  // Upload to Supabase storage
  const { data: uploadData, error } = await supabaseAdmin.storage
    .from('send-exports')
    .upload(fileName, blob, {
      contentType,
      upsert: true
    })

  if (error) {
    throw new Error(`Failed to store export file: ${error.message}`)
  }

  // Get public URL
  const { data: urlData } = supabaseAdmin.storage
    .from('send-exports')
    .getPublicUrl(fileName)

  return urlData.publicUrl
}
