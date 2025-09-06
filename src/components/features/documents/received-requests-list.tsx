'use client'

import { useState, useEffect } from 'react'
import { File, Clock, CheckCircle, AlertTriangle, MoreHorizontal, Eye, Download, Trash2, Share2, Users, Calendar } from 'lucide-react'
import { useAuth } from '@/components/providers/auth-provider'
import { SigningWorkflowService, type SigningRequestListItem } from '@/lib/signing-workflow-service'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/ui/loading'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorAlert } from '@/components/ui/alert'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'

interface ReceivedRequestsListProps {
    onRefresh?: () => void
}

export function ReceivedRequestsList({ onRefresh }: ReceivedRequestsListProps) {
    const [receivedRequests, setReceivedRequests] = useState<SigningRequestListItem[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [viewingRequest, setViewingRequest] = useState<SigningRequestListItem | null>(null)
    const { user } = useAuth()

    const loadReceivedRequests = async () => {
        if (!user?.id) return

        setLoading(true)
        setError('')

        try {
            // Get requests where the user is a signer
            const requests = await SigningWorkflowService.getReceivedSigningRequests(user.email)
            setReceivedRequests(requests)
        } catch (err) {
            setError('Failed to load received signing requests')
            console.error('Error loading received signing requests:', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadReceivedRequests()
    }, [user])

    const getStatusBadge = (status: string) => {
        const statusConfig = {
            pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
            viewed: { label: 'Viewed', color: 'bg-blue-100 text-blue-800' },
            signed: { label: 'Signed', color: 'bg-green-100 text-green-800' },
            declined: { label: 'Declined', color: 'bg-red-100 text-red-800' },
            expired: { label: 'Expired', color: 'bg-gray-100 text-gray-800' }
        }

        const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending

        return (
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
                {config.label}
            </span>
        )
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        })
    }

    const getTimeRemaining = (expiresAt: string) => {
        const now = new Date()
        const expiry = new Date(expiresAt)
        const diffTime = expiry.getTime() - now.getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        if (diffDays < 0) return 'Expired'
        if (diffDays === 0) return 'Expires today'
        if (diffDays === 1) return 'Expires tomorrow'
        return `${diffDays} days left`
    }

    const handleSign = (request: SigningRequestListItem) => {
        // TODO: Implement signing flow
        console.log('Sign document:', request)
    }

    const handleView = (request: SigningRequestListItem) => {
        // TODO: Implement document preview
        console.log('View document:', request)
        setViewingRequest(request)
    }

    const handleDecline = (request: SigningRequestListItem) => {
        // TODO: Implement decline flow
        console.log('Decline signing request:', request)
    }

    if (loading) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center py-8">
                    <LoadingSpinner size="lg" />
                    <span className="ml-3 text-gray-600">Loading received requests...</span>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Received Signature Requests</CardTitle>
                <CardDescription>
                    Documents waiting for your signature
                </CardDescription>
            </CardHeader>
            <CardContent>
                {error && (
                    <div className="mb-4">
                        <ErrorAlert
                            error={error}
                            onRetry={() => loadReceivedRequests()}
                            onClose={() => setError('')}
                        />
                    </div>
                )}

                {receivedRequests.length === 0 ? (
                    <EmptyState
                        icon={File}
                        title="No signature requests received"
                        description="You haven't received any documents to sign yet"
                    />
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Document Title</TableHead>
                                <TableHead>From</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Received</TableHead>
                                <TableHead>Expires</TableHead>
                                <TableHead className="w-[100px]">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {receivedRequests.map((request) => (
                                <TableRow key={request.id}>
                                    <TableCell>
                                        <div className="flex items-center space-x-2">
                                            <File className="w-4 h-4 text-gray-400" />
                                            <span className="font-medium">{request.title}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-sm text-gray-600">
                                            {request.initiated_by_name || 'Unknown'}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        {getStatusBadge(request.status)}
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-sm text-gray-600">
                                            {formatDate(request.initiated_at)}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <span className={`text-sm ${
                                            getTimeRemaining(request.expires_at).includes('Expired') 
                                                ? 'text-red-600' 
                                                : 'text-gray-600'
                                        }`}>
                                            {getTimeRemaining(request.expires_at)}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center space-x-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleView(request)}
                                            >
                                                <Eye className="w-4 h-4" />
                                            </Button>
                                            {request.status === 'pending' && (
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleSign(request)}
                                                    className="bg-blue-600 hover:bg-blue-700"
                                                >
                                                    Sign
                                                </Button>
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
    )
}
