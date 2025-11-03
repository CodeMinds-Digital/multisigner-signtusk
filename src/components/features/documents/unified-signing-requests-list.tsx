'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { File, CheckCircle, Trash2, Share2, Users, Send, Inbox, Filter, X, Search, Shield, RefreshCw } from 'lucide-react'
import { useAuth } from '@/components/providers/secure-auth-provider'
import type { SignatureRequest } from '@/lib/signature/types/signature-types'
import { SignatureStatus } from '@/lib/signature/types/signature-types'
import { supabase } from '@/lib/supabase'

// Type alias for backward compatibility
type SigningRequestListItem = SignatureRequest
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/ui/loading'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorAlert } from '@/components/ui/alert'
import { RequestDetailsModal } from './request-details-modal'
import { PDFSigningScreen } from './pdf-signing-screen'
import { RequestCard } from './request-card'


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
    document_sign_id?: string // NEW: Document Sign ID
    final_pdf_url?: string
    context_display?: string
    signers?: Array<{
        name: string
        email: string
        status: string
        viewed_at?: string
        signed_at?: string
    }>
    progress?: {
        viewed: number
        signed: number
        total: number
    }
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
    const [timeRange, setTimeRange] = useState<TimeRange>('6m') // Changed from '30d' to '6m' to show more requests by default
    const [searchQuery, setSearchQuery] = useState('') // NEW: Search query state
    const [activeTab, setActiveTab] = useState<'all' | 'sent' | 'received'>('all') // NEW: Active tab state
    const [viewingRequest, setViewingRequest] = useState<UnifiedSigningRequest | null>(null)
    const [showSignersSheet, setShowSignersSheet] = useState<UnifiedSigningRequest | null>(null)
    const [showActionsSheet, setShowActionsSheet] = useState<UnifiedSigningRequest | null>(null)
    const [signingRequest, setSigningRequest] = useState<UnifiedSigningRequest | null>(null)
    const [showProfileValidation, setShowProfileValidation] = useState(false)
    const [pendingSigningRequest, setPendingSigningRequest] = useState<UnifiedSigningRequest | null>(null)
    const [userProfile, setUserProfile] = useState<any>(null)

    // Realtime subscription state (replacing polling)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const realtimeChannelRef = useRef<any>(null)

    // Note: Toast context may not be available in all contexts

    const { user } = useAuth()

    // Helper function to check if all signers have completed signing
    const isRequestCompleted = useCallback((request: UnifiedSigningRequest): boolean => {
        // Check if status is explicitly completed
        if (request.status === 'completed' || request.document_status === 'completed') {
            return true
        }

        // Check if all signers have signed (completed_signers equals total_signers)
        if ((request as any).completed_signers && (request as any).total_signers) {
            return (request as any).completed_signers >= (request as any).total_signers
        }

        return false
    }, [])

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

            // Debug: Log first request to see signers data
            if (allRequests.length > 0) {
                console.log('📊 Sample API request data:', {
                    title: allRequests[0].title,
                    progress: allRequests[0].progress,
                    signers: allRequests[0].signers,
                    signers_length: allRequests[0].signers?.length || 0
                })
            }

            // Filter by date range and categorize requests
            const filteredRequests = allRequests
                .filter((req: any) => {
                    // Use initiated_at (from API) or created_at as fallback
                    const dateField = req.initiated_at || req.created_at
                    const requestDate = new Date(dateField)
                    return requestDate >= dateFilter
                })
                .map((req: any) => {
                    // Determine if this is a sent or received request
                    const isSent = !req.initiated_by_name // Sent requests don't have initiated_by_name

                    // Map progress object to flat fields for compatibility
                    const progress = req.progress || {}

                    return {
                        ...req,
                        type: isSent ? 'sent' as const : 'received' as const,
                        sender_name: req.initiated_by_name,
                        user_status: isSent ? undefined : req.status,
                        created_at: req.initiated_at || req.created_at, // Normalize to created_at for sorting
                        // Map progress fields to expected flat structure
                        total_signers: progress.total || req.total_signers || 0,
                        completed_signers: progress.signed || req.completed_signers || 0,
                        viewed_signers: progress.viewed || req.viewed_signers || 0,
                        // Ensure signers array is available
                        signers: req.signers || []
                    }
                })
                .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

            const sentCount = filteredRequests.filter((req: any) => req.type === 'sent').length
            const receivedCount = filteredRequests.filter((req: any) => req.type === 'received').length

            setRequests(filteredRequests)
            setFilteredRequests(filteredRequests) // NEW: Initialize filtered requests
            setStats({
                total: filteredRequests.length,
                sent: sentCount,
                received: receivedCount
            })
            setFilteredStats({
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
            // Compute stats from requests instead of copying stats to avoid cross-state coupling
            const filteredSentCount = requests.filter(req => req.type === 'sent').length
            const filteredReceivedCount = requests.filter(req => req.type === 'received').length
            setFilteredStats({
                total: requests.length,
                sent: filteredSentCount,
                received: filteredReceivedCount
            })
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
    }, [requests, searchQuery])

    useEffect(() => {
        loadAllRequests()
    }, [loadAllRequests])

    // Supabase Realtime Subscription for live updates (replaces polling)
    useEffect(() => {
        if (!user?.id) return

        console.log('📡 Setting up Supabase Realtime subscription for signing requests')

        // Subscribe to changes in signing_requests table
        const channel = supabase
            .channel('signing-requests-changes')
            .on(
                'postgres_changes',
                {
                    event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
                    schema: 'public',
                    table: 'signing_requests',
                },
                (payload: any) => {
                    console.log('🔔 Realtime update received:', payload.eventType)

                    // Handle different event types
                    if (payload.eventType === 'INSERT') {
                        // New request created - reload all requests
                        console.log('➕ New signing request created')
                        loadAllRequests()
                    } else if (payload.eventType === 'UPDATE') {
                        // Request updated - update specific request in state
                        const updatedRequest = payload.new as any
                        console.log('🔄 Signing request updated:', updatedRequest.id)

                        setRequests(prev => {
                            const existingIndex = prev.findIndex(req => req.id === updatedRequest.id)
                            if (existingIndex === -1) {
                                // Request not in current list, reload all
                                loadAllRequests()
                                return prev
                            }

                            // Update the specific request
                            return prev.map(req =>
                                req.id === updatedRequest.id
                                    ? {
                                        ...req,
                                        status: updatedRequest.status,
                                        final_pdf_url: updatedRequest.final_pdf_url,
                                        updated_at: updatedRequest.updated_at,
                                    }
                                    : req
                            )
                        })
                    } else if (payload.eventType === 'DELETE') {
                        // Request deleted - remove from state
                        const deletedId = (payload.old as any).id
                        console.log('🗑️ Signing request deleted:', deletedId)
                        setRequests(prev => prev.filter(req => req.id !== deletedId))
                    }
                }
            )
            .subscribe((status: string) => {
                console.log('📡 Realtime subscription status:', status)
            })

        realtimeChannelRef.current = channel

        // Cleanup on unmount
        return () => {
            console.log('📡 Cleaning up Realtime subscription')
            if (realtimeChannelRef.current) {
                supabase.removeChannel(realtimeChannelRef.current)
                realtimeChannelRef.current = null
            }
        }
    }, [user?.id, loadAllRequests])

    // Manual refresh function
    const handleManualRefresh = useCallback(async () => {
        setIsRefreshing(true)
        await loadAllRequests()
        setTimeout(() => setIsRefreshing(false), 500)
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
                const completedAt = request.updated_at || request.created_at
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
        // Parse the UTC date string and convert to local timezone for display
        const expiry = new Date(expiresAt)
        const diffTime = expiry.getTime() - now.getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        // Format the full date and time in user's local timezone
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

        // If documentPath is already a full HTTP URL, use it directly
        if (documentPath.startsWith('http')) {
            console.log('✅ Document path is already a full URL, opening directly:', documentPath)
            window.open(documentPath, '_blank')
            return
        }

        // Extract just the file path if it contains the full storage URL structure
        let cleanPath = documentPath
        if (documentPath.includes('/storage/v1/object/public/')) {
            // Extract the path after the bucket name
            const urlParts = documentPath.split('/storage/v1/object/public/')
            if (urlParts.length > 1) {
                const pathWithBucket = urlParts[1]
                // Remove bucket name from the beginning (e.g., "documents/" or "files/")
                const pathParts = pathWithBucket.split('/')
                if (pathParts.length > 1) {
                    cleanPath = pathParts.slice(1).join('/')
                    console.log('🧹 Cleaned path from URL:', cleanPath)
                }
            }
        }

        // For Sign Inbox documents, use 'documents' bucket only (PDFs are stored here)
        // User confirmed: files bucket contains only JSON schemas, documents bucket contains PDFs
        const buckets = ['documents']
        let pdfUrl = null

        for (const bucket of buckets) {
            try {
                console.log(`🔍 Trying bucket: ${bucket} with path: ${cleanPath}`)
                const previewResponse = await fetch(`/api/documents/preview?bucket=${bucket}&path=${encodeURIComponent(cleanPath)}`)
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
        console.log('👥 Request data:', {
            total_signers: request.total_signers,
            completed_signers: request.completed_signers,
            viewed_signers: request.viewed_signers,
            signers: request.signers,
            signers_length: request.signers?.length || 0
        })
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
        if (request.type === 'sent') {
            // For sent requests, show recipient information
            const signerCount = request.total_signers || 0
            if (signerCount === 1) {
                return `To: 1 recipient`
            } else if (signerCount > 1) {
                return `To: ${signerCount} recipients`
            }
            return `To: ${signerCount} recipient${signerCount !== 1 ? 's' : ''}`
        } else {
            // For received requests, show sender name
            return `From: ${request.sender_name || 'Unknown'}`
        }
    }

    const getAllSignersDisplay = (request: UnifiedSigningRequest) => {
        const totalSigners = request.total_signers || 0
        const completedSigners = request.completed_signers || 0
        if (totalSigners === 0) return null

        return (
            <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-700">
                        {completedSigners} of {totalSigners} signed
                    </span>
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                            className="bg-green-600 h-2 rounded-full"
                            style={{ width: `${totalSigners > 0 ? (completedSigners / totalSigners) * 100 : 0}%` }}
                        ></div>
                    </div>
                </div>
            </div>
        )
    }

    const getSignatureTypeDisplay = (request: UnifiedSigningRequest) => {
        const signerCount = request.total_signers || 0

        if (signerCount === 1) {
            return (
                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                    Single Signature
                </span>
            )
        } else if (signerCount > 1) {
            // Get signing mode from metadata
            const signingMode = (request.metadata as any)?.signing_mode || 'sequential'
            const modeLabel = signingMode === 'parallel' ? 'Parallel' : 'Sequential'
            const modeColor = signingMode === 'parallel' ? 'bg-purple-100 text-purple-800' : 'bg-indigo-100 text-indigo-800'

            return (
                <div className="flex flex-col gap-1">
                    <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${modeColor}`}>
                        Multi-Signature ({signerCount})
                    </span>
                    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700">
                        {modeLabel} Mode
                    </span>
                </div>
            )
        }
        return (
            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800">
                No Signers
            </span>
        )
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

    // Adapter function to convert UnifiedSigningRequest to RequestDetailsModal format
    const adaptRequestForModal = (request: UnifiedSigningRequest) => {
        return {
            ...request,
            initiated_at: request.created_at,
            progress: {
                viewed: request.viewed_signers,
                signed: request.completed_signers,
                total: request.total_signers
            },
            signers: request.signers || [] // Use actual signers array from the request
        }
    }

    // Get requests filtered by active tab
    const getTabFilteredRequests = (): UnifiedSigningRequest[] => {
        if (activeTab === 'all') return filteredRequests
        return filteredRequests.filter(req => req.type === activeTab)
    }

    // Get stats for current tab
    const getTabStats = () => {
        const tabRequests = getTabFilteredRequests()
        return {
            total: tabRequests.length,
            sent: tabRequests.filter(r => r.type === 'sent').length,
            received: tabRequests.filter(r => r.type === 'received').length
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
                    <Button
                        onClick={handleManualRefresh}
                        variant="outline"
                        size="sm"
                        disabled={isRefreshing}
                        className="flex items-center gap-2"
                        title="Refresh data"
                    >
                        <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                        {isRefreshing ? 'Refreshing...' : 'Refresh'}
                    </Button>
                    <div className="relative" data-tour="search">
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

            {/* Requests List with Tabs */}
            <Card>
                <CardHeader>
                    <CardTitle>Signature Requests</CardTitle>
                    <CardDescription>
                        View and manage your signature requests
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

                    <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'all' | 'sent' | 'received')}>
                        <TabsList className="grid w-full grid-cols-3 mb-4">
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
                                <div className="space-y-3">{getTabFilteredRequests().map((request) => (
                                    <RequestCard
                                        key={`${request.type}-${request.id}`}
                                        request={request}
                                        showType={true}
                                        getStatusBadge={getStatusBadge}
                                        getFromToDisplay={getFromToDisplay}
                                        getAllSignersDisplay={getAllSignersDisplay}
                                        getSignatureTypeDisplay={getSignatureTypeDisplay}
                                        formatDate={formatDate}
                                        getTimeRemaining={getTimeRemaining}
                                        handleFromToClick={handleFromToClick}
                                        handlePreviewPDF={handlePreviewPDF}
                                        handleViewDetails={handleViewDetails}
                                        handleSign={handleSign}
                                        isRequestCompleted={isRequestCompleted}
                                        setShowActionsSheet={setShowActionsSheet}
                                        isPolling={false}
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
                                <div className="space-y-3">{getTabFilteredRequests().map((request) => (
                                    <RequestCard
                                        key={`${request.type}-${request.id}`}
                                        request={request}
                                        showType={false}
                                        getStatusBadge={getStatusBadge}
                                        getFromToDisplay={getFromToDisplay}
                                        getAllSignersDisplay={getAllSignersDisplay}
                                        getSignatureTypeDisplay={getSignatureTypeDisplay}
                                        formatDate={formatDate}
                                        getTimeRemaining={getTimeRemaining}
                                        handleFromToClick={handleFromToClick}
                                        handlePreviewPDF={handlePreviewPDF}
                                        handleViewDetails={handleViewDetails}
                                        handleSign={handleSign}
                                        isRequestCompleted={isRequestCompleted}
                                        setShowActionsSheet={setShowActionsSheet}
                                        isPolling={false}
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
                                <div className="space-y-3">{getTabFilteredRequests().map((request) => (
                                    <RequestCard
                                        key={`${request.type}-${request.id}`}
                                        request={request}
                                        showType={false}
                                        getStatusBadge={getStatusBadge}
                                        getFromToDisplay={getFromToDisplay}
                                        getAllSignersDisplay={getAllSignersDisplay}
                                        getSignatureTypeDisplay={getSignatureTypeDisplay}
                                        formatDate={formatDate}
                                        getTimeRemaining={getTimeRemaining}
                                        handleFromToClick={handleFromToClick}
                                        handlePreviewPDF={handlePreviewPDF}
                                        handleViewDetails={handleViewDetails}
                                        handleSign={handleSign}
                                        isRequestCompleted={isRequestCompleted}
                                        setShowActionsSheet={setShowActionsSheet}
                                        isPolling={false}
                                    />
                                ))}
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card >

            {/* Request Details Modal */}
            {
                viewingRequest && (
                    <RequestDetailsModal
                        request={adaptRequestForModal(viewingRequest)}
                        isOpen={!!viewingRequest}
                        onClose={() => setViewingRequest(null)}
                        currentUserEmail={user?.email}
                        onStatusUpdate={(requestId, updates) => {
                            // ✅ PERFORMANCE FIX: Update specific request instead of full reload
                            setRequests(prev => prev.map(req =>
                                req.id === requestId
                                    ? {
                                        ...req,
                                        status: updates.status as SignatureStatus,
                                        completed_signers: updates.signed_count,
                                        total_signers: updates.total_signers,
                                        updated_at: updates.updated_at
                                    }
                                    : req
                            ))
                            setViewingRequest(null)
                        }}
                    />
                )
            }

            {/* Signers Side Sheet */}
            {
                showSignersSheet && (
                    <>
                        {/* Backdrop */}
                        <div
                            className="fixed inset-0 bg-black/10 z-[9998]"
                            onClick={() => setShowSignersSheet(null)}
                        />

                        {/* Side Sheet */}
                        <div className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-[9999] flex flex-col">
                            {/* Header */}
                            <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
                                <h3 className="text-lg font-semibold text-gray-900">
                                    {showSignersSheet.type === 'sent' ? `Document Signers (${showSignersSheet.signers?.length || 0})` : 'Sender Information'}
                                </h3>
                                <button
                                    onClick={() => setShowSignersSheet(null)}
                                    className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                                >
                                    <X className="w-5 h-5 text-gray-500" />
                                </button>
                            </div>

                            {/* Scrollable Content */}
                            <div
                                className="flex-1 overflow-y-auto p-4"
                                style={{
                                    overflowY: 'auto',
                                    WebkitOverflowScrolling: 'touch'
                                }}
                            >
                                {showSignersSheet.type === 'sent' ? (
                                    // Show signer details for sent requests
                                    <div className="space-y-4">
                                        <p className="text-sm text-gray-600">
                                            {showSignersSheet.total_signers === 1
                                                ? 'This document requires a single signature:'
                                                : `This document requires ${showSignersSheet.total_signers} signatures:`
                                            }
                                        </p>

                                        {/* Progress Summary */}
                                        <div className="p-4 bg-gray-50 rounded-lg">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm font-medium text-gray-700">Progress</span>
                                                <span className="text-sm font-medium text-gray-900">
                                                    {showSignersSheet.completed_signers} / {showSignersSheet.total_signers}
                                                </span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div
                                                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                                    style={{ width: `${(showSignersSheet.completed_signers / showSignersSheet.total_signers) * 100}%` }}
                                                />
                                            </div>
                                            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                                                <div className="flex items-center gap-1">
                                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                                    <span className="text-gray-600">Signed: {showSignersSheet.completed_signers}</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                                    <span className="text-gray-600">Viewed: {showSignersSheet.viewed_signers}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Individual Signers List */}
                                        {showSignersSheet.signers && showSignersSheet.signers.length > 0 && (
                                            <div className="space-y-2">
                                                <h4 className="text-sm font-medium text-gray-700">Signers</h4>
                                                <div className="space-y-2">
                                                    {showSignersSheet.signers.map((signer: any, index: number) => (
                                                        <div key={index} className="flex items-start space-x-3 p-3 bg-white border border-gray-200 rounded-lg">
                                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${signer.status === 'signed' || signer.status === 'completed'
                                                                ? 'bg-green-100'
                                                                : signer.status === 'viewed'
                                                                    ? 'bg-blue-100'
                                                                    : 'bg-gray-100'
                                                                }`}>
                                                                <Users className={`w-4 h-4 ${signer.status === 'signed' || signer.status === 'completed'
                                                                    ? 'text-green-600'
                                                                    : signer.status === 'viewed'
                                                                        ? 'text-blue-600'
                                                                        : 'text-gray-600'
                                                                    }`} />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="font-medium text-gray-900 truncate">{signer.name || 'Unknown'}</p>
                                                                <p className="text-sm text-gray-600 truncate">{signer.email}</p>
                                                                <div className="mt-1">
                                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${signer.status === 'signed' || signer.status === 'completed'
                                                                        ? 'bg-green-100 text-green-800'
                                                                        : signer.status === 'viewed'
                                                                            ? 'bg-blue-100 text-blue-800'
                                                                            : signer.status === 'declined'
                                                                                ? 'bg-red-100 text-red-800'
                                                                                : 'bg-yellow-100 text-yellow-800'
                                                                        }`}>
                                                                        {signer.status === 'signed' || signer.status === 'completed' ? '✓ Signed' :
                                                                            signer.status === 'viewed' ? '👁 Viewed' :
                                                                                signer.status === 'declined' ? '✗ Declined' :
                                                                                    '⏳ Pending'}
                                                                    </span>
                                                                </div>
                                                                {signer.signed_at && (
                                                                    <p className="text-xs text-gray-500 mt-1">
                                                                        Signed: {new Date(signer.signed_at).toLocaleDateString()}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
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
                    </>
                )
            }

            {/* Actions Side Sheet */}
            {
                showActionsSheet && (
                    <>
                        {/* Backdrop */}
                        <div
                            className="fixed inset-0 bg-black/10 z-[9998]"
                            onClick={() => setShowActionsSheet(null)}
                        />

                        {/* Side Sheet */}
                        <div className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-[9999] flex flex-col">
                            {/* Header */}
                            <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
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

                            {/* Scrollable Content */}
                            <div
                                className="flex-1 overflow-y-auto p-4"
                                style={{
                                    overflowY: 'auto',
                                    WebkitOverflowScrolling: 'touch'
                                }}
                            >
                                <div className="space-y-2">
                                    {/* Send Reminder Action - Only show if not expired */}
                                    {!getTimeRemaining(showActionsSheet.expires_at, showActionsSheet).includes('Expired') && (
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
                                    )}

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
                    </>
                )
            }

            {/* Profile Validation Popup */}
            {
                showProfileValidation && userProfile && (
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
                )
            }

            {/* PDF Signing Screen */}
            {
                signingRequest && (
                    <PDFSigningScreen
                        request={{
                            id: signingRequest.id,
                            title: signingRequest.title,
                            document_url: signingRequest.document_url || '',
                            expires_at: signingRequest.expires_at || '',
                            signers: [] // Signer details not available in list view
                        }}
                        currentUserEmail={user?.email || ''}
                        onClose={() => setSigningRequest(null)}
                        onSign={handleSignatureAccept}
                        onDecline={handleSignatureDecline}
                    />
                )
            }
        </div >
    )
}
