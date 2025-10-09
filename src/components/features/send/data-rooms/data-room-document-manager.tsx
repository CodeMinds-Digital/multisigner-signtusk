'use client'

import { useState, useEffect, useCallback } from 'react'
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
  FolderOpen,
  FolderLock,
  FolderCheck,
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
  Filter,
  Home,
  ChevronRight
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

// Helper function to format file size
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export function DataRoomDocumentManager({
  dataRoomId,
  documents,
  onDocumentsChange
}: DataRoomDocumentManagerProps) {
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([])
  const [selectedFolders, setSelectedFolders] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  const [currentFolder, setCurrentFolder] = useState('/')
  const [folders, setFolders] = useState<Folder[]>([])
  const [showAddDocuments, setShowAddDocuments] = useState(false)
  const [showCreateFolder, setShowCreateFolder] = useState(false)
  const [showRenameFolder, setShowRenameFolder] = useState(false)
  const [showDeleteFolder, setShowDeleteFolder] = useState(false)
  const [showBulkDeleteFolders, setShowBulkDeleteFolders] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [renameFolderName, setRenameFolderName] = useState('')
  const [selectedFolder, setSelectedFolder] = useState<any>(null)
  const [availableDocuments, setAvailableDocuments] = useState<any[]>([])

  // Get folder icon based on folder properties
  const getFolderIcon = (folder: any) => {
    // If folder has documents, show FolderCheck
    if (folder.document_count > 0) {
      return FolderCheck
    }
    // If folder has subfolders, show FolderOpen
    if (folder.subfolder_count > 0) {
      return FolderOpen
    }
    // Default folder icon
    return Folder
  }

  // Fetch folders
  const fetchFolders = useCallback(async () => {
    try {
      const response = await fetch(`/api/send/data-rooms/${dataRoomId}/folders`)
      if (response.ok) {
        const data = await response.json()
        setFolders(data.folders || [])
      }
    } catch (error) {
      console.error('Failed to fetch folders:', error)
    }
  }, [dataRoomId])

  // Fetch available documents to add
  const fetchAvailableDocuments = useCallback(async () => {
    try {
      const response = await fetch('/api/send/documents')
      if (response.ok) {
        const data = await response.json()
        // Filter out documents already in this data room
        const existingDocIds = documents.map(d => d.document_id)
        const available = data.documents.filter((doc: any) => !existingDocIds.includes(doc.id))
        setAvailableDocuments(available)
        console.log('📄 Available documents:', available.length, 'Total documents:', data.documents.length, 'Existing in room:', existingDocIds.length)
      } else {
        console.error('Failed to fetch documents:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Failed to fetch available documents:', error)
    }
  }, [documents])

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

  // Rename folder
  const renameFolder = async () => {
    if (!renameFolderName.trim() || !selectedFolder) return

    setLoading(true)
    try {
      const response = await fetch(`/api/send/data-rooms/${dataRoomId}/folders`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          folder_path: selectedFolder.path,
          new_name: renameFolderName.trim()
        }),
      })

      if (response.ok) {
        toast.success('Folder renamed successfully')
        setRenameFolderName('')
        setShowRenameFolder(false)
        setSelectedFolder(null)
        fetchFolders()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to rename folder')
      }
    } catch (error) {
      console.error('Rename folder error:', error)
      toast.error('Failed to rename folder')
    } finally {
      setLoading(false)
    }
  }

  // Delete folder
  const deleteFolder = async () => {
    if (!selectedFolder) return

    setLoading(true)
    try {
      const response = await fetch(`/api/send/data-rooms/${dataRoomId}/folders`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          folder_path: selectedFolder.path
        }),
      })

      if (response.ok) {
        toast.success('Folder deleted successfully')
        setShowDeleteFolder(false)
        setSelectedFolder(null)
        // Navigate to parent folder if we're currently in the deleted folder
        if (currentFolder.startsWith(selectedFolder.path)) {
          const parentPath = selectedFolder.path.substring(0, selectedFolder.path.lastIndexOf('/')) || '/'
          setCurrentFolder(parentPath)
        }
        fetchFolders()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to delete folder')
      }
    } catch (error) {
      console.error('Delete folder error:', error)
      toast.error('Failed to delete folder')
    } finally {
      setLoading(false)
    }
  }

  // Bulk delete folders
  const bulkDeleteFolders = async () => {
    if (selectedFolders.length === 0) return

    setLoading(true)
    try {
      // Delete folders one by one
      for (const folderPath of selectedFolders) {
        const response = await fetch(`/api/send/data-rooms/${dataRoomId}/folders`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            folder_path: folderPath
          }),
        })

        if (!response.ok) {
          const error = await response.json()
          toast.error(`Failed to delete folder: ${error.error}`)
          break
        }
      }

      toast.success(`${selectedFolders.length} folder(s) deleted successfully`)
      setSelectedFolders([])
      setShowBulkDeleteFolders(false)

      // Navigate to root if current folder was deleted
      if (selectedFolders.some(path => currentFolder.startsWith(path))) {
        setCurrentFolder('/')
      }

      fetchFolders()
    } catch (error) {
      console.error('Bulk delete folders error:', error)
      toast.error('Failed to delete folders')
    } finally {
      setLoading(false)
    }
  }

  // View document
  const viewDocument = async (documentId: string, title: string) => {
    try {
      const response = await fetch(`/api/send/documents/${documentId}`)
      if (response.ok) {
        const data = await response.json()
        if (data.document?.signed_url) {
          // Open document in new tab
          window.open(data.document.signed_url, '_blank')
        } else {
          toast.error('Document URL not available')
        }
      } else {
        toast.error('Failed to access document')
      }
    } catch (error) {
      console.error('Error viewing document:', error)
      toast.error('Failed to view document')
    }
  }

  // Download document
  const downloadDocument = async (documentId: string, title: string) => {
    try {
      const response = await fetch(`/api/send/documents/${documentId}`)
      if (response.ok) {
        const data = await response.json()
        if (data.document?.signed_url) {
          // Create download link
          const link = document.createElement('a')
          link.href = data.document.signed_url
          link.download = title
          link.target = '_blank'
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          toast.success('Download started')
        } else {
          toast.error('Document URL not available')
        }
      } else {
        toast.error('Failed to access document')
      }
    } catch (error) {
      console.error('Error downloading document:', error)
      toast.error('Failed to download document')
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
  }, [dataRoomId, fetchFolders])

  // Reset selected documents when dialog opens
  useEffect(() => {
    if (showAddDocuments) {
      setSelectedDocuments([])
      fetchAvailableDocuments()
    }
  }, [showAddDocuments, fetchAvailableDocuments])

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

      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-1 text-sm bg-gray-50 p-3 rounded-lg">
        <Home className="h-4 w-4 text-gray-500" />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCurrentFolder('/')}
          className={`h-8 px-2 ${currentFolder === '/' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-200'}`}
        >
          Data Room
        </Button>
        {currentFolder !== '/' && currentFolder.split('/').filter(Boolean).map((folder, index, arr) => {
          const path = '/' + arr.slice(0, index + 1).join('/')
          return (
            <div key={path} className="flex items-center">
              <ChevronRight className="h-4 w-4 text-gray-400 mx-1" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentFolder(path)}
                className={`h-8 px-2 ${path === currentFolder ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-200'}`}
              >
                {folder}
              </Button>
            </div>
          )
        })}
      </div>

      {/* File Explorer View */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Folder className="h-5 w-5 text-blue-600" />
                {currentFolder === '/' ? 'Data Room Contents' : `Contents of ${currentFolder.split('/').pop()}`}
              </CardTitle>
              <CardDescription>
                {currentFolderDocuments.length} folder{currentFolderDocuments.length !== 1 ? 's' : ''} • {filteredDocuments.length} document{filteredDocuments.length !== 1 ? 's' : ''}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {selectedFolders.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowBulkDeleteFolders(true)}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete Folders ({selectedFolders.length})
                </Button>
              )}
              {selectedDocuments.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => removeDocuments(selectedDocuments)}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Remove Documents ({selectedDocuments.length})
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddDocuments(true)}
              >
                <Upload className="h-4 w-4 mr-1" />
                Add Documents
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {currentFolderDocuments.length === 0 && filteredDocuments.length === 0 ? (
            <div className="text-center py-12">
              <Folder className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h4 className="font-medium text-gray-900 mb-2">This folder is empty</h4>
              <p className="text-sm text-gray-600 mb-6">
                Create folders to organize your documents or add documents directly
              </p>
              <div className="flex gap-3 justify-center">
                <Button onClick={() => setShowCreateFolder(true)}>
                  <FolderPlus className="h-4 w-4 mr-2" />
                  New Folder
                </Button>
                <Button variant="outline" onClick={() => setShowAddDocuments(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Add Documents
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Folders Section */}
              {currentFolderDocuments.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                    <Folder className="h-4 w-4" />
                    Folders ({currentFolderDocuments.length})
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {currentFolderDocuments.map((folder) => (
                      <div
                        key={folder.path}
                        className="group relative p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer"
                        onClick={() => setCurrentFolder(folder.path)}
                      >
                        <Checkbox
                          checked={selectedFolders.includes(folder.path)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedFolders([...selectedFolders, folder.path])
                            } else {
                              setSelectedFolders(selectedFolders.filter(path => path !== folder.path))
                            }
                          }}
                          className="absolute top-2 left-2 z-10"
                        />
                        <div className="flex flex-col items-center text-center">
                          {(() => {
                            const IconComponent = getFolderIcon(folder)
                            return <IconComponent className="h-8 w-8 text-blue-500 mb-2 group-hover:text-blue-600" />
                          })()}
                          <span className="text-sm font-medium text-gray-900 truncate w-full">{folder.name}</span>
                          <span className="text-xs text-gray-500 mt-1">
                            {folder.document_count} docs
                          </span>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation()
                              setCurrentFolder(folder.path)
                              setShowCreateFolder(true)
                            }}>
                              <FolderPlus className="h-4 w-4 mr-2" />
                              New Subfolder
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation()
                              setSelectedFolder(folder)
                              setRenameFolderName(folder.name)
                              setShowRenameFolder(true)
                            }}>
                              <FileText className="h-4 w-4 mr-2" />
                              Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedFolder(folder)
                                setShowDeleteFolder(true)
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Documents Section */}
              {filteredDocuments.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Documents ({filteredDocuments.length})
                  </h4>
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
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => viewDocument(doc.document.id, doc.document.title)}
                            title="View document"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => downloadDocument(doc.document.id, doc.document.title)}
                            title="Download document"
                          >
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
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Folder Dialog */}
      <Dialog open={showCreateFolder} onOpenChange={setShowCreateFolder}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>
              Create a new folder in {currentFolder === '/' ? 'Data Room' : currentFolder}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder name"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newFolderName.trim()) {
                  createFolder()
                }
              }}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateFolder(false)}>
                Cancel
              </Button>
              <Button onClick={createFolder} disabled={loading || !newFolderName.trim()}>
                Create Folder
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Documents Dialog */}
      <Dialog open={showAddDocuments} onOpenChange={setShowAddDocuments}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Documents to Data Room</DialogTitle>
            <DialogDescription>
              Select documents to add to {currentFolder === '/' ? 'the data room' : currentFolder}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {availableDocuments.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <p>No available documents to add</p>
                <p className="text-xs mt-2">
                  Debug: Total docs in room: {documents.length}, Available: {availableDocuments.length}
                </p>
              </div>
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
                  <div>
                    <p className="font-medium">{doc.title}</p>
                    <p className="text-sm text-gray-600">
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

      {/* Rename Folder Dialog */}
      <Dialog open={showRenameFolder} onOpenChange={setShowRenameFolder}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Folder</DialogTitle>
            <DialogDescription>
              Enter a new name for "{selectedFolder?.name}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={renameFolderName}
              onChange={(e) => setRenameFolderName(e.target.value)}
              placeholder="Folder name"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && renameFolderName.trim()) {
                  renameFolder()
                }
              }}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setShowRenameFolder(false)
                setSelectedFolder(null)
                setRenameFolderName('')
              }}>
                Cancel
              </Button>
              <Button onClick={renameFolder} disabled={loading || !renameFolderName.trim()}>
                Rename Folder
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Folder Dialog */}
      <Dialog open={showDeleteFolder} onOpenChange={setShowDeleteFolder}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Folder</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedFolder?.name}"? This action cannot be undone and will also delete all subfolders and documents within this folder.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => {
              setShowDeleteFolder(false)
              setSelectedFolder(null)
            }}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={deleteFolder} disabled={loading}>
              Delete Folder
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Folders Dialog */}
      <Dialog open={showBulkDeleteFolders} onOpenChange={setShowBulkDeleteFolders}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Multiple Folders</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedFolders.length} folder(s)? This action cannot be undone and will also delete all subfolders and documents within these folders.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-40 overflow-y-auto mb-4">
            <ul className="text-sm text-gray-600">
              {selectedFolders.map(path => (
                <li key={path} className="py-1">• {path.split('/').pop()}</li>
              ))}
            </ul>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => {
              setShowBulkDeleteFolders(false)
              setSelectedFolders([])
            }}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={bulkDeleteFolders} disabled={loading}>
              Delete {selectedFolders.length} Folder(s)
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
