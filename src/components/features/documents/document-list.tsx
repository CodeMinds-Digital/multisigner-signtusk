'use client'

import { useState, useEffect, useCallback } from 'react'
import { File, Clock, CheckCircle, AlertTriangle, MoreHorizontal, Eye, Download, Trash2, Share2, Users, Calendar } from 'lucide-react'
import { useAuth } from '@/components/providers/secure-auth-provider'
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
import { Badge } from '@/components/ui/badge'

interface DocumentListProps {
    onRefresh?: () => void
}

export function DocumentList({ onRefresh }: DocumentListProps) {
    const [signingRequests, setSigningRequests] = useState<SigningRequestListItem[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [viewingRequest, setViewingRequest] = useState<SigningRequestListItem | null>(null)
    const { user } = useAuth()

    // Helper function to check if all signers have completed signing
    const isRequestCompleted = (request: SigningRequestListItem): boolean => {
        // Check if status is explicitly completed
        if (request.status === 'Completed' || request.status === 'completed') {
            return true
        }

        // Check if all signers have signed (signed equals total)
        if (request.progress && request.progress.signed >= request.progress.total) {
            return true
        }

        return false
    }

    const loadSigningRequests = useCallback(async () => {
        if (!user?.id) return

        setLoading(true)
        setError('')

        try {
            const requests = await SigningWorkflowService.getSigningRequests(user.id)
            setSigningRequests(requests)
        } catch (err) {
            setError('Failed to load signing requests')
            console.error('Error loading signing requests:', err)
        } finally {
            setLoading(false)
        }
    }, [user])

    useEffect(() => {
        loadSigningRequests()
    }, [loadSigningRequests])

    useEffect(() => {
        if (onRefresh) {
            loadSigningRequests()
        }
    }, [onRefresh])

    const handleCancel = async (requestId: string) => {
        if (!user?.id || !confirm('Are you sure you want to cancel this signing request?')) return

        try {
            const success = await SigningWorkflowService.cancelSigningRequest(requestId, user.id)
            if (success) {
                setSigningRequests(requests => requests.filter(req => req.id !== requestId))
                onRefresh?.()
            } else {
                setError('Failed to cancel signing request')
            }
        } catch (err) {
            setError('Failed to cancel signing request')
            console.error('Error cancelling signing request:', err)
        }
    }

    const getStatusBadge = (status: string) => {
        const variants = {
            'Initiated': { variant: 'outline' as const, icon: Clock, color: 'text-blue-600' },
            'Viewed': { variant: 'secondary' as const, icon: Eye, color: 'text-yellow-600' },
            'Signed': { variant: 'secondary' as const, icon: Users, color: 'text-orange-600' },
            'Completed': { variant: 'default' as const, icon: CheckCircle, color: 'text-green-600' },
            'Expired': { variant: 'destructive' as const, icon: AlertTriangle, color: 'text-red-600' },
            'Cancelled': { variant: 'destructive' as const, icon: AlertTriangle, color: 'text-red-600' }
        }

        // Handle status patterns like "Viewed (1/2)" or "Signed (2/3)"
        let baseStatus = status
        if (status.includes('Viewed')) baseStatus = 'Viewed'
        else if (status.includes('Signed')) baseStatus = 'Signed'

        const config = variants[baseStatus as keyof typeof variants] || variants['Initiated']
        const Icon = config.icon

        return (
            <Badge variant={config.variant} className="flex items-center gap-1">
                <Icon className={`w-3 h-3 ${config.color}`} />
                {status}
            </Badge>
        )
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        })
    }

    const handleView = (request: SigningRequestListItem) => {
        // TODO: Implement signing request details view
        console.log('View signing request details:', request)
        setViewingRequest(request)
    }

    const handleShare = async (request: SigningRequestListItem) => {
        console.log('Send reminder for signing request:', request)

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
                // Refresh the list
                fetchSigningRequests()
            } else {
                alert(result.error || 'Failed to send reminder')
            }
        } catch (error) {
            console.error('Error sending reminder:', error)
            alert('Failed to send reminder. Please try again.')
        }
    }

    if (loading) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center py-8">
                    <LoadingSpinner size="lg" />
                    <span className="ml-3 text-gray-600">Loading documents...</span>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Signing Requests</CardTitle>
                <CardDescription>
                    Track document signing progress and manage workflows
                </CardDescription>
            </CardHeader>
            <CardContent>
                {error && (
                    <div className="mb-4">
                        <ErrorAlert
                            error={error}
                            onRetry={() => loadSigningRequests()}
                            onClose={() => setError('')}
                        />
                    </div>
                )}

                {signingRequests.length === 0 ? (
                    <EmptyState
                        icon={File}
                        title="No signing requests yet"
                        description="Create your first signing request to get started"
                        action={{
                            label: 'Request Signature',
                            onClick: () => onRefresh?.()
                        }}
                    />
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Document Title</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Signers</TableHead>
                                <TableHead>Progress</TableHead>
                                <TableHead>Initiated</TableHead>
                                <TableHead>Expires</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {signingRequests.map((request) => (
                                <TableRow key={request.id}>
                                    <TableCell>
                                        <div className="flex items-center space-x-2">
                                            <File className="w-4 h-4 text-gray-400" />
                                            <span className="font-medium">{request.title}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {getStatusBadge(request.status)}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex -space-x-2">
                                            {request.signers.slice(0, 3).map((signer, i) => {
                                                const statusColor = signer.signed_at
                                                    ? 'bg-green-500 text-white'
                                                    : signer.viewed_at
                                                        ? 'bg-yellow-500 text-white'
                                                        : 'bg-gray-200 text-gray-700'

                                                return (
                                                    <div
                                                        key={i}
                                                        title={`${signer.name} (${signer.email}) - ${signer.status}`}
                                                        className={`h-6 w-6 rounded-full flex items-center justify-center font-semibold text-xs uppercase border-2 border-white ${statusColor}`}
                                                    >
                                                        {signer.name.charAt(0)}
                                                    </div>
                                                )
                                            })}
                                            {request.signers.length > 3 && (
                                                <div className="h-6 w-6 rounded-full flex items-center justify-center bg-gray-100 text-gray-500 text-xs border-2 border-white">
                                                    +{request.signers.length - 3}
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center space-x-2">
                                            <div className="w-16 bg-gray-200 rounded-full h-2">
                                                <div
                                                    className="bg-blue-600 h-2 rounded-full"
                                                    style={{ width: `${(request.progress.signed / request.progress.total) * 100}%` }}
                                                ></div>
                                            </div>
                                            <span className="text-xs text-gray-600">
                                                {request.progress.signed}/{request.progress.total}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-sm text-gray-600">
                                            {formatDate(request.initiated_at)}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center space-x-1">
                                            <span className="text-sm text-gray-600">
                                                {request.expires_at ? formatDate(request.expires_at) : 'No expiry'}
                                            </span>
                                            {request.days_remaining !== undefined && request.days_remaining <= 3 && (
                                                <div className="flex items-center space-x-1">
                                                    <Calendar className="w-3 h-3 text-orange-500" />
                                                    <span className="text-xs text-orange-600">
                                                        {request.days_remaining === 0 ? 'Today' : `${request.days_remaining}d`}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {!isRequestCompleted(request) ? (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="sm" title="Document Actions">
                                                        <MoreHorizontal className="w-4 h-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => handleView(request)}>
                                                        <Eye className="w-4 h-4 mr-2" />
                                                        View Details
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleShare(request)}>
                                                        <Share2 className="w-4 h-4 mr-2" />
                                                        Send Reminder
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() => handleCancel(request.id)}
                                                        className="text-red-600"
                                                        disabled={request.status === 'Completed' || request.status === 'Cancelled'}
                                                    >
                                                        <Trash2 className="w-4 h-4 mr-2" />
                                                        Cancel Request
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        ) : (
                                            <span className="text-sm text-green-600 font-medium">
                                                ✓ Completed
                                            </span>
                                        )}
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