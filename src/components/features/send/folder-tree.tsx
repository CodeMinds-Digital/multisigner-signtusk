'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { 
  Folder, 
  FolderPlus, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  ChevronRight, 
  ChevronDown,
  FileText,
  Home
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface FolderItem {
  id: string
  name: string
  parent_id: string | null
  path: string
  color: string
  description?: string
  document_count: number
  created_at: string
}

interface FolderTreeProps {
  onFolderSelect?: (folderId: string | null) => void
  selectedFolderId?: string | null
  showDocumentCounts?: boolean
  allowDragDrop?: boolean
}

export function FolderTree({ 
  onFolderSelect, 
  selectedFolderId, 
  showDocumentCounts = true,
  allowDragDrop = false 
}: FolderTreeProps) {
  const [folders, setFolders] = useState<FolderItem[]>([])
  const [loading, setLoading] = useState(false)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingFolder, setEditingFolder] = useState<FolderItem | null>(null)
  const [parentFolderId, setParentFolderId] = useState<string | null>(null)

  // Form state
  const [folderName, setFolderName] = useState('')
  const [folderColor, setFolderColor] = useState('#3B82F6')
  const [folderDescription, setFolderDescription] = useState('')

  // Fetch folders
  const fetchFolders = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/send/folders')
      const data = await response.json()

      if (data.success) {
        setFolders(data.folders)
      } else {
        toast.error('Failed to load folders')
      }
    } catch (error) {
      console.error('Error fetching folders:', error)
      toast.error('Failed to load folders')
    } finally {
      setLoading(false)
    }
  }

  // Create folder
  const createFolder = async () => {
    if (!folderName.trim()) {
      toast.error('Folder name is required')
      return
    }

    try {
      const response = await fetch('/api/send/folders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: folderName,
          parent_id: parentFolderId,
          color: folderColor,
          description: folderDescription
        })
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Folder created successfully')
        setShowCreateDialog(false)
        resetForm()
        fetchFolders()
        
        // Expand parent folder if it exists
        if (parentFolderId) {
          setExpandedFolders(prev => new Set([...prev, parentFolderId]))
        }
      } else {
        toast.error(data.error || 'Failed to create folder')
      }
    } catch (error) {
      console.error('Error creating folder:', error)
      toast.error('Failed to create folder')
    }
  }

  // Update folder
  const updateFolder = async () => {
    if (!editingFolder || !folderName.trim()) return

    try {
      const response = await fetch(`/api/send/folders/${editingFolder.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: folderName,
          color: folderColor,
          description: folderDescription
        })
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Folder updated successfully')
        setEditingFolder(null)
        resetForm()
        fetchFolders()
      } else {
        toast.error(data.error || 'Failed to update folder')
      }
    } catch (error) {
      console.error('Error updating folder:', error)
      toast.error('Failed to update folder')
    }
  }

  // Delete folder
  const deleteFolder = async (folderId: string) => {
    if (!confirm('Are you sure you want to delete this folder? It must be empty.')) {
      return
    }

    try {
      const response = await fetch(`/api/send/folders/${folderId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Folder deleted successfully')
        fetchFolders()
      } else {
        toast.error(data.error || 'Failed to delete folder')
      }
    } catch (error) {
      console.error('Error deleting folder:', error)
      toast.error('Failed to delete folder')
    }
  }

  // Reset form
  const resetForm = () => {
    setFolderName('')
    setFolderColor('#3B82F6')
    setFolderDescription('')
    setParentFolderId(null)
  }

  // Toggle folder expansion
  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev)
      if (newSet.has(folderId)) {
        newSet.delete(folderId)
      } else {
        newSet.add(folderId)
      }
      return newSet
    })
  }

  // Build folder tree structure
  const buildFolderTree = (parentId: string | null = null): FolderItem[] => {
    return folders
      .filter(folder => folder.parent_id === parentId)
      .sort((a, b) => a.name.localeCompare(b.name))
  }

  // Render folder item
  const renderFolder = (folder: FolderItem, level: number = 0) => {
    const hasChildren = folders.some(f => f.parent_id === folder.id)
    const isExpanded = expandedFolders.has(folder.id)
    const isSelected = selectedFolderId === folder.id

    return (
      <div key={folder.id}>
        <div
          className={cn(
            'flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800',
            isSelected && 'bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800',
            'transition-colors'
          )}
          style={{ paddingLeft: `${level * 20 + 8}px` }}
          onClick={() => onFolderSelect?.(folder.id)}
        >
          {hasChildren && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={(e) => {
                e.stopPropagation()
                toggleFolder(folder.id)
              }}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          )}
          
          {!hasChildren && <div className="w-6" />}
          
          <Folder 
            className="h-4 w-4 flex-shrink-0" 
            style={{ color: folder.color }}
          />
          
          <span className="flex-1 text-sm font-medium truncate">
            {folder.name}
          </span>
          
          {showDocumentCounts && folder.document_count > 0 && (
            <Badge variant="secondary" className="text-xs">
              {folder.document_count}
            </Badge>
          )}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  setParentFolderId(folder.id)
                  setShowCreateDialog(true)
                }}
              >
                <FolderPlus className="h-4 w-4 mr-2" />
                Add Subfolder
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  setEditingFolder(folder)
                  setFolderName(folder.name)
                  setFolderColor(folder.color)
                  setFolderDescription(folder.description || '')
                }}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  deleteFolder(folder.id)
                }}
                className="text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {hasChildren && isExpanded && (
          <div>
            {buildFolderTree(folder.id).map(childFolder => 
              renderFolder(childFolder, level + 1)
            )}
          </div>
        )}
      </div>
    )
  }

  useEffect(() => {
    fetchFolders()
  }, [])

  return (
    <div className="space-y-2">
      {/* Root folder */}
      <div
        className={cn(
          'flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800',
          selectedFolderId === null && 'bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800'
        )}
        onClick={() => onFolderSelect?.(null)}
      >
        <Home className="h-4 w-4" />
        <span className="flex-1 text-sm font-medium">All Documents</span>
      </div>

      {/* Folder tree */}
      {loading ? (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="space-y-1">
          {buildFolderTree().map(folder => renderFolder(folder))}
        </div>
      )}

      {/* Create folder button */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full"
            onClick={() => {
              setParentFolderId(null)
              resetForm()
            }}
          >
            <FolderPlus className="h-4 w-4 mr-2" />
            New Folder
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>
              Create a new folder to organize your documents.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="folder-name">Folder Name</Label>
              <Input
                id="folder-name"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                placeholder="Enter folder name"
              />
            </div>
            <div>
              <Label htmlFor="folder-color">Color</Label>
              <Input
                id="folder-color"
                type="color"
                value={folderColor}
                onChange={(e) => setFolderColor(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="folder-description">Description (Optional)</Label>
              <Textarea
                id="folder-description"
                value={folderDescription}
                onChange={(e) => setFolderDescription(e.target.value)}
                placeholder="Enter folder description"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowCreateDialog(false)}
              >
                Cancel
              </Button>
              <Button onClick={createFolder}>
                Create Folder
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit folder dialog */}
      <Dialog open={!!editingFolder} onOpenChange={() => setEditingFolder(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Folder</DialogTitle>
            <DialogDescription>
              Update folder details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-folder-name">Folder Name</Label>
              <Input
                id="edit-folder-name"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                placeholder="Enter folder name"
              />
            </div>
            <div>
              <Label htmlFor="edit-folder-color">Color</Label>
              <Input
                id="edit-folder-color"
                type="color"
                value={folderColor}
                onChange={(e) => setFolderColor(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="edit-folder-description">Description (Optional)</Label>
              <Textarea
                id="edit-folder-description"
                value={folderDescription}
                onChange={(e) => setFolderDescription(e.target.value)}
                placeholder="Enter folder description"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setEditingFolder(null)}
              >
                Cancel
              </Button>
              <Button onClick={updateFolder}>
                Update Folder
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
