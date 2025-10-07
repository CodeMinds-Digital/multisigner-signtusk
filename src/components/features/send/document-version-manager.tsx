'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Clock, 
  Upload, 
  Star, 
  FileText, 
  Calendar,
  User,
  Download,
  MoreHorizontal,
  CheckCircle
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { formatBytes } from '@/lib/utils'

interface DocumentVersion {
  id: string
  title: string
  version_number: number
  is_primary: boolean
  file_size: number
  file_type: string
  version_notes?: string
  created_at: string
  created_by: string
}

interface DocumentVersionManagerProps {
  documentId: string
  currentTitle: string
  onVersionChange?: (version: DocumentVersion) => void
}

export function DocumentVersionManager({ 
  documentId, 
  currentTitle,
  onVersionChange 
}: DocumentVersionManagerProps) {
  const [versions, setVersions] = useState<DocumentVersion[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [versionNotes, setVersionNotes] = useState('')

  // Fetch document versions
  const fetchVersions = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/send/documents/${documentId}/versions`)
      const data = await response.json()

      if (data.success) {
        setVersions(data.versions)
      } else {
        toast.error('Failed to load document versions')
      }
    } catch (error) {
      console.error('Error fetching versions:', error)
      toast.error('Failed to load document versions')
    } finally {
      setLoading(false)
    }
  }

  // Upload new version
  const handleUploadVersion = async () => {
    if (!uploadFile) {
      toast.error('Please select a file')
      return
    }

    setUploading(true)
    try {
      // First upload the file
      const formData = new FormData()
      formData.append('file', uploadFile)
      formData.append('documentId', documentId)

      const uploadResponse = await fetch('/api/send/documents/upload', {
        method: 'POST',
        body: formData
      })

      const uploadData = await uploadResponse.json()

      if (!uploadData.success) {
        throw new Error(uploadData.error || 'Upload failed')
      }

      // Create new version
      const versionResponse = await fetch(`/api/send/documents/${documentId}/versions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: currentTitle,
          file_url: uploadData.fileUrl,
          file_name: uploadFile.name,
          file_size: uploadFile.size,
          file_type: uploadFile.type,
          version_notes: versionNotes
        })
      })

      const versionData = await versionResponse.json()

      if (versionData.success) {
        toast.success('New version uploaded successfully')
        setShowUploadDialog(false)
        setUploadFile(null)
        setVersionNotes('')
        fetchVersions()
        onVersionChange?.(versionData.version)
      } else {
        throw new Error(versionData.error || 'Version creation failed')
      }
    } catch (error) {
      console.error('Error uploading version:', error)
      toast.error('Failed to upload new version')
    } finally {
      setUploading(false)
    }
  }

  // Set primary version
  const setPrimaryVersion = async (versionId: string) => {
    try {
      const response = await fetch(`/api/send/documents/${documentId}/versions`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          primary_version_id: versionId
        })
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Primary version updated')
        fetchVersions()
        onVersionChange?.(data.primary_version)
      } else {
        throw new Error(data.error || 'Failed to update primary version')
      }
    } catch (error) {
      console.error('Error setting primary version:', error)
      toast.error('Failed to update primary version')
    }
  }

  useEffect(() => {
    fetchVersions()
  }, [documentId])

  const primaryVersion = versions.find(v => v.is_primary)

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Document Versions
            </CardTitle>
            <CardDescription>
              Manage and track different versions of your document
            </CardDescription>
          </div>
          <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
            <DialogTrigger asChild>
              <Button>
                <Upload className="h-4 w-4 mr-2" />
                Upload New Version
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload New Version</DialogTitle>
                <DialogDescription>
                  Upload a new version of this document. The new version will become the primary version.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="version-file">Select File</Label>
                  <Input
                    id="version-file"
                    type="file"
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  />
                </div>
                <div>
                  <Label htmlFor="version-notes">Version Notes (Optional)</Label>
                  <Textarea
                    id="version-notes"
                    placeholder="Describe what changed in this version..."
                    value={versionNotes}
                    onChange={(e) => setVersionNotes(e.target.value)}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowUploadDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleUploadVersion}
                    disabled={!uploadFile || uploading}
                  >
                    {uploading ? 'Uploading...' : 'Upload Version'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <ScrollArea className="h-96">
            <div className="space-y-3">
              {versions.map((version) => (
                <div
                  key={version.id}
                  className={`p-4 rounded-lg border ${
                    version.is_primary 
                      ? 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950' 
                      : 'border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={version.is_primary ? 'default' : 'secondary'}>
                          Version {version.version_number}
                        </Badge>
                        {version.is_primary && (
                          <Badge variant="outline" className="text-blue-600">
                            <Star className="h-3 w-3 mr-1" />
                            Primary
                          </Badge>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          {formatBytes(version.file_size)}
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {formatDistanceToNow(new Date(version.created_at), { addSuffix: true })}
                        </div>
                      </div>

                      {version.version_notes && (
                        <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                          {version.version_notes}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {!version.is_primary && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setPrimaryVersion(version.id)}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Set as Primary
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
