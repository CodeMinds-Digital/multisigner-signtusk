import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs'
import { Readable } from 'stream'

// Force Node.js runtime for ExcelJS and PDFKit
export const runtime = 'nodejs'

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

/**
 * POST /api/send/analytics/export/worker
 * Background worker for processing export jobs
 * Called by QStash
 */
async function handler(request: NextRequest) {
  let jobId: string | undefined
  try {
    const body = await request.json()
    const {
      jobId: extractedJobId,
      documentId,
      linkId,
      format,
      includeVisitors,
      includeEvents,
      includePageStats,
      userId
    } = body
    jobId = extractedJobId

    console.log(`📊 Processing export job ${jobId} for document ${documentId}`)

    // Update job status to processing
    await supabaseAdmin
      .from('send_analytics_export_history')
      .update({
        status: 'processing',
        started_at: new Date().toISOString()
      })
      .eq('id', jobId)

    // Fetch analytics data
    const analyticsData = await fetchAnalyticsData(documentId, linkId)

    // Generate export based on format
    let fileBuffer: Buffer
    let mimeType: string
    let extension: string

    if (format === 'excel') {
      fileBuffer = await generateExcelExport(analyticsData, {
        includeVisitors,
        includeEvents,
        includePageStats
      })
      mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      extension = 'xlsx'
    } else if (format === 'pdf') {
      fileBuffer = await generatePDFExport(analyticsData, {
        includeVisitors,
        includeEvents,
        includePageStats
      })
      mimeType = 'application/pdf'
      extension = 'pdf'
    } else if (format === 'csv') {
      const csvContent = generateCSVExport(analyticsData, {
        includeVisitors,
        includeEvents,
        includePageStats
      })
      fileBuffer = Buffer.from(csvContent, 'utf-8')
      mimeType = 'text/csv'
      extension = 'csv'
    } else {
      throw new Error(`Unsupported format: ${format}`)
    }

    // Upload to Supabase Storage
    const fileName = `exports/${jobId}.${extension}`
    const { error: uploadError } = await supabaseAdmin.storage
      .from(process.env.EXPORT_STORAGE_BUCKET || 'send-exports')
      .upload(fileName, fileBuffer, {
        contentType: mimeType,
        upsert: true
      })

    if (uploadError) {
      throw new Error(`Failed to upload file: ${uploadError.message}`)
    }

    // Get signed URL (valid for 7 days)
    const { data: urlData } = await supabaseAdmin.storage
      .from(process.env.EXPORT_STORAGE_BUCKET || 'send-exports')
      .createSignedUrl(fileName, 60 * 60 * 24 * 7)

    if (!urlData) {
      throw new Error('Failed to generate download URL')
    }

    // Update job status to completed
    await supabaseAdmin
      .from('send_analytics_export_history')
      .update({
        status: 'completed',
        download_url: urlData.signedUrl,
        file_size: fileBuffer.length,
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId)

    console.log(`✅ Export job ${jobId} completed successfully`)

    return NextResponse.json({
      success: true,
      jobId,
      downloadUrl: urlData.signedUrl
    })
  } catch (error: any) {
    console.error('Export worker error:', error)

    // Update job status to failed
    if (jobId) {
      await supabaseAdmin
        .from('send_analytics_export_history')
        .update({
          status: 'failed',
          error_message: error.message || 'Export processing failed',
          completed_at: new Date().toISOString()
        })
        .eq('id', jobId)
    }

    return NextResponse.json(
      { success: false, error: error.message || 'Export processing failed' },
      { status: 500 }
    )
  }
}

// Verify QStash signature in production
export const POST = process.env.NODE_ENV === 'production'
  ? verifySignatureAppRouter(handler)
  : handler

/**
 * Fetch analytics data for export
 */
async function fetchAnalyticsData(documentId: string, linkId?: string) {
  // Get document info
  const { data: document } = await supabaseAdmin
    .from('send_shared_documents')
    .select('id, title, total_pages')
    .eq('id', documentId)
    .single()

  // Get views
  let viewsQuery = supabaseAdmin
    .from('send_document_views')
    .select('*')
    .eq('document_id', documentId)

  if (linkId) {
    const { data: link } = await supabaseAdmin
      .from('send_document_links')
      .select('id')
      .eq('link_id', linkId)
      .single()

    if (link) {
      viewsQuery = viewsQuery.eq('link_id', link.id)
    }
  }

  const { data: views } = await viewsQuery

  // Get page views
  const sessionIds = views?.map(v => v.session_id) || []
  const { data: pageViews } = await supabaseAdmin
    .from('send_page_views')
    .select('*')
    .in('session_id', sessionIds)

  // Get events
  const { data: events } = await supabaseAdmin
    .from('send_link_analytics_events')
    .select('*')
    .eq('document_id', documentId)
    .order('created_at', { ascending: false })

  // Get visitor sessions
  const { data: sessions } = await supabaseAdmin
    .from('send_visitor_sessions')
    .select('*')
    .eq('document_id', documentId)

  // Calculate summary
  const totalViews = views?.length || 0
  const uniqueViewers = new Set(views?.map(v => v.session_id)).size
  const avgDuration = views?.reduce((sum, v) => sum + (v.duration_seconds || 0), 0) / (totalViews || 1)
  const avgScrollDepth = pageViews?.reduce((sum, pv) => sum + (pv.scroll_depth || 0), 0) / (pageViews?.length || 1)

  const totalPages = document?.total_pages || 1
  const pagesViewed = new Set(pageViews?.map(pv => pv.page_number)).size
  const completionRate = (pagesViewed / totalPages) * 100

  const downloads = events?.filter(e => e.event_type === 'download').length || 0
  const prints = events?.filter(e => e.event_type === 'print').length || 0

  // Calculate page stats
  const pageStatsMap = new Map()
  for (let i = 1; i <= totalPages; i++) {
    pageStatsMap.set(i, { page: i, views: 0, totalTime: 0, totalScroll: 0 })
  }

  pageViews?.forEach(pv => {
    const stats = pageStatsMap.get(pv.page_number)
    if (stats) {
      stats.views++
      stats.totalTime += pv.duration_seconds || 0
      stats.totalScroll += pv.scroll_depth || 0
    }
  })

  const pageStats = Array.from(pageStatsMap.values()).map(stats => ({
    page: stats.page,
    views: stats.views,
    avgTime: stats.views > 0 ? stats.totalTime / stats.views : 0,
    avgScroll: stats.views > 0 ? stats.totalScroll / stats.views : 0
  }))

  // Get top viewers
  const visitorMap = new Map()
  sessions?.forEach(session => {
    const fingerprint = session.fingerprint
    if (!visitorMap.has(fingerprint)) {
      visitorMap.set(fingerprint, {
        fingerprint,
        email: session.email,
        visits: 0,
        duration: 0,
        lastVisit: session.created_at
      })
    }
    const visitor = visitorMap.get(fingerprint)
    visitor.visits++
    visitor.duration += session.duration_seconds || 0
    if (new Date(session.created_at) > new Date(visitor.lastVisit)) {
      visitor.lastVisit = session.created_at
    }
  })

  const topViewers = Array.from(visitorMap.values())
    .sort((a, b) => b.visits - a.visits)

  return {
    document: {
      id: document?.id || documentId,
      title: document?.title || 'Unknown',
      totalPages: totalPages
    },
    summary: {
      totalViews,
      uniqueViewers,
      avgDuration,
      avgScrollDepth,
      completionRate,
      downloads,
      prints
    },
    pageStats,
    topViewers,
    events: events?.map(e => ({
      type: e.event_type,
      timestamp: e.created_at,
      page: e.page_number,
      sessionId: e.session_id
    })) || [],
    views: views || [],
    sessions: sessions || []
  }
}

/**
 * Generate CSV export
 */
function generateCSVExport(data: any, options: any): string {
  const lines: string[] = []

  // Header
  lines.push(`Analytics Export - ${data.document.title}`)
  lines.push(`Generated: ${new Date().toISOString()}`)
  lines.push('')

  // Summary
  lines.push('SUMMARY')
  lines.push('Metric,Value')
  lines.push(`Total Views,${data.summary.totalViews}`)
  lines.push(`Unique Viewers,${data.summary.uniqueViewers}`)
  lines.push(`Avg Duration (seconds),${data.summary.avgDuration.toFixed(2)}`)
  lines.push(`Avg Scroll Depth (%),${data.summary.avgScrollDepth.toFixed(2)}`)
  lines.push(`Completion Rate (%),${data.summary.completionRate.toFixed(2)}`)
  lines.push(`Downloads,${data.summary.downloads}`)
  lines.push(`Prints,${data.summary.prints}`)
  lines.push('')

  // Page Stats
  if (options.includePageStats) {
    lines.push('PAGE STATISTICS')
    lines.push('Page,Views,Avg Time (s),Avg Scroll (%)')
    data.pageStats.forEach((stat: any) => {
      lines.push(`${stat.page},${stat.views},${stat.avgTime.toFixed(2)},${stat.avgScroll.toFixed(2)}`)
    })
    lines.push('')
  }

  // Top Viewers
  if (options.includeVisitors) {
    lines.push('TOP VIEWERS')
    lines.push('Email,Visits,Total Duration (s),Last Visit')
    data.topViewers.forEach((viewer: any) => {
      lines.push(`${viewer.email || 'Anonymous'},${viewer.visits},${viewer.duration.toFixed(2)},${viewer.lastVisit}`)
    })
    lines.push('')
  }

  // Events
  if (options.includeEvents) {
    lines.push('EVENTS')
    lines.push('Type,Timestamp,Page')
    data.events.forEach((event: any) => {
      lines.push(`${event.type},${event.timestamp},${event.page || 'N/A'}`)
    })
  }

  return lines.join('\n')
}

/**
 * Generate Excel export
 */
async function generateExcelExport(data: any, options: any): Promise<Buffer> {
  const ExcelJS = (await import('exceljs')).default
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'SendTusk Analytics'
  workbook.created = new Date()

  // Summary Sheet
  const summarySheet = workbook.addWorksheet('Summary')
  summarySheet.columns = [
    { header: 'Metric', key: 'metric', width: 30 },
    { header: 'Value', key: 'value', width: 20 }
  ]

  summarySheet.addRow({ metric: 'Document', value: data.document.title })
  summarySheet.addRow({ metric: 'Total Pages', value: data.document.totalPages })
  summarySheet.addRow({ metric: 'Export Date', value: new Date().toISOString() })
  summarySheet.addRow({})
  summarySheet.addRow({ metric: 'Total Views', value: data.summary.totalViews })
  summarySheet.addRow({ metric: 'Unique Viewers', value: data.summary.uniqueViewers })
  summarySheet.addRow({ metric: 'Avg Duration (seconds)', value: data.summary.avgDuration.toFixed(2) })
  summarySheet.addRow({ metric: 'Avg Scroll Depth (%)', value: data.summary.avgScrollDepth.toFixed(2) })
  summarySheet.addRow({ metric: 'Completion Rate (%)', value: data.summary.completionRate.toFixed(2) })
  summarySheet.addRow({ metric: 'Downloads', value: data.summary.downloads })
  summarySheet.addRow({ metric: 'Prints', value: data.summary.prints })

  // Style header row
  summarySheet.getRow(1).font = { bold: true }
  summarySheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  }

  // Page Stats Sheet
  if (options.includePageStats) {
    const pageSheet = workbook.addWorksheet('Page Statistics')
    pageSheet.columns = [
      { header: 'Page', key: 'page', width: 10 },
      { header: 'Views', key: 'views', width: 15 },
      { header: 'Avg Time (s)', key: 'avgTime', width: 15 },
      { header: 'Avg Scroll (%)', key: 'avgScroll', width: 15 }
    ]

    data.pageStats.forEach((stat: any) => {
      pageSheet.addRow({
        page: stat.page,
        views: stat.views,
        avgTime: stat.avgTime.toFixed(2),
        avgScroll: stat.avgScroll.toFixed(2)
      })
    })

    pageSheet.getRow(1).font = { bold: true }
    pageSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    }
  }

  // Viewers Sheet
  if (options.includeVisitors) {
    const viewersSheet = workbook.addWorksheet('Viewers')
    viewersSheet.columns = [
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Visits', key: 'visits', width: 15 },
      { header: 'Total Duration (s)', key: 'duration', width: 20 },
      { header: 'Last Visit', key: 'lastVisit', width: 25 }
    ]

    data.topViewers.forEach((viewer: any) => {
      viewersSheet.addRow({
        email: viewer.email || 'Anonymous',
        visits: viewer.visits,
        duration: viewer.duration.toFixed(2),
        lastVisit: viewer.lastVisit
      })
    })

    viewersSheet.getRow(1).font = { bold: true }
    viewersSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    }
  }

  // Events Sheet
  if (options.includeEvents) {
    const eventsSheet = workbook.addWorksheet('Events')
    eventsSheet.columns = [
      { header: 'Type', key: 'type', width: 20 },
      { header: 'Timestamp', key: 'timestamp', width: 25 },
      { header: 'Page', key: 'page', width: 10 }
    ]

    data.events.forEach((event: any) => {
      eventsSheet.addRow({
        type: event.type,
        timestamp: event.timestamp,
        page: event.page || 'N/A'
      })
    })

    eventsSheet.getRow(1).font = { bold: true }
    eventsSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    }
  }

  return Buffer.from(await workbook.xlsx.writeBuffer())
}

/**
 * Generate PDF export
 */
async function generatePDFExport(data: any, options: any): Promise<Buffer> {
  const PDFDocument = (await import('pdfkit')).default
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 })
    const chunks: Buffer[] = []

    doc.on('data', (chunk) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    // Title
    doc.fontSize(20).text('Analytics Export', { align: 'center' })
    doc.fontSize(14).text(data.document.title, { align: 'center' })
    doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' })
    doc.moveDown(2)

    // Summary
    doc.fontSize(16).text('Summary', { underline: true })
    doc.moveDown(0.5)
    doc.fontSize(12)
    doc.text(`Total Views: ${data.summary.totalViews}`)
    doc.text(`Unique Viewers: ${data.summary.uniqueViewers}`)
    doc.text(`Avg Duration: ${data.summary.avgDuration.toFixed(2)}s`)
    doc.text(`Avg Scroll Depth: ${data.summary.avgScrollDepth.toFixed(2)}%`)
    doc.text(`Completion Rate: ${data.summary.completionRate.toFixed(2)}%`)
    doc.text(`Downloads: ${data.summary.downloads}`)
    doc.text(`Prints: ${data.summary.prints}`)
    doc.moveDown(2)

    // Page Stats
    if (options.includePageStats && data.pageStats.length > 0) {
      doc.fontSize(16).text('Page Statistics', { underline: true })
      doc.moveDown(0.5)
      doc.fontSize(10)

      const tableTop = doc.y
      const colWidths = [60, 80, 100, 100]
      const headers = ['Page', 'Views', 'Avg Time (s)', 'Avg Scroll (%)']

      // Table headers
      headers.forEach((header, i) => {
        const x = 50 + colWidths.slice(0, i).reduce((a, b) => a + b, 0)
        doc.text(header, x, tableTop, { width: colWidths[i], continued: false })
      })

      doc.moveDown(0.5)

      // Table rows (limit to first 20 pages)
      data.pageStats.slice(0, 20).forEach((stat: any) => {
        const y = doc.y
        doc.text(stat.page.toString(), 50, y, { width: colWidths[0] })
        doc.text(stat.views.toString(), 110, y, { width: colWidths[1] })
        doc.text(stat.avgTime.toFixed(2), 190, y, { width: colWidths[2] })
        doc.text(stat.avgScroll.toFixed(2), 290, y, { width: colWidths[3] })
        doc.moveDown(0.5)
      })

      doc.moveDown(1)
    }

    // Top Viewers
    if (options.includeVisitors && data.topViewers.length > 0) {
      doc.addPage()
      doc.fontSize(16).text('Top Viewers', { underline: true })
      doc.moveDown(0.5)
      doc.fontSize(10)

      data.topViewers.slice(0, 20).forEach((viewer: any) => {
        doc.text(`${viewer.email || 'Anonymous'} - ${viewer.visits} visits, ${viewer.duration.toFixed(2)}s total`)
        doc.moveDown(0.3)
      })
    }

    doc.end()
  })
}

