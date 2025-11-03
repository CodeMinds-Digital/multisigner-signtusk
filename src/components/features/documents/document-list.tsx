'use client'

import { useState, useEffect, useCallback } from 'react'
import { File, Clock, CheckCircle, AlertTriangle, MoreHorizontal, Eye, Trash2, Share2, Users, Calendar } from 'lucide-react'
import { useAuth } from '@/components/providers/secure-auth-provider'
import { signatureService } from '@/lib/signature/core/signature-service'
import type { SignatureRequest } from '@/lib/signature/types/signature-types'
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

// Type alias for backward compatibility
type SigningRequestListItem = SignatureRequest

interface DocumentListProps {
    onRefresh?: () => void
}

export function DocumentList({ onRefresh }: DocumentListProps) {
    const [signingRequests, setSigningRequests] = useState<SigningRequestListItem[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const { user } = useAuth()

    // Helper function to check if all signers have completed signing
    const isRequestCompleted = (request: SigningRequestListItem): boolean => {
        // Check if status is explicitly completed
        if (request.status === 'completed') {
            return true
        }

        // Check if all signers have signed based on counts
        if (request.total_signers > 0 && request.completed_signers === request.total_signers) {
            return true
        }

        return false
    }

    // Helper function to check if a request is expired
    const isRequestExpired = (request: SigningRequestListItem): boolean => {
        if (!request.expires_at) return false
        return new Date(request.expires_at) < new Date()
    }

    const loadSigningRequests = useCallback(async () => {
        if (!user?.id) return

        setLoading(true)
        setError('')

        try {
            const result = await signatureService.listRequests(user.id, user.email || '', {
                view: 'sent',
                page: 1,
                pageSize: 100
            })

            if (result.success) {
                setSigningRequests(result.data || [])
            } else {
                setError(result.error?.message || 'Failed to load requests')
            }
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
    }, [onRefresh, loadSigningRequests])

    const handleCancel = async (requestId: string) => {
        if (!user?.id || !confirm('Are you sure you want to cancel this signing request?')) return

        try {
            const result = await signatureService.deleteRequest(requestId, user.id, user.email || '')
            if (result.success) {
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
                loadSigningRequests()
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
                                        <div className="flex items-center gap-2">
                                            <Users className="h-4 w-4 text-gray-500" />
                                            <span className="text-sm text-gray-600">
                                                {request.completed_signers}/{request.total_signers} signed
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center space-x-2">
                                            <div className="w-16 bg-gray-200 rounded-full h-2">
                                                <div
                                                    className="bg-blue-600 h-2 rounded-full"
                                                    style={{ width: `${request.total_signers > 0 ? (request.completed_signers / request.total_signers) * 100 : 0}%` }}
                                                ></div>
                                            </div>
                                            <span className="text-xs text-gray-600">
                                                {request.completed_signers}/{request.total_signers}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-sm text-gray-600">
                                            {formatDate(request.created_at)}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center space-x-1">
                                            <span className="text-sm text-gray-600">
                                                {request.expires_at ? formatDate(request.expires_at) : 'No expiry'}
                                            </span>
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
                                                    {/* Only show Send Reminder if not expired */}
                                                    {!isRequestExpired(request) && (
                                                        <DropdownMenuItem onClick={() => handleShare(request)}>
                                                            <Share2 className="w-4 h-4 mr-2" />
                                                            Send Reminder
                                                        </DropdownMenuItem>
                                                    )}
                                                    <DropdownMenuItem
                                                        onClick={() => handleCancel(request.id)}
                                                        className="text-red-600"
                                                        disabled={request.status === 'completed' || request.status === 'cancelled'}
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