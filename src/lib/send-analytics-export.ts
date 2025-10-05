/**
 * Send Analytics Export Service
 * Generate PDF/CSV reports for analytics data
 */

export interface ExportOptions {
  documentId: string
  linkId?: string
  format: 'pdf' | 'csv'
  dateRange?: {
    start: Date
    end: Date
  }
  includeCharts?: boolean
  includeVisitors?: boolean
  includeEvents?: boolean
}

export interface AnalyticsData {
  document: {
    id: string
    title: string
    totalPages: number
  }
  summary: {
    totalViews: number
    uniqueViewers: number
    avgDuration: number
    avgScrollDepth: number
    completionRate: number
    engagementScore: number
    downloads: number
    prints: number
  }
  pageStats: Array<{
    page: number
    views: number
    avgTime: number
    avgScroll: number
  }>
  topViewers: Array<{
    fingerprint: string
    email?: string
    visits: number
    duration: number
  }>
  events: Array<{
    type: string
    timestamp: string
    page?: number
  }>
}

export class SendAnalyticsExport {
  /**
   * Generate CSV export
   */
  static async generateCSV(data: AnalyticsData, options: ExportOptions): Promise<string> {
    const lines: string[] = []

    // Header
    lines.push('# Analytics Report')
    lines.push(`# Document: ${data.document.title}`)
    lines.push(`# Generated: ${new Date().toISOString()}`)
    lines.push('')

    // Summary
    lines.push('## Summary')
    lines.push('Metric,Value')
    lines.push(`Total Views,${data.summary.totalViews}`)
    lines.push(`Unique Viewers,${data.summary.uniqueViewers}`)
    lines.push(`Avg Duration (seconds),${data.summary.avgDuration}`)
    lines.push(`Avg Scroll Depth (%),${data.summary.avgScrollDepth}`)
    lines.push(`Completion Rate (%),${data.summary.completionRate}`)
    lines.push(`Engagement Score,${data.summary.engagementScore}`)
    lines.push(`Downloads,${data.summary.downloads}`)
    lines.push(`Prints,${data.summary.prints}`)
    lines.push('')

    // Page Stats
    lines.push('## Page Statistics')
    lines.push('Page,Views,Avg Time (s),Avg Scroll (%)')
    data.pageStats.forEach(page => {
      lines.push(`${page.page},${page.views},${page.avgTime},${page.avgScroll}`)
    })
    lines.push('')

    // Top Viewers
    if (options.includeVisitors && data.topViewers.length > 0) {
      lines.push('## Top Viewers')
      lines.push('Fingerprint,Email,Visits,Duration (s)')
      data.topViewers.forEach(viewer => {
        lines.push(`${viewer.fingerprint},${viewer.email || 'N/A'},${viewer.visits},${viewer.duration}`)
      })
      lines.push('')
    }

    // Events
    if (options.includeEvents && data.events.length > 0) {
      lines.push('## Events')
      lines.push('Type,Timestamp,Page')
      data.events.forEach(event => {
        lines.push(`${event.type},${event.timestamp},${event.page || 'N/A'}`)
      })
      lines.push('')
    }

    return lines.join('\n')
  }

  /**
   * Generate PDF export (placeholder - requires PDF library)
   */
  static async generatePDF(data: AnalyticsData, options: ExportOptions): Promise<Blob> {
    // TODO: Implement PDF generation using a library like jsPDF or Puppeteer
    // For now, return a placeholder
    
    const html = this.generateHTMLReport(data, options)
    
    // In production, you would:
    // 1. Use Puppeteer to render HTML to PDF
    // 2. Or use jsPDF to generate PDF programmatically
    // 3. Or use a service like PDFShift, DocRaptor, etc.
    
    const blob = new Blob([html], { type: 'text/html' })
    return blob
  }

  /**
   * Generate HTML report
   */
  static generateHTMLReport(data: AnalyticsData, options: ExportOptions): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Analytics Report - ${data.document.title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 1200px;
      margin: 0 auto;
      padding: 40px 20px;
      color: #1f2937;
    }
    h1 {
      color: #059669;
      border-bottom: 3px solid #059669;
      padding-bottom: 10px;
    }
    h2 {
      color: #047857;
      margin-top: 40px;
      border-bottom: 2px solid #d1fae5;
      padding-bottom: 8px;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin: 30px 0;
    }
    .summary-card {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 8px;
      padding: 20px;
    }
    .summary-card .label {
      font-size: 14px;
      color: #047857;
      font-weight: 500;
    }
    .summary-card .value {
      font-size: 32px;
      font-weight: bold;
      color: #059669;
      margin-top: 8px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th {
      background: #059669;
      color: white;
      padding: 12px;
      text-align: left;
      font-weight: 600;
    }
    td {
      padding: 12px;
      border-bottom: 1px solid #e5e7eb;
    }
    tr:hover {
      background: #f9fafb;
    }
    .footer {
      margin-top: 60px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      color: #6b7280;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <h1>📊 Analytics Report</h1>
  <p><strong>Document:</strong> ${data.document.title}</p>
  <p><strong>Total Pages:</strong> ${data.document.totalPages}</p>
  <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>

  <h2>Summary</h2>
  <div class="summary-grid">
    <div class="summary-card">
      <div class="label">Total Views</div>
      <div class="value">${data.summary.totalViews}</div>
    </div>
    <div class="summary-card">
      <div class="label">Unique Viewers</div>
      <div class="value">${data.summary.uniqueViewers}</div>
    </div>
    <div class="summary-card">
      <div class="label">Avg Duration</div>
      <div class="value">${Math.round(data.summary.avgDuration)}s</div>
    </div>
    <div class="summary-card">
      <div class="label">Engagement Score</div>
      <div class="value">${Math.round(data.summary.engagementScore)}</div>
    </div>
    <div class="summary-card">
      <div class="label">Completion Rate</div>
      <div class="value">${Math.round(data.summary.completionRate)}%</div>
    </div>
    <div class="summary-card">
      <div class="label">Avg Scroll Depth</div>
      <div class="value">${Math.round(data.summary.avgScrollDepth)}%</div>
    </div>
    <div class="summary-card">
      <div class="label">Downloads</div>
      <div class="value">${data.summary.downloads}</div>
    </div>
    <div class="summary-card">
      <div class="label">Prints</div>
      <div class="value">${data.summary.prints}</div>
    </div>
  </div>

  <h2>Page Statistics</h2>
  <table>
    <thead>
      <tr>
        <th>Page</th>
        <th>Views</th>
        <th>Avg Time (s)</th>
        <th>Avg Scroll (%)</th>
      </tr>
    </thead>
    <tbody>
      ${data.pageStats.map(page => `
        <tr>
          <td>${page.page}</td>
          <td>${page.views}</td>
          <td>${Math.round(page.avgTime)}</td>
          <td>${Math.round(page.avgScroll)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  ${options.includeVisitors && data.topViewers.length > 0 ? `
    <h2>Top Viewers</h2>
    <table>
      <thead>
        <tr>
          <th>Fingerprint</th>
          <th>Email</th>
          <th>Visits</th>
          <th>Duration (s)</th>
        </tr>
      </thead>
      <tbody>
        ${data.topViewers.map(viewer => `
          <tr>
            <td>${viewer.fingerprint.substring(0, 16)}...</td>
            <td>${viewer.email || 'N/A'}</td>
            <td>${viewer.visits}</td>
            <td>${Math.round(viewer.duration)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  ` : ''}

  ${options.includeEvents && data.events.length > 0 ? `
    <h2>Recent Events</h2>
    <table>
      <thead>
        <tr>
          <th>Type</th>
          <th>Timestamp</th>
          <th>Page</th>
        </tr>
      </thead>
      <tbody>
        ${data.events.slice(0, 50).map(event => `
          <tr>
            <td>${event.type}</td>
            <td>${new Date(event.timestamp).toLocaleString()}</td>
            <td>${event.page || 'N/A'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  ` : ''}

  <div class="footer">
    <p>Generated by SendTusk Analytics</p>
    <p>${new Date().toLocaleString()}</p>
  </div>
</body>
</html>
    `.trim()
  }

  /**
   * Download file helper
   */
  static downloadFile(content: string | Blob, filename: string, mimeType: string) {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }
}

