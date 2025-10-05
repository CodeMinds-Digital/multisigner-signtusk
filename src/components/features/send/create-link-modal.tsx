'use client'

import { useState } from 'react'
import { Link as LinkIcon, Copy, Check, Settings, Calendar, Lock, Mail, FileText, Download, Printer, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

interface CreateLinkModalProps {
  documentId: string
  documentTitle: string
  onClose?: () => void
  onLinkCreated?: (link: any) => void
}

export function CreateLinkModal({
  documentId,
  documentTitle,
  onClose,
  onLinkCreated
}: CreateLinkModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdLink, setCreatedLink] = useState<any | null>(null)
  const [copied, setCopied] = useState(false)
  const [showEmailForm, setShowEmailForm] = useState(false)
  const [recipientEmail, setRecipientEmail] = useState('')
  const [emailMessage, setEmailMessage] = useState('')
  const [sendingEmail, setSendingEmail] = useState(false)

  // Link settings
  const [linkName, setLinkName] = useState(`${documentTitle} - Share Link`)
  const [password, setPassword] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [allowDownload, setAllowDownload] = useState(true)
  const [allowPrinting, setAllowPrinting] = useState(true)
  const [requireEmail, setRequireEmail] = useState(false)
  const [requireNda, setRequireNda] = useState(false)
  const [enableNotifications, setEnableNotifications] = useState(true)
  const [viewLimit, setViewLimit] = useState('')

  const handleCreateLink = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/send/links/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          documentId,
          name: linkName,
          password: password || undefined,
          expiresAt: expiresAt || undefined,
          allowDownload,
          allowPrinting,
          requireEmail,
          requireNda,
          enableNotifications,
          viewLimit: viewLimit ? parseInt(viewLimit) : undefined
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create link')
      }

      const data = await response.json()
      setCreatedLink(data.link)

      if (onLinkCreated) {
        onLinkCreated(data.link)
      }
    } catch (err: any) {
      console.error('Create link error:', err)
      setError(err.message || 'Failed to create share link')
    } finally {
      setLoading(false)
    }
  }

  const handleCopyLink = async () => {
    if (createdLink?.shareUrl) {
      await navigator.clipboard.writeText(createdLink.shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleSendEmail = async () => {
    if (!recipientEmail) {
      setError('Please enter recipient email')
      return
    }

    setSendingEmail(true)
    setError(null)

    try {
      const response = await fetch('/api/send/links/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          linkId: createdLink.id,
          recipientEmail,
          message: emailMessage,
          documentTitle,
          shareUrl: createdLink.shareUrl,
          password: password || undefined
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send email')
      }

      // Success - reset form and show success message
      setRecipientEmail('')
      setEmailMessage('')
      setShowEmailForm(false)
      alert('Email sent successfully!')
    } catch (err: any) {
      console.error('Send email error:', err)
      setError(err.message || 'Failed to send email')
    } finally {
      setSendingEmail(false)
    }
  }

  if (createdLink) {
    return (
      <div className="p-6 space-y-6">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Check className="w-5 h-5 text-green-600" />
            Share Link Created
          </h3>
          <p className="text-sm text-gray-600">
            Your document is ready to share
          </p>
        </div>
        {/* Share URL */}
        <div className="space-y-2">
          <Label>Share URL</Label>
          <div className="flex items-center gap-2">
            <Input
              value={createdLink.shareUrl}
              readOnly
              className="flex-1"
            />
            <Button
              onClick={handleCopyLink}
              variant="outline"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Link Details */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Link Name:</span>
            <span className="font-medium">{createdLink.name}</span>
          </div>
          {createdLink.expiresAt && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Expires:</span>
              <span className="font-medium">
                {new Date(createdLink.expiresAt).toLocaleDateString()}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Status:</span>
            <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
              Active
            </span>
          </div>
        </div>

        {/* Send via Email Section */}
        {!showEmailForm ? (
          <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900 mb-1">Send via Email</h4>
                <p className="text-sm text-gray-600">Send this link directly to someone's email</p>
              </div>
              <Button
                onClick={() => setShowEmailForm(true)}
                className="bg-green-600 hover:bg-green-700"
              >
                <Mail className="w-4 h-4 mr-2" />
                Send Email
              </Button>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900">Send via Email</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowEmailForm(false)
                  setRecipientEmail('')
                  setEmailMessage('')
                  setError(null)
                }}
              >
                Cancel
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="recipientEmail">Recipient Email *</Label>
              <Input
                id="recipientEmail"
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="recipient@example.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="emailMessage">Message (Optional)</Label>
              <textarea
                id="emailMessage"
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
                placeholder="Add a personal message..."
                className="w-full min-h-[100px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <Button
              onClick={handleSendEmail}
              disabled={sendingEmail || !recipientEmail}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {sendingEmail ? (
                <>Sending...</>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Send Email
                </>
              )}
            </Button>
          </div>
        )}

        {/* How to Share Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">How to Share This Document</h4>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
            <li>Copy the share URL above and send via any messaging app</li>
            <li>Or use the "Send Email" button to send directly</li>
            <li>Recipients can view the document by clicking the link</li>
            <li>Track views and engagement in the Analytics section</li>
          </ol>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={onClose}
          >
            Close
          </Button>
          <Button
            onClick={() => window.open(createdLink.shareUrl, '_blank')}
          >
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <LinkIcon className="w-5 h-5" />
          Create Share Link
        </h3>
        <p className="text-sm text-gray-600">
          Configure settings for sharing "{documentTitle}"
        </p>
      </div>
      {/* Link Name */}
      <div className="space-y-2">
        <Label htmlFor="linkName">Link Name</Label>
        <Input
          id="linkName"
          value={linkName}
          onChange={(e) => setLinkName(e.target.value)}
          placeholder="Enter a name for this link"
        />
      </div>

      {/* Security Settings */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <Lock className="w-4 h-4" />
          Security
        </h3>

        <div className="space-y-2">
          <Label htmlFor="password">Password Protection (Optional)</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="expiresAt">Expiration Date (Optional)</Label>
          <Input
            id="expiresAt"
            type="datetime-local"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="viewLimit">View Limit (Optional)</Label>
          <Input
            id="viewLimit"
            type="number"
            value={viewLimit}
            onChange={(e) => setViewLimit(e.target.value)}
            placeholder="Maximum number of views"
            min="1"
          />
        </div>
      </div>

      {/* Access Controls */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <Settings className="w-4 h-4" />
          Access Controls
        </h3>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-gray-500" />
            <Label htmlFor="allowDownload" className="cursor-pointer">
              Allow Download
            </Label>
          </div>
          <Switch
            id="allowDownload"
            checked={allowDownload}
            onCheckedChange={setAllowDownload}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-gray-500" />
            <Label htmlFor="allowPrinting" className="cursor-pointer">
              Allow Printing
            </Label>
          </div>
          <Switch
            id="allowPrinting"
            checked={allowPrinting}
            onCheckedChange={setAllowPrinting}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-gray-500" />
            <Label htmlFor="requireEmail" className="cursor-pointer">
              Require Email Verification
            </Label>
          </div>
          <Switch
            id="requireEmail"
            checked={requireEmail}
            onCheckedChange={setRequireEmail}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-gray-500" />
            <Label htmlFor="requireNda" className="cursor-pointer">
              Require NDA Acceptance
            </Label>
          </div>
          <Switch
            id="requireNda"
            checked={requireNda}
            onCheckedChange={setRequireNda}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LinkIcon className="w-4 h-4 text-gray-500" />
            <Label htmlFor="enableNotifications" className="cursor-pointer">
              Enable View Notifications
            </Label>
          </div>
          <Switch
            id="enableNotifications"
            checked={enableNotifications}
            onCheckedChange={setEnableNotifications}
          />
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t">
        {onClose && (
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
        )}
        <Button
          onClick={handleCreateLink}
          disabled={loading || !linkName}
        >
          {loading ? 'Creating...' : 'Create Share Link'}
        </Button>
      </div>
    </div>
  )
}

