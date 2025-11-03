'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Download, FileText, Table, Loader2, Clock, CheckCircle, XCircle, History } from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'

interface AnalyticsExportButtonProps {
  documentId: string
  linkId?: string
  documentTitle?: string
}

interface ExportJob {
  id: string
  documentId: string
  format: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'scheduled'
  downloadUrl?: string
  fileSize?: number
  errorMessage?: string
  createdAt: string
  completedAt?: string
  scheduledFor?: string
}

export default function AnalyticsExportButton({
  documentId,
  linkId,
  documentTitle = 'Document'
}: AnalyticsExportButtonProps) {
  const [loading, setLoading] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [format, setFormat] = useState<'excel' | 'pdf' | 'csv'>('excel')
  const [includeVisitors, setIncludeVisitors] = useState(true)
  const [includeEvents, setIncludeEvents] = useState(true)
  const [includePageStats, setIncludePageStats] = useState(true)
  const [activeJobs, setActiveJobs] = useState<ExportJob[]>([])
  const [jobHistory, setJobHistory] = useState<ExportJob[]>([])
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null)


  // Fetch job history
  const fetchJobHistory = async () => {
    try {
      const response = await fetch(`/api/send/analytics/export/queue?documentId=${documentId}&limit=10`)
      const data = await response.json()

      if (data.success) {
        setJobHistory(data.jobs || [])

        // Filter active jobs (pending or processing)
        const active = data.jobs.filter((job: ExportJob) =>
          job.status === 'pending' || job.status === 'processing'
        )
        setActiveJobs(active)

        // Start polling if there are active jobs
        if (active.length > 0 && !pollingInterval) {
          startPolling()
        } else if (active.length === 0 && pollingInterval) {
          stopPolling()
        }
      }
    } catch (error) {
      console.error('Failed to fetch job history:', error)
    }
  }

  // Poll for job status
  const startPolling = () => {
    const interval = setInterval(fetchJobHistory, 3000) // Poll every 3 seconds
    setPollingInterval(interval)
  }

  const stopPolling = () => {
    if (pollingInterval) {
      clearInterval(pollingInterval)
      setPollingInterval(null)
    }
  }

  // Fetch history on mount
  useEffect(() => {
    fetchJobHistory()
    return () => stopPolling()
  }, [documentId])

  const handleExport = async (selectedFormat: 'excel' | 'pdf' | 'csv') => {
    try {
      setLoading(true)
      setFormat(selectedFormat)

      const response = await fetch('/api/send/analytics/export/queue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentId,
          linkId,
          format: selectedFormat,
          includeVisitors,
          includeEvents,
          includePageStats,
        }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Export failed')
      }

      toast.success('Export job queued successfully. You will be notified when it\'s ready.')
      setShowDialog(false)

      // Refresh job history
      await fetchJobHistory()
    } catch (error: any) {
      console.error('Export error:', error)
      toast.error(error.message || 'Failed to queue export. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleQuickExport = (selectedFormat: 'excel' | 'pdf' | 'csv') => {
    setFormat(selectedFormat)
    setShowDialog(true)
  }

  const handleDownload = async (job: ExportJob) => {
    if (job.downloadUrl) {
      window.open(job.downloadUrl, '_blank')
      toast.success('Download started')
    } else {
      toast.error('Download URL not available')
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-600"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>
      case 'processing':
        return <Badge className="bg-blue-600"><Loader2 className="w-3 h-3 mr-1 animate-spin" />Processing</Badge>
      case 'pending':
        return <Badge className="bg-yellow-600"><Clock className="w-3 h-3 mr-1" />Pending</Badge>
      case 'failed':
        return <Badge className="bg-red-600"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>
      case 'scheduled':
        return <Badge className="bg-purple-600"><Clock className="w-3 h-3 mr-1" />Scheduled</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  return (
    <>
      <div className="flex gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Queueing...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Export
                  {activeJobs.length > 0 && (
                    <Badge className="ml-2 bg-blue-600">{activeJobs.length}</Badge>
                  )}
                </>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Export Format</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleQuickExport('excel')}>
              <Table className="w-4 h-4 mr-2" />
              Export as Excel
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleQuickExport('csv')}>
              <Table className="w-4 h-4 mr-2" />
              Export as CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleQuickExport('pdf')}>
              <FileText className="w-4 h-4 mr-2" />
              Export as PDF
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setShowHistory(true)}>
              <History className="w-4 h-4 mr-2" />
              View Export History
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Export Options Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Analytics</DialogTitle>
            <DialogDescription>
              Choose what to include in your {format.toUpperCase()} export
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Summary Metrics</div>
                  <div className="text-sm text-gray-600">
                    Total views, engagement score, etc.
                  </div>
                </div>
                <div className="text-sm text-green-600 font-medium">Included</div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Page Statistics</div>
                  <div className="text-sm text-gray-600">
                    Views, time, and scroll depth per page
                  </div>
                </div>
                <div className="text-sm text-green-600 font-medium">Included</div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Visitor Data</div>
                  <div className="text-sm text-gray-600">
                    Top viewers and their activity
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeVisitors}
                    onChange={(e) => setIncludeVisitors(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Page Statistics</div>
                  <div className="text-sm text-gray-600">
                    Views, time, and scroll depth per page
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includePageStats}
                    onChange={(e) => setIncludePageStats(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Event History</div>
                  <div className="text-sm text-gray-600">
                    Downloads, prints, and other events
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeEvents}
                    onChange={(e) => setIncludeEvents(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                </label>
              </div>
            </div>

            {format === 'excel' && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="text-sm text-green-900">
                  <div className="font-medium mb-1">📊 Excel Export</div>
                  <div className="text-green-700">
                    Data will be organized in multiple sheets with formatting and charts.
                  </div>
                </div>
              </div>
            )}

            {format === 'pdf' && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="text-sm text-blue-900">
                  <div className="font-medium mb-1">📄 PDF Export</div>
                  <div className="text-blue-700">
                    Professional PDF report with summary, charts, and detailed analytics.
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => handleExport(format)} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Queueing...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Queue Export
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export History Dialog */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Export History</DialogTitle>
            <DialogDescription>
              View and download your recent analytics exports
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {jobHistory.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No export history yet</p>
              </div>
            ) : (
              jobHistory.map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{job.format.toUpperCase()} Export</span>
                      {getStatusBadge(job.status)}
                    </div>
                    <div className="text-sm text-gray-600">
                      {job.status === 'completed' && job.fileSize && (
                        <span className="mr-3">
                          Size: {(job.fileSize / 1024).toFixed(2)} KB
                        </span>
                      )}
                      {job.status === 'failed' && job.errorMessage && (
                        <span className="text-red-600 mr-3">
                          Error: {job.errorMessage}
                        </span>
                      )}
                      <span>
                        {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  <div>
                    {job.status === 'completed' && job.downloadUrl && (
                      <Button
                        size="sm"
                        onClick={() => handleDownload(job)}
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Download
                      </Button>
                    )}
                    {(job.status === 'pending' || job.status === 'processing') && (
                      <Button size="sm" variant="outline" disabled>
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        {job.status === 'processing' ? 'Processing' : 'Pending'}
                      </Button>
                    )}
                    {job.status === 'failed' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setFormat(job.format as any)
                          setShowHistory(false)
                          setShowDialog(true)
                        }}
                      >
                        Retry
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowHistory(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
