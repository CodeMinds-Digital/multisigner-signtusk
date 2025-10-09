// Advanced Analytics Export Service
// Enhanced analytics export with multiple formats, scheduling, and advanced features

export interface AdvancedExportConfig {
  format: 'csv' | 'excel' | 'pdf' | 'json' | 'xml'
  dateRange: {
    start: string
    end: string
    preset?: 'last_7_days' | 'last_30_days' | 'last_90_days' | 'all_time' | 'custom'
  }
  includeData: {
    summary: boolean
    views: boolean
    pageViews: boolean
    events: boolean
    sessions: boolean
    visitors: boolean
    geographic: boolean
    devices: boolean
    referrers: boolean
    ndaAcceptances: boolean
    protectionEvents: boolean
  }
  filters: {
    linkIds?: string[]
    viewerEmails?: string[]
    countries?: string[]
    devices?: string[]
    eventTypes?: string[]
    minDuration?: number
    maxDuration?: number
  }
  groupBy?: 'day' | 'week' | 'month' | 'link' | 'viewer' | 'country'
  sortBy?: 'date' | 'views' | 'duration' | 'engagement'
  sortOrder?: 'asc' | 'desc'
  includeCharts?: boolean
  includeHeatmaps?: boolean
  customFields?: string[]
  branding?: {
    logo?: string
    companyName?: string
    reportTitle?: string
    footer?: string
  }
}

export interface ScheduledExportConfig {
  id: string
  name: string
  documentId: string
  config: AdvancedExportConfig
  schedule: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly'
    dayOfWeek?: number // 0-6 for weekly
    dayOfMonth?: number // 1-31 for monthly
    time: string // HH:MM format
    timezone: string
  }
  recipients: string[]
  isActive: boolean
  lastRun?: string
  nextRun: string
  createdAt: string
  updatedAt: string
}

export interface ExportJob {
  id: string
  documentId: string
  config: AdvancedExportConfig
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  downloadUrl?: string
  error?: string
  createdAt: string
  completedAt?: string
  expiresAt: string
}

export class AdvancedAnalyticsExport {
  /**
   * Create export job
   */
  static async createExportJob(
    documentId: string,
    config: AdvancedExportConfig,
    userId: string
  ): Promise<ExportJob> {
    const jobId = `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const job: ExportJob = {
      id: jobId,
      documentId,
      config,
      status: 'pending',
      progress: 0,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
    }

    // Queue the export job
    await this.queueExportJob(job, userId)

    return job
  }

  /**
   * Queue export job for processing
   */
  private static async queueExportJob(job: ExportJob, userId: string): Promise<void> {
    try {
      await fetch('/api/send/analytics/export/queue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          job,
          userId
        })
      })
    } catch (error) {
      console.error('Failed to queue export job:', error)
      throw new Error('Failed to queue export job')
    }
  }

  /**
   * Get export job status
   */
  static async getExportJobStatus(jobId: string): Promise<ExportJob | null> {
    try {
      const response = await fetch(`/api/send/analytics/export/status/${jobId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get job status')
      }

      return data.job
    } catch (error) {
      console.error('Failed to get export job status:', error)
      return null
    }
  }

  /**
   * Generate CSV export
   */
  static async generateCSVExport(
    documentId: string,
    config: AdvancedExportConfig
  ): Promise<string> {
    const data = await this.fetchAnalyticsData(documentId, config)
    let csv = ''

    // Summary section
    if (config.includeData.summary) {
      csv += 'DOCUMENT SUMMARY\n'
      csv += `Document ID,${data.document.id}\n`
      csv += `Document Title,${data.document.title}\n`
      csv += `Total Pages,${data.document.totalPages}\n`
      csv += `Export Date,${new Date().toISOString()}\n`
      csv += `Date Range,${config.dateRange.start} to ${config.dateRange.end}\n\n`

      csv += 'METRICS\n'
      csv += 'Metric,Value\n'
      csv += `Total Views,${data.summary.totalViews}\n`
      csv += `Unique Viewers,${data.summary.uniqueViewers}\n`
      csv += `Average Duration (seconds),${data.summary.avgDuration}\n`
      csv += `Average Scroll Depth (%),${data.summary.avgScrollDepth}\n`
      csv += `Completion Rate (%),${data.summary.completionRate}\n`
      csv += `Engagement Score,${data.summary.engagementScore}\n`
      csv += `Downloads,${data.summary.downloads}\n`
      csv += `Prints,${data.summary.prints}\n\n`
    }

    // Views section
    if (config.includeData.views && data.views) {
      csv += 'DOCUMENT VIEWS\n'
      csv += 'View ID,Viewer Email,IP Address,Duration (seconds),Created At,Link ID\n'
      data.views.forEach(view => {
        csv += `${view.id},${view.viewerEmail || ''},${view.ipAddress},${view.duration},${view.createdAt},${view.linkId}\n`
      })
      csv += '\n'
    }

    // Page views section
    if (config.includeData.pageViews && data.pageViews) {
      csv += 'PAGE VIEWS\n'
      csv += 'Page Number,Viewer Email,Duration (seconds),Scroll Depth (%),Created At\n'
      data.pageViews.forEach(pv => {
        csv += `${pv.pageNumber},${pv.viewerEmail || ''},${pv.duration},${pv.scrollDepth},${pv.createdAt}\n`
      })
      csv += '\n'
    }

    // Events section
    if (config.includeData.events && data.events) {
      csv += 'EVENTS\n'
      csv += 'Event Type,Viewer Email,Page Number,Created At,Metadata\n'
      data.events.forEach(event => {
        csv += `${event.type},${event.viewerEmail || ''},${event.pageNumber || ''},${event.createdAt},${JSON.stringify(event.metadata || {})}\n`
      })
      csv += '\n'
    }

    // Geographic data
    if (config.includeData.geographic && data.geographic) {
      csv += 'GEOGRAPHIC DATA\n'
      csv += 'Country,City,Views,Unique Viewers\n'
      data.geographic.forEach(geo => {
        csv += `${geo.country},${geo.city || ''},${geo.views},${geo.uniqueViewers}\n`
      })
      csv += '\n'
    }

    return csv
  }

  /**
   * Generate Excel export (returns base64 encoded data)
   */
  static async generateExcelExport(
    documentId: string,
    config: AdvancedExportConfig
  ): Promise<string> {
    // In a real implementation, this would use a library like ExcelJS
    // For now, return CSV data with Excel MIME type
    const csvData = await this.generateCSVExport(documentId, config)
    return btoa(csvData) // Base64 encode for download
  }

  /**
   * Generate PDF export
   */
  static async generatePDFExport(
    documentId: string,
    config: AdvancedExportConfig
  ): Promise<string> {
    const data = await this.fetchAnalyticsData(documentId, config)

    // Generate HTML for PDF conversion
    let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Analytics Report - ${data.document.title}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { text-align: center; margin-bottom: 30px; }
        .section { margin-bottom: 30px; }
        .metric { display: inline-block; margin: 10px; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .chart-placeholder { height: 200px; background: #f9f9f9; border: 1px solid #ddd; margin: 15px 0; display: flex; align-items: center; justify-content: center; }
      </style>
    </head>
    <body>
      <div class="header">
        ${config.branding?.logo ? `<img src="${config.branding.logo}" alt="Logo" style="max-height: 60px;">` : ''}
        <h1>${config.branding?.reportTitle || 'Analytics Report'}</h1>
        <h2>${data.document.title}</h2>
        <p>Generated on ${new Date().toLocaleDateString()}</p>
        <p>Period: ${config.dateRange.start} to ${config.dateRange.end}</p>
      </div>
    `

    // Summary metrics
    if (config.includeData.summary) {
      html += `
      <div class="section">
        <h3>Summary Metrics</h3>
        <div class="metric">
          <strong>Total Views</strong><br>
          ${data.summary.totalViews}
        </div>
        <div class="metric">
          <strong>Unique Viewers</strong><br>
          ${data.summary.uniqueViewers}
        </div>
        <div class="metric">
          <strong>Avg Duration</strong><br>
          ${Math.round(data.summary.avgDuration)}s
        </div>
        <div class="metric">
          <strong>Completion Rate</strong><br>
          ${data.summary.completionRate}%
        </div>
        <div class="metric">
          <strong>Engagement Score</strong><br>
          ${data.summary.engagementScore}/100
        </div>
      </div>
      `
    }

    // Charts placeholder
    if (config.includeCharts) {
      html += `
      <div class="section">
        <h3>Charts</h3>
        <div class="chart-placeholder">Views Over Time Chart</div>
        <div class="chart-placeholder">Page Performance Chart</div>
      </div>
      `
    }

    // Recent views table
    if (config.includeData.views && data.views) {
      html += `
      <div class="section">
        <h3>Recent Views</h3>
        <table>
          <thead>
            <tr>
              <th>Viewer</th>
              <th>Duration</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
      `
      data.views.slice(0, 20).forEach(view => {
        html += `
            <tr>
              <td>${view.viewerEmail || view.ipAddress}</td>
              <td>${view.duration}s</td>
              <td>${new Date(view.createdAt).toLocaleDateString()}</td>
            </tr>
        `
      })
      html += `
          </tbody>
        </table>
      </div>
      `
    }

    html += `
      ${config.branding?.footer ? `<div class="footer">${config.branding.footer}</div>` : ''}
    </body>
    </html>
    `

    return html
  }

  /**
   * Generate JSON export
   */
  static async generateJSONExport(
    documentId: string,
    config: AdvancedExportConfig
  ): Promise<string> {
    const data = await this.fetchAnalyticsData(documentId, config)

    const exportData = {
      metadata: {
        exportedAt: new Date().toISOString(),
        documentId,
        config,
        version: '1.0'
      },
      ...data
    }

    return JSON.stringify(exportData, null, 2)
  }

  /**
   * Fetch analytics data based on config
   */
  private static async fetchAnalyticsData(
    documentId: string,
    config: AdvancedExportConfig
  ): Promise<any> {
    const params = new URLSearchParams({
      start: config.dateRange.start,
      end: config.dateRange.end,
      includeViews: config.includeData.views.toString(),
      includePageViews: config.includeData.pageViews.toString(),
      includeEvents: config.includeData.events.toString(),
      includeSessions: config.includeData.sessions.toString(),
      includeGeographic: config.includeData.geographic.toString()
    })

    const response = await fetch(`/api/send/analytics/${documentId}/export?${params}`)
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch analytics data')
    }

    return data
  }

  /**
   * Create scheduled export
   */
  static async createScheduledExport(
    config: ScheduledExportConfig
  ): Promise<ScheduledExportConfig> {
    const response = await fetch('/api/send/analytics/export/schedule', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(config)
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to create scheduled export')
    }

    return data.schedule
  }

  /**
   * Get scheduled exports
   */
  static async getScheduledExports(documentId?: string): Promise<ScheduledExportConfig[]> {
    const params = documentId ? `?documentId=${documentId}` : ''
    const response = await fetch(`/api/send/analytics/export/schedules${params}`)
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to get scheduled exports')
    }

    return data.schedules
  }

  /**
   * Update scheduled export
   */
  static async updateScheduledExport(
    id: string,
    updates: Partial<ScheduledExportConfig>
  ): Promise<ScheduledExportConfig> {
    const response = await fetch(`/api/send/analytics/export/schedule/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to update scheduled export')
    }

    return data.schedule
  }

  /**
   * Delete scheduled export
   */
  static async deleteScheduledExport(id: string): Promise<void> {
    const response = await fetch(`/api/send/analytics/export/schedule/${id}`, {
      method: 'DELETE'
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'Failed to delete scheduled export')
    }
  }

  /**
   * Get export history
   */
  static async getExportHistory(documentId?: string): Promise<ExportJob[]> {
    const params = documentId ? `?documentId=${documentId}` : ''
    const response = await fetch(`/api/send/analytics/export/history${params}`)
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to get export history')
    }

    return data.exports
  }

  /**
   * Download export file
   */
  static async downloadExport(jobId: string): Promise<void> {
    const response = await fetch(`/api/send/analytics/export/download/${jobId}`)

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'Failed to download export')
    }

    // Trigger download
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `analytics-export-${jobId}.${this.getFileExtension(response.headers.get('content-type') || '')}`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  /**
   * Get file extension from content type
   */
  private static getFileExtension(contentType: string): string {
    const extensions: Record<string, string> = {
      'text/csv': 'csv',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
      'application/pdf': 'pdf',
      'application/json': 'json',
      'application/xml': 'xml'
    }
    return extensions[contentType] || 'txt'
  }

  /**
   * Get default export config
   */
  static getDefaultConfig(): AdvancedExportConfig {
    return {
      format: 'csv',
      dateRange: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0],
        preset: 'last_30_days'
      },
      includeData: {
        summary: true,
        views: true,
        pageViews: true,
        events: true,
        sessions: true,
        visitors: true,
        geographic: true,
        devices: true,
        referrers: false,
        ndaAcceptances: false,
        protectionEvents: false
      },
      filters: {},
      sortBy: 'date',
      sortOrder: 'desc',
      includeCharts: false,
      includeHeatmaps: false
    }
  }
}
