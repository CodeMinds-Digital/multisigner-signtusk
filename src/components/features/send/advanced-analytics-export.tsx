'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Download, 
  Calendar, 
  FileText, 
  Table, 
  FileSpreadsheet, 
  FileJson,
  Clock,
  Settings,
  Filter,
  BarChart3,
  Trash2,
  Play,
  Pause,
  RefreshCw
} from 'lucide-react'
import { 
  AdvancedAnalyticsExport, 
  AdvancedExportConfig, 
  ScheduledExportConfig,
  ExportJob 
} from '@/lib/advanced-analytics-export'
import { toast } from 'sonner'

interface AdvancedAnalyticsExportProps {
  documentId: string
  documentTitle: string
}

export function AdvancedAnalyticsExportComponent({ 
  documentId, 
  documentTitle 
}: AdvancedAnalyticsExportProps) {
  const [config, setConfig] = useState<AdvancedExportConfig>(
    AdvancedAnalyticsExport.getDefaultConfig()
  )
  const [loading, setLoading] = useState(false)
  const [exportJobs, setExportJobs] = useState<ExportJob[]>([])
  const [scheduledExports, setScheduledExports] = useState<ScheduledExportConfig[]>([])
  const [activeTab, setActiveTab] = useState('export')

  useEffect(() => {
    loadExportHistory()
    loadScheduledExports()
  }, [documentId])

  const loadExportHistory = async () => {
    try {
      const history = await AdvancedAnalyticsExport.getExportHistory(documentId)
      setExportJobs(history)
    } catch (error) {
      console.error('Failed to load export history:', error)
    }
  }

  const loadScheduledExports = async () => {
    try {
      const schedules = await AdvancedAnalyticsExport.getScheduledExports(documentId)
      setScheduledExports(schedules)
    } catch (error) {
      console.error('Failed to load scheduled exports:', error)
    }
  }

  const handleExport = async () => {
    try {
      setLoading(true)
      
      const job = await AdvancedAnalyticsExport.createExportJob(
        documentId,
        config,
        'current-user' // This would come from auth context
      )

      toast.success('Export started!', {
        description: 'Your export is being processed. You\'ll be notified when it\'s ready.'
      })

      // Poll for job completion
      pollJobStatus(job.id)
      
      await loadExportHistory()
    } catch (error: any) {
      toast.error('Export failed', {
        description: error.message
      })
    } finally {
      setLoading(false)
    }
  }

  const pollJobStatus = async (jobId: string) => {
    const poll = async () => {
      const job = await AdvancedAnalyticsExport.getExportJobStatus(jobId)
      if (!job) return

      if (job.status === 'completed') {
        toast.success('Export completed!', {
          description: 'Your export is ready for download.',
          action: {
            label: 'Download',
            onClick: () => AdvancedAnalyticsExport.downloadExport(jobId)
          }
        })
        await loadExportHistory()
      } else if (job.status === 'failed') {
        toast.error('Export failed', {
          description: job.error || 'Unknown error occurred'
        })
        await loadExportHistory()
      } else {
        // Continue polling
        setTimeout(poll, 2000)
      }
    }

    poll()
  }

  const updateConfig = (updates: Partial<AdvancedExportConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }))
  }

  const updateDateRange = (preset: string) => {
    const now = new Date()
    let start: Date

    switch (preset) {
      case 'last_7_days':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'last_30_days':
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case 'last_90_days':
        start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      default:
        return
    }

    updateConfig({
      dateRange: {
        start: start.toISOString().split('T')[0],
        end: now.toISOString().split('T')[0],
        preset: preset as any
      }
    })
  }

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'csv': return <Table className="w-4 h-4" />
      case 'excel': return <FileSpreadsheet className="w-4 h-4" />
      case 'pdf': return <FileText className="w-4 h-4" />
      case 'json': return <FileJson className="w-4 h-4" />
      default: return <Download className="w-4 h-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500'
      case 'failed': return 'bg-red-500'
      case 'processing': return 'bg-blue-500'
      default: return 'bg-gray-500'
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Advanced Analytics Export
          </CardTitle>
          <CardDescription>
            Export detailed analytics data with advanced filtering and scheduling options
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="export">Export</TabsTrigger>
              <TabsTrigger value="schedule">Schedule</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>

            {/* Export Tab */}
            <TabsContent value="export" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Format & Date Range */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Export Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Format</Label>
                      <Select
                        value={config.format}
                        onValueChange={(value: any) => updateConfig({ format: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="csv">
                            <div className="flex items-center gap-2">
                              <Table className="w-4 h-4" />
                              CSV
                            </div>
                          </SelectItem>
                          <SelectItem value="excel">
                            <div className="flex items-center gap-2">
                              <FileSpreadsheet className="w-4 h-4" />
                              Excel
                            </div>
                          </SelectItem>
                          <SelectItem value="pdf">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4" />
                              PDF Report
                            </div>
                          </SelectItem>
                          <SelectItem value="json">
                            <div className="flex items-center gap-2">
                              <FileJson className="w-4 h-4" />
                              JSON
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Date Range</Label>
                      <Select
                        value={config.dateRange.preset || 'custom'}
                        onValueChange={updateDateRange}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="last_7_days">Last 7 days</SelectItem>
                          <SelectItem value="last_30_days">Last 30 days</SelectItem>
                          <SelectItem value="last_90_days">Last 90 days</SelectItem>
                          <SelectItem value="all_time">All time</SelectItem>
                          <SelectItem value="custom">Custom range</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {config.dateRange.preset === 'custom' && (
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Start Date</Label>
                          <Input
                            type="date"
                            value={config.dateRange.start}
                            onChange={(e) => updateConfig({
                              dateRange: { ...config.dateRange, start: e.target.value }
                            })}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">End Date</Label>
                          <Input
                            type="date"
                            value={config.dateRange.end}
                            onChange={(e) => updateConfig({
                              dateRange: { ...config.dateRange, end: e.target.value }
                            })}
                          />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Data Selection */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Include Data</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {Object.entries(config.includeData).map(([key, value]) => (
                      <div key={key} className="flex items-center space-x-2">
                        <Checkbox
                          id={key}
                          checked={value}
                          onCheckedChange={(checked) => 
                            updateConfig({
                              includeData: { ...config.includeData, [key]: !!checked }
                            })
                          }
                        />
                        <Label htmlFor={key} className="text-sm capitalize">
                          {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                        </Label>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              {/* Export Button */}
              <div className="flex justify-end">
                <Button
                  onClick={handleExport}
                  disabled={loading}
                  size="lg"
                  className="min-w-32"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      {getFormatIcon(config.format)}
                      <span className="ml-2">Export {config.format.toUpperCase()}</span>
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>

            {/* Schedule Tab */}
            <TabsContent value="schedule" className="space-y-4">
              <div className="text-center py-8 text-gray-500">
                <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Scheduled exports coming soon!</p>
                <p className="text-sm">Set up automatic exports to be delivered to your email.</p>
              </div>
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Export History</h3>
                <Button variant="outline" size="sm" onClick={loadExportHistory}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </div>

              <div className="space-y-3">
                {exportJobs.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Download className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No exports yet</p>
                    <p className="text-sm">Your export history will appear here.</p>
                  </div>
                ) : (
                  exportJobs.map((job) => (
                    <Card key={job.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {getFormatIcon(job.config.format)}
                            <div>
                              <p className="font-medium">
                                {job.config.format.toUpperCase()} Export
                              </p>
                              <p className="text-sm text-gray-500">
                                {new Date(job.createdAt).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <Badge 
                              variant="secondary" 
                              className={`${getStatusColor(job.status)} text-white`}
                            >
                              {job.status}
                            </Badge>
                            
                            {job.status === 'processing' && (
                              <Progress value={job.progress} className="w-20" />
                            )}
                            
                            {job.status === 'completed' && job.downloadUrl && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => AdvancedAnalyticsExport.downloadExport(job.id)}
                              >
                                <Download className="w-4 h-4 mr-1" />
                                Download
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
