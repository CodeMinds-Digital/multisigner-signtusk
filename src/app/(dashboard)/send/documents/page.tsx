'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  FileText,
  Search,
  Upload,
  Share2,
  Trash2,
  Archive,
  MoreVertical,
  ArrowUpDown,
  BarChart3
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { CreateLinkModal } from '@/components/features/send/create-link-modal'
import { BulkSelectionToolbar, useBulkSelection, BulkSelectionCheckbox } from '@/components/features/send/bulk-operations/bulk-selection-toolbar'
import { BulkUploadModal } from '@/components/features/send/bulk-operations/bulk-upload-modal'
import { BulkShareModal } from '@/components/features/send/bulk-operations/bulk-share-modal'
import { useAuth } from '@/components/providers/secure-auth-provider'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface Document {
  id: string
  title: string
  file_name: string
  file_type: string
  file_size: number
  status: string
  created_at: string
  updated_at: string
}

type SortField = 'title' | 'created_at' | 'file_size' | 'status'
type SortOrder = 'asc' | 'desc'

export default function DocumentLibraryPage() {
  const router = useRouter()
  const { user } = useAuth()

  const [documents, setDocuments] = useState<Document[]>([])
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [sortField, setSortField] = useState<SortField>('created_at')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)

  // Bulk operations
  const [showBulkUpload, setShowBulkUpload] = useState(false)
  const [showBulkShare, setShowBulkShare] = useState(false)
  const bulkSelection = useBulkSelection(filteredDocuments)

  useEffect(() => {
    if (user) {
      loadDocuments()
    }
  }, [user])

  useEffect(() => {
    filterAndSortDocuments()
  }, [documents, searchQuery, statusFilter, typeFilter, sortField, sortOrder])

  const loadDocuments = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/send/documents/upload?limit=1000')
      if (response.ok) {
        const data = await response.json()
        setDocuments(data.documents || [])
      }
    } catch (error) {
      console.error('Failed to load documents:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterAndSortDocuments = () => {
    let filtered = [...documents]

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (doc) =>
          doc.title.toLowerCase().includes(query) ||
          doc.file_name.toLowerCase().includes(query)
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((doc) => doc.status === statusFilter)
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter((doc) => doc.file_type === typeFilter)
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue: any = a[sortField]
      let bValue: any = b[sortField]

      if (sortField === 'created_at') {
        aValue = new Date(aValue).getTime()
        bValue = new Date(bValue).getTime()
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    setFilteredDocuments(filtered)
    setCurrentPage(1) // Reset to first page when filters change
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  const handleShare = (doc: Document) => {
    setSelectedDocument(doc)
    setShowLinkModal(true)
  }

  const handleDelete = async (doc: Document) => {
    setSelectedDocument(doc)
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    if (!selectedDocument) return

    try {
      const response = await fetch(`/api/send/documents/${selectedDocument.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setDocuments(documents.filter((d) => d.id !== selectedDocument.id))
        setShowDeleteModal(false)
        setSelectedDocument(null)
      }
    } catch (error) {
      console.error('Failed to delete document:', error)
    }
  }

  const handleArchive = async (doc: Document) => {
    try {
      const response = await fetch(`/api/send/documents/${doc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'archived' })
      })

      if (response.ok) {
        loadDocuments()
      }
    } catch (error) {
      console.error('Failed to archive document:', error)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // Bulk operation handlers
  const handleBulkDelete = async (documentIds: string[]) => {
    try {
      const response = await fetch('/api/send/documents/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'delete',
          documentIds
        })
      })

      if (response.ok) {
        loadDocuments()
        bulkSelection.selectNone()
      }
    } catch (error) {
      console.error('Bulk delete failed:', error)
      throw error
    }
  }

  const handleBulkArchive = async (documentIds: string[]) => {
    try {
      const response = await fetch('/api/send/documents/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'archive',
          documentIds
        })
      })

      if (response.ok) {
        loadDocuments()
        bulkSelection.selectNone()
      }
    } catch (error) {
      console.error('Bulk archive failed:', error)
      throw error
    }
  }

  const handleBulkShare = async (documentIds: string[]) => {
    const selectedDocs = documents.filter(doc => documentIds.includes(doc.id))
    setShowBulkShare(true)
  }

  const handleBulkUploadComplete = (results: any) => {
    loadDocuments()
    setShowBulkUpload(false)
  }

  const handleBulkShareComplete = (results: any) => {
    setShowBulkShare(false)
    bulkSelection.selectNone()
  }

  const handleBulkExport = async (documentIds: string[]) => {
    try {
      const response = await fetch('/api/send/analytics/bulk-export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentIds,
          format: 'csv'
        })
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `document-analytics-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        bulkSelection.selectNone()
      } else {
        throw new Error('Export failed')
      }
    } catch (error) {
      console.error('Bulk export failed:', error)
      throw error
    }
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-green-100 text-green-700',
      archived: 'bg-gray-100 text-gray-700',
      deleted: 'bg-red-100 text-red-700'
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles] || styles.active}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  const getFileTypeIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return '📄'
    if (fileType.includes('word') || fileType.includes('document')) return '📝'
    if (fileType.includes('sheet') || fileType.includes('excel')) return '📊'
    if (fileType.includes('presentation') || fileType.includes('powerpoint')) return '📽️'
    if (fileType.includes('image')) return '🖼️'
    return '📁'
  }

  // Pagination
  const totalPages = Math.ceil(filteredDocuments.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentDocuments = filteredDocuments.slice(startIndex, endIndex)

  // Get unique file types for filter
  const fileTypes = Array.from(new Set(documents.map((d) => d.file_type)))

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Document Library</h1>
            <p className="text-gray-600 mt-1">Manage all your shared documents</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowBulkUpload(true)}
            >
              <Upload className="w-4 h-4 mr-2" />
              Bulk Upload
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => router.push('/send')}
            >
              <FileText className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </div>

        {/* Filters and Search */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search documents..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {fileTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type.split('/')[1]?.toUpperCase() || type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {/* Bulk Selection Toolbar */}
            <BulkSelectionToolbar
              selectedItems={bulkSelection.selectedItems}
              totalItems={bulkSelection.totalCount}
              onSelectAll={bulkSelection.selectAll}
              onSelectNone={bulkSelection.selectNone}
              onBulkDelete={handleBulkDelete}
              onBulkArchive={handleBulkArchive}
              onBulkShare={handleBulkShare}
              onBulkExport={handleBulkExport}
              itemType="documents"
              className="mb-4"
            />

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
                <p className="text-gray-500 mt-4">Loading documents...</p>
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchQuery || statusFilter !== 'all' || typeFilter !== 'all'
                    ? 'No documents found'
                    : 'No documents yet'}
                </h3>
                <p className="text-gray-500 mb-4">
                  {searchQuery || statusFilter !== 'all' || typeFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Upload your first document to get started'}
                </p>
                {!searchQuery && statusFilter === 'all' && typeFilter === 'all' && (
                  <Button onClick={() => router.push('/send')}>
                    <FileText className="w-4 h-4 mr-2" />
                    Upload Document
                  </Button>
                )}
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">
                        <BulkSelectionCheckbox
                          itemId="all"
                          isSelected={bulkSelection.isAllSelected}
                          onToggle={bulkSelection.isAllSelected ? bulkSelection.selectNone : bulkSelection.selectAll}
                        />
                      </TableHead>
                      <TableHead className="w-[50px]">Type</TableHead>
                      <TableHead>
                        <button
                          onClick={() => handleSort('title')}
                          className="flex items-center gap-1 hover:text-gray-900"
                        >
                          Title
                          <ArrowUpDown className="w-4 h-4" />
                        </button>
                      </TableHead>
                      <TableHead>
                        <button
                          onClick={() => handleSort('file_size')}
                          className="flex items-center gap-1 hover:text-gray-900"
                        >
                          Size
                          <ArrowUpDown className="w-4 h-4" />
                        </button>
                      </TableHead>
                      <TableHead>
                        <button
                          onClick={() => handleSort('status')}
                          className="flex items-center gap-1 hover:text-gray-900"
                        >
                          Status
                          <ArrowUpDown className="w-4 h-4" />
                        </button>
                      </TableHead>
                      <TableHead>
                        <button
                          onClick={() => handleSort('created_at')}
                          className="flex items-center gap-1 hover:text-gray-900"
                        >
                          Created
                          <ArrowUpDown className="w-4 h-4" />
                        </button>
                      </TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentDocuments.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell>
                          <BulkSelectionCheckbox
                            itemId={doc.id}
                            isSelected={bulkSelection.isSelected(doc.id)}
                            onToggle={bulkSelection.selectItem}
                          />
                        </TableCell>
                        <TableCell>
                          <span className="text-2xl">{getFileTypeIcon(doc.file_type)}</span>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium text-gray-900">{doc.title}</div>
                            <div className="text-sm text-gray-500">{doc.file_name}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {formatFileSize(doc.file_size)}
                        </TableCell>
                        <TableCell>{getStatusBadge(doc.status)}</TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {formatDate(doc.created_at)}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => router.push(`/send/analytics/${doc.id}`)}>
                                <BarChart3 className="w-4 h-4 mr-2" />
                                Analytics
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleShare(doc)}>
                                <Share2 className="w-4 h-4 mr-2" />
                                Share
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleArchive(doc)}>
                                <Archive className="w-4 h-4 mr-2" />
                                Archive
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDelete(doc)}
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

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <div className="text-sm text-gray-600">
                      Showing {startIndex + 1} to {Math.min(endIndex, filteredDocuments.length)} of{' '}
                      {filteredDocuments.length} documents
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Share Link Modal */}
      <Dialog open={showLinkModal && !!selectedDocument} onOpenChange={(open) => {
        if (!open) {
          setShowLinkModal(false)
          setSelectedDocument(null)
        }
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white">
          {selectedDocument && (
            <CreateLinkModal
              documentId={selectedDocument.id}
              documentTitle={selectedDocument.title}
              onClose={() => {
                setShowLinkModal(false)
                setSelectedDocument(null)
              }}
              onLinkCreated={() => {
                setShowLinkModal(false)
                setSelectedDocument(null)
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={(open) => {
        if (!open) {
          setShowDeleteModal(false)
          setSelectedDocument(null)
        }
      }}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>Delete Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-700">
              Are you sure you want to delete "{selectedDocument?.title}"? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteModal(false)
                  setSelectedDocument(null)
                }}
              >
                Cancel
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={confirmDelete}
              >
                Delete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Upload Modal */}
      <BulkUploadModal
        isOpen={showBulkUpload}
        onClose={() => setShowBulkUpload(false)}
        onUploadComplete={handleBulkUploadComplete}
      />

      {/* Bulk Share Modal */}
      <BulkShareModal
        isOpen={showBulkShare}
        onClose={() => setShowBulkShare(false)}
        selectedDocuments={documents.filter(doc => bulkSelection.selectedItems.includes(doc.id))}
        onShareComplete={handleBulkShareComplete}
      />
    </>
  )
}

