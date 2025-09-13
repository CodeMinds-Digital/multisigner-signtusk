'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/components/providers/secure-auth-provider'
import { DriveService } from '@/lib/drive-service'
import { DocumentMetadataService, DocumentType, DocumentCategory } from '@/lib/document-metadata-service'
import { DocumentTemplate, DocumentUploadData } from '@/types/drive'
import { X, Upload, FileText, Eye, CheckCircle } from 'lucide-react'

interface AddDocumentModalProps {
  onClose: () => void
  onDocumentCreated: (document: DocumentTemplate) => void
}

export function AddDocumentModal({ onClose, onDocumentCreated }: AddDocumentModalProps) {
  const { user } = useAuth()
  const [step, setStep] = useState<1 | 2>(1)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    category: ''
  })
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([])
  const [documentCategories, setDocumentCategories] = useState<DocumentCategory[]>([])
  const [loadingMetadata, setLoadingMetadata] = useState(true)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadedDocument, setUploadedDocument] = useState<DocumentTemplate | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Load document types and categories
  useEffect(() => {
    const loadMetadata = async () => {
      if (!user?.id) return

      setLoadingMetadata(true)
      try {
        const [types, categories] = await Promise.all([
          DocumentMetadataService.getDocumentTypes(user.id),
          DocumentMetadataService.getDocumentCategories(user.id)
        ])
        setDocumentTypes(types)
        setDocumentCategories(categories)
      } catch (error) {
        console.error('Error loading metadata:', error)
      } finally {
        setLoadingMetadata(false)
      }
    }

    loadMetadata()
  }, [user?.id])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const validateStep1 = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Document name is required'
    }

    if (!formData.type.trim()) {
      newErrors.type = 'Document type is required'
    }

    if (!formData.category.trim()) {
      newErrors.category = 'Document category is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleStep1Next = () => {
    if (validateStep1()) {
      setStep(2)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.type === 'application/pdf') {
        setSelectedFile(file)
        setErrors(prev => ({ ...prev, file: '' }))
      } else {
        setErrors(prev => ({ ...prev, file: 'Please select a valid PDF file' }))
      }
    }
  }

  const handleUpload = async () => {
    if (!selectedFile || !user) {
      setErrors(prev => ({ ...prev, file: 'Please select a PDF file' }))
      return
    }

    console.log('Starting upload with user:', user)
    setLoading(true)
    try {
      // Upload PDF to Supabase storage
      const uploadResult = await DriveService.uploadDocument(selectedFile, user.id)

      console.log('Upload result:', uploadResult)

      if (uploadResult.error || !uploadResult.data) {
        console.error('Upload failed:', uploadResult.error)
        throw new Error('Failed to upload document')
      }

      // Create document template record
      const documentData: DocumentUploadData = {
        name: formData.name,
        type: formData.type,
        category: formData.category,
        file: selectedFile
      }

      console.log('Creating document template with data:', {
        documentData,
        pdfPath: uploadResult.data.path,
        userId: user.id
      })

      const document = await DriveService.createDocumentTemplate(
        documentData,
        uploadResult.data.path,
        user.id
      )

      console.log('Document creation result:', document)

      if (!document) {
        throw new Error('Failed to create document template')
      }

      // Get preview URL
      const url = await DriveService.getDocumentUrl(document.pdf_url)

      setUploadedDocument(document)
      setPreviewUrl(url)
      setLoading(false)
    } catch (error) {
      console.error('Error uploading document:', error)
      setErrors(prev => ({ ...prev, upload: 'Failed to upload document. Please try again.' }))
      setLoading(false)
    }
  }

  const handlePreview = () => {
    if (previewUrl) {
      window.open(previewUrl, '_blank')
    }
  }

  const handleOpenDesigner = () => {
    if (uploadedDocument) {
      onDocumentCreated(uploadedDocument)
    }
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            Add Document - Step {step}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 1 ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Document Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.name ? 'border-red-500' : 'border-gray-300'
                    }`}
                  placeholder="Enter document name"
                />
                {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Document Type *
                </label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.type ? 'border-red-500' : 'border-gray-300'
                    }`}
                  disabled={loadingMetadata}
                >
                  <option value="">Select document type</option>
                  {documentTypes.map((type) => (
                    <option key={type.id} value={type.name}>
                      {type.name}
                    </option>
                  ))}
                </select>
                {errors.type && <p className="text-red-500 text-sm mt-1">{errors.type}</p>}
                {loadingMetadata && <p className="text-gray-500 text-sm mt-1">Loading document types...</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Document Category *
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.category ? 'border-red-500' : 'border-gray-300'
                    }`}
                  disabled={loadingMetadata}
                >
                  <option value="">Select document category</option>
                  {documentCategories.map((category) => (
                    <option key={category.id} value={category.name}>
                      {category.name}
                    </option>
                  ))}
                </select>
                {errors.category && <p className="text-red-500 text-sm mt-1">{errors.category}</p>}
                {loadingMetadata && <p className="text-gray-500 text-sm mt-1">Loading document categories...</p>}
              </div>
            </div>
          ) : uploadedDocument ? (
            // Success state
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">Document Uploaded Successfully!</h3>
              <p className="text-gray-600">
                Your document "{uploadedDocument.name}" has been uploaded to Supabase Storage.
              </p>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <FileText className="w-5 h-5 text-blue-600 mr-2" />
                    <span className="text-sm font-medium">{uploadedDocument.name}</span>
                  </div>
                  {previewUrl && (
                    <button
                      onClick={handlePreview}
                      className="text-blue-600 hover:text-blue-700 text-sm flex items-center"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Preview
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            // File upload state
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select PDF Document</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Choose the PDF file for "{formData.name}"
                </p>
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="pdf-upload"
                />
                <label
                  htmlFor="pdf-upload"
                  className="cursor-pointer flex flex-col items-center"
                >
                  <Upload className="w-8 h-8 text-gray-400 mb-2" />
                  <div className="text-sm text-gray-600">
                    Click to select PDF file
                  </div>
                </label>
              </div>

              {selectedFile && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                  <div className="flex items-center">
                    <FileText className="w-5 h-5 text-blue-600 mr-2" />
                    <span className="text-sm text-blue-800">
                      {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  </div>
                </div>
              )}

              {errors.file && <p className="text-red-500 text-sm">{errors.file}</p>}
              {errors.upload && <p className="text-red-500 text-sm">{errors.upload}</p>}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-6 border-t bg-gray-50">
          <div className="flex space-x-2">
            {step === 2 && !uploadedDocument && (
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>

          {step === 1 ? (
            <button
              onClick={handleStep1Next}
              className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Next
            </button>
          ) : uploadedDocument ? (
            <button
              onClick={handleOpenDesigner}
              className="px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
            >
              Open Designer
            </button>
          ) : (
            <button
              onClick={handleUpload}
              disabled={!selectedFile || loading}
              className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Uploading...' : 'Upload & Continue'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
