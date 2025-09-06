'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload, File, X, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/providers/auth-provider'
import { LoadingOverlay, ProgressBar } from '@/components/ui/loading'
import { ErrorBoundary } from '@/components/ui/error-boundary'

interface DocumentUploadProps {
  onUploadComplete?: (documentId: string) => void
  onClose?: () => void
}

export function DocumentUpload({ onUploadComplete, onClose }: DocumentUploadProps) {
  const [selectedDocument, setSelectedDocument] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { user } = useAuth()

  const validateFile = useCallback((file: File): string | null => {
    // Check file type
    if (file.type !== 'application/pdf') {
      return 'Please select a PDF file'
    }

    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      return `File size must be less than ${Math.round(maxSize / (1024 * 1024))}MB`
    }

    // Check file name
    if (file.name.length > 255) {
      return 'File name is too long'
    }

    // Check for potentially dangerous file extensions
    const fileName = file.name.toLowerCase()
    if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
      return 'Invalid file name'
    }

    return null
  }, [])

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const validationError = validateFile(file)
      if (validationError) {
        setError(validationError)
        return
      }
      setSelectedDocument(file)
      setError(null)
      setSuccess(false)
    }
  }

  const generateAndSaveQRCode = async (documentId: string, publicUrl: string) => {
    try {
      // This would typically generate a QR code
      // For now, we'll return a placeholder
      return {
        qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(publicUrl)}`
      }
    } catch (error) {
      console.error('Error generating QR code:', error)
      return { qrCodeUrl: null }
    }
  }

  const handleUpload = async () => {
    if (!selectedDocument || !user) {
      setError('Please select a document and ensure you are logged in')
      return
    }

    // Re-validate file before upload
    const validationError = validateFile(selectedDocument)
    if (validationError) {
      setError(validationError)
      return
    }

    setIsUploading(true)
    setError(null)
    setUploadProgress(0)
    setSuccess(false)

    try {
      // Generate a unique file name and document ID using crypto API for better randomness
      const timestamp = Date.now()
      const randomBytes = crypto.getRandomValues(new Uint8Array(4))
      const randomId = Array.from(randomBytes, byte => byte.toString(36)).join('')
      const uniqueDocId = `${timestamp}-${randomId}`

      setUploadProgress(10)

      // Try to get existing files count, but don't fail if table doesn't exist
      let fileCount = 0
      try {
        const { data, error } = await supabase
          .from('user_files')
          .select('id')
          .eq('user_id', user.id)

        if (!error && data) {
          fileCount = data.length
        }
      } catch (err) {
        console.warn('user_files table not available, using default count')
      }

      const sanitizedFileName = selectedDocument.name.replace(/[^a-zA-Z0-9.-]/g, '_')
      const uniqueFileName = `${user.id}-${fileCount}-${uniqueDocId}-${sanitizedFileName}`

      setUploadProgress(25)

      // Try multiple storage buckets in order of preference
      let fileDetails, publicUrl
      const buckets = ['documents', 'files', 'uploads']
      let uploadSuccess = false

      for (const bucket of buckets) {
        try {
          const { data, error } = await supabase.storage
            .from(bucket)
            .upload(`${uniqueFileName}.pdf`, selectedDocument, {
              cacheControl: '3600',
              upsert: false
            })

          if (!error && data) {
            fileDetails = data
            const { data: urlData } = supabase.storage
              .from(bucket)
              .getPublicUrl(data.path)
            publicUrl = urlData.publicUrl
            uploadSuccess = true
            console.log(`Successfully uploaded to ${bucket} bucket`)
            break
          }
        } catch (err) {
          console.warn(`Failed to upload to ${bucket} bucket:`, err)
          continue
        }
      }

      if (!uploadSuccess) {
        throw new Error('Failed to upload to any storage bucket. Please check your Supabase storage configuration.')
      }

      setUploadProgress(50)

      setUploadProgress(75)

      // Generate and save QR code automatically
      const qrCodeData = await generateAndSaveQRCode(uniqueDocId, publicUrl)

      // Try to save file metadata to database
      try {
        const { data: insertedFile, error: insertError } = await supabase
          .from('user_files')
          .insert([
            {
              file_id: fileDetails.id,
              user_id: user.id,
              public_url: publicUrl,
              path: fileDetails.fullPath,
              document_id: uniqueDocId,
              qr_url: qrCodeData.qrCodeUrl
            }
          ])

        if (insertError) {
          console.warn('Could not save to user_files table:', insertError.message)
        }
      } catch (err) {
        console.warn('user_files table not available, file uploaded to storage only')
      }



      setUploadProgress(100)
      setSuccess(true)

      // Show success message
      console.log('File uploaded successfully:', {
        documentId: uniqueDocId,
        fileName: selectedDocument.name,
        publicUrl: publicUrl
      })

      // Call completion callback
      if (onUploadComplete) {
        onUploadComplete(uniqueDocId)
      }

      // Reset form after a delay
      setTimeout(() => {
        setSelectedDocument(null)
        setSuccess(false)
        setUploadProgress(0)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      }, 3000)

    } catch (err: any) {
      console.error('Upload error:', err)
      setError(err.message || 'Failed to upload document')
    } finally {
      setIsUploading(false)
    }
  }

  const removeSelectedFile = () => {
    setSelectedDocument(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <ErrorBoundary>
      <LoadingOverlay
        isLoading={isUploading}
        message={`Uploading... ${Math.round(uploadProgress)}%`}
      >
        <Card className="w-full max-w-2xl mx-auto">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Upload Document</CardTitle>
                <CardDescription>
                  Upload a PDF document for digital signing
                </CardDescription>
              </div>
              {onClose && (
                <Button variant="ghost" size="sm" onClick={onClose}>
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Document Selection */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Select Document
              </label>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
                accept=".pdf"
                disabled={isUploading}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="w-full px-4 py-2.5 text-left border rounded-lg flex items-center justify-between text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center space-x-2">
                  <File className="w-5 h-5 text-gray-400" />
                  <span>{selectedDocument ? selectedDocument.name : 'Choose PDF file...'}</span>
                </div>
                <Upload className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Selected File Display */}
            {selectedDocument && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <File className="w-8 h-8 text-blue-600" />
                    <div>
                      <p className="font-medium text-gray-900">{selectedDocument.name}</p>
                      <p className="text-sm text-gray-500">
                        {(selectedDocument.size / 1024 / 1024).toFixed(2)} MB
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
                <div className="flex justify-between text-sm">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-green-800 font-medium">Document uploaded successfully!</span>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800">{error}</p>
              </div>
            )}

            {/* Progress Bar */}
            {isUploading && (
              <ProgressBar
                progress={uploadProgress}
                message="Uploading document..."
                className="mb-4"
              />
            )}

            {/* Upload Button */}
            <Button
              onClick={handleUpload}
              disabled={!selectedDocument || isUploading}
              className="w-full"
            >
              {isUploading ? 'Uploading...' : 'Upload Document'}
            </Button>
          </CardContent>
        </Card>
      </LoadingOverlay>
    </ErrorBoundary>
  )
}
