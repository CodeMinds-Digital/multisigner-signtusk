'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  RefreshCw, AlertTriangle, CheckCircle, Clock, XCircle,
  Users, FileText, Mail, Settings, Eye, RotateCcw,
  Calendar, Download, Search, Filter, MoreHorizontal
} from 'lucide-react'
import {
  AdminMultiSignatureRequest,
  MultiSignatureStats
} from '@/lib/admin-multi-signature-service'

export function MultiSignatureManagement() {
  const [requests, setRequests] = useState<AdminMultiSignatureRequest[]>([])
  const [stats, setStats] = useState<MultiSignatureStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [modeFilter, setModeFilter] = useState<string>('all')
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null)

  useEffect(() => {
    loadMultiSignatureRequests()
  }, [])

  const loadMultiSignatureRequests = async () => {
    setLoading(true)
    try {
      console.log('🔄 Loading multi-signature requests from API...')

      // Load data from API endpoint instead of direct database access
      const response = await fetch('/api/admin/multi-signature-requests?includeStats=true')
      const data = await response.json()

      if (data.success) {
        setRequests(data.requests || [])
        setStats(data.stats || {
          total: 0,
          inProgress: 0,
          completed: 0,
          failed: 0,
          sequential: 0,
          parallel: 0
        })
        console.log(`✅ Loaded ${data.requests?.length || 0} requests and stats:`, data.stats)
      } else {
        throw new Error(data.error || 'Failed to load data')
      }
    } catch (error) {
      console.error('❌ Error loading multi-signature requests:', error)
      setRequests([])
      setStats({
        inProgress: 0,
        needAttention: 0,
        completed: 0,
        total: 0,
        todayCreated: 0,
        todayCompleted: 0
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'in_progress': return 'bg-blue-100 text-blue-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'declined': return 'bg-red-100 text-red-800'
      case 'expired': return 'bg-gray-100 text-gray-800'
      case 'pdf_generation_failed': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />
      case 'in_progress': return <Clock className="w-4 h-4" />
      case 'pending': return <Clock className="w-4 h-4" />
      case 'declined': return <XCircle className="w-4 h-4" />
      case 'expired': return <AlertTriangle className="w-4 h-4" />
      case 'pdf_generation_failed': return <AlertTriangle className="w-4 h-4" />
      default: return <Clock className="w-4 h-4" />
    }
  }

  const handleRetryPDF = async (requestId: string) => {
    try {
      console.log('Retrying PDF generation for:', requestId)
      // Call retry PDF API
      const response = await fetch('/api/admin/retry-pdf-generation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId })
      })

      if (response.ok) {
        await loadMultiSignatureRequests()
      }
    } catch (error) {
      console.error('Error retrying PDF generation:', error)
    }
  }

  const handleResetSigner = async (requestId: string, signerEmail: string) => {
    try {
      console.log('Resetting signer:', signerEmail, 'for request:', requestId)
      // Call reset signer API
      const response = await fetch('/api/admin/reset-signer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, signerEmail })
      })

      if (response.ok) {
        await loadMultiSignatureRequests()
      }
    } catch (error) {
      console.error('Error resetting signer:', error)
    }
  }

  const handleExtendDeadline = async (requestId: string, newDate: string) => {
    try {
      console.log('Extending deadline for:', requestId, 'to:', newDate)
      // Call extend deadline API
      const response = await fetch('/api/admin/extend-deadline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, newExpirationDate: newDate })
      })

      if (response.ok) {
        await loadMultiSignatureRequests()
      }
    } catch (error) {
      console.error('Error extending deadline:', error)
    }
  }

  const filteredRequests = requests.filter(request => {
    const matchesSearch = !searchTerm ||
      request.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.initiatedBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.signers.some(s =>
        s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter
    const matchesMode = modeFilter === 'all' || request.signingMode === modeFilter

    return matchesSearch && matchesStatus && matchesMode
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Multi-Signature Workflow Management</h2>
          <p className="text-gray-600">Monitor and manage multi-signature document workflows</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={loadMultiSignatureRequests} disabled={loading} size="sm">
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="w-5 h-5 mr-2" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search by title or requester..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="declined">Declined</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="pdf_generation_failed">PDF Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Signing Mode</label>
              <Select value={modeFilter} onValueChange={setModeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All modes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Modes</SelectItem>
                  <SelectItem value="sequential">Sequential</SelectItem>
                  <SelectItem value="parallel">Parallel</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button variant="outline" className="w-full">
                <Eye className="w-4 h-4 mr-2" />
                View Analytics
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="w-8 h-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">In Progress</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.inProgress || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertTriangle className="w-8 h-8 text-orange-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Need Attention</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.needAttention || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="w-8 h-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.completed || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-purple-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Requests</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.total || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Requests List */}
      <Card>
        <CardHeader>
          <CardTitle>Multi-Signature Requests</CardTitle>
          <CardDescription>
            {filteredRequests.length} of {requests.length} requests shown
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-600">Loading requests...</span>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRequests.map(request => (
                <div
                  key={request.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="font-semibold text-gray-900">{request.title}</h3>
                        <Badge className={getStatusColor(request.status)}>
                          {getStatusIcon(request.status)}
                          <span className="ml-1">{request.status.replace('_', ' ')}</span>
                        </Badge>
                        <Badge variant="outline">
                          {request.signingMode}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Progress:</span> {request.signedCount}/{request.totalSigners} signed
                        </div>
                        <div>
                          <span className="font-medium">Viewed:</span> {request.viewedCount}/{request.totalSigners} viewed
                        </div>
                        <div>
                          <span className="font-medium">Expires:</span> {new Date(request.expiresAt).toLocaleDateString()}
                        </div>
                      </div>

                      {request.nextSignerEmail && (
                        <div className="mt-2 text-sm">
                          <span className="font-medium text-blue-600">Next signer:</span> {request.nextSignerEmail}
                        </div>
                      )}

                      {request.errorMessage && (
                        <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                          <AlertTriangle className="w-4 h-4 inline mr-1" />
                          {request.errorMessage}
                        </div>
                      )}
                    </div>

                    <div className="flex space-x-2 ml-4">
                      {request.status === 'pdf_generation_failed' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRetryPDF(request.id)}
                        >
                          <RotateCcw className="w-4 h-4 mr-1" />
                          Retry PDF
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedRequest(selectedRequest === request.id ? null : request.id)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        {selectedRequest === request.id ? 'Hide' : 'Details'}
                      </Button>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {selectedRequest === request.id && (
                    <div className="mt-4 pt-4 border-t">
                      <h4 className="font-medium mb-3">Signer Details</h4>
                      <div className="space-y-2">
                        {request.signers.map((signer, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium">
                                {signer.order}
                              </div>
                              <div>
                                <div className="font-medium">{signer.name}</div>
                                <div className="text-sm text-gray-600">{signer.email}</div>
                              </div>
                              <Badge className={getStatusColor(signer.status)}>
                                {signer.status}
                              </Badge>
                            </div>

                            <div className="flex items-center space-x-2">
                              {signer.signedAt && (
                                <span className="text-xs text-gray-500">
                                  Signed: {new Date(signer.signedAt).toLocaleString()}
                                </span>
                              )}
                              {signer.status !== 'signed' && signer.status !== 'declined' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleResetSigner(request.id, signer.email)}
                                >
                                  <RotateCcw className="w-4 h-4 mr-1" />
                                  Reset
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const newDate = prompt('Enter new expiration date (YYYY-MM-DD):')
                            if (newDate) handleExtendDeadline(request.id, newDate)
                          }}
                        >
                          <Calendar className="w-4 h-4 mr-1" />
                          Extend Deadline
                        </Button>
                        <Button size="sm" variant="outline">
                          <Mail className="w-4 h-4 mr-1" />
                          Send Reminder
                        </Button>
                        <Button size="sm" variant="outline">
                          <FileText className="w-4 h-4 mr-1" />
                          View Document
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
