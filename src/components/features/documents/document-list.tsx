'use client'

import { useState, useEffect } from 'react'
import { File, Clock, CheckCircle, AlertTriangle, MoreHorizontal, Eye, Download, Trash2, Share2, Users, Calendar } from 'lucide-react'
import { useAuth } from '@/components/providers/auth-provider'
import { SigningWorkflowService, type SigningRequestListItem } from '@/lib/signing-workflow-service'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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

    const loadSigningRequests = async () => {
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
    }

    useEffect(() => {
        loadSigningRequests()
    }, [user])

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

        const config = variants[baseStatus] || variants['Initiated']
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

    const handleShare = (request: SigningRequestListItem) => {
        // TODO: Implement reminder sending
        console.log('Send reminder for signing request:', request)
    }

    if (loading) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-gray-600">Loading documents...</span>
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
                    <div className="mb-4 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                        {error}
                    </div>
                )}

                {signingRequests.length === 0 ? (
                    <div className="text-center py-8">
                        <File className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No signing requests yet</h3>
                        <p className="text-gray-500">Create your first signing request to get started</p>
                    </div>
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
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="sm">
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