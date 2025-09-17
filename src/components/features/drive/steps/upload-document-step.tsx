'use client'

import { useState, useCallback, useRef } from 'react'
import { Upload, FileText, X, AlertCircle, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface UploadDocumentStepProps {
  data?: {
    file?: File
    fileName?: string
    fileSize?: number
    uploadProgress?: number
  }
  onDataChange?: (data: any) => void
  onNext?: () => void
  canProceed?: boolean
}

export function UploadDocumentStep({
  data = {},
  onDataChange,
  onNext,
  canProceed
}: UploadDocumentStepProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { file, fileName, fileSize } = data

  const validateFile = (file: File): string | null => {
    // Check file type
    if (file.type !== 'application/pdf') {
      return 'Only PDF files are allowed'
    }

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return 'File size must be less than 10MB'
    }

    return null
  }

  const simulateUpload = async (file: File): Promise<void> => {
    setIsUploading(true)
    setUploadProgress(0)
    setError(null)

    // Simulate upload progress
    for (let progress = 0; progress <= 100; progress += 10) {
      await new Promise(resolve => setTimeout(resolve, 100))
      setUploadProgress(progress)
    }

    // Update data with file information
    onDataChange?.({
      ...data,
      file,
      fileName: file.name,
      fileSize: file.size,
      uploadProgress: 100
    })

    setIsUploading(false)
  }

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    const validationError = validateFile(selectedFile)
    if (validationError) {
      setError(validationError)
      return
    }

    await simulateUpload(selectedFile)
  }, [onDataChange, simulateUpload])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }, [handleFileSelect])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileSelect(files[0])
    }
  }, [handleFileSelect])

  const handleRemoveFile = useCallback(() => {
    onDataChange?.({
      ...data,
      file: undefined,
      fileName: undefined,
      fileSize: undefined,
      uploadProgress: 0
    })
    setUploadProgress(0)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [data, onDataChange])

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      {!file ? (
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${isDragOver
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
            }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <Upload className="mx-auto h-12 w-12 text-gray-400" />
          <div className="mt-4">
            <h3 className="text-lg font-medium text-gray-900">Upload your document</h3>
            <p className="mt-2 text-sm text-gray-500">
              Drag and drop your PDF file here, or click to browse
            </p>
          </div>

          <div className="mt-6">
            <Button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center"
            >
              <Upload className="mr-2 h-4 w-4" />
              Choose File
            </Button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileInputChange}
            className="hidden"
          />

          <div className="mt-4 text-xs text-gray-500">
            <p>Supported format: PDF</p>
            <p>Maximum file size: 10MB</p>
          </div>
        </div>
      ) : (
        /* File Preview */
        <div className="border border-gray-200 rounded-lg p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <FileText className="h-10 w-10 text-red-500" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-medium text-gray-900 truncate">
                  {fileName}
                </h3>
                <p className="text-sm text-gray-500">
                  {fileSize && formatFileSize(fileSize)}
                </p>

                {isUploading && (
                  <div className="mt-2">
                    <div className="flex items-center">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                      <span className="ml-2 text-sm text-gray-500">
                        {uploadProgress}%
                      </span>
                    </div>
                  </div>
                )}

                {!isUploading && uploadProgress === 100 && (
                  <div className="mt-2 flex items-center text-green-600">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    <span className="text-sm">Upload complete</span>
                  </div>
                )}
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleRemoveFile}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-center p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="h-5 w-5 text-red-500 mr-3" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Instructions:</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Upload a PDF document that you want to prepare for signing</li>
          <li>• Ensure the document is complete and ready for signature fields</li>
          <li>• The document will be processed in the next steps to add signature areas</li>
        </ul>
      </div>

      {/* Next Button */}
      {canProceed && file && !isUploading && (
        <div className="flex justify-end">
          <Button onClick={onNext} className="flex items-center">
            Continue to Signature Selection
          </Button>
        </div>
      )}
    </div>
  )
}
