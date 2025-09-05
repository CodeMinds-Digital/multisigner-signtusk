'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { DriveService } from '@/lib/drive-service'
import { DocumentTemplate, DocumentManagementState, DocumentStatus } from '@/types/drive'
import { DocumentList } from './document-list'
import { AddDocumentModal } from './add-document-modal'
import { DocumentDesignerWrapper } from './document-designer-wrapper'
import { DocumentStatsImproved } from './document-stats-improved'
import { Plus, FileText, AlertCircle, Filter } from 'lucide-react'
import { filterDocumentsByGroup } from '@/utils/document-status'

export function DriveMain() {
  const { user } = useAuth()
  const [state, setState] = useState<DocumentManagementState>({
    documents: [],
    loading: true,
    error: null,
    selectedDocument: null,
    currentView: 'list'
  })
  const [showAddModal, setShowAddModal] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [filteredDocuments, setFilteredDocuments] = useState<DocumentTemplate[]>([])

  // Load documents on component mount
  useEffect(() => {
    if (user) {
      loadDocuments()
    }
  }, [user])

  // Filter documents when documents or filter changes
  useEffect(() => {
    if (statusFilter === 'all') {
      setFilteredDocuments(state.documents)
    } else {
      const filtered = filterDocumentsByGroup(state.documents, statusFilter)
      setFilteredDocuments(filtered)
    }
  }, [state.documents, statusFilter])

  const loadDocuments = async () => {
    if (!user) return

    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const documents = await DriveService.getDocumentTemplates(user.id)
      setState(prev => ({
        ...prev,
        documents,
        loading: false
      }))
    } catch (error) {
      console.error('Error loading documents:', error)
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to load documents. Please try again.'
      }))
    }
  }

  const handleAddDocument = () => {
    setShowAddModal(true)
  }

  const handleDocumentCreated = (document: DocumentTemplate) => {
    setState(prev => ({
      ...prev,
      documents: [document, ...prev.documents],
      selectedDocument: document,
      currentView: 'designer'
    }))
    setShowAddModal(false)
  }

  const handleEditDocument = (document: DocumentTemplate) => {
    console.log('handleEditDocument called with:', document)
    setState(prev => ({
      ...prev,
      selectedDocument: document,
      currentView: 'designer'
    }))
  }

  const handleBackToList = () => {
    setState(prev => ({
      ...prev,
      selectedDocument: null,
      currentView: 'list'
    }))
    // Reload documents to get latest data
    loadDocuments()
  }

  const handleDocumentUpdated = (updatedDocument: DocumentTemplate) => {
    setState(prev => ({
      ...prev,
      documents: prev.documents.map(doc =>
        doc.id === updatedDocument.id ? updatedDocument : doc
      ),
      selectedDocument: updatedDocument
    }))
  }

  const handleDeleteDocument = async (documentId: string) => {
    if (!user) return

    if (confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
      try {
        const success = await DriveService.deleteDocumentTemplate(documentId, user.id)
        if (success) {
          setState(prev => ({
            ...prev,
            documents: prev.documents.filter(doc => doc.id !== documentId)
          }))
        } else {
          alert('Failed to delete document. Please try again.')
        }
      } catch (error) {
        console.error('Error deleting document:', error)
        alert('Failed to delete document. Please try again.')
      }
    }
  }

  const handleArchiveDocument = async (documentId: string) => {
    if (!user) return

    try {
      await DriveService.archiveDocumentTemplate(documentId, user.id)
      setState(prev => ({
        ...prev,
        documents: prev.documents.map(doc =>
          doc.id === documentId
            ? { ...doc, status: 'archived' }
            : doc
        )
      }))
    } catch (error) {
      console.error('Error archiving document:', error)
      alert('Failed to archive document. Please try again.')
    }
  }

  const handleUnarchiveDocument = async (documentId: string) => {
    if (!user) return

    try {
      await DriveService.unarchiveDocumentTemplate(documentId, user.id)
      // Reload documents to get the updated status
      loadDocuments()
    } catch (error) {
      console.error('Error unarchiving document:', error)
      alert('Failed to restore document from archive. Please try again.')
    }
  }

  const handleFilterChange = (filter: string) => {
    setStatusFilter(filter)
  }

  // Show designer view
  if (state.currentView === 'designer' && state.selectedDocument) {
    console.log('Rendering DocumentDesignerWrapper with document:', state.selectedDocument)
    return (
      <DocumentDesignerWrapper
        document={state.selectedDocument}
        onBack={handleBackToList}
        onDocumentUpdated={handleDocumentUpdated}
      />
    )
  }

  // Show main list view
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Drive</h1>
          <p className="text-gray-600 mt-1">
            Create and manage PDF templates with interactive schemas
          </p>
        </div>
        <button
          onClick={handleAddDocument}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Document
        </button>
      </div>

      {/* Error Message */}
      {state.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
          <AlertCircle className="w-5 h-5 text-red-500 mr-3" />
          <div>
            <p className="text-red-800 font-medium">Error</p>
            <p className="text-red-700 text-sm">{state.error}</p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {state.loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-2">Loading documents...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Enhanced Stats with Filtering */}
          <DocumentStatsImproved
            documents={state.documents}
            onFilterChange={handleFilterChange}
            activeFilter={statusFilter}
          />

          {/* Filter Info */}
          {statusFilter !== 'all' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Filter className="w-5 h-5 text-blue-600 mr-2" />
                  <span className="text-blue-800 font-medium">
                    Showing {filteredDocuments.length} documents in "{statusFilter.replace(/_/g, ' ')}" category
                  </span>
                </div>
                <button
                  onClick={() => setStatusFilter('all')}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Clear Filter
                </button>
              </div>
            </div>
          )}

          {/* Document List */}
          <DocumentList
            documents={filteredDocuments}
            onEdit={handleEditDocument}
            onDelete={handleDeleteDocument}
            onArchive={handleArchiveDocument}
            onUnarchive={handleUnarchiveDocument}
            loading={state.loading}
          />
        </>
      )}

      {/* Add Document Modal */}
      {showAddModal && (
        <AddDocumentModal
          onClose={() => setShowAddModal(false)}
          onDocumentCreated={handleDocumentCreated}
        />
      )}
    </div>
  )
}
