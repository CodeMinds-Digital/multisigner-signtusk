'use client'

import { useState } from 'react'
import { Share2, Copy, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react'
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
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

interface BulkShareModalProps {
  isOpen: boolean
  onClose: () => void
  selectedDocuments: any[]
  onShareComplete: (results: any) => void
}

interface ShareSettings {
  name: string
  password_protected: boolean
  password: string
  expires_at: string
  allow_download: boolean
  allow_print: boolean
  watermark_enabled: boolean
  screenshot_protection: boolean
  email_required: boolean
  email_verification_required: boolean
  nda_required: boolean
  view_limit: number | null
}

export function BulkShareModal({
  isOpen,
  onClose,
  selectedDocuments,
  onShareComplete
}: BulkShareModalProps) {
  const [isSharing, setIsSharing] = useState(false)
  const [shareResults, setShareResults] = useState<any>(null)
  const [shareSettings, setShareSettings] = useState<ShareSettings>({
    name: 'Bulk Shared Documents',
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
    view_limit: null
  })

  const handleBulkShare = async () => {
    if (selectedDocuments.length === 0) {
      toast.error('No documents selected')
      return
    }

    setIsSharing(true)

    try {
      const response = await fetch('/api/send/documents/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          operation: 'share',
          documentIds: selectedDocuments.map(doc => doc.id),
          data: shareSettings
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Bulk share failed')
      }

      setShareResults(result)
      toast.success(`Bulk share completed: ${result.processed} successful, ${result.failed} failed`)
      onShareComplete(result)

    } catch (error) {
      console.error('Bulk share error:', error)
      toast.error(error instanceof Error ? error.message : 'Bulk share failed')
    } finally {
      setIsSharing(false)
    }
  }

  const copyAllLinks = () => {
    if (!shareResults?.results) return

    const links = shareResults.results
      .filter((result: any) => result.shareUrl)
      .map((result: any) => `${window.location.origin}${result.shareUrl}`)
      .join('\n')

    navigator.clipboard.writeText(links)
    toast.success('All share links copied to clipboard')
  }

  const copyLink = (shareUrl: string) => {
    const fullUrl = `${window.location.origin}${shareUrl}`
    navigator.clipboard.writeText(fullUrl)
    toast.success('Link copied to clipboard')
  }

  const getExpirationOptions = () => {
    const now = new Date()
    return [
      { label: 'Never expires', value: '' },
      { label: '1 day', value: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString() },
      { label: '7 days', value: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString() },
      { label: '30 days', value: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString() },
      { label: '90 days', value: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString() }
    ]
  }

  if (shareResults) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Bulk Share Results</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-auto space-y-4">
            <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="font-medium">
                  {shareResults.processed} of {selectedDocuments.length} documents shared successfully
                </span>
              </div>
              {shareResults.results.some((r: any) => r.shareUrl) && (
                <Button onClick={copyAllLinks} variant="outline" size="sm">
                  <Copy className="h-4 w-4 mr-2" />
                  Copy All Links
                </Button>
              )}
            </div>

            {shareResults.failed > 0 && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <span className="font-medium text-red-800">
                    {shareResults.failed} documents failed to share
                  </span>
                </div>
                <ul className="text-sm text-red-700 space-y-1">
                  {shareResults.errors.map((error: string, index: number) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="space-y-3">
              <h3 className="font-medium">Share Links</h3>
              {shareResults.results.map((result: any, index: number) => {
                const document = selectedDocuments.find(doc => doc.id === result.documentId)

                return (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{document?.title || 'Unknown Document'}</p>
                      {result.shareUrl ? (
                        <p className="text-sm text-blue-600 truncate">
                          {window.location.origin}{result.shareUrl}
                        </p>
                      ) : (
                        <p className="text-sm text-red-600">Failed to create share link</p>
                      )}
                    </div>

                    {result.shareUrl && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyLink(result.shareUrl)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`${window.location.origin}${result.shareUrl}`, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button onClick={onClose}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk Share Documents</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="font-medium">
              Creating share links for {selectedDocuments.length} documents
            </p>
            <p className="text-sm text-gray-600 mt-1">
              {selectedDocuments.map(doc => doc.title).join(', ')}
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="link-name">Link Name Template</Label>
              <Input
                id="link-name"
                value={shareSettings.name}
                onChange={(e) => setShareSettings(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Bulk Shared Documents"
              />
              <p className="text-xs text-gray-500 mt-1">
                Each document will get a unique link name based on this template
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Expiration</Label>
                <Select
                  value={shareSettings.expires_at}
                  onValueChange={(value) => setShareSettings(prev => ({ ...prev, expires_at: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Never expires" />
                  </SelectTrigger>
                  <SelectContent>
                    {getExpirationOptions().map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>View Limit</Label>
                <Input
                  type="number"
                  placeholder="Unlimited"
                  value={shareSettings.view_limit || ''}
                  onChange={(e) => setShareSettings(prev => ({
                    ...prev,
                    view_limit: e.target.value ? parseInt(e.target.value) : null
                  }))}
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <CustomSwitch
                  checked={shareSettings.password_protected}
                  onCheckedChange={(checked) => setShareSettings(prev => ({ ...prev, password_protected: checked }))}
                />
                <Label htmlFor="password-protected">Password protected</Label>
              </div>

              {shareSettings.password_protected && (
                <div>
                  <Label>Password</Label>
                  <Input
                    type="password"
                    placeholder="Enter password"
                    value={shareSettings.password}
                    onChange={(e) => setShareSettings(prev => ({ ...prev, password: e.target.value }))}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <CustomSwitch
                    checked={shareSettings.email_required}
                    onCheckedChange={(checked) => setShareSettings(prev => ({ ...prev, email_required: checked }))}
                  />
                  <Label htmlFor="email-required">Email required</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <CustomSwitch
                    checked={shareSettings.email_verification_required}
                    onCheckedChange={(checked) => setShareSettings(prev => ({ ...prev, email_verification_required: checked }))}
                  />
                  <Label htmlFor="email-verification">Email verification</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <CustomSwitch
                    checked={shareSettings.watermark_enabled}
                    onCheckedChange={(checked) => setShareSettings(prev => ({ ...prev, watermark_enabled: checked }))}
                  />
                  <Label htmlFor="watermark">Watermark</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <CustomSwitch
                    checked={shareSettings.screenshot_protection}
                    onCheckedChange={(checked) => setShareSettings(prev => ({ ...prev, screenshot_protection: checked }))}
                  />
                  <Label htmlFor="screenshot-protection">Screenshot protection</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <CustomSwitch
                    checked={shareSettings.allow_download}
                    onCheckedChange={(checked) => setShareSettings(prev => ({ ...prev, allow_download: checked }))}
                  />
                  <Label htmlFor="allow-download">Allow download</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <CustomSwitch
                    checked={shareSettings.allow_print}
                    onCheckedChange={(checked) => setShareSettings(prev => ({ ...prev, allow_print: checked }))}
                  />
                  <Label htmlFor="allow-print">Allow print</Label>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <CustomSwitch
                  checked={shareSettings.nda_required}
                  onCheckedChange={(checked) => setShareSettings(prev => ({ ...prev, nda_required: checked }))}
                />
                <Label htmlFor="nda-required">NDA required</Label>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={isSharing}>
            Cancel
          </Button>
          <Button onClick={handleBulkShare} disabled={isSharing}>
            {isSharing ? 'Creating Links...' : `Create ${selectedDocuments.length} Share Links`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
