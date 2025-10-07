'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Download, FileText, Table, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface AnalyticsExportButtonProps {
  documentId: string
  linkId?: string
  documentTitle?: string
}

export default function AnalyticsExportButton({
  documentId,
  linkId,
  documentTitle = 'Document'
}: AnalyticsExportButtonProps) {
  const [loading, setLoading] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const [format, setFormat] = useState<'csv' | 'pdf'>('csv')
  const [includeVisitors, setIncludeVisitors] = useState(true)
  const [includeEvents, setIncludeEvents] = useState(true)


  const handleExport = async (selectedFormat: 'csv' | 'pdf') => {
    try {
      setLoading(true)
      setFormat(selectedFormat)

      const response = await fetch('/api/send/analytics/export', {
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
        }),
      })

      if (!response.ok) {
        throw new Error('Export failed')
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition')
      let filename = `analytics-${documentTitle.replace(/[^a-z0-9]/gi, '-')}-${Date.now()}.${selectedFormat}`

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/)
        if (filenameMatch) {
          filename = filenameMatch[1]
        }
      }

      // Download file
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success(`Analytics exported as ${selectedFormat.toUpperCase()}`)
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Failed to export analytics. Please try again.')
    } finally {
      setLoading(false)
      setShowDialog(false)
    }
  }

  const handleQuickExport = (selectedFormat: 'csv' | 'pdf') => {
    setFormat(selectedFormat)
    setShowDialog(true)
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Export
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Export Format</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => handleQuickExport('csv')}>
            <Table className="w-4 h-4 mr-2" />
            Export as CSV
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleQuickExport('pdf')}>
            <FileText className="w-4 h-4 mr-2" />
            Export as HTML/PDF
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

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

            {format === 'pdf' && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="text-sm text-blue-900">
                  <div className="font-medium mb-1">📄 Note</div>
                  <div className="text-blue-700">
                    PDF export will generate an HTML report. You can print it to PDF using your browser's print function.
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
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Export {format.toUpperCase()}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

