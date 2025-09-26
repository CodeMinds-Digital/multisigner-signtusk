'use client'

import React from 'react'
import { DocumentTemplate } from '@/types/drive'
import { DriveService } from '@/lib/drive-service'
import { FileText, Calendar, User, Eye, Edit } from 'lucide-react'
import { getStatusConfig } from '@/utils/document-status'
import { DocumentActionsMenu } from '@/components/ui/document-actions-menu'

interface DocumentListProps {
  documents: DocumentTemplate[]
  onEdit: (document: DocumentTemplate) => void
  onDelete: (documentId: string) => void
  onArchive?: (documentId: string) => void
  onUnarchive?: (documentId: string) => void
  loading: boolean
}

export function DocumentList({ documents, onEdit, onDelete, onArchive, onUnarchive, loading }: DocumentListProps) {
  // Debug document structure
  React.useEffect(() => {
    if (documents && documents.length > 0) {
      console.log('🔍 DocumentList - First document structure:', {
        document: documents[0],
        schemasType: typeof documents[0]?.schemas,
        schemasValue: documents[0]?.schemas,
        isArray: Array.isArray(documents[0]?.schemas)
      })
    }
  }, [documents])
  const handlePreview = async (document: DocumentTemplate) => {
    try {
      console.log('🔍 Drive PDF Preview - Document:', document)
      console.log('🔍 Drive PDF Preview - pdf_url:', document.pdf_url)

      const url = await DriveService.getDocumentUrl(document.pdf_url || '')
      console.log('🔍 Drive PDF Preview - Got URL:', url)

      if (url) {
        window.open(url, '_blank')
      } else {
        alert('Unable to preview document. Please try again.')
      }
    } catch (error) {
      console.error('Error previewing document:', error)
      alert('Error previewing document. Please try again.')
    }
  }

  // Get signature type display text based on signature_type column
  const getDocumentSignatureType = (document: DocumentTemplate): string => {
    // Use the signature_type field from the documents table
    if (!document.signature_type) {
      return 'No signatures'
    }

    switch (document.signature_type) {
      case 'single':
        return 'Single signature'
      case 'multi':
        return 'Multi signature'
      default:
        return 'No signatures'
    }
  }

  const getStatusBadge = (status: string) => {
    const config = getStatusConfig(status as any)
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"

    return `${baseClasses} ${config.bgColor} ${config.textColor} ${config.borderColor} border`
  }

  const getStatusIcon = (status: string) => {
    const config = getStatusConfig(status as any)
    const Icon = config.icon
    return <Icon className={`w-3 h-3 ${config.color} mr-1`} />
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div className="w-20 h-6 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (documents.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No documents yet</h3>
          <p className="text-gray-600 mb-4">
            Start by adding your first PDF document to create templates with interactive schemas.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {documents.map((document) => (
          <div key={document.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-all">
            {/* Document Header */}
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-medium text-gray-900 truncate" title={document.name}>
                  {document.name}
                </h3>
                <div className="mt-1">
                  <span className={getStatusBadge(document.status)}>
                    {getStatusIcon(document.status)} {getStatusConfig(document.status as any).label}
                  </span>
                </div>
              </div>
            </div>

            {/* Document Details */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center text-sm text-gray-600">
                <FileText className="w-4 h-4 mr-2 flex-shrink-0" />
                <span className="truncate">{document.type}</span>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <User className="w-4 h-4 mr-2 flex-shrink-0" />
                <span className="truncate">{getDocumentSignatureType(document)}</span>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <Calendar className="w-4 h-4 mr-2 flex-shrink-0" />
                <span className="truncate">{formatDate(document.created_at)}</span>
              </div>
            </div>

            {/* Schemas */}
            {Array.isArray(document.schemas) && document.schemas.length > 0 && (
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  Schemas ({Array.isArray(document.schemas) ? document.schemas.length : 0}):
                </p>
                <div className="flex flex-wrap gap-1">
                  {Array.isArray(document.schemas) && document.schemas.length > 0 ? (
                    document.schemas.slice(0, 3).map((schema, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-700"
                      >
                        {schema.type}
                      </span>
                    ))
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-700">
                      No schemas available
                    </span>
                  )}
                  {Array.isArray(document.schemas) && document.schemas.length > 3 && (
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-700">
                      +{document.schemas.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <div className="flex items-center space-x-2">
                {/* Preview Button */}
                <button
                  onClick={() => handlePreview(document)}
                  className="inline-flex items-center px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                  title="Preview PDF"
                >
                  <Eye className="w-4 h-4 mr-1" />
                  Preview
                </button>

                {/* Edit Button - only show if not archived */}
                {document.status !== 'archived' && (
                  <button
                    onClick={() => onEdit(document)}
                    className="inline-flex items-center px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                    title="Edit Document"
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </button>
                )}

              </div>

              {/* Three-dots Menu */}
              <DocumentActionsMenu
                documentItem={document}
                onDelete={onDelete}
                onArchive={onArchive || (() => { })}
                onUnarchive={onUnarchive || (() => { })}
              />
            </div>
          </div>
        ))}
      </div>
    </div >
  )
}
