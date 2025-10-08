'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload, File, X, CheckCircle, AlertCircle, FileText, Image as ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useAuth } from '@/components/providers/secure-auth-provider'

interface DocumentUploadProps {
  onUploadComplete?: (documentId: string, documentData: any) => void
  onClose?: () => void
  maxFileSize?: number // in MB
  allowedTypes?: string[]
  showHeader?: boolean // Show card header with title and description
}

const DEFAULT_ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp'
]

const FILE_TYPE_LABELS: Record<string, string> = {
  'application/pdf': 'PDF',
  'application/msword': 'DOC',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
  'application/vnd.ms-powerpoint': 'PPT',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PPTX',
  'application/vnd.ms-excel': 'XLS',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
  'image/png': 'PNG',
  'image/jpeg': 'JPEG',
  'image/gif': 'GIF',
  'image/webp': 'WEBP'
}

export function DocumentUpload({
  onUploadComplete,
  onClose,
  maxFileSize = 100, // 100MB default
  allowedTypes = DEFAULT_ALLOWED_TYPES,
  showHeader = true // Default to true for backward compatibility
}: DocumentUploadProps) {
  const { user } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const validateFile = (file: File): string | null => {
    // Check file size
    const fileSizeMB = file.size / 1024 / 1024
    if (fileSizeMB > maxFileSize) {
      return `File size must be less than ${maxFileSize}MB`
    }

    // Check file type
    if (!allowedTypes.includes(file.type)) {
      const allowedExtensions = allowedTypes
        .map(type => FILE_TYPE_LABELS[type] || type)
        .join(', ')
      return `File type not supported. Allowed types: ${allowedExtensions}`
    }

    return null
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const validationError = validateFile(file)
      if (validationError) {
        setError(validationError)
        return
      }
      setSelectedFile(file)
      setError(null)
      setSuccess(false)
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      const file = files[0]
      const validationError = validateFile(file)
      if (validationError) {
        setError(validationError)
        return
      }
      setSelectedFile(file)
      setError(null)
      setSuccess(false)
    }
  }, [maxFileSize, allowedTypes])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleUpload = async () => {
    if (!selectedFile || !user) {
      setError('Please select a file and ensure you are logged in')
      return
    }

    setIsUploading(true)
    setError(null)
    setUploadProgress(0)

    try {
      // Create FormData
      const formData = new FormData()
      formData.append('file', selectedFile)

      // Upload via API
      const response = await fetch('/api/send/documents/upload', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Upload failed')
      }

      const data = await response.json()

      setUploadProgress(100)
      setSuccess(true)

      // Call completion callback
      if (onUploadComplete) {
        onUploadComplete(data.document.id, data.document)
      }

      // Reset form after delay
      setTimeout(() => {
        setSelectedFile(null)
        setSuccess(false)
        setUploadProgress(0)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
        if (onClose) {
          onClose()
        }
      }, 2000)

    } catch (err: any) {
      console.error('Upload error:', err)
      setError(err.message || 'Failed to upload document')
    } finally {
      setIsUploading(false)
    }
  }

  const removeSelectedFile = () => {
    setSelectedFile(null)
    setError(null)
    setSuccess(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <ImageIcon className="w-8 h-8 text-blue-600" />
    }
    return <FileText className="w-8 h-8 text-blue-600" />
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      {showHeader && (
        <CardHeader>
          <CardTitle>Upload Document</CardTitle>
          <CardDescription>
            Drag and drop or click to browse. Supports PDF, Word, PowerPoint, Excel, and images (max {maxFileSize}MB).
          </CardDescription>
        </CardHeader>
      )}
      <CardContent className="space-y-6">
        {/* Drag & Drop Area */}
        {!selectedFile ? (
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${isDragOver
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
              }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Drop your file here
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              or click to browse from your computer
            </p>

            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              className="hidden"
              accept={allowedTypes.join(',')}
              disabled={isUploading}
            />

            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              variant="outline"
            >
              <File className="mr-2 h-4 w-4" />
              Choose File
            </Button>

            <p className="text-xs text-gray-400 mt-4">
              Max file size: {maxFileSize}MB
            </p>
          </div>
        ) : (
          /* Selected File Display */
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {getFileIcon(selectedFile.type)}
                <div>
                  <p className="font-medium text-gray-900">{selectedFile.name}</p>
                  <p className="text-sm text-gray-500">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • {FILE_TYPE_LABELS[selectedFile.type] || 'Unknown'}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={removeSelectedFile}
                disabled={isUploading}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Upload Progress */}
        {isUploading && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Uploading...</span>
              <span className="text-gray-900 font-medium">{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="h-2" />
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-900">Upload Failed</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start space-x-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-green-900">Upload Successful</p>
              <p className="text-sm text-green-700 mt-1">Your document has been uploaded successfully!</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-3 pt-4 border-t">
          {onClose && (
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isUploading}
            >
              Cancel
            </Button>
          )}
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading || success}
          >
            {isUploading ? 'Uploading...' : 'Upload Document'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

