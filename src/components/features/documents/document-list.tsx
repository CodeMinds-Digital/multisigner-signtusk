'use client'

import { useState, useEffect } from 'react'
import { File, Clock, CheckCircle, AlertTriangle, MoreHorizontal, Eye, Download, Trash2, Share2 } from 'lucide-react'
import { useAuth } from '@/components/providers/auth-provider'
import { getDocuments, deleteDocument, type Document as DocumentType } from '@/lib/document-store'
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
import PDFViewer from './pdf-viewer'
import DocumentSharing from './document-sharing'

interface DocumentListProps {
    onRefresh?: () => void
}

export function DocumentList({ onRefresh }: DocumentListProps) {
    const [documents, setDocuments] = useState<DocumentType[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [viewingDocument, setViewingDocument] = useState<DocumentType | null>(null)
    const [sharingDocument, setSharingDocument] = useState<DocumentType | null>(null)
    const { user } = useAuth()

    const loadDocuments = async () => {
        if (!user) return

        setLoading(true)
        setError('')

        try {
            const docs = await getDocuments(user.id)
            setDocuments(docs)
        } catch (err) {
            setError('Failed to load documents')
            console.error('Error loading documents:', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadDocuments()
    }, [user])

    const handleDelete = async (documentId: string) => {
        if (!user || !confirm('Are you sure you want to delete this document?')) return

        try {
            const result = await deleteDocument(documentId, user.id)
            if (result.success) {
                setDocuments(docs => docs.filter(doc => doc.document_id !== documentId))
                onRefresh?.()
            } else {
                setError(result.error || 'Failed to delete document')
            }
        } catch (err) {
            setError('Failed to delete document')
            console.error('Error deleting document:', err)
        }
    }

    const getStatusBadge = (status: DocumentType['status']) => {
        const variants = {
            pending: { variant: 'secondary' as const, icon: Clock, color: 'text-yellow-600' },
            completed: { variant: 'default' as const, icon: CheckCircle, color: 'text-green-600' },
            draft: { variant: 'outline' as const, icon: File, color: 'text-blue-600' },
            expired: { variant: 'destructive' as const, icon: AlertTriangle, color: 'text-red-600' },
            waiting: { variant: 'secondary' as const, icon: Clock, color: 'text-orange-600' }
        }

        const config = variants[status] || variants.draft
        const Icon = config.icon

        return (
            <Badge variant={config.variant} className="flex items-center gap-1">
                <Icon className={`w-3 h-3 ${config.color}`} />
                {status.charAt(0).toUpperCase() + status.slice(1)}
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

    const handleView = (document: DocumentType) => {
        setViewingDocument(document)
    }

    const handleShare = (document: DocumentType) => {
        setSharingDocument(document)
    }

    if (viewingDocument) {
        return (
            <PDFViewer
                fileUrl={viewingDocument.public_url}
                fileName={viewingDocument.name}
                onClose={() => setViewingDocument(null)}
            />
        )
    }

    if (sharingDocument) {
        return (
            <DocumentSharing
                documentId={sharingDocument.document_id || sharingDocument.id}
                documentName={sharingDocument.name}
                onClose={() => setSharingDocument(null)}
            />
        )
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
                <CardTitle>Documents</CardTitle>
                <CardDescription>
                    Manage your documents and track their status
                </CardDescription>
            </CardHeader>
            <CardContent>
                {error && (
                    <div className="mb-4 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                        {error}
                    </div>
                )}

                {documents.length === 0 ? (
                    <div className="text-center py-8">
                        <File className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No documents yet</h3>
                        <p className="text-gray-500">Upload your first document to get started</p>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Document Name</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Recipients</TableHead>
                                <TableHead>Due Date</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {documents.map((doc) => (
                                <TableRow key={doc.id}>
                                    <TableCell>
                                        <div className="flex items-center space-x-2">
                                            <File className="w-4 h-4 text-gray-400" />
                                            <span className="font-medium">{doc.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-sm text-gray-600">{doc.document_type}</span>
                                    </TableCell>
                                    <TableCell>
                                        {getStatusBadge(doc.status)}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex -space-x-2">
                                            {doc.recipients.slice(0, 3).map((email, i) => (
                                                <div
                                                    key={i}
                                                    title={email}
                                                    className="h-6 w-6 rounded-full flex items-center justify-center bg-gray-200 text-gray-700 font-semibold text-xs uppercase border-2 border-white"
                                                >
                                                    {email.charAt(0)}
                                                </div>
                                            ))}
                                            {doc.recipients.length > 3 && (
                                                <div className="h-6 w-6 rounded-full flex items-center justify-center bg-gray-100 text-gray-500 text-xs border-2 border-white">
                                                    +{doc.recipients.length - 3}
                                                </div>
                                            )}
                                            {doc.recipients.length === 0 && (
                                                <span className="text-sm text-gray-400">No recipients</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-sm text-gray-600">
                                            {formatDate(doc.due_date)}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="sm">
                                                    <MoreHorizontal className="w-4 h-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleView(doc)}>
                                                    <Eye className="w-4 h-4 mr-2" />
                                                    View
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleShare(doc)}>
                                                    <Share2 className="w-4 h-4 mr-2" />
                                                    Share
                                                </DropdownMenuItem>
                                                <DropdownMenuItem asChild>
                                                    <a href={doc.public_url} download={doc.name} target="_blank" rel="noopener noreferrer">
                                                        <Download className="w-4 h-4 mr-2" />
                                                        Download
                                                    </a>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() => handleDelete(doc.document_id || doc.id)}
                                                    className="text-red-600"
                                                >
                                                    <Trash2 className="w-4 h-4 mr-2" />
                                                    Delete
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