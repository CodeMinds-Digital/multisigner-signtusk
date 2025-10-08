'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload, X, FileText, AlertCircle, CheckCircle, Clock } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

import { Badge } from '@/components/ui/badge'
import { CustomSwitch } from '@/components/ui/custom-switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

interface BulkUploadModalProps {
  isOpen: boolean
  onClose: () => void
  onUploadComplete: (results: any) => void
  folderId?: string
}

interface FileUploadStatus {
  file: File
  status: 'pending' | 'uploading' | 'success' | 'error'
  progress: number
  error?: string
  documentId?: string
  shareUrl?: string
}

export function BulkUploadModal({
  isOpen,
  onClose,
  onUploadComplete,
  folderId
}: BulkUploadModalProps) {
  const [files, setFiles] = useState<FileUploadStatus[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [createLinks, setCreateLinks] = useState(false)
  const [linkSettings, setLinkSettings] = useState({
    password_protected: false,
    password: '',
    expires_at: '',
    allow_download: true,
    allow_print: true,
    watermark_enabled: false,
    screenshot_protection: false,
    email_required: false,
    email_verification_required: false,
    nda_required: false,
    view_limit: null as number | null
  })
  const [uploadLimits, setUploadLimits] = useState<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = useCallback((selectedFiles: FileList | null) => {
    if (!selectedFiles) return

    const newFiles: FileUploadStatus[] = Array.from(selectedFiles).map(file => ({
      file,
      status: 'pending',
      progress: 0
    }))

    // Validate files
    const validFiles = newFiles.filter(fileStatus => {
      const { file } = fileStatus

      // Check file size (50MB limit)
      if (file.size > 50 * 1024 * 1024) {
        fileStatus.status = 'error'
        fileStatus.error = 'File size exceeds 50MB limit'
        return false
      }

      // Check file type
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain',
        'text/csv',
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp'
      ]

      if (!allowedTypes.includes(file.type)) {
        fileStatus.status = 'error'
        fileStatus.error = 'File type not supported'
        return false
      }

      return true
    })

    setFiles(prev => [...prev, ...validFiles])
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    handleFileSelect(e.dataTransfer.files)
  }, [handleFileSelect])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const startUpload = async () => {
    if (files.length === 0) {
      toast.error('No files selected')
      return
    }

    setIsUploading(true)

    try {
      const formData = new FormData()

      // Add files
      files.forEach(fileStatus => {
        if (fileStatus.status !== 'error') {
          formData.append('files', fileStatus.file)
        }
      })

      // Add settings
      if (folderId) {
        formData.append('folderId', folderId)
      }
      formData.append('createLinks', createLinks.toString())
      if (createLinks) {
        formData.append('linkSettings', JSON.stringify(linkSettings))
      }

      const response = await fetch('/api/send/documents/bulk-upload', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed')
      }

      // Update file statuses based on results
      setFiles(prev => prev.map((fileStatus, index) => {
        const uploadResult = result.documents.find((doc: any) => doc.uploadIndex === index)

        if (uploadResult) {
          if (uploadResult.error) {
            return {
              ...fileStatus,
              status: 'error',
              error: uploadResult.error
            }
          } else {
            return {
              ...fileStatus,
              status: 'success',
              progress: 100,
              documentId: uploadResult.id,
              shareUrl: uploadResult.shareLink?.url
            }
          }
        }

        return fileStatus
      }))

      toast.success(`Upload completed: ${result.uploaded} successful, ${result.failed} failed`)
      onUploadComplete(result)

    } catch (error) {
      console.error('Upload error:', error)
      toast.error(error instanceof Error ? error.message : 'Upload failed')

      // Mark all pending files as error
      setFiles(prev => prev.map(fileStatus =>
        fileStatus.status === 'pending'
          ? { ...fileStatus, status: 'error', error: 'Upload failed' }
          : fileStatus
      ))
    } finally {
      setIsUploading(false)
    }
  }

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return '📄'
    if (fileType.includes('word') || fileType.includes('document')) return '📝'
    if (fileType.includes('excel') || fileType.includes('sheet')) return '📊'
    if (fileType.includes('powerpoint') || fileType.includes('presentation')) return '📈'
    if (fileType.includes('image')) return '🖼️'
    return '📄'
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4 text-gray-400" />
      case 'uploading': return <Upload className="h-4 w-4 text-blue-500 animate-pulse" />
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error': return <AlertCircle className="h-4 w-4 text-red-500" />
      default: return null
    }
  }

  const successCount = files.filter(f => f.status === 'success').length
  const errorCount = files.filter(f => f.status === 'error').length
  const pendingCount = files.filter(f => f.status === 'pending').length

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Bulk Upload Documents</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-6">
          {/* File Drop Zone */}
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-900 mb-2">
              Drop files here or click to browse
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Supports PDF, Word, Excel, PowerPoint, images and more. Max 50MB per file.
            </p>
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              Choose Files
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files)}
            />
          </div>

          {/* Upload Options */}
          {files.length > 0 && (
            <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <CustomSwitch
                  checked={createLinks}
                  onCheckedChange={setCreateLinks}
                />
                <Label htmlFor="create-links">Create share links automatically</Label>
              </div>

              {createLinks && (
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="space-y-2">
                    <Label>Link Expiration</Label>
                    <Select
                      value={linkSettings.expires_at}
                      onValueChange={(value) => setLinkSettings(prev => ({ ...prev, expires_at: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Never expires" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Never expires</SelectItem>
                        <SelectItem value={new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()}>7 days</SelectItem>
                        <SelectItem value={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()}>30 days</SelectItem>
                        <SelectItem value={new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()}>90 days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>View Limit</Label>
                    <Input
                      type="number"
                      placeholder="Unlimited"
                      value={linkSettings.view_limit || ''}
                      onChange={(e) => setLinkSettings(prev => ({
                        ...prev,
                        view_limit: e.target.value ? parseInt(e.target.value) : null
                      }))}
                    />
                  </div>

                  <div className="col-span-2 flex flex-wrap gap-4">
                    <div className="flex items-center space-x-2">
                      <CustomSwitch
                        checked={linkSettings.password_protected}
                        onCheckedChange={(checked) => setLinkSettings(prev => ({ ...prev, password_protected: checked }))}
                      />
                      <Label htmlFor="password-protected">Password protected</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <CustomSwitch
                        checked={linkSettings.email_required}
                        onCheckedChange={(checked) => setLinkSettings(prev => ({ ...prev, email_required: checked }))}
                      />
                      <Label htmlFor="email-required">Email required</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <CustomSwitch
                        checked={linkSettings.watermark_enabled}
                        onCheckedChange={(checked) => setLinkSettings(prev => ({ ...prev, watermark_enabled: checked }))}
                      />
                      <Label htmlFor="watermark">Watermark</Label>
                    </div>
                  </div>

                  {linkSettings.password_protected && (
                    <div className="col-span-2 space-y-2">
                      <Label>Password</Label>
                      <Input
                        type="password"
                        placeholder="Enter password"
                        value={linkSettings.password}
                        onChange={(e) => setLinkSettings(prev => ({ ...prev, password: e.target.value }))}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* File List */}
          {files.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Files ({files.length})</h3>
                <div className="flex gap-2">
                  {successCount > 0 && <Badge variant="secondary" className="bg-green-100 text-green-800">{successCount} success</Badge>}
                  {errorCount > 0 && <Badge variant="secondary" className="bg-red-100 text-red-800">{errorCount} error</Badge>}
                  {pendingCount > 0 && <Badge variant="secondary">{pendingCount} pending</Badge>}
                </div>
              </div>

              <div className="max-h-60 overflow-auto space-y-2">
                {files.map((fileStatus, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                    <span className="text-2xl">{getFileIcon(fileStatus.file.type)}</span>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{fileStatus.file.name}</p>
                      <p className="text-sm text-gray-500">{formatFileSize(fileStatus.file.size)}</p>
                      {fileStatus.error && (
                        <p className="text-sm text-red-600">{fileStatus.error}</p>
                      )}
                      {fileStatus.shareUrl && (
                        <p className="text-sm text-blue-600">Share URL: {fileStatus.shareUrl}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {getStatusIcon(fileStatus.status)}
                      {!isUploading && fileStatus.status === 'pending' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-gray-500">
            {files.length > 0 && `${files.length} files selected`}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={isUploading}>
              Cancel
            </Button>
            <Button
              onClick={startUpload}
              disabled={files.length === 0 || isUploading}
            >
              {isUploading ? 'Uploading...' : `Upload ${files.length} Files`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
