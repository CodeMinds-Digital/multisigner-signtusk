'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import {
  Plus,
  Search,
  FileText,
  Folder,
  MoreHorizontal,
  Eye,
  Download,
  Trash2,
  Move,
  Upload,
  FolderPlus,
  Grid,
  List,
  SortAsc,
  Filter
} from 'lucide-react'
import { toast } from 'sonner'
// import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'

interface Document {
  id: string
  document_id: string
  folder_path: string
  sort_order: number
  added_at: string
  document: {
    id: string
    title: string
    file_name: string
    file_size: number
    file_type: string
    created_at: string
  }
}

interface Folder {
  path: string
  name: string
  document_count: number
  created_at: string
}

interface DataRoomDocumentManagerProps {
  dataRoomId: string
  documents: Document[]
  onDocumentsChange: () => void
}

export function DataRoomDocumentManager({
  dataRoomId,
  documents,
  onDocumentsChange
}: DataRoomDocumentManagerProps) {
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  const [currentFolder, setCurrentFolder] = useState('/')
  const [folders, setFolders] = useState<Folder[]>([])
  const [showAddDocuments, setShowAddDocuments] = useState(false)
  const [showCreateFolder, setShowCreateFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [availableDocuments, setAvailableDocuments] = useState<any[]>([])

  // Fetch folders
  const fetchFolders = async () => {
    try {
      const response = await fetch(`/api/send/data-rooms/${dataRoomId}/folders`)
      if (response.ok) {
        const data = await response.json()
        setFolders(data.folders || [])
      }
    } catch (error) {
      console.error('Failed to fetch folders:', error)
    }
  }

  // Fetch available documents to add
  const fetchAvailableDocuments = async () => {
    try {
      const response = await fetch('/api/send/documents')
      if (response.ok) {
        const data = await response.json()
        // Filter out documents already in this data room
        const existingDocIds = documents.map(d => d.document_id)
        const available = data.documents.filter((doc: any) => !existingDocIds.includes(doc.id))
        setAvailableDocuments(available)
      }
    } catch (error) {
      console.error('Failed to fetch available documents:', error)
    }
  }

  // Create folder
  const createFolder = async () => {
    if (!newFolderName.trim()) {
      toast.error('Folder name is required')
      return
    }

    setLoading(true)
    try {
      const folderPath = currentFolder === '/' ? `/${newFolderName}` : `${currentFolder}/${newFolderName}`

      const response = await fetch(`/api/send/data-rooms/${dataRoomId}/folders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folder_path: folderPath,
          name: newFolderName
        })
      })

      if (response.ok) {
        toast.success('Folder created successfully')
        setNewFolderName('')
        setShowCreateFolder(false)
        fetchFolders()
      } else {
        const data = await response.json()
        toast.error(data.error || 'Failed to create folder')
      }
    } catch (error) {
      console.error('Error creating folder:', error)
      toast.error('Failed to create folder')
    } finally {
      setLoading(false)
    }
  }

  // Add documents to data room
  const addDocuments = async (documentIds: string[]) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/send/data-rooms/${dataRoomId}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_ids: documentIds,
          folder_path: currentFolder
        })
      })

      if (response.ok) {
        toast.success('Documents added successfully')
        setShowAddDocuments(false)
        onDocumentsChange()
        fetchAvailableDocuments()
      } else {
        const data = await response.json()
        toast.error(data.error || 'Failed to add documents')
      }
    } catch (error) {
      console.error('Error adding documents:', error)
      toast.error('Failed to add documents')
    } finally {
      setLoading(false)
    }
  }

  // Remove documents from data room
  const removeDocuments = async (documentIds: string[]) => {
    if (!confirm('Are you sure you want to remove these documents from the data room?')) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/send/data-rooms/${dataRoomId}/documents`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document_ids: documentIds })
      })

      if (response.ok) {
        toast.success('Documents removed successfully')
        setSelectedDocuments([])
        onDocumentsChange()
      } else {
        const data = await response.json()
        toast.error(data.error || 'Failed to remove documents')
      }
    } catch (error) {
      console.error('Error removing documents:', error)
      toast.error('Failed to remove documents')
    } finally {
      setLoading(false)
    }
  }

  // Handle drag and drop - temporarily disabled
  // const handleDragEnd = async (result: any) => {
  //   if (!result.destination) return

  //   const { source, destination } = result
  //   if (source.index === destination.index) return

  //   // Reorder documents
  //   const reorderedDocs = Array.from(filteredDocuments)
  //   const [removed] = reorderedDocs.splice(source.index, 1)
  //   reorderedDocs.splice(destination.index, 0, removed)

  //   // Update sort order
  //   try {
  //     const updates = reorderedDocs.map((doc, index) => ({
  //       document_id: doc.document_id,
  //       sort_order: index
  //     }))

  //     await fetch(`/api/send/data-rooms/${dataRoomId}/documents/reorder`, {
  //       method: 'PATCH',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify({ updates })
  //     })

  //     onDocumentsChange()
  //   } catch (error) {
  //     console.error('Error reordering documents:', error)
  //     toast.error('Failed to reorder documents')
  //   }
  // }

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Filter documents by current folder and search
  const filteredDocuments = documents.filter(doc => {
    const matchesFolder = doc.folder_path === currentFolder
    const matchesSearch = !searchQuery ||
      doc.document.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.document.file_name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesFolder && matchesSearch
  })

  // Get current folder documents
  const currentFolderDocuments = folders.filter(folder => {
    // Check if folder is a direct child of current folder
    if (!folder.path.startsWith(currentFolder) || folder.path === currentFolder) {
      return false
    }

    // For root folder (/), direct children are like /folder1, /folder2
    if (currentFolder === '/') {
      const pathParts = folder.path.split('/').filter(Boolean)
      return pathParts.length === 1
    }

    // For other folders, check if it's a direct child
    const relativePath = folder.path.substring(currentFolder.length)
    const pathParts = relativePath.split('/').filter(Boolean)
    return pathParts.length === 1
  })



  useEffect(() => {
    fetchFolders()
    fetchAvailableDocuments()
  }, [dataRoomId])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Document Management</h3>
          <p className="text-sm text-gray-500">
            Organize documents in folders and manage access
          </p>
        </div>

        <div className="flex gap-2">
          <Dialog open={showCreateFolder} onOpenChange={setShowCreateFolder}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <FolderPlus className="h-4 w-4 mr-2" />
                New Folder
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Folder</DialogTitle>
                <DialogDescription>
                  Create a new folder in {currentFolder}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Folder name"
                />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowCreateFolder(false)}>
                    Cancel
                  </Button>
                  <Button onClick={createFolder} disabled={loading}>
                    Create Folder
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showAddDocuments} onOpenChange={setShowAddDocuments}>
            <DialogTrigger asChild>
              <Button onClick={fetchAvailableDocuments}>
                <Plus className="h-4 w-4 mr-2" />
                Add Documents
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add Documents to Data Room</DialogTitle>
                <DialogDescription>
                  Select documents to add to this data room
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {availableDocuments.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">
                    No available documents to add
                  </p>
                ) : (
                  availableDocuments.map((doc) => (
                    <div key={doc.id} className="flex items-center gap-3 p-3 border rounded-lg">
                      <Checkbox
                        checked={selectedDocuments.includes(doc.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedDocuments([...selectedDocuments, doc.id])
                          } else {
                            setSelectedDocuments(selectedDocuments.filter(id => id !== doc.id))
                          }
                        }}
                      />
                      <FileText className="h-5 w-5 text-gray-500" />
                      <div className="flex-1">
                        <p className="font-medium">{doc.title}</p>
                        <p className="text-sm text-gray-500">
                          {formatFileSize(doc.file_size)} • {doc.file_type}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowAddDocuments(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => addDocuments(selectedDocuments)}
                  disabled={selectedDocuments.length === 0 || loading}
                >
                  Add {selectedDocuments.length} Document{selectedDocuments.length !== 1 ? 's' : ''}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search documents..."
              className="pl-10 w-64"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCurrentFolder('/')}
          className={currentFolder === '/' ? 'bg-gray-100' : ''}
        >
          <Folder className="h-4 w-4 mr-1" />
          Root
        </Button>
        {currentFolder !== '/' && currentFolder.split('/').filter(Boolean).map((folder, index, arr) => {
          const path = '/' + arr.slice(0, index + 1).join('/')
          return (
            <div key={path} className="flex items-center gap-2">
              <span>/</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentFolder(path)}
                className={path === currentFolder ? 'bg-gray-100' : ''}
              >
                {folder}
              </Button>
            </div>
          )
        })}
      </div>

      {/* Folders */}
      {currentFolderDocuments.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {currentFolderDocuments.map((folder) => (
            <Button
              key={folder.path}
              variant="outline"
              className="h-auto p-4 flex flex-col items-center gap-2"
              onClick={() => setCurrentFolder(folder.path)}
            >
              <Folder className="h-8 w-8 text-blue-600" />
              <span className="text-sm font-medium truncate w-full">{folder.name}</span>
              <span className="text-xs text-gray-500">{folder.document_count} docs</span>
            </Button>
          ))}
        </div>
      )}

      {/* Documents */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Documents</CardTitle>
              <CardDescription>
                {filteredDocuments.length} document{filteredDocuments.length !== 1 ? 's' : ''} in {currentFolder}
              </CardDescription>
            </div>
            {selectedDocuments.length > 0 && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => removeDocuments(selectedDocuments)}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Remove ({selectedDocuments.length})
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {filteredDocuments.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <h4 className="font-medium mb-1">No documents in this folder</h4>
              <p className="text-sm text-gray-600 mb-4">
                Add documents to get started
              </p>
              <Button onClick={() => setShowAddDocuments(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Documents
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredDocuments.map((doc, index) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={selectedDocuments.includes(doc.document_id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedDocuments([...selectedDocuments, doc.document_id])
                        } else {
                          setSelectedDocuments(selectedDocuments.filter(id => id !== doc.document_id))
                        }
                      }}
                    />
                    <FileText className="h-5 w-5 text-gray-500" />
                    <div>
                      <p className="font-medium">{doc.document.title}</p>
                      <p className="text-sm text-gray-600">
                        {formatFileSize(doc.document.file_size)} • {doc.document.file_type}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Move className="h-4 w-4 mr-2" />
                          Move to Folder
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => removeDocuments([doc.document_id])}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remove from Data Room
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
