'use client'

import React, { useState, useRef, useEffect } from 'react'
import { MoreVertical, Archive, Trash2, ArchiveRestore } from 'lucide-react'
import { DocumentTemplate } from '@/types/drive'

interface DocumentActionsMenuProps {
  documentItem: DocumentTemplate
  onDelete: (documentId: string) => void
  onArchive: (documentId: string) => void
  onUnarchive: (documentId: string) => void
}

export function DocumentActionsMenu({
  documentItem,
  onDelete,
  onArchive,
  onUnarchive
}: DocumentActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleAction = (action: () => void) => {
    action()
    setIsOpen(false)
  }

  const isArchived = documentItem.status === 'archived'

  return (
    <div className="relative" ref={menuRef}>
      {/* Three-dots button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center justify-center w-8 h-8 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
        title="More actions"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-50">
          {/* Archive/Unarchive */}
          {isArchived ? (
            <button
              onClick={() => handleAction(() => onUnarchive(documentItem.id))}
              className="flex items-center w-full px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 transition-colors"
            >
              <ArchiveRestore className="w-4 h-4 mr-3" />
              Restore from Archive
            </button>
          ) : (
            <button
              onClick={() => handleAction(() => onArchive(documentItem.id))}
              className="flex items-center w-full px-4 py-2 text-sm text-amber-600 hover:bg-amber-50 transition-colors"
            >
              <Archive className="w-4 h-4 mr-3" />
              Archive Document
            </button>
          )}

          {/* Delete */}
          <button
            onClick={() => handleAction(() => onDelete(documentItem.id))}
            className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-4 h-4 mr-3" />
            Delete Document
          </button>
        </div>
      )}
    </div>
  )
}
