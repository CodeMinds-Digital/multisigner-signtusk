'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { File, CheckCircle, MoreHorizontal, Eye, Download, Trash2, Share2, Users, Send, Inbox, Filter, Info, X, Search, Shield, Calendar, Clock, User, FileText } from 'lucide-react'
import { useAuth } from '@/components/providers/secure-auth-provider'
import { type SigningRequestListItem } from '@/lib/signing-workflow-service'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/ui/loading'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorAlert } from '@/components/ui/alert'
import { RequestDetailsModal } from './request-details-modal'
import { PDFSigningScreen } from './pdf-signing-screen'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Tabs,
    TabsList,
    TabsTrigger,
    TabsContent,
} from '@/components/ui/tabs'

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
    document_sign_id?: string
    final_pdf_url?: string
    context_display?: string
}

interface RequestStats {
    total: number
    sent: number
    received: number
}

export function UnifiedSigningRequestsListRedesigned({ onRefresh }: UnifiedSigningRequestsListProps) {
    const [requests, setRequests] = useState<UnifiedSigningRequest[]>([])
    const [filteredRequests, setFilteredRequests] = useState<UnifiedSigningRequest[]>([])
    const [stats, setStats] = useState<RequestStats>({ total: 0, sent: 0, received: 0 })
    const [filteredStats, setFilteredStats] = useState<RequestStats>({ total: 0, sent: 0, received: 0 })
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [timeRange, setTimeRange] = useState<TimeRange>('30d')
    const [searchQuery, setSearchQuery] = useState('')
    const [activeTab, setActiveTab] = useState<'all' | 'sent' | 'received'>('all')
    const [viewingRequest, setViewingRequest] = useState<UnifiedSigningRequest | null>(null)
    const [showSignersSheet, setShowSignersSheet] = useState<UnifiedSigningRequest | null>(null)
    const [showActionsSheet, setShowActionsSheet] = useState<UnifiedSigningRequest | null>(null)
    const [signingRequest, setSigningRequest] = useState<UnifiedSigningRequest | null>(null)
    const [showProfileValidation, setShowProfileValidation] = useState(false)
    const [pendingSigningRequest, setPendingSigningRequest] = useState<UnifiedSigningRequest | null>(null)
    const [userProfile, setUserProfile] = useState<any>(null)

    const { user } = useAuth()

    // Helper function to check if all signers have completed signing
    const isRequestCompleted = (request: UnifiedSigningRequest): boolean => {
        if (request.status === 'completed' || request.document_status === 'completed') {
            return true
        }
        if ((request as any).completed_signers && (request as any).total_signers) {
            return (request as any).completed_signers >= (request as any).total_signers
        }
        return false
    }

    const getStatusBadge = (request: UnifiedSigningRequest) => {
        const status = request.type === 'received' ? request.user_status || request.status : request.status

        const statusConfig = {
            pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
            viewed: { label: 'Viewed', color: 'bg-blue-100 text-blue-800 border-blue-200' },
            signed: { label: 'Signed', color: 'bg-green-100 text-green-800 border-green-200' },
            declined: { label: 'Declined', color: 'bg-red-100 text-red-800 border-red-200' },
            initiated: { label: 'Initiated', color: 'bg-blue-100 text-blue-800 border-blue-200' },
            'Initiated': { label: 'Initiated', color: 'bg-blue-100 text-blue-800 border-blue-200' },
            in_progress: { label: 'In Progress', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
            'In Progress': { label: 'In Progress', color: 'bg-blue-100 text-blue-800 border-blue-200' },
            completed: { label: 'Completed', color: 'bg-green-100 text-green-800 border-green-200' },
            expired: { label: 'Expired', color: 'bg-red-100 text-red-800 border-red-200' },
        }

        const config = statusConfig[status as keyof typeof statusConfig] || {
            label: status || 'Unknown',
            color: 'bg-gray-100 text-gray-800 border-gray-200'
        }

        return (
            <Badge variant="outline" className={`${config.color} font-medium`}>
                {config.label}
            </Badge>
        )
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        })
    }

    const getTimeRemaining = (expiresAt?: string, request?: UnifiedSigningRequest) => {
        if (request) {
            const isCompleted = request.status === 'completed' || request.document_status === 'completed'
            if (isCompleted) {
                return 'Completed'
            }
        }

        if (!expiresAt) return 'No expiration'

        const now = new Date()
        const expiry = new Date(expiresAt)
        const diff = expiry.getTime() - now.getTime()

        if (diff < 0) return 'Expired'

        const days = Math.floor(diff / (1000 * 60 * 60 * 24))
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

        if (days > 0) return `${days}d remaining`
        if (hours > 0) return `${hours}h remaining`
        return 'Expires soon'
    }

    const getFromToDisplay = (request: UnifiedSigningRequest) => {
        if (request.type === 'sent') {
            const signerCount = request.signers?.length || 0
            if (signerCount === 1) {
                const recipientName = request.signers?.[0]?.email || request.signers?.[0]?.name
                return recipientName || '1 recipient'
            } else if (signerCount > 1) {
                return `${signerCount} recipients`
            }
            return `${signerCount} recipient${signerCount !== 1 ? 's' : ''}`
        } else {
            return request.sender_name || 'Unknown'
        }
    }

    const getSignatureTypeDisplay = (request: UnifiedSigningRequest) => {
        const signerCount = request.signers?.length || 0
        if (signerCount === 1) {
            return (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    Single Signature
                </Badge>
            )
        } else if (signerCount > 1) {
            return (
                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                    Multi-Signature ({signerCount})
                </Badge>
            )
        }
        return (
            <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                No Signers
            </Badge>
        )
    }

    // Placeholder functions - these would be imported from the original component
    const loadAllRequests = useCallback(async () => {
        setLoading(true)
        // Implementation would go here
        setLoading(false)
    }, [])

    const handleFromToClick = (request: UnifiedSigningRequest) => {
        setShowSignersSheet(request)
    }

    const handlePreviewPDF = (request: UnifiedSigningRequest) => {
        // Implementation
    }

    const handleViewDetails = (request: UnifiedSigningRequest) => {
        setViewingRequest(request)
    }

    const handleSign = (request: UnifiedSigningRequest) => {
        // Implementation
    }

    const handleShare = (request: UnifiedSigningRequest) => {
        // Implementation
    }

    const handleDelete = (request: UnifiedSigningRequest) => {
        // Implementation
    }

    const getTimeRangeLabel = (range: TimeRange) => {
        const labels = {
            '7d': 'Last 7 days',
            '30d': 'Last 30 days',
            '6m': 'Last 6 months',
            '1y': 'Last year'
        }
        return labels[range]
    }

    const getTabFilteredRequests = () => {
        return filteredRequests.filter(req => {
            if (activeTab === 'all') return true
            return req.type === activeTab
        })
    }

    useEffect(() => {
        loadAllRequests()
    }, [loadAllRequests])

    if (loading) {
        return <LoadingSpinner />
    }

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">
                                    Total Requests {searchQuery && <span className="text-xs text-blue-600">(filtered)</span>}
                                </p>
                                <p className="text-3xl font-bold text-gray-900 mt-1">{filteredStats.total}</p>
                            </div>
                            <div className="p-3 bg-blue-100 rounded-full">
                                <File className="w-6 h-6 text-blue-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">
                                    Signing Requests {searchQuery && <span className="text-xs text-blue-600">(filtered)</span>}
                                </p>
                                <p className="text-3xl font-bold text-gray-900 mt-1">{filteredStats.sent}</p>
                            </div>
                            <div className="p-3 bg-green-100 rounded-full">
                                <Send className="w-6 h-6 text-green-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">
                                    Received Requests {searchQuery && <span className="text-xs text-blue-600">(filtered)</span>}
                                </p>
                                <p className="text-3xl font-bold text-gray-900 mt-1">{filteredStats.received}</p>
                            </div>
                            <div className="p-3 bg-purple-100 rounded-full">
                                <Inbox className="w-6 h-6 text-purple-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content Card */}
            <Card>
                <CardHeader>
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <CardTitle>Signature Requests</CardTitle>
                            <CardDescription>View and manage your signature requests</CardDescription>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3">
                            {/* Search */}
                            <div className="relative flex-1 sm:w-64">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input
                                    type="text"
                                    placeholder="Search requests..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                            {/* Time Range Filter */}
                            <Select value={timeRange} onValueChange={(value) => setTimeRange(value as TimeRange)}>
                                <SelectTrigger className="w-full sm:w-40">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="7d">Last 7 days</SelectItem>
                                    <SelectItem value="30d">Last 30 days</SelectItem>
                                    <SelectItem value="6m">Last 6 months</SelectItem>
                                    <SelectItem value="1y">Last year</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
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

                    <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'all' | 'sent' | 'received')}>
                        <TabsList className="grid w-full grid-cols-3 mb-6">
                            <TabsTrigger value="all" className="flex items-center gap-2">
                                <File className="w-4 h-4" />
                                All ({filteredStats.total})
                            </TabsTrigger>
                            <TabsTrigger value="sent" className="flex items-center gap-2">
                                <Send className="w-4 h-4" />
                                Sent ({filteredStats.sent})
                            </TabsTrigger>
                            <TabsTrigger value="received" className="flex items-center gap-2">
                                <Inbox className="w-4 h-4" />
                                Received ({filteredStats.received})
                            </TabsTrigger>
                        </TabsList>

                        {/* All Requests Tab */}
                        <TabsContent value="all" className="mt-0">
                            {getTabFilteredRequests().length === 0 ? (
                                <EmptyState
                                    icon={File}
                                    title={searchQuery ? "No matching requests found" : "No signature requests found"}
                                    description={searchQuery ? `No requests match "${searchQuery}"` : `No requests found for ${getTimeRangeLabel(timeRange).toLowerCase()}`}
                                />
                            ) : (
                                <div className="space-y-3">
                                    {getTabFilteredRequests().map((request) => (
                                        <RequestCard
                                            key={`${request.type}-${request.id}`}
                                            request={request}
                                            showType={true}
                                            getStatusBadge={getStatusBadge}
                                            getFromToDisplay={getFromToDisplay}
                                            getSignatureTypeDisplay={getSignatureTypeDisplay}
                                            formatDate={formatDate}
                                            getTimeRemaining={getTimeRemaining}
                                            handleFromToClick={handleFromToClick}
                                            handlePreviewPDF={handlePreviewPDF}
                                            handleViewDetails={handleViewDetails}
                                            handleSign={handleSign}
                                            handleShare={handleShare}
                                            handleDelete={handleDelete}
                                            isRequestCompleted={isRequestCompleted}
                                            setShowActionsSheet={setShowActionsSheet}
                                        />
                                    ))}
                                </div>
                            )}
                        </TabsContent>

                        {/* Sent Requests Tab */}
                        <TabsContent value="sent" className="mt-0">
                            {getTabFilteredRequests().length === 0 ? (
                                <EmptyState
                                    icon={Send}
                                    title={searchQuery ? "No matching sent requests" : "No sent requests"}
                                    description={searchQuery ? `No sent requests match "${searchQuery}"` : `You haven't sent any signature requests for ${getTimeRangeLabel(timeRange).toLowerCase()}`}
                                />
                            ) : (
                                <div className="space-y-3">
                                    {getTabFilteredRequests().map((request) => (
                                        <RequestCard
                                            key={`${request.type}-${request.id}`}
                                            request={request}
                                            showType={false}
                                            getStatusBadge={getStatusBadge}
                                            getFromToDisplay={getFromToDisplay}
                                            getSignatureTypeDisplay={getSignatureTypeDisplay}
                                            formatDate={formatDate}
                                            getTimeRemaining={getTimeRemaining}
                                            handleFromToClick={handleFromToClick}
                                            handlePreviewPDF={handlePreviewPDF}
                                            handleViewDetails={handleViewDetails}
                                            handleSign={handleSign}
                                            handleShare={handleShare}
                                            handleDelete={handleDelete}
                                            isRequestCompleted={isRequestCompleted}
                                            setShowActionsSheet={setShowActionsSheet}
                                        />
                                    ))}
                                </div>
                            )}
                        </TabsContent>

                        {/* Received Requests Tab */}
                        <TabsContent value="received" className="mt-0">
                            {getTabFilteredRequests().length === 0 ? (
                                <EmptyState
                                    icon={Inbox}
                                    title={searchQuery ? "No matching received requests" : "No received requests"}
                                    description={searchQuery ? `No received requests match "${searchQuery}"` : `You haven't received any signature requests for ${getTimeRangeLabel(timeRange).toLowerCase()}`}
                                />
                            ) : (
                                <div className="space-y-3">
                                    {getTabFilteredRequests().map((request) => (
                                        <RequestCard
                                            key={`${request.type}-${request.id}`}
                                            request={request}
                                            showType={false}
                                            getStatusBadge={getStatusBadge}
                                            getFromToDisplay={getFromToDisplay}
                                            getSignatureTypeDisplay={getSignatureTypeDisplay}
                                            formatDate={formatDate}
                                            getTimeRemaining={getTimeRemaining}
                                            handleFromToClick={handleFromToClick}
                                            handlePreviewPDF={handlePreviewPDF}
                                            handleViewDetails={handleViewDetails}
                                            handleSign={handleSign}
                                            handleShare={handleShare}
                                            handleDelete={handleDelete}
                                            isRequestCompleted={isRequestCompleted}
                                            setShowActionsSheet={setShowActionsSheet}
                                        />
                                    ))}
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            {/* Modals and Sheets would go here */}
        </div>
    )
}

// Request Card Component
interface RequestCardProps {
    request: UnifiedSigningRequest
    showType: boolean
    getStatusBadge: (request: UnifiedSigningRequest) => React.ReactElement
    getFromToDisplay: (request: UnifiedSigningRequest) => string
    getSignatureTypeDisplay: (request: UnifiedSigningRequest) => React.ReactElement
    formatDate: (date: string) => string
    getTimeRemaining: (expiresAt?: string, request?: UnifiedSigningRequest) => string
    handleFromToClick: (request: UnifiedSigningRequest) => void
    handlePreviewPDF: (request: UnifiedSigningRequest) => void
    handleViewDetails: (request: UnifiedSigningRequest) => void
    handleSign: (request: UnifiedSigningRequest) => void
    handleShare: (request: UnifiedSigningRequest) => void
    handleDelete: (request: UnifiedSigningRequest) => void
    isRequestCompleted: (request: UnifiedSigningRequest) => boolean
    setShowActionsSheet: (request: UnifiedSigningRequest | null) => void
}

function RequestCard({
    request,
    showType,
    getStatusBadge,
    getFromToDisplay,
    getSignatureTypeDisplay,
    formatDate,
    getTimeRemaining,
    handleFromToClick,
    handlePreviewPDF,
    handleViewDetails,
    handleSign,
    handleShare,
    handleDelete,
    isRequestCompleted,
    setShowActionsSheet
}: RequestCardProps) {
    const timeRemaining = getTimeRemaining(request.expires_at, request)
    const isExpired = timeRemaining === 'Expired'
    const isCompleted = timeRemaining === 'Completed'

    return (
        <Card className="hover:shadow-md transition-all duration-200 border-l-4" style={{
            borderLeftColor: request.type === 'sent' ? '#10b981' : '#a855f7'
        }}>
            <CardContent className="p-5">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    {/* Left Section - Document Info */}
                    <div className="flex-1 space-y-3">
                        {/* Title and Type */}
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-gray-100 rounded-lg">
                                <FileText className="w-5 h-5 text-gray-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="font-semibold text-gray-900 text-lg truncate">{request.title}</h3>
                                    {showType && (
                                        <Badge variant="outline" className={request.type === 'sent' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-purple-50 text-purple-700 border-purple-200'}>
                                            {request.type === 'sent' ? <Send className="w-3 h-3 mr-1" /> : <Inbox className="w-3 h-3 mr-1" />}
                                            {request.type === 'sent' ? 'Sent' : 'Received'}
                                        </Badge>
                                    )}
                                </div>
                                {request.document_sign_id && (
                                    <p className="text-sm text-gray-500 mt-1">
                                        🆔 {request.document_sign_id}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Metadata Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                            {/* Status */}
                            <div className="flex items-center gap-2">
                                <div className="text-gray-500 font-medium min-w-fit">Status:</div>
                                {getStatusBadge(request)}
                            </div>

                            {/* From/To */}
                            <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                <button
                                    onClick={() => handleFromToClick(request)}
                                    className="text-gray-700 hover:text-blue-600 hover:underline transition-colors truncate"
                                >
                                    {request.type === 'sent' ? 'To: ' : 'From: '}{getFromToDisplay(request)}
                                </button>
                            </div>

                            {/* Signature Type */}
                            <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                {getSignatureTypeDisplay(request)}
                            </div>

                            {/* Date */}
                            <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                <span className="text-gray-700">{formatDate(request.initiated_at)}</span>
                            </div>
                        </div>

                        {/* Expiration */}
                        <div className="flex items-center gap-2 text-sm">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <span className={`font-medium ${isExpired ? 'text-red-600' :
                                isCompleted ? 'text-green-600' :
                                    'text-gray-700'
                                }`}>
                                {timeRemaining}
                            </span>
                        </div>
                    </div>

                    {/* Right Section - Actions */}
                    <div className="flex items-center gap-2 flex-wrap lg:flex-nowrap">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePreviewPDF(request)}
                            title="Preview PDF"
                        >
                            <Eye className="w-4 h-4 lg:mr-2" />
                            <span className="hidden lg:inline">Preview</span>
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetails(request)}
                            title="View Details"
                        >
                            <Info className="w-4 h-4 lg:mr-2" />
                            <span className="hidden lg:inline">Details</span>
                        </Button>
                        {request.type === 'received' && request.can_sign && (
                            <Button
                                size="sm"
                                onClick={() => handleSign(request)}
                                className="bg-green-600 hover:bg-green-700"
                            >
                                <CheckCircle className="w-4 h-4 lg:mr-2" />
                                <span className="hidden lg:inline">Sign</span>
                            </Button>
                        )}
                        {request.type === 'received' && request.document_status === 'completed' && request.final_pdf_url && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(request.final_pdf_url, '_blank')}
                            >
                                <Download className="w-4 h-4 lg:mr-2" />
                                <span className="hidden lg:inline">Final PDF</span>
                            </Button>
                        )}
                        {request.type === 'sent' && !isRequestCompleted(request) && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowActionsSheet(request)}
                                title="Document Actions"
                            >
                                <MoreHorizontal className="w-4 h-4" />
                            </Button>
                        )}
                        {request.type === 'sent' && isRequestCompleted(request) && (
                            <Badge className="bg-green-100 text-green-800 border-green-200">
                                ✓ Completed
                            </Badge>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

