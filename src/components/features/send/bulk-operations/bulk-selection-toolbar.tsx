'use client'

import { useState } from 'react'
import { 
  Trash2, 
  Archive, 
  Share2, 
  Download, 
  FolderOpen, 
  Tag, 
  MoreHorizontal,
  X,
  CheckSquare,
  Square
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'

interface BulkSelectionToolbarProps {
  selectedItems: string[]
  totalItems: number
  onSelectAll: () => void
  onSelectNone: () => void
  onBulkDelete: (itemIds: string[]) => Promise<void>
  onBulkArchive: (itemIds: string[]) => Promise<void>
  onBulkShare: (itemIds: string[]) => Promise<void>
  onBulkMoveToFolder?: (itemIds: string[], folderId: string) => Promise<void>
  onBulkAddTags?: (itemIds: string[], tagIds: string[]) => Promise<void>
  onBulkExport?: (itemIds: string[]) => Promise<void>
  itemType?: 'documents' | 'links'
  className?: string
}

export function BulkSelectionToolbar({
  selectedItems,
  totalItems,
  onSelectAll,
  onSelectNone,
  onBulkDelete,
  onBulkArchive,
  onBulkShare,
  onBulkMoveToFolder,
  onBulkAddTags,
  onBulkExport,
  itemType = 'documents',
  className = ''
}: BulkSelectionToolbarProps) {
  const [isProcessing, setIsProcessing] = useState(false)

  const hasSelection = selectedItems.length > 0
  const isAllSelected = selectedItems.length === totalItems && totalItems > 0

  const handleBulkOperation = async (
    operation: () => Promise<void>,
    operationName: string
  ) => {
    if (selectedItems.length === 0) {
      toast.error('No items selected')
      return
    }

    try {
      setIsProcessing(true)
      await operation()
      toast.success(`${operationName} completed successfully`)
    } catch (error) {
      console.error(`${operationName} failed:`, error)
      toast.error(`${operationName} failed`)
    } finally {
      setIsProcessing(false)
    }
  }

  if (!hasSelection) {
    return null
  }

  return (
    <div className={`flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg ${className}`}>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={isAllSelected ? onSelectNone : onSelectAll}
            className="h-8 w-8 p-0"
          >
            {isAllSelected ? (
              <CheckSquare className="h-4 w-4" />
            ) : (
              <Square className="h-4 w-4" />
            )}
          </Button>
          <Badge variant="secondary">
            {selectedItems.length} of {totalItems} selected
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          {/* Primary Actions */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleBulkOperation(
              () => onBulkShare(selectedItems),
              'Bulk share'
            )}
            disabled={isProcessing}
          >
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleBulkOperation(
              () => onBulkArchive(selectedItems),
              'Bulk archive'
            )}
            disabled={isProcessing}
          >
            <Archive className="h-4 w-4 mr-2" />
            Archive
          </Button>

          {/* More Actions Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={isProcessing}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {onBulkMoveToFolder && (
                <DropdownMenuItem
                  onClick={() => {
                    // This would open a folder selection modal
                    toast.info('Folder selection modal would open here')
                  }}
                >
                  <FolderOpen className="h-4 w-4 mr-2" />
                  Move to Folder
                </DropdownMenuItem>
              )}
              
              {onBulkAddTags && (
                <DropdownMenuItem
                  onClick={() => {
                    // This would open a tag selection modal
                    toast.info('Tag selection modal would open here')
                  }}
                >
                  <Tag className="h-4 w-4 mr-2" />
                  Add Tags
                </DropdownMenuItem>
              )}
              
              {onBulkExport && (
                <DropdownMenuItem
                  onClick={() => handleBulkOperation(
                    () => onBulkExport!(selectedItems),
                    'Bulk export'
                  )}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export {itemType === 'documents' ? 'Documents' : 'Analytics'}
                </DropdownMenuItem>
              )}
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem
                onClick={() => handleBulkOperation(
                  () => onBulkDelete(selectedItems),
                  'Bulk delete'
                )}
                className="text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onSelectNone}
          disabled={isProcessing}
        >
          <X className="h-4 w-4 mr-2" />
          Clear Selection
        </Button>
      </div>
    </div>
  )
}

// Hook for managing bulk selection state
export function useBulkSelection<T extends { id: string }>(items: T[]) {
  const [selectedItems, setSelectedItems] = useState<string[]>([])

  const selectItem = (itemId: string) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    )
  }

  const selectAll = () => {
    setSelectedItems(items.map(item => item.id))
  }

  const selectNone = () => {
    setSelectedItems([])
  }

  const isSelected = (itemId: string) => selectedItems.includes(itemId)

  const isAllSelected = selectedItems.length === items.length && items.length > 0

  const hasSelection = selectedItems.length > 0

  return {
    selectedItems,
    selectItem,
    selectAll,
    selectNone,
    isSelected,
    isAllSelected,
    hasSelection,
    selectedCount: selectedItems.length,
    totalCount: items.length
  }
}

// Checkbox component for individual item selection
interface BulkSelectionCheckboxProps {
  itemId: string
  isSelected: boolean
  onToggle: (itemId: string) => void
  className?: string
}

export function BulkSelectionCheckbox({
  itemId,
  isSelected,
  onToggle,
  className = ''
}: BulkSelectionCheckboxProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={(e) => {
        e.stopPropagation()
        onToggle(itemId)
      }}
      className={`h-8 w-8 p-0 ${className}`}
    >
      {isSelected ? (
        <CheckSquare className="h-4 w-4 text-blue-600" />
      ) : (
        <Square className="h-4 w-4 text-gray-400" />
      )}
    </Button>
  )
}
