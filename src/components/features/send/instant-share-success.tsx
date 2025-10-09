'use client'

import { useState } from 'react'
import { FileText, Share2, Copy, Check, Settings, BarChart3, Upload, ExternalLink } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

interface InstantShareSuccessProps {
  document: {
    id: string
    title: string
    instantLink?: {
      id: string
      linkId: string
      url?: string
    }
  }
  onCreateAdvancedLink: () => void
  onViewAnalytics: () => void
  onUploadAnother: () => void
}

export function InstantShareSuccess({
  document,
  onCreateAdvancedLink,
  onViewAnalytics,
  onUploadAnother
}: InstantShareSuccessProps) {
  const [copied, setCopied] = useState(false)
  
  // Generate the share URL
  const shareUrl = document.instantLink 
    ? `${window.location.origin}/v/${document.instantLink.linkId}`
    : ''

  const handleCopyLink = async () => {
    if (!shareUrl) return
    
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      toast.success('Link copied to clipboard!')
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast.error('Failed to copy link')
    }
  }

  const handleOpenLink = () => {
    if (shareUrl) {
      window.open(shareUrl, '_blank')
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Success Message */}
      <Card>
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Document Uploaded & Link Created!
          </h3>
          <p className="text-gray-600 mb-6">
            "{document.title}" is ready to share. Your link has been generated automatically.
          </p>

          {/* Instant Share Link - Papermark Style */}
          {document.instantLink && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Share2 className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-gray-700">Your Share Link</span>
              </div>
              
              <div className="flex items-center gap-2 mb-3">
                <Input
                  value={shareUrl}
                  readOnly
                  className="flex-1 bg-white text-sm"
                />
                <Button
                  onClick={handleCopyLink}
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 mr-1" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-1" />
                      Copy
                    </>
                  )}
                </Button>
              </div>

              <div className="flex items-center justify-center gap-2">
                <Button
                  onClick={handleOpenLink}
                  variant="ghost"
                  size="sm"
                  className="text-blue-600 hover:text-blue-700"
                >
                  <ExternalLink className="w-3 h-3 mr-1" />
                  Preview Link
                </Button>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={onCreateAdvancedLink}
              variant="outline"
              className="border-blue-200 text-blue-700 hover:bg-blue-50"
            >
              <Settings className="w-4 h-4 mr-2" />
              Advanced Settings
            </Button>
            <Button
              onClick={onViewAnalytics}
              variant="outline"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              View Analytics
            </Button>
          </div>

          {/* Secondary Actions */}
          <div className="mt-6 pt-6 border-t flex justify-center">
            <Button
              onClick={onUploadAnother}
              variant="ghost"
              className="text-sm"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Another Document
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Tips - Papermark Style */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <h4 className="font-medium text-blue-900 mb-2">Quick Tips:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Your link is ready to share immediately with default security settings</li>
            <li>• Use "Advanced Settings" to add password protection, expiry, or email verification</li>
            <li>• Track views and engagement in real-time via Analytics</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
