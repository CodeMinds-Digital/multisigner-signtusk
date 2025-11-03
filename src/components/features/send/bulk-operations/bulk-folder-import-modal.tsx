'use client'

import { useState, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import {
  FolderOpen,
  Upload,
  CheckCircle,
  XCircle,
  Loader2,
  FileText
} from 'lucide-react'

interface BulkFolderImportModalProps {
  isOpen: boolean
  onClose: () => void
  dataRoomId?: number
  onComplete?: () => void
}

interface FileWithPath {
  file: File
  path: string
}

interface UploadResult {
  path: string
  success: boolean
  documentId?: number
  error?: string
}

export function BulkFolderImportModal({
  isOpen,
  onClose,
  dataRoomId,
  onComplete
}: BulkFolderImportModalProps) {
  const [selectedFiles, setSelectedFiles] = useState<FileWithPath[]>([])
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<UploadResult[]>([])
  const [completed, setCompleted] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const filesWithPaths: FileWithPath[] = files.map(file => ({
      file,
      path: (file as any).webkitRelativePath || file.name
    }))
    setSelectedFiles(filesWithPaths)
    setResults([])
    setCompleted(false)
  }

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return

    setUploading(true)
    setProgress(0)
    setResults([])

    try {
      const formData = new FormData()
      selectedFiles.forEach(({ file, path }) => {
        formData.append('files', file)
        formData.append('paths', path)
      })

      if (dataRoomId) {
        formData.append('dataRoomId', dataRoomId.toString())
      }

      const response = await fetch('/api/send/documents/bulk-folder-upload', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (data.success) {
        setResults(data.results)
        setProgress(100)
        setCompleted(true)
        if (onComplete) {
          onComplete()
        }
      } else {
        throw new Error(data.error || 'Upload failed')
      }
    } catch (error) {
      console.error('Upload error:', error)
      alert('Failed to upload files. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const handleClose = () => {
    setSelectedFiles([])
    setResults([])
    setCompleted(false)
    setProgress(0)
    onClose()
  }

  const successCount = results.filter(r => r.success).length
  const failureCount = results.filter(r => !r.success).length

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5" />
            Bulk Folder Import
          </DialogTitle>
          <DialogDescription>
            Upload an entire folder structure while preserving the hierarchy
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Selection */}
          {!completed && (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                // @ts-ignore - webkitdirectory is not in TypeScript types
                webkitdirectory=""
                multiple
                onChange={handleFolderSelect}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full"
              >
                <FolderOpen className="w-4 h-4 mr-2" />
                Select Folder
              </Button>
            </div>
          )}

          {/* Selected Files Preview */}
          {selectedFiles.length > 0 && !completed && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">
                  Selected Files ({selectedFiles.length})
                </p>
                <Badge variant="secondary">
                  {(selectedFiles.reduce((acc, f) => acc + f.file.size, 0) / 1024 / 1024).toFixed(2)} MB
                </Badge>
              </div>
              <ScrollArea className="h-48 border rounded-lg p-2">
                <div className="space-y-1">
                  {selectedFiles.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 text-sm p-2 hover:bg-gray-50 rounded"
                    >
                      <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="flex-1 truncate text-xs font-mono">
                        {item.path}
                      </span>
                      <span className="text-xs text-gray-500">
                        {(item.file.size / 1024).toFixed(1)} KB
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Upload Progress */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Uploading files...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {/* Results */}
          {completed && results.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">Upload Results</p>
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="bg-green-600">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    {successCount} Success
                  </Badge>
                  {failureCount > 0 && (
                    <Badge variant="destructive">
                      <XCircle className="w-3 h-3 mr-1" />
                      {failureCount} Failed
                    </Badge>
                  )}
                </div>
              </div>
              <ScrollArea className="h-64 border rounded-lg p-2">
                <div className="space-y-1">
                  {results.map((result, index) => (
                    <div
                      key={index}
                      className={`flex items-center gap-2 text-sm p-2 rounded ${
                        result.success ? 'bg-green-50' : 'bg-red-50'
                      }`}
                    >
                      {result.success ? (
                        <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                      )}
                      <span className="flex-1 truncate text-xs font-mono">
                        {result.path}
                      </span>
                      {result.error && (
                        <span className="text-xs text-red-600">{result.error}</span>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter>
          {!completed ? (
            <>
              <Button variant="outline" onClick={handleClose} disabled={uploading}>
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                disabled={selectedFiles.length === 0 || uploading}
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload {selectedFiles.length} Files
                  </>
                )}
              </Button>
            </>
          ) : (
            <Button onClick={handleClose}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

