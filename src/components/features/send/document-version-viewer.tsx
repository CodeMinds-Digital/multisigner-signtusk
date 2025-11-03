'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ConfirmationModal } from '@/components/ui/modal'
import {
  Clock,
  User,
  FileText,
  Download,
  Trash2,
  Edit2,
  Check,
  X,
  Star,
  Loader2,
  AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'

interface DocumentVersion {
  id: string
  version_number: number
  file_url: string
  file_name: string
  file_size: number
  file_type: string
  version_notes?: string
  created_by: string
  created_at: string
  is_primary: boolean
  uploader_name?: string
  uploader_email?: string
}

interface DocumentVersionViewerProps {
  documentId: string
  isOpen: boolean
  onClose: () => void
}

export default function DocumentVersionViewer({
  documentId,
  isOpen,
  onClose
}: DocumentVersionViewerProps) {
  const [versions, setVersions] = useState<DocumentVersion[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [editingNotes, setEditingNotes] = useState<string | null>(null)
  const [notesValue, setNotesValue] = useState('')
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  // Fetch versions
  const fetchVersions = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/send/documents/${documentId}/versions`)
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch versions')
      }

      setVersions(data.versions || [])
    } catch (error: any) {
      console.error('Failed to fetch versions:', error)
      toast.error(error.message || 'Failed to load version history')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen && documentId) {
      fetchVersions()
    }
  }, [isOpen, documentId])

  // Set as primary version
  const handleSetPrimary = async (versionId: string) => {
    try {
      setActionLoading(versionId)
      const response = await fetch(`/api/send/documents/${documentId}/versions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ primary_version_id: versionId })
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to set primary version')
      }

      toast.success('Primary version updated successfully')
      await fetchVersions()
    } catch (error: any) {
      console.error('Failed to set primary:', error)
      toast.error(error.message || 'Failed to update primary version')
    } finally {
      setActionLoading(null)
    }
  }

  // Update version notes
  const handleUpdateNotes = async (versionId: string) => {
    try {
      setActionLoading(versionId)
      const response = await fetch(`/api/send/documents/${versionId}/versions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_notes',
          version_notes: notesValue
        })
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to update notes')
      }

      toast.success('Notes updated successfully')
      setEditingNotes(null)
      setNotesValue('')
      await fetchVersions()
    } catch (error: any) {
      console.error('Failed to update notes:', error)
      toast.error(error.message || 'Failed to update notes')
    } finally {
      setActionLoading(null)
    }
  }

  // Delete version
  const handleDelete = async (versionId: string) => {
    try {
      setActionLoading(versionId)
      const response = await fetch(`/api/send/documents/${versionId}/versions`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to delete version')
      }

      toast.success('Version deleted successfully')
      setDeleteConfirmId(null)
      await fetchVersions()
    } catch (error: any) {
      console.error('Failed to delete version:', error)
      toast.error(error.message || 'Failed to delete version')
    } finally {
      setActionLoading(null)
    }
  }

  // Download version
  const handleDownload = (version: DocumentVersion) => {
    window.open(version.file_url, '_blank')
  }

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Version History</DialogTitle>
            <DialogDescription>
              View, restore, and manage document versions
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : versions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <AlertCircle className="w-12 h-12 mb-4" />
                <p>No version history available</p>
              </div>
            ) : (
              <div className="space-y-4">
                {versions.map((version) => (
                  <div
                    key={version.id}
                    className={`border rounded-lg p-4 ${
                      version.is_primary ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="w-5 h-5 text-gray-600" />
                          <span className="font-medium text-gray-900">
                            Version {version.version_number}
                          </span>
                          {version.is_primary && (
                            <Badge className="bg-blue-600 text-white">
                              <Star className="w-3 h-3 mr-1" />
                              Primary
                            </Badge>
                          )}
                        </div>

                        <div className="text-sm text-gray-600 space-y-1">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4" />
                            <span>{version.uploader_email || 'Unknown'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            <span>
                              {formatDistanceToNow(new Date(version.created_at), {
                                addSuffix: true
                              })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            <span>
                              {version.file_name} ({formatFileSize(version.file_size)})
                            </span>
                          </div>
                        </div>

                        {/* Version Notes */}
                        <div className="mt-3">
                          {editingNotes === version.id ? (
                            <div className="space-y-2">
                              <Label htmlFor={`notes-${version.id}`}>Notes</Label>
                              <Input
                                id={`notes-${version.id}`}
                                value={notesValue}
                                onChange={(e) => setNotesValue(e.target.value)}
                                placeholder="Add version notes..."
                                className="w-full"
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleUpdateNotes(version.id)}
                                  disabled={actionLoading === version.id}
                                >
                                  {actionLoading === version.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Check className="w-4 h-4" />
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setEditingNotes(null)
                                    setNotesValue('')
                                  }}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start gap-2">
                              <p className="text-sm text-gray-600 flex-1">
                                {version.version_notes || (
                                  <span className="italic">No notes</span>
                                )}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-2 ml-4">
                        {!version.is_primary && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSetPrimary(version.id)}
                            disabled={actionLoading === version.id}
                          >
                            {actionLoading === version.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <Star className="w-4 h-4 mr-1" />
                                Set Primary
                              </>
                            )}
                          </Button>
                        )}

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingNotes(version.id)
                            setNotesValue(version.version_notes || '')
                          }}
                        >
                          <Edit2 className="w-4 h-4 mr-1" />
                          Edit Notes
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownload(version)}
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Download
                        </Button>

                        {!version.is_primary && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setDeleteConfirmId(version.id)}
                            disabled={actionLoading === version.id}
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Delete
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        id="delete-version-confirm"
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={() => deleteConfirmId && handleDelete(deleteConfirmId)}
        title="Delete Version"
        message="Are you sure you want to delete this version? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
      />
    </>
  )
}

