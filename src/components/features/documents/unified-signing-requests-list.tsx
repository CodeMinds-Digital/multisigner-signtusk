'use client'

import { useState, useEffect, useCallback } from 'react'
import { File, CheckCircle, MoreHorizontal, Eye, Download, Trash2, Share2, Users, Send, Inbox, Filter, Info, X, Search, Shield } from 'lucide-react'
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
    document_sign_id?: string // NEW: Document Sign ID
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
    const [filteredRequests, setFilteredRequests] = useState<UnifiedSigningRequest[]>([]) // NEW: Filtered requests for search
    const [stats, setStats] = useState<RequestStats>({ total: 0, sent: 0, received: 0 })
    const [filteredStats, setFilteredStats] = useState<RequestStats>({ total: 0, sent: 0, received: 0 }) // NEW: Stats for filtered results
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [timeRange, setTimeRange] = useState<TimeRange>('30d')
    const [searchQuery, setSearchQuery] = useState('') // NEW: Search query state
    const [viewingRequest, setViewingRequest] = useState<UnifiedSigningRequest | null>(null)
    const [showSignersSheet, setShowSignersSheet] = useState<UnifiedSigningRequest | null>(null)
    const [showActionsSheet, setShowActionsSheet] = useState<UnifiedSigningRequest | null>(null)
    const [signingRequest, setSigningRequest] = useState<UnifiedSigningRequest | null>(null)
    const [showProfileValidation, setShowProfileValidation] = useState(false)
    const [pendingSigningRequest, setPendingSigningRequest] = useState<UnifiedSigningRequest | null>(null)
    const [userProfile, setUserProfile] = useState<any>(null)

    // Note: Toast context may not be available in all contexts

    const { user } = useAuth()

    // Helper function to check if all signers have completed signing
    const isRequestCompleted = (request: UnifiedSigningRequest): boolean => {
        // Check if status is explicitly completed
        if (request.status === 'completed' || request.document_status === 'completed') {
            return true
        }

        // Check if all signers have signed (completed_signers equals total_signers)
        if ((request as any).completed_signers && (request as any).total_signers) {
            return (request as any).completed_signers >= (request as any).total_signers
        }

        return false
    }

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
                .sort((a: any, b: any) => new Date(b.initiated_at).getTime() - new Date(a.initiated_at).getTime())

            const sentCount = filteredRequests.filter((req: any) => req.type === 'sent').length
            const receivedCount = filteredRequests.filter((req: any) => req.type === 'received').length

            setRequests(filteredRequests)
            setFilteredRequests(filteredRequests) // NEW: Initialize filtered requests
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

    // NEW: Search filtering effect
    useEffect(() => {
        if (!searchQuery.trim()) {
            setFilteredRequests(requests)
            setFilteredStats(stats)
            return
        }

        const query = searchQuery.toLowerCase().trim()
        const filtered = requests.filter(request => {
            // Search in document title
            if (request.title?.toLowerCase().includes(query)) return true

            // Search in document sign ID
            if (request.document_sign_id?.toLowerCase().includes(query)) return true

            // Search in sender name
            if (request.sender_name?.toLowerCase().includes(query)) return true

            // Search in status
            if (request.status?.toLowerCase().includes(query)) return true

            return false
        })

        // Calculate filtered stats
        const filteredSentCount = filtered.filter(req => req.type === 'sent').length
        const filteredReceivedCount = filtered.filter(req => req.type === 'received').length

        setFilteredRequests(filtered)
        setFilteredStats({
            total: filtered.length,
            sent: filteredSentCount,
            received: filteredReceivedCount
        })
    }, [requests, searchQuery, stats])

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

    const getTimeRemaining = (expiresAt?: string, request?: UnifiedSigningRequest) => {
        // Check if document is completed first
        if (request) {
            const isCompleted = request.status === 'completed' || request.document_status === 'completed'
            if (isCompleted) {
                // Show completion time instead of expiry
                const completedAt = request.initiated_at // Use initiated_at as fallback since updated_at doesn't exist
                if (completedAt) {
                    const completedDate = new Date(completedAt)
                    const formattedDate = completedDate.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                    }) + ' · ' + completedDate.toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                    })
                    return `Completed: ${formattedDate}`
                }
                return 'Completed'
            }
        }

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



    const handleSign = async (request: UnifiedSigningRequest) => {
        console.log('🖊️ Sign document clicked:', request.title)

        try {
            // Step 1: Validate user profile first
            console.log('🔍 Validating user profile for signing...')
            const profile = await fetchUserProfile()

            if (!profile) {
                alert('Unable to fetch user profile. Please try again.')
                return
            }

            const validation = validateProfileForSigning(profile)

            if (!validation.isValid) {
                console.log('❌ Profile validation failed:', validation.missingFields)
                // Store the request for later use after profile setup
                setPendingSigningRequest(request)
                setShowProfileValidation(true)
                return
            }

            console.log('✅ Profile validation passed, proceeding to PDF preview...')

            // Step 2: Get the PDF URL using the same logic as the Eye icon
            let documentPath = null

            // Check multiple possible data structures for original document
            const documentObj = (request as any).document
            const documentUrl = (request as any).document_url
            const documentId = (request as any).document_id
            const documentTemplateId = (request as any).document_template_id

            console.log('🔍 Document object type:', typeof documentObj)
            console.log('🔍 Document object value:', documentObj)
            console.log('🔍 Document URL:', documentUrl)
            console.log('🔍 Document ID:', documentId)
            console.log('🔍 Document Template ID:', documentTemplateId)

            // First try: nested document object
            if (documentObj?.file_url || documentObj?.pdf_url) {
                documentPath = documentObj.file_url || documentObj.pdf_url
                console.log('✅ Found document path in nested object:', documentPath)
            }
            // Second try: direct document_url field
            else if (documentUrl) {
                documentPath = documentUrl
                console.log('✅ Found document path in document_url field:', documentPath)
            }

            if (documentPath) {
                console.log('🔍 Attempting to resolve document URL for path:', documentPath)

                // Try to get a working PDF URL using the document URL API first
                try {
                    const response = await fetch('/api/drive/document-url', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ pdfUrl: documentPath })
                    })

                    if (response.ok) {
                        const result = await response.json()
                        if (result.success && result.data?.url) {
                            console.log('✅ Got PDF URL from API:', result.data.url)
                            const requestWithPdfUrl = {
                                ...request,
                                document_url: result.data.url
                            }
                            setSigningRequest(requestWithPdfUrl)
                            return
                        }
                    }
                } catch (apiError) {
                    console.log('⚠️ API method failed, trying direct storage access:', apiError)
                }

                // Fallback: Try direct storage access
                const buckets = ['documents', 'files']
                let pdfUrl = null

                for (const bucket of buckets) {
                    try {
                        console.log(`🔍 Checking bucket: ${bucket} for path: ${documentPath}`)
                        const { data } = supabase.storage.from(bucket).getPublicUrl(documentPath)

                        if (data?.publicUrl) {
                            // Test if the URL is accessible
                            const response = await fetch(data.publicUrl, { method: 'HEAD' })
                            if (response.ok) {
                                pdfUrl = data.publicUrl
                                console.log(`✅ Found accessible PDF in ${bucket}:`, pdfUrl)
                                break
                            }
                        }
                    } catch (error) {
                        console.log(`❌ Error checking ${bucket}:`, error)
                    }
                }

                if (pdfUrl) {
                    // Open PDF signing screen with the PDF URL
                    const requestWithPdfUrl = {
                        ...request,
                        document_url: pdfUrl
                    }
                    setSigningRequest(requestWithPdfUrl)
                } else {
                    console.log('📋 PDF not found in any bucket')
                    alert(`PDF not accessible for "${request.title}". The document may be in a different storage location.`)
                }
            } else {
                console.log('❌ No document path found')
                alert(`No document path found for "${request.title}".`)
            }
        } catch (error) {
            console.error('❌ Error in handleSign:', error)
            alert('Error accessing document for signing.')
        }
    }

    const handleShare = async (request: UnifiedSigningRequest) => {
        console.log('Send reminder for request:', request)

        try {
            const response = await fetch(`/api/signature-requests/${request.id}/remind`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            })

            const result = await response.json()

            if (response.ok) {
                alert(result.message || 'Reminder sent successfully!')
                // Refresh the list to update any status changes
                if (onRefresh) {
                    onRefresh()
                }
            } else {
                alert(result.error || 'Failed to send reminder')
            }
        } catch (error) {
            console.error('Error sending reminder:', error)
            alert('Failed to send reminder. Please try again.')
        }
    }

    const handleDelete = async (request: UnifiedSigningRequest) => {
        if (confirm('Are you sure you want to delete this request? This action cannot be undone.')) {
            try {
                console.log('🗑️ Deleting signature request:', request.id)

                const response = await fetch(`/api/signature-requests/${request.id}`, {
                    method: 'DELETE',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                })

                if (response.ok) {
                    const result = await response.json()
                    console.log('✅ Successfully deleted signature request:', result.message)
                    console.log('🎯 Deletion details:', {
                        deletedSigners: result.deletedSigners,
                        note: 'Request removed from all signers\' inboxes'
                    })

                    // Show success message
                    alert(result.message || 'Signature request deleted successfully')

                    // Refresh the list to reflect changes
                    onRefresh?.()
                } else {
                    const error = await response.json()
                    console.error('❌ Failed to delete signature request:', error)
                    alert(error.error || 'Failed to delete signature request')
                }
            } catch (error) {
                console.error('❌ Error deleting signature request:', error)
                alert('An error occurred while deleting the signature request')
            }
        }
    }

    const tryOpenPDF = async (documentPath: string, title: string) => {
        console.log('🔍 Trying to access PDF at path:', documentPath)

        // For Sign Inbox documents, use 'documents' bucket only (PDFs are stored here)
        // User confirmed: files bucket contains only JSON schemas, documents bucket contains PDFs
        const buckets = ['documents']
        let pdfUrl = null

        for (const bucket of buckets) {
            try {
                console.log(`🔍 Trying bucket: ${bucket}`)
                const previewResponse = await fetch(`/api/documents/preview?bucket=${bucket}&path=${documentPath}`)
                console.log(`📡 Response from ${bucket}:`, previewResponse.status, previewResponse.statusText)

                if (previewResponse.ok) {
                    const result = await previewResponse.json()
                    console.log(`📋 Result from ${bucket}:`, result)
                    if (result.success && result.url) {
                        pdfUrl = result.url
                        console.log(`✅ Found PDF URL in ${bucket}:`, pdfUrl)
                        break
                    }
                }
            } catch (err) {
                console.log(`❌ Failed to get PDF from ${bucket}:`, err)
            }
        }

        if (pdfUrl) {
            console.log('🚀 Opening PDF URL:', pdfUrl)
            window.open(pdfUrl, '_blank')
        } else {
            console.log('📋 PDF not found in any bucket')
            alert(`PDF not accessible for "${title}". The document may be in a different storage location.`)
        }
    }

    const handlePreviewPDF = async (request: UnifiedSigningRequest) => {
        console.log('👁️ PDF Preview clicked for:', request.title)
        console.log('📄 Request data:', {
            document_template_id: (request as any).document_template_id,
            document: (request as any).document,
            document_url: request.document_url,
            final_pdf_url: request.final_pdf_url,
            file_url: (request as any).file_url,
            status: request.status,
            document_status: request.document_status,
            full_request: request
        })

        try {
            // Check if all signers have completed and final PDF is available
            const isCompleted = request.status === 'completed' || request.document_status === 'completed'
            const hasFinalPdf = request.final_pdf_url && request.final_pdf_url.trim() !== ''

            console.log('🔍 Signing status check:', {
                isCompleted,
                hasFinalPdf,
                status: request.status,
                document_status: request.document_status,
                final_pdf_url: request.final_pdf_url
            })

            // If completed and final PDF exists, show final PDF
            if (isCompleted && hasFinalPdf) {
                console.log('✅ Showing final signed PDF:', request.final_pdf_url)
                window.open(request.final_pdf_url, '_blank')

                // Mark as viewed if this is a received request
                if (request.type === 'received') {
                    try {
                        await fetch('/api/signature-requests/track-view', {
                            method: 'POST',
                            credentials: 'include',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ requestId: request.id })
                        })
                    } catch (error) {
                        console.error('Error marking request as viewed:', error)
                    }
                }
                return
            }

            // Otherwise, show original document
            console.log('🔍 Showing original document...')

            // Check multiple possible data structures for original document
            const documentObj = (request as any).document
            const documentUrl = (request as any).document_url
            const documentId = (request as any).document_id
            const documentTemplateId = (request as any).document_template_id

            console.log('🔍 Document object type:', typeof documentObj)
            console.log('🔍 Document object value:', documentObj)
            console.log('🔍 Document URL:', documentUrl)
            console.log('🔍 Document ID:', documentId)
            console.log('🔍 Document Template ID:', documentTemplateId)

            // Try to get document path from various sources
            let documentPath = null

            // First try: nested document object
            if (documentObj?.file_url || documentObj?.pdf_url) {
                documentPath = documentObj.file_url || documentObj.pdf_url
                console.log('✅ Found document path in nested object:', documentPath)
            }
            // Second try: direct document_url field
            else if (documentUrl) {
                documentPath = documentUrl
                console.log('✅ Found document path in document_url field:', documentPath)
            }

            if (documentPath) {
                console.log('🔍 Direct PDF access with path:', documentPath)
                await tryOpenPDF(documentPath, request.title)
                return
            }

            console.log('❌ No document path found in nested object, checking other fields...')

            // Fallback: try to get document_template_id or document_id and fetch document details
            const fallbackDocumentId = documentTemplateId || documentId

            if (!fallbackDocumentId) {
                console.log('❌ No document path or template ID found')
                console.log('📋 Available request fields:', Object.keys(request))
                console.log('📋 Document object:', (request as any).document)
                alert(`Cannot preview PDF: No document reference found for "${request.title}".`)
                return
            }

            console.log('🔍 Fetching document details for ID:', fallbackDocumentId)

            // Fetch document details from the documents table
            const response = await fetch(`/api/documents/${fallbackDocumentId}`)

            if (!response.ok) {
                console.log('❌ Document not found via API')
                alert(`Document not found for "${request.title}".`)
                return
            }

            const documentData = await response.json()
            console.log('📄 Document data:', documentData)

            // Get the document path from the fetched document
            // Based on terminal output, documents have file_url but pdf_url is null
            const fetchedDocumentPath = documentData.file_url || documentData.pdf_url || documentData.template_url

            console.log('📄 Document paths available:', {
                file_url: documentData.file_url,
                pdf_url: documentData.pdf_url,
                template_url: documentData.template_url,
                selected_path: fetchedDocumentPath
            })

            if (!fetchedDocumentPath) {
                console.log('❌ No file path in document')
                alert(`No file path found for "${request.title}".`)
                return
            }

            console.log('🔍 Trying to access PDF with path:', fetchedDocumentPath)
            await tryOpenPDF(fetchedDocumentPath, request.title)

            // Track document view for received requests
            if (request.type === 'received') {
                try {
                    console.log('📊 Tracking document view for original document:', request.id)
                    await fetch('/api/signature-requests/track-view', {
                        method: 'POST',
                        credentials: 'include',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ requestId: request.id })
                    })
                    console.log('✅ Document view tracked successfully')
                } catch (error) {
                    console.error('❌ Error tracking document view:', error)
                }
            }
        } catch (error) {
            console.error('❌ Error in PDF preview:', error)
            alert('Error accessing document.')
        }
    }

    const handleViewDetails = (request: UnifiedSigningRequest) => {
        console.log('ℹ️ Info icon clicked! View details for:', request.title)
        setViewingRequest(request)
    }

    const handleFromToClick = (request: UnifiedSigningRequest) => {
        console.log('👥 From/To clicked for:', request.title)
        setShowSignersSheet(request)
    }

    const fetchUserProfile = async () => {
        try {
            const response = await fetch('/api/user/profile', {
                credentials: 'include'
            })

            if (response.ok) {
                const profile = await response.json()
                setUserProfile(profile)
                return profile
            }
            return null
        } catch (error) {
            console.error('Error fetching user profile:', error)
            return null
        }
    }

    const validateProfileForSigning = (profile: any) => {
        const hasName = !!profile?.full_name
        const hasSignature = profile?.signatures && profile.signatures.length > 0

        console.log('🔍 Profile validation debug:', {
            profile_full_name: profile?.full_name,
            profile_signatures: profile?.signatures,
            signatures_length: profile?.signatures?.length,
            hasName,
            hasSignature,
            profile_keys: Object.keys(profile || {})
        })

        return {
            isValid: hasName && hasSignature,
            hasName,
            hasSignature,
            missingFields: [
                ...(!hasName ? ['Name'] : []),
                ...(!hasSignature ? ['Primary Signature'] : [])
            ]
        }
    }

    const handleSignatureAccept = async (signatureData: any) => {
        try {
            console.log('✅ Signature accepted (already processed by PDFSigningScreen):', signatureData)

            // The signature has already been saved by PDFSigningScreen
            // No need to make another API call here - just handle the UI updates

            // Show success message
            alert('Signature saved successfully!')

            setSigningRequest(null)

            // ✅ PERFORMANCE FIX: Update state instead of page reload
            loadAllRequests() // Refresh the requests list
        } catch (error) {
            console.error('❌ Error in signature accept handler:', error)
            alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }

    const handleSignatureDecline = async (reason: string) => {
        try {
            console.log('❌ Signature declined:', reason)

            const response = await fetch('/api/signature-requests/decline', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    requestId: signingRequest?.id,
                    reason
                })
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Failed to decline signature')
            }

            const result = await response.json()
            console.log('✅ Signature declined successfully:', result)

            alert('Signature declined successfully.')
            setSigningRequest(null)

            // Refresh the data instead of full page reload
            await loadAllRequests()

            // Trigger notification refresh for all users
            if (typeof (window as any).refreshNotifications === 'function') {
                (window as any).refreshNotifications()
            }

            // Force a small delay to ensure database updates are reflected
            setTimeout(async () => {
                await loadAllRequests()
                if (typeof (window as any).refreshNotifications === 'function') {
                    (window as any).refreshNotifications()
                }
            }, 1000)
        } catch (error) {
            console.error('❌ Error declining signature:', error)
            alert(`Error declining signature: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }

    const getFromToDisplay = (request: UnifiedSigningRequest) => {
        // Prioritize count-based display for sent requests
        if (request.type === 'sent') {
            const signerCount = request.signers?.length || 0
            if (signerCount === 1) {
                return `Single Signature`
            } else if (signerCount > 1) {
                return `${signerCount} Signers Required`
            }
            return `To ${signerCount} signer${signerCount !== 1 ? 's' : ''}`
        } else {
            // For received requests, show sender name
            return `From ${request.sender_name || 'Unknown'}`
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
            {/* Time Range Selector and Search */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
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

                {/* NEW: Search Bar and Refresh */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={loadAllRequests}
                        className="px-3 py-2 rounded-lg font-medium transition-colors bg-gray-100 text-gray-700 hover:bg-gray-200 flex items-center gap-2"
                        title="Refresh data"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Refresh
                    </button>
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by title, sign ID, or sender..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-80"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                    <span className="text-sm text-gray-500">
                        Showing data for {getTimeRangeLabel(timeRange).toLowerCase()}
                    </span>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">
                                    Total Requests {searchQuery && <span className="text-xs text-blue-600">(filtered)</span>}
                                </p>
                                <p className="text-2xl font-bold text-gray-900">{filteredStats.total}</p>
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
                                <p className="text-sm font-medium text-gray-600">
                                    Signing Requests {searchQuery && <span className="text-xs text-blue-600">(filtered)</span>}
                                </p>
                                <p className="text-2xl font-bold text-gray-900">{filteredStats.sent}</p>
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
                                <p className="text-sm font-medium text-gray-600">
                                    Received Requests {searchQuery && <span className="text-xs text-blue-600">(filtered)</span>}
                                </p>
                                <p className="text-2xl font-bold text-gray-900">{filteredStats.received}</p>
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

                    {filteredRequests.length === 0 ? (
                        <EmptyState
                            icon={File}
                            title={searchQuery ? "No matching requests found" : "No signature requests found"}
                            description={searchQuery ? `No requests match "${searchQuery}"` : `No requests found for ${getTimeRangeLabel(timeRange).toLowerCase()}`}
                        />
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Document Title</TableHead>
                                    <TableHead>Sign ID</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>From/To</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Expires</TableHead>
                                    <TableHead className="w-[100px]">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredRequests.map((request) => (
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
                                            {request.document_sign_id ? (
                                                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                                                    🆔 {request.document_sign_id}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-gray-400">No ID</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {getStatusBadge(request)}
                                        </TableCell>
                                        <TableCell>
                                            <button
                                                onClick={() => handleFromToClick(request)}
                                                className="text-sm text-gray-600 hover:text-blue-600 hover:underline cursor-pointer transition-colors text-left"
                                            >
                                                {getFromToDisplay(request)}
                                            </button>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-sm text-gray-600">
                                                {formatDate(request.initiated_at)}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <span className={`text-sm ${getTimeRemaining(request.expires_at, request).includes('Expired')
                                                ? 'text-red-600'
                                                : getTimeRemaining(request.expires_at, request).includes('Completed')
                                                    ? 'text-green-600'
                                                    : 'text-gray-600'
                                                }`}>
                                                {getTimeRemaining(request.expires_at, request)}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center space-x-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handlePreviewPDF(request)}
                                                    title="Preview PDF"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </Button>
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
                                                    <span className="text-sm text-green-600 font-medium">
                                                        ✓ Completed
                                                    </span>
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
                    onStatusUpdate={(requestId, updates) => {
                        // ✅ PERFORMANCE FIX: Update specific request instead of full reload
                        setAllRequests(prev => prev.map(req =>
                            req.id === requestId
                                ? { ...req, ...updates }
                                : req
                        ))
                        setViewingRequest(null)
                    }}
                />
            )}

            {/* Signers Bottom Sheet */}
            {showSignersSheet && (
                <div className="fixed inset-0 z-50 flex items-end justify-center">
                    {/* Backdrop - no opacity overlay */}
                    <div
                        className="fixed inset-0"
                        onClick={() => setShowSignersSheet(null)}
                    />

                    {/* Bottom Sheet */}
                    <div className="relative bg-white rounded-t-lg shadow-xl w-full max-w-md max-h-[70vh] overflow-hidden transform transition-transform duration-300 ease-out translate-y-0">
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-900">
                                {showSignersSheet.type === 'sent' ? 'Document Signers' : 'Sender Information'}
                            </h3>
                            <button
                                onClick={() => setShowSignersSheet(null)}
                                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-4 overflow-y-auto max-h-[calc(70vh-80px)]">
                            {showSignersSheet.type === 'sent' ? (
                                // Show signers for sent requests
                                <div className="space-y-3">
                                    <p className="text-sm text-gray-600 mb-4">
                                        {showSignersSheet.signers?.length === 1
                                            ? 'This document requires a single signature:'
                                            : `This document requires ${showSignersSheet.signers?.length || 0} signatures:`
                                        }
                                    </p>
                                    {showSignersSheet.signers?.map((signer, index) => (
                                        <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                                <Users className="w-4 h-4 text-blue-600" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-medium text-gray-900">{signer.name}</p>
                                                <p className="text-sm text-gray-600">{signer.email}</p>
                                            </div>
                                            <div className="text-right">
                                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${signer.status === 'signed' ? 'bg-green-100 text-green-800' :
                                                    signer.status === 'viewed' ? 'bg-blue-100 text-blue-800' :
                                                        signer.status === 'declined' ? 'bg-red-100 text-red-800' :
                                                            'bg-yellow-100 text-yellow-800'
                                                    }`}>
                                                    {/* Display proper capitalized status */}
                                                    {signer.status === 'signed' ? 'Signed' :
                                                        signer.status === 'viewed' ? 'Viewed' :
                                                            signer.status === 'declined' ? 'Declined' :
                                                                signer.status || 'Pending'}
                                                </span>
                                            </div>
                                        </div>
                                    )) || (
                                            <p className="text-sm text-gray-500 italic">No signers found</p>
                                        )}
                                </div>
                            ) : (
                                // Show sender info for received requests
                                <div className="space-y-3">
                                    <p className="text-sm text-gray-600 mb-4">
                                        This document was sent by:
                                    </p>
                                    <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                            <Send className="w-4 h-4 text-green-600" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-medium text-gray-900">
                                                {showSignersSheet.sender_name || 'Unknown Sender'}
                                            </p>
                                            <p className="text-sm text-gray-600">Sender</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Actions Bottom Sheet */}
            {showActionsSheet && (
                <div className="fixed inset-0 z-50 flex items-end justify-center">
                    {/* Backdrop - no opacity overlay */}
                    <div
                        className="fixed inset-0"
                        onClick={() => setShowActionsSheet(null)}
                    />

                    {/* Bottom Sheet */}
                    <div className="relative bg-white rounded-t-lg shadow-xl w-full max-w-md max-h-[50vh] overflow-hidden transform transition-transform duration-300 ease-out translate-y-0">
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-900">
                                Document Actions
                            </h3>
                            <button
                                onClick={() => setShowActionsSheet(null)}
                                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-4">
                            <div className="space-y-2">
                                {/* Send Reminder Action */}
                                <button
                                    onClick={() => {
                                        handleShare(showActionsSheet)
                                        setShowActionsSheet(null)
                                    }}
                                    className="w-full flex items-center p-3 text-left hover:bg-gray-50 rounded-lg transition-colors"
                                >
                                    <Share2 className="w-5 h-5 text-blue-600 mr-3" />
                                    <div>
                                        <p className="font-medium text-gray-900">Send Reminder</p>
                                        <p className="text-sm text-gray-600">Notify signers about pending signatures</p>
                                    </div>
                                </button>

                                {/* Verify Document Action */}
                                <button
                                    onClick={() => {
                                        const verifyUrl = showActionsSheet.document_sign_id
                                            ? `/verify?documentSignId=${encodeURIComponent(showActionsSheet.document_sign_id)}`
                                            : `/verify?requestId=${showActionsSheet.id}`
                                        window.open(verifyUrl, '_blank')
                                        setShowActionsSheet(null)
                                    }}
                                    className="w-full flex items-center p-3 text-left hover:bg-green-50 rounded-lg transition-colors"
                                >
                                    <Shield className="w-5 h-5 text-green-600 mr-3" />
                                    <div>
                                        <p className="font-medium text-green-900">Verify Document</p>
                                        <p className="text-sm text-green-600">
                                            {showActionsSheet.document_sign_id
                                                ? `Verify using ID: ${showActionsSheet.document_sign_id}`
                                                : 'Verify document authenticity'
                                            }
                                        </p>
                                    </div>
                                </button>

                                {/* Delete Action */}
                                <button
                                    onClick={() => {
                                        handleDelete(showActionsSheet)
                                        setShowActionsSheet(null)
                                    }}
                                    className="w-full flex items-center p-3 text-left hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    <Trash2 className="w-5 h-5 text-red-600 mr-3" />
                                    <div>
                                        <p className="font-medium text-red-900">Delete Request</p>
                                        <p className="text-sm text-red-600">Permanently remove this signature request</p>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Profile Validation Popup */}
            {showProfileValidation && userProfile && (
                <div className="fixed inset-0 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
                        <h3 className="text-lg font-semibold mb-4">Complete Your Profile</h3>
                        <p className="text-sm text-gray-600 mb-4">
                            Before signing, please ensure your profile contains the required information:
                        </p>

                        <div className="space-y-3 mb-6">
                            {/* Name Status */}
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center space-x-3">
                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${userProfile.full_name ? 'bg-green-100' : 'bg-red-100'
                                        }`}>
                                        {userProfile.full_name ? (
                                            <CheckCircle className="w-3 h-3 text-green-600" />
                                        ) : (
                                            <X className="w-3 h-3 text-red-600" />
                                        )}
                                    </div>
                                    <span className="font-medium">Name</span>
                                </div>
                                {userProfile.full_name ? (
                                    <span className="text-sm text-green-600">Available</span>
                                ) : (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                            window.open('/profile', '_blank')
                                        }}
                                    >
                                        Setup
                                    </Button>
                                )}
                            </div>

                            {/* Signature Status */}
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center space-x-3">
                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${userProfile.signatures && userProfile.signatures.length > 0 ? 'bg-green-100' : 'bg-red-100'
                                        }`}>
                                        {userProfile.signatures && userProfile.signatures.length > 0 ? (
                                            <CheckCircle className="w-3 h-3 text-green-600" />
                                        ) : (
                                            <X className="w-3 h-3 text-red-600" />
                                        )}
                                    </div>
                                    <span className="font-medium">Primary Signature</span>
                                </div>
                                {userProfile.signatures && userProfile.signatures.length > 0 ? (
                                    <span className="text-sm text-green-600">Available</span>
                                ) : (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                            window.open('/signatures', '_blank')
                                        }}
                                    >
                                        Setup
                                    </Button>
                                )}
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Button
                                className="w-full"
                                onClick={async () => {
                                    // Re-check profile after setup
                                    const updatedProfile = await fetchUserProfile()
                                    if (updatedProfile) {
                                        const validation = validateProfileForSigning(updatedProfile)
                                        if (validation.isValid && pendingSigningRequest) {
                                            setShowProfileValidation(false)
                                            // Continue with the signing flow
                                            handleSign(pendingSigningRequest)
                                        } else {
                                            alert('Please complete all required profile fields before continuing.')
                                        }
                                    }
                                }}
                            >
                                Check & Continue
                            </Button>
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => {
                                    setShowProfileValidation(false)
                                    setPendingSigningRequest(null)
                                }}
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* PDF Signing Screen */}
            {signingRequest && (
                <PDFSigningScreen
                    request={{
                        id: signingRequest.id,
                        title: signingRequest.title,
                        document_url: signingRequest.document_url || '',
                        expires_at: signingRequest.expires_at || '',
                        signers: signingRequest.signers.map(s => ({
                            id: s.email,
                            name: s.name,
                            email: s.email,
                            status: s.status,
                            signing_order: 1
                        }))
                    }}
                    currentUserEmail={user?.email || ''}
                    onClose={() => setSigningRequest(null)}
                    onSign={handleSignatureAccept}
                    onDecline={handleSignatureDecline}
                />
            )}
        </div>
    )
}
