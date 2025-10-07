'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { 
  FileText, 
  MoreHorizontal, 
  FolderOpen, 
  Move,
  Trash2,
  Download,
  Share,
  Eye
} from 'lucide-react'
import { toast } from 'sonner'
import { formatBytes, formatDistanceToNow } from '@/lib/utils'
import { FolderTree } from './folder-tree'

interface Document {
  id: string
  title: string
  file_name: string
  file_size: number
  file_type: string
  created_at: string
  folder_id?: string
  version_number: number
  is_primary: boolean
}

interface DocumentOrganizerProps {
  folderId?: string | null
  onDocumentSelect?: (document: Document) => void
}

export function DocumentOrganizer({ folderId, onDocumentSelect }: DocumentOrganizerProps) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set())
  const [showMoveDialog, setShowMoveDialog] = useState(false)
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(folderId || null)

  // Fetch documents for current folder
  const fetchDocuments = async (targetFolderId: string | null = currentFolderId) => {
    setLoading(true)
    try {
      let url = '/api/send/documents/upload'
      const params = new URLSearchParams()
      
      if (targetFolderId) {
        // Fetch documents in specific folder
        url = `/api/send/folders/${targetFolderId}`
      } else {
        // Fetch documents in root (no folder)
        params.append('folder_filter', 'root')
      }

      const response = await fetch(`${url}?${params.toString()}`)
      const data = await response.json()

      if (data.success) {
        if (targetFolderId) {
          setDocuments(data.documents || [])
        } else {
          // Filter documents that are not in any folder
          const rootDocuments = (data.documents || []).filter((doc: Document) => !doc.folder_id)
          setDocuments(rootDocuments)
        }
      } else {
        toast.error('Failed to load documents')
      }
    } catch (error) {
      console.error('Error fetching documents:', error)
      toast.error('Failed to load documents')
    } finally {
      setLoading(false)
    }
  }

  // Move selected documents to folder
  const moveDocuments = async (targetFolderId: string | null) => {
    if (selectedDocuments.size === 0) {
      toast.error('No documents selected')
      return
    }

    try {
      const response = await fetch('/api/send/folders', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          document_ids: Array.from(selectedDocuments),
          target_folder_id: targetFolderId
        })
      })

      const data = await response.json()

      if (data.success) {
        toast.success(`Moved ${data.moved_count} document(s)`)
        setSelectedDocuments(new Set())
        setShowMoveDialog(false)
        fetchDocuments()
      } else {
        toast.error(data.error || 'Failed to move documents')
      }
    } catch (error) {
      console.error('Error moving documents:', error)
      toast.error('Failed to move documents')
    }
  }

  // Toggle document selection
  const toggleDocumentSelection = (documentId: string) => {
    setSelectedDocuments(prev => {
      const newSet = new Set(prev)
      if (newSet.has(documentId)) {
        newSet.delete(documentId)
      } else {
        newSet.add(documentId)
      }
      return newSet
    })
  }

  // Select all documents
  const selectAllDocuments = () => {
    if (selectedDocuments.size === documents.length) {
      setSelectedDocuments(new Set())
    } else {
      setSelectedDocuments(new Set(documents.map(doc => doc.id)))
    }
  }

  // Get file type icon
  const getFileTypeIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return '📄'
    if (fileType.includes('word')) return '📝'
    if (fileType.includes('powerpoint') || fileType.includes('presentation')) return '📊'
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return '📈'
    if (fileType.includes('image')) return '🖼️'
    return '📄'
  }

  useEffect(() => {
    fetchDocuments()
  }, [currentFolderId])

  useEffect(() => {
    setCurrentFolderId(folderId || null)
  }, [folderId])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Folder Tree Sidebar */}
      <div className="lg:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              Folders
            </CardTitle>
            <CardDescription>
              Organize your documents
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FolderTree
              selectedFolderId={currentFolderId}
              onFolderSelect={setCurrentFolderId}
              showDocumentCounts={true}
            />
          </CardContent>
        </Card>
      </div>

      {/* Documents List */}
      <div className="lg:col-span-3">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  {currentFolderId ? 'Folder Documents' : 'All Documents'}
                </CardTitle>
                <CardDescription>
                  {documents.length} document(s) found
                </CardDescription>
              </div>
              
              {selectedDocuments.size > 0 && (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {selectedDocuments.size} selected
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowMoveDialog(true)}
                  >
                    <Move className="h-4 w-4 mr-2" />
                    Move
                  </Button>
                </div>
              )}
            </div>
            
            {documents.length > 0 && (
              <div className="flex items-center gap-2 mt-4">
                <Checkbox
                  checked={selectedDocuments.size === documents.length}
                  onCheckedChange={selectAllDocuments}
                />
                <span className="text-sm text-gray-600">
                  Select all documents
                </span>
              </div>
            )}
          </CardHeader>
          
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No documents found</p>
                <p className="text-sm">Upload documents or move them to this folder</p>
              </div>
            ) : (
              <div className="space-y-3">
                {documents.map((document) => (
                  <div
                    key={document.id}
                    className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                  >
                    <Checkbox
                      checked={selectedDocuments.has(document.id)}
                      onCheckedChange={() => toggleDocumentSelection(document.id)}
                    />
                    
                    <div className="text-2xl">
                      {getFileTypeIcon(document.file_type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">
                        {document.title}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>{formatBytes(document.file_size)}</span>
                        <span>{formatDistanceToNow(new Date(document.created_at), { addSuffix: true })}</span>
                        {document.version_number > 1 && (
                          <Badge variant="outline" className="text-xs">
                            v{document.version_number}
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => onDocumentSelect?.(document)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Share className="h-4 w-4 mr-2" />
                          Share
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Move Documents Dialog */}
      {showMoveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Move Documents</CardTitle>
              <CardDescription>
                Select a folder to move {selectedDocuments.size} document(s) to
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-64 overflow-y-auto">
                <FolderTree
                  onFolderSelect={(folderId) => moveDocuments(folderId)}
                  showDocumentCounts={false}
                />
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setShowMoveDialog(false)}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
