'use client'

import { useState } from 'react'
import { Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DocumentList } from '@/components/features/documents/document-list'
import { UploadDocument } from '@/components/features/documents/upload-document'

export default function DocumentsPage() {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const handleUploadSuccess = () => {
    setRefreshKey(prev => prev + 1)
    setIsUploadModalOpen(false)
  }

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
          <p className="text-gray-600">Manage and track all your documents</p>
        </div>
        <Button
          onClick={() => setIsUploadModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Upload className="w-4 h-4 mr-2" />
          Upload Document
        </Button>
      </div>

      <DocumentList key={refreshKey} onRefresh={handleRefresh} />

      <UploadDocument
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={handleUploadSuccess}
      />
    </div>
  )
}
