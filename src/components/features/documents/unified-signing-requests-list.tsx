'use client'

import { useState, useEffect, useCallback } from 'react'
import { File, Clock, CheckCircle, AlertTriangle, MoreHorizontal, Eye, Download, Trash2, Share2, Users, Calendar, Send, Inbox, Filter, Timer, Info } from 'lucide-react'
import { useAuth } from '@/components/providers/secure-auth-provider'
import { type SigningRequestListItem } from '@/lib/signing-workflow-service'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/ui/loading'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorAlert } from '@/components/ui/alert'
import { RequestDetailsModal } from './request-details-modal'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'

interface UnifiedSigningRequestsListProps {
    onRefresh?: () => void
}

type TimeRange = '7d' | '30d' | '6m' | '1y'

interface UnifiedSigningRequest extends SigningRequestListItem {
    type: 'sent' | 'received'
    sender_name?: string
    user_status?: string
    document_status?: string
    can_sign?: boolean
    decline_reason?: string
    document_url?: string
    document_id?: string
    final_pdf_url?: string
    context_display?: string
}

interface RequestStats {
    total: number
    sent: number
    received: number
}

export function UnifiedSigningRequestsList({ onRefresh }: UnifiedSigningRequestsListProps) {
    const [requests, setRequests] = useState<UnifiedSigningRequest[]>([])
    const [stats, setStats] = useState<RequestStats>({ total: 0, sent: 0, received: 0 })
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [timeRange, setTimeRange] = useState<TimeRange>('30d')
    const [viewingRequest, setViewingRequest] = useState<UnifiedSigningRequest | null>(null)
    const { user } = useAuth()

    const getDateFilter = (range: TimeRange): Date => {
        const now = new Date()
        switch (range) {
            case '7d':
                return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
            case '30d':
                return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
            case '6m':
                return new Date(now.getTime() - 6 * 30 * 24 * 60 * 60 * 1000)
            case '1y':
                return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
            default:
                return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        }
    }

    const loadAllRequests = useCallback(async () => {
        if (!user?.id || !user?.email) return

        setLoading(true)
        setError('')

        try {
            const dateFilter = getDateFilter(timeRange)

            // Fetch all requests using the new API endpoint
            const response = await fetch('/api/signature-requests')

            if (!response.ok) {
                throw new Error('Failed to fetch signing requests')
            }

            const result = await response.json()

            if (!result.success) {
                throw new Error(result.error || 'Failed to fetch signing requests')
            }

            const allRequests = result.data || []

            // Filter by date range and categorize requests
            const filteredRequests = allRequests
                .filter((req: any) => new Date(req.initiated_at) >= dateFilter)
                .map((req: any) => {
                    // Determine if this is a sent or received request
                    const isSent = !req.initiated_by_name // Sent requests don't have initiated_by_name

                    return {
                        ...req,
                        type: isSent ? 'sent' as const : 'received' as const,
                        sender_name: req.initiated_by_name,
                        user_status: isSent ? undefined : req.status
                    }
                })
                .sort((a, b) => new Date(b.initiated_at).getTime() - new Date(a.initiated_at).getTime())

            const sentCount = filteredRequests.filter(req => req.type === 'sent').length
            const receivedCount = filteredRequests.filter(req => req.type === 'received').length

            setRequests(filteredRequests)
            setStats({
                total: filteredRequests.length,
                sent: sentCount,
                received: receivedCount
            })
        } catch (err) {
            console.error('Unexpected error loading signing requests:', err)
            setError('Failed to load signing requests')
        } finally {
            setLoading(false)
        }
    }, [user, timeRange])

    useEffect(() => {
        loadAllRequests()
    }, [loadAllRequests])

    const getStatusBadge = (request: UnifiedSigningRequest) => {
        const status = request.type === 'received' ? request.user_status || request.status : request.status

        // Debug: Log the actual status to understand the mapping issue
        console.log('Status for request:', request.title, 'is:', status, 'type:', request.type)

        const statusConfig = {
            pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
            viewed: { label: 'Viewed', color: 'bg-blue-100 text-blue-800' },
            signed: { label: 'Signed', color: 'bg-green-100 text-green-800' },
            declined: { label: 'Declined', color: 'bg-red-100 text-red-800' },
            initiated: { label: 'Initiated', color: 'bg-blue-100 text-blue-800' },
            'Initiated': { label: 'Initiated', color: 'bg-blue-100 text-blue-800' }, // Handle capitalized version
            in_progress: { label: 'In Progress', color: 'bg-yellow-100 text-yellow-800' },
            'In Progress': { label: 'In Progress', color: 'bg-blue-100 text-blue-800' },
            completed: { label: 'Completed', color: 'bg-green-100 text-green-800' },
            'Completed': { label: 'Completed', color: 'bg-green-100 text-green-800' },
            expired: { label: 'Expired', color: 'bg-gray-100 text-gray-800' },
            cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800' }
        }

        const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending

        return (
            <div className="flex flex-col">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
                    {config.label}
                </span>
                {request.decline_reason && (
                    <span className="text-xs text-red-600 mt-1" title={request.decline_reason}>
                        Reason: {request.decline_reason.length > 30
                            ? `${request.decline_reason.substring(0, 30)}...`
                            : request.decline_reason}
                    </span>
                )}
            </div>
        )
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        })
    }

    const getTimeRemaining = (expiresAt?: string) => {
        if (!expiresAt) return 'No expiry'

        const now = new Date()
        const expiry = new Date(expiresAt)
        const diffTime = expiry.getTime() - now.getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        // Format the full date and time
        const fullDateTime = expiry.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        }) + ' · ' + expiry.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        })

        if (diffDays < 0) return `Expired (${fullDateTime})`
        if (diffDays === 0) return `Expires Today (${fullDateTime})`
        if (diffDays === 1) return `Expires Tomorrow (${fullDateTime})`
        return `Expires ${fullDateTime}`
    }

    const handleViewDetails = (request: UnifiedSigningRequest) => {
        console.log('ℹ️ Info icon clicked! View request details:', request.title, 'Status:', request.status)
        console.log('📊 Request progress:', request.progress)
        console.log('👥 Request signers:', request.signers)
        setViewingRequest(request)
        console.log('✅ ViewingRequest state set, modal should open')
    }

    const handlePreviewPDF = async (request: UnifiedSigningRequest) => {
        try {
            console.log('👁️ Eye icon clicked! Preview PDF:', request.title)

            if (!request.document_url) {
                alert('Document URL not available')
                return
            }

            console.log('🔗 Opening document with URL:', request.document_url)

            let documentUrl = request.document_url

            // If it's already a full URL, use it directly
            if (documentUrl.startsWith('http')) {
                console.log('✅ Using direct URL:', documentUrl)
                window.open(documentUrl, '_blank')
                return
            }

            // For storage paths, try multiple buckets (documents, files, uploads)
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gzxfsojbbfipzvjxucci.supabase.co'
            const buckets = ['documents', 'files', 'uploads']

            // Try each bucket until we find the file
            for (const bucket of buckets) {
                const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${documentUrl}`
                console.log(`🔗 Trying ${bucket} bucket:`, publicUrl)

                try {
                    // Test if the URL is accessible
                    const response = await fetch(publicUrl, { method: 'HEAD' })
                    if (response.ok) {
                        console.log(`✅ Found document in ${bucket} bucket`)
                        window.open(publicUrl, '_blank')
                        return
                    }
                } catch (error) {
                    console.log(`❌ ${bucket} bucket failed:`, error)
                    continue
                }
            }

            // If direct access fails, try API fallback
            try {
                console.log('🔄 Trying API fallback...')
                const response = await fetch('/api/drive/document-url', {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ pdfUrl: documentUrl })
                })

                if (response.ok) {
                    const data = await response.json()
                    if (data.success && data.data?.url) {
                        console.log('✅ API resolved URL:', data.data.url)
                        window.open(data.data.url, '_blank')
                        return
                    }
                }
            } catch (apiError) {
                console.log('❌ API fallback failed:', apiError)
            }

            // If all approaches fail, show helpful error
            alert('Document is not currently accessible. This may be because:\n\n• The document is still being processed\n• Storage permissions need to be configured\n• The document was not properly uploaded\n\nPlease contact support if this issue persists.')

        } catch (error) {
            console.error('❌ Error opening document:', error)
            alert(`Error opening document: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }

    const handleSign = (request: UnifiedSigningRequest) => {
        console.log('🖊️ Sign document clicked:', request.title)
        // Open the request details modal which will show the Sign Document button
        setViewingRequest(request)
    }

    const handleSendReminder = (request: UnifiedSigningRequest) => {
        console.log('Send reminder for request:', request)
        // TODO: Implement reminder functionality
    }

    const handleDelete = (request: UnifiedSigningRequest) => {
        if (confirm('Are you sure you want to delete this request?')) {
            console.log('Delete request:', request)
            // TODO: Implement delete functionality
        }
    }

    const isDocumentCompleted = (request: UnifiedSigningRequest) => {
        return request.status === 'completed' || request.document_status === 'completed'
    }

    const canSendReminderSimple = (request: UnifiedSigningRequest) => {
        // Simple 24-hour check
        const lastUpdate = new Date(request.initiated_at)
        const now = new Date()
        const hoursSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60)

        const allowed = hoursSinceUpdate >= 24
        const hoursRemaining = Math.max(0, 24 - hoursSinceUpdate)

        return {
            allowed,
            message: allowed ? 'Can send reminder' : 'Must wait 24 hours between reminders',
            timeRemaining: allowed ? null : `${Math.floor(hoursRemaining)}h ${Math.floor((hoursRemaining % 1) * 60)}m remaining`
        }
    }

    const getTimeRangeLabel = (range: TimeRange) => {
        switch (range) {
            case '7d': return 'Last 7 days'
            case '30d': return 'Last 30 days'
            case '6m': return 'Last 6 months'
            case '1y': return 'Last 1 year'
            default: return 'Last 30 days'
        }
    }

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => (
                        <Card key={i}>
                            <CardContent className="p-6">
                                <div className="animate-pulse">
                                    <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                                    <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
                <Card>
                    <CardContent className="flex items-center justify-center py-8">
                        <LoadingSpinner size="lg" />
                        <span className="ml-3 text-gray-600">Loading requests...</span>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Time Range Selector */}
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-gray-500" />
                    <Select value={timeRange} onValueChange={(value: TimeRange) => setTimeRange(value)}>
                        <SelectTrigger className="w-40">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="7d">Last 7 days</SelectItem>
                            <SelectItem value="30d">Last 30 days</SelectItem>
                            <SelectItem value="6m">Last 6 months</SelectItem>
                            <SelectItem value="1y">Last 1 year</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <span className="text-sm text-gray-500">
                    Showing data for {getTimeRangeLabel(timeRange).toLowerCase()}
                </span>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Total Requests</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                            </div>
                            <div className="p-3 bg-blue-100 rounded-full">
                                <File className="w-6 h-6 text-blue-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Signing Requests</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.sent}</p>
                            </div>
                            <div className="p-3 bg-green-100 rounded-full">
                                <Send className="w-6 h-6 text-green-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Received Requests</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.received}</p>
                            </div>
                            <div className="p-3 bg-purple-100 rounded-full">
                                <Inbox className="w-6 h-6 text-purple-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Requests List */}
            <Card>
                <CardHeader>
                    <CardTitle>All Signature Requests</CardTitle>
                    <CardDescription>
                        Combined view of requests you've sent and received
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {error && (
                        <div className="mb-4">
                            <ErrorAlert
                                error={error}
                                onRetry={() => loadAllRequests()}
                                onClose={() => setError('')}
                            />
                        </div>
                    )}

                    {requests.length === 0 ? (
                        <EmptyState
                            icon={File}
                            title="No signature requests found"
                            description={`No requests found for ${getTimeRangeLabel(timeRange).toLowerCase()}`}
                        />
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Document Title</TableHead>
                                    <TableHead>Category/Type</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>From/To</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Expires</TableHead>
                                    <TableHead className="w-[100px]">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {requests.map((request) => (
                                    <TableRow key={`${request.type}-${request.id}`}>
                                        <TableCell>
                                            <div className="flex items-center space-x-2">
                                                {request.type === 'sent' ? (
                                                    <Send className="w-4 h-4 text-green-600" />
                                                ) : (
                                                    <Inbox className="w-4 h-4 text-purple-600" />
                                                )}
                                                <span className="text-sm font-medium capitalize">
                                                    {request.type}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center space-x-2">
                                                <File className="w-4 h-4 text-gray-400" />
                                                <span className="font-medium">{request.title}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col space-y-1">
                                                {request.document_category && (
                                                    <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                                                        📁 {request.document_category}
                                                    </span>
                                                )}
                                                {request.document_type && (
                                                    <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                                        📄 {request.document_type}
                                                    </span>
                                                )}
                                                {!request.document_category && !request.document_type && (
                                                    <span className="text-xs text-gray-400">Not specified</span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {getStatusBadge(request)}
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-sm text-gray-600">
                                                {request.context_display ||
                                                    (request.type === 'sent'
                                                        ? `To ${request.signers?.length || 0} signer${request.signers?.length !== 1 ? 's' : ''}`
                                                        : `From ${request.sender_name || 'Unknown'}`
                                                    )
                                                }
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-sm text-gray-600">
                                                {formatDate(request.initiated_at)}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <span className={`text-sm ${getTimeRemaining(request.expires_at).includes('Expired')
                                                ? 'text-red-600'
                                                : 'text-gray-600'
                                                }`}>
                                                {getTimeRemaining(request.expires_at)}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center space-x-2">
                                                {/* PDF Preview Button */}
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handlePreviewPDF(request)}
                                                    title="Preview PDF"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </Button>
                                                {/* Details Info Button */}
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleViewDetails(request)}
                                                    title="View Details"
                                                >
                                                    <Info className="w-4 h-4" />
                                                </Button>
                                                {request.type === 'received' && request.can_sign && (
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleSign(request)}
                                                        className="bg-green-600 hover:bg-green-700"
                                                    >
                                                        Sign
                                                    </Button>
                                                )}
                                                {request.type === 'received' && request.document_status === 'completed' && request.final_pdf_url && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => window.open(request.final_pdf_url, '_blank')}
                                                    >
                                                        <Download className="w-4 h-4 mr-1" />
                                                        Final PDF
                                                    </Button>
                                                )}
                                                {request.type === 'sent' && (
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="outline" size="sm">
                                                                <MoreHorizontal className="w-4 h-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent>
                                                            <DropdownMenuItem onClick={() => handleSendReminder(request)}>
                                                                <Share2 className="w-4 h-4 mr-2" />
                                                                Send Reminder
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={() => handleDelete(request)}
                                                                className="text-red-600"
                                                            >
                                                                <Trash2 className="w-4 h-4 mr-2" />
                                                                Delete
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Request Details Modal */}
            {viewingRequest && (
                <RequestDetailsModal
                    request={viewingRequest}
                    isOpen={!!viewingRequest}
                    onClose={() => setViewingRequest(null)}
                    currentUserEmail={user?.email}
                />
            )}
        </div>
    )
}
