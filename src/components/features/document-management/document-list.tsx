'use client'

import React from 'react'
import { DocumentTemplate } from '@/types/document-management'
import { DocumentManagementService } from '@/lib/document-management-service'
import { Edit, Trash2, Eye, FileText, Calendar, User } from 'lucide-react'
import { getStatusConfig } from '@/utils/document-status'

interface DocumentListProps {
  documents: DocumentTemplate[]
  onEdit: (document: DocumentTemplate) => void
  onDelete: (documentId: string) => void
  loading: boolean
}

export function DocumentList({ documents, onEdit, onDelete, loading }: DocumentListProps) {
  const handlePreview = async (document: DocumentTemplate) => {
    try {
      const url = await DocumentManagementService.getDocumentUrl(document.pdf_url)
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
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-medium text-gray-900">Documents</h2>
      </div>

      <div className="divide-y divide-gray-200">
        {documents.map((document) => (
          <div key={document.id} className="p-6 hover:bg-gray-50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 flex-1">
                {/* Document Icon */}
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>

                {/* Document Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3 mb-1">
                    <h3 className="text-lg font-medium text-gray-900 truncate">
                      {document.name}
                    </h3>
                    <span className={getStatusBadge(document.status)}>
                      {getStatusIcon(document.status)} {getStatusConfig(document.status as any).label}
                    </span>
                  </div>

                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <span className="flex items-center">
                      <FileText className="w-4 h-4 mr-1" />
                      {document.type}
                    </span>
                    <span className="flex items-center">
                      <User className="w-4 h-4 mr-1" />
                      {document.signature_type} signature
                    </span>
                    <span className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      {formatDate(document.created_at)}
                    </span>
                  </div>

                  {/* Schemas */}
                  {document.schemas.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm text-gray-600 mb-1">
                        Schemas ({document.schemas.length}):
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {document.schemas.slice(0, 5).map((schema, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-700"
                          >
                            {schema.type}
                          </span>
                        ))}
                        {document.schemas.length > 5 && (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-700">
                            +{document.schemas.length - 5} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-2 ml-4">
                <button
                  onClick={() => handlePreview(document)}
                  className="inline-flex items-center px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                  title="Preview PDF"
                >
                  <Eye className="w-4 h-4 mr-1" />
                  Preview
                </button>

                <button
                  onClick={() => onEdit(document)}
                  className="inline-flex items-center px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                  title="Edit Document"
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </button>

                <button
                  onClick={() => onDelete(document.id)}
                  className="inline-flex items-center px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                  title="Delete Document"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
