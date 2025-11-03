import React, { memo } from 'react'
import { Calendar, Clock, User, FileText, Eye, Info, CheckCircle, Download, MoreHorizontal, Send, Inbox, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { SignatureType, SigningOrder, SignatureStatus } from '@/lib/signature/types/signature-types'

interface UnifiedSigningRequest {
    id: string
    title: string
    type: 'sent' | 'received'
    status: SignatureStatus
    user_status?: string
    document_status?: string
    document_sign_id?: string
    created_at: string
    updated_at: string
    expires_at?: string
    sender_name?: string
    can_sign?: boolean
    final_pdf_url?: string
    total_signers: number
    completed_signers: number
    viewed_signers: number
    decline_reason?: string
    initiated_by: string
    document_url?: string
    document_id: string
    context_display?: string
    metadata: Record<string, unknown>
    signature_type: SignatureType
    signing_order: SigningOrder
    require_totp: boolean
    description?: string
    completed_at?: string
    progress?: {
        viewed: number
        signed: number
        total: number
    }
}

interface RequestCardProps {
    request: UnifiedSigningRequest
    showType: boolean
    getStatusBadge: (request: UnifiedSigningRequest) => React.ReactElement
    getFromToDisplay: (request: UnifiedSigningRequest) => string
    getAllSignersDisplay: (request: UnifiedSigningRequest) => React.ReactElement | null
    getSignatureTypeDisplay: (request: UnifiedSigningRequest) => React.ReactElement
    formatDate: (date: string) => string
    getTimeRemaining: (expiresAt?: string, request?: UnifiedSigningRequest) => string
    handleFromToClick: (request: UnifiedSigningRequest) => void
    handlePreviewPDF: (request: UnifiedSigningRequest) => void
    handleViewDetails: (request: UnifiedSigningRequest) => void
    handleSign: (request: UnifiedSigningRequest) => void
    isRequestCompleted: (request: UnifiedSigningRequest) => boolean
    setShowActionsSheet: (request: UnifiedSigningRequest | null) => void
    isPolling?: boolean
}

const RequestCardComponent = ({
    request,
    showType,
    getStatusBadge,
    getFromToDisplay,
    getAllSignersDisplay,
    getSignatureTypeDisplay,
    formatDate,
    getTimeRemaining,
    handleFromToClick,
    handlePreviewPDF,
    handleViewDetails,
    handleSign,
    isRequestCompleted,
    setShowActionsSheet,
    isPolling = false
}: RequestCardProps) => {
    const timeRemaining = getTimeRemaining(request.expires_at, request)
    const isExpired = timeRemaining === 'Expired'
    const isCompleted = timeRemaining === 'Completed'

    return (
        <Card
            className="hover:shadow-md transition-all duration-200 border-l-4"
            style={{
                borderLeftColor: request.type === 'sent' ? '#10b981' : '#a855f7'
            }}
        >
            <CardContent className="p-5">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    {/* Left Section - Document Info */}
                    <div className="flex-1 space-y-3">
                        {/* Title and Type */}
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-gray-100 rounded-lg flex-shrink-0">
                                <FileText className="w-5 h-5 text-gray-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="font-semibold text-gray-900 text-lg truncate">{request.title}</h3>
                                    {showType && (
                                        <Badge
                                            variant="outline"
                                            className={request.type === 'sent'
                                                ? 'bg-green-50 text-green-700 border-green-200'
                                                : 'bg-purple-50 text-purple-700 border-purple-200'
                                            }
                                        >
                                            {request.type === 'sent' ? (
                                                <><Send className="w-3 h-3 mr-1" /> Sent</>
                                            ) : (
                                                <><Inbox className="w-3 h-3 mr-1" /> Received</>
                                            )}
                                        </Badge>
                                    )}
                                </div>
                                {request.document_sign_id && (
                                    <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                                        <span className="font-mono bg-blue-50 px-2 py-0.5 rounded text-blue-700">
                                            🆔 {request.document_sign_id}
                                        </span>
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Metadata Grid */}
                        <div className="space-y-3 text-sm">
                            {/* Status */}
                            <div className="flex items-center gap-2">
                                <div className="text-gray-500 font-medium min-w-fit">Status:</div>
                                <div className="flex items-center gap-2">
                                    {getStatusBadge(request)}
                                    {/* Show PDF Generation Status */}
                                    {isPolling && (
                                        <Badge className="bg-blue-100 text-blue-800 border-blue-200 gap-1.5">
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                            Generating PDF...
                                        </Badge>
                                    )}
                                </div>
                            </div>

                            {/* From/To - Only show for single signature or sent requests */}
                            {(request.total_signers === 1 || request.type === 'sent') && (
                                <div className="flex items-center gap-2">
                                    <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                    <button
                                        onClick={() => handleFromToClick(request)}
                                        className="text-gray-700 hover:text-blue-600 hover:underline transition-colors truncate text-left"
                                    >
                                        {getFromToDisplay(request)}
                                    </button>
                                </div>
                            )}

                            {/* All Signers - Show for multi-signature received requests */}
                            {request.type === 'received' && request.total_signers > 1 && (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                        <span className="text-gray-700 font-medium">From: {request.sender_name || 'Unknown'}</span>
                                    </div>
                                    <div className="ml-6 space-y-1">
                                        <div className="text-gray-600 font-medium text-xs mb-1">All Signers:</div>
                                        {getAllSignersDisplay(request)}
                                    </div>
                                </div>
                            )}

                            {/* Signature Type */}
                            <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                {getSignatureTypeDisplay(request)}
                            </div>

                            {/* Date */}
                            <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                <span className="text-gray-700">{formatDate(request.created_at)}</span>
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

                        {/* Decline Reason if present */}
                        {request.decline_reason && (
                            <div className="flex items-start gap-2 text-sm bg-red-50 border border-red-200 rounded-lg p-2">
                                <span className="text-red-600 font-medium">Decline Reason:</span>
                                <span className="text-red-700">{request.decline_reason}</span>
                            </div>
                        )}
                    </div>

                    {/* Right Section - Actions */}
                    <div className="flex items-center gap-2 flex-wrap lg:flex-nowrap">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePreviewPDF(request)}
                            title="Preview PDF"
                            className="flex-1 sm:flex-none"
                        >
                            <Eye className="w-4 h-4 sm:mr-2" />
                            <span className="hidden sm:inline">Preview</span>
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetails(request)}
                            title="View Details"
                            className="flex-1 sm:flex-none"
                        >
                            <Info className="w-4 h-4 sm:mr-2" />
                            <span className="hidden sm:inline">Details</span>
                        </Button>
                        {request.type === 'received' && request.can_sign && (
                            <Button
                                size="sm"
                                onClick={() => handleSign(request)}
                                className="bg-green-600 hover:bg-green-700 flex-1 sm:flex-none"
                            >
                                <CheckCircle className="w-4 h-4 sm:mr-2" />
                                <span className="hidden sm:inline">Sign</span>
                            </Button>
                        )}
                        {request.type === 'received' && request.document_status === 'completed' && request.final_pdf_url && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(request.final_pdf_url, '_blank')}
                                className="flex-1 sm:flex-none"
                            >
                                <Download className="w-4 h-4 sm:mr-2" />
                                <span className="hidden sm:inline">Final PDF</span>
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

// Memoize the component to prevent unnecessary re-renders
export const RequestCard = memo(RequestCardComponent, (prevProps, nextProps) => {
    // Only re-render if request data or polling state changes
    return (
        prevProps.request.id === nextProps.request.id &&
        prevProps.request.status === nextProps.request.status &&
        prevProps.request.document_status === nextProps.request.document_status &&
        prevProps.isPolling === nextProps.isPolling &&
        JSON.stringify(prevProps.request.progress) === JSON.stringify(nextProps.request.progress)
    )
})

RequestCard.displayName = 'RequestCard'
