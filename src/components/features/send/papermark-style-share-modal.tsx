'use client'

import { useState } from 'react'
import { X, Mail, Plus, Trash2, Send, Copy, Check, Loader2, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { CustomSwitch } from '@/components/ui/custom-switch'
import { toast } from 'sonner'

interface Document {
  id: string
  title: string
  file_name: string
  file_size: number
}

interface Recipient {
  email: string
  message?: string
}

interface PapermarkStyleShareModalProps {
  document: Document
  onClose: () => void
}

export function PapermarkStyleShareModal({ document, onClose }: PapermarkStyleShareModalProps) {
  // Recipients management
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [newRecipientEmail, setNewRecipientEmail] = useState('')
  const [globalMessage, setGlobalMessage] = useState('')

  // Link settings
  const [linkName, setLinkName] = useState(`${document.title} - Share Link`)
  const [password, setPassword] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [requireEmail, setRequireEmail] = useState(false)
  const [allowDownload, setAllowDownload] = useState(true)
  const [allowPrinting, setAllowPrinting] = useState(true)
  const [viewLimit, setViewLimit] = useState('')
  const [requireNda, setRequireNda] = useState(false)
  const [enableWatermark, setEnableWatermark] = useState(false)
  const [watermarkText, setWatermarkText] = useState('')
  const [allowedEmails, setAllowedEmails] = useState<string[]>([])
  const [blockedEmails, setBlockedEmails] = useState<string[]>([])
  const [allowedDomains, setAllowedDomains] = useState<string[]>([])
  const [blockedDomains, setBlockedDomains] = useState<string[]>([])
  const [newAllowedEmail, setNewAllowedEmail] = useState('')
  const [newBlockedEmail, setNewBlockedEmail] = useState('')
  const [newAllowedDomain, setNewAllowedDomain] = useState('')
  const [newBlockedDomain, setNewBlockedDomain] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(true)

  // UI states
  const [loading, setLoading] = useState(false)
  const [createdLink, setCreatedLink] = useState<any>(null)
  const [copied, setCopied] = useState(false)

  const addRecipient = () => {
    if (!newRecipientEmail.trim()) return

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(newRecipientEmail)) {
      toast.error('Please enter a valid email address')
      return
    }

    if (recipients.some(r => r.email === newRecipientEmail)) {
      toast.error('This email is already added')
      return
    }

    setRecipients([...recipients, { email: newRecipientEmail.trim() }])
    setNewRecipientEmail('')
  }

  const removeRecipient = (email: string) => {
    setRecipients(recipients.filter(r => r.email !== email))
  }

  // Email/Domain access control helpers
  const addAllowedEmail = () => {
    if (!newAllowedEmail.trim()) return
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(newAllowedEmail)) {
      toast.error('Please enter a valid email address')
      return
    }
    if (!allowedEmails.includes(newAllowedEmail.trim())) {
      setAllowedEmails([...allowedEmails, newAllowedEmail.trim()])
      setNewAllowedEmail('')
    }
  }

  const addBlockedEmail = () => {
    if (!newBlockedEmail.trim()) return
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(newBlockedEmail)) {
      toast.error('Please enter a valid email address')
      return
    }
    if (!blockedEmails.includes(newBlockedEmail.trim())) {
      setBlockedEmails([...blockedEmails, newBlockedEmail.trim()])
      setNewBlockedEmail('')
    }
  }

  const addAllowedDomain = () => {
    if (!newAllowedDomain.trim()) return
    const domain = newAllowedDomain.trim().toLowerCase()
    if (!allowedDomains.includes(domain)) {
      setAllowedDomains([...allowedDomains, domain])
      setNewAllowedDomain('')
    }
  }

  const addBlockedDomain = () => {
    if (!newBlockedDomain.trim()) return
    const domain = newBlockedDomain.trim().toLowerCase()
    if (!blockedDomains.includes(domain)) {
      setBlockedDomains([...blockedDomains, domain])
      setNewBlockedDomain('')
    }
  }

  const handleCreateAndSend = async () => {
    if (recipients.length === 0) {
      toast.error('Please add at least one recipient')
      return
    }

    setLoading(true)
    try {
      // Step 1: Create the share link
      const linkResponse = await fetch('/api/send/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: document.id,
          name: linkName,
          password: password || undefined,
          expiresAt: expiresAt || undefined,
          requireEmail,
          allowDownload,
          allowPrinting,
          enableNotifications: true,
          viewLimit: viewLimit ? parseInt(viewLimit) : undefined,
          requireNda,
          enableWatermark,
          watermarkText: watermarkText || undefined,
          allowedEmails,
          blockedEmails,
          allowedDomains,
          blockedDomains
        })
      })

      if (!linkResponse.ok) {
        const errorData = await linkResponse.json()
        throw new Error(errorData.error || 'Failed to create share link')
      }

      const linkData = await linkResponse.json()
      console.log('🔗 Link creation response:', linkData)
      setCreatedLink(linkData.link)
      console.log('🔗 Created link set to:', linkData.link)
      const shareUrl = `${window.location.origin}/v/${linkData.link.linkId}`

      // Step 2: Send emails to all recipients
      let successCount = 0
      let failCount = 0

      for (const recipient of recipients) {
        try {
          const emailResponse = await fetch('/api/send/links/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              linkId: linkData.link.linkId,
              recipientEmail: recipient.email,
              message: globalMessage || undefined,
              documentTitle: document.title,
              shareUrl,
              password: password || undefined
            })
          })

          if (emailResponse.ok) {
            successCount++
          } else {
            failCount++
            console.error(`Failed to send email to ${recipient.email}`)
          }
        } catch (error) {
          failCount++
          console.error(`Error sending email to ${recipient.email}:`, error)
        }
      }

      // Show results
      if (successCount > 0 && failCount === 0) {
        toast.success(`Document sent to ${successCount} recipient${successCount > 1 ? 's' : ''}!`)
      } else if (successCount > 0 && failCount > 0) {
        toast.success(`Document sent to ${successCount} recipients. ${failCount} failed.`)
      } else {
        toast.error('Failed to send emails to recipients')
      }

    } catch (error: any) {
      console.error('Error creating link and sending emails:', error)
      toast.error(error.message || 'Failed to create and send document')
    } finally {
      setLoading(false)
    }
  }

  const handleCopyLink = async () => {
    console.log('🔗 Copy button clicked!')
    console.log('🔗 createdLink:', createdLink)
    console.log('🔗 window.location.origin:', window.location.origin)

    if (!createdLink?.linkId) {
      console.error('❌ No linkId available')
      toast.error('No link available to copy')
      return
    }

    const shareUrl = `${window.location.origin}/v/${createdLink.linkId}`
    console.log('🔗 Attempting to copy:', shareUrl)

    try {
      // Method 1: Try modern clipboard API
      if (navigator.clipboard && window.isSecureContext) {
        console.log('🔗 Using modern clipboard API')
        await navigator.clipboard.writeText(shareUrl)
        console.log('✅ Modern clipboard copy successful!')
        setCopied(true)
        toast.success('Link copied to clipboard!')
        setTimeout(() => setCopied(false), 2000)
        return
      }

      // Method 2: Fallback to execCommand
      console.log('🔗 Using fallback execCommand method')
      if (typeof window !== 'undefined' && typeof document !== 'undefined') {
        const textArea = (document as any).createElement('textarea')
        textArea.value = shareUrl
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        textArea.style.top = '-999999px'
          ; (document as any).body.appendChild(textArea)
        textArea.focus()
        textArea.select()

        const successful = (document as any).execCommand('copy')
          ; (document as any).body.removeChild(textArea)

        if (successful) {
          console.log('✅ Fallback copy successful!')
          setCopied(true)
          toast.success('Link copied to clipboard!')
          setTimeout(() => setCopied(false), 2000)
        } else {
          throw new Error('execCommand copy failed')
        }
      }
    } catch (error) {
      console.error('❌ All copy methods failed:', error)

      // Show a toast with instructions for manual copy
      toast.error('Copy failed. Please click the URL field and press Ctrl+C (or Cmd+C) to copy manually.')
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold">Share Document</h2>
            <p className="text-sm text-gray-600 mt-1">{document.title}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {!createdLink ? (
            <>
              {/* Recipients Section - Papermark Style */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="w-5 h-5 text-blue-600" />
                    Recipients
                  </CardTitle>
                  <CardDescription>
                    Add email addresses to send this document to
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Add Recipient */}
                  <div className="flex gap-2">
                    <Input
                      value={newRecipientEmail}
                      onChange={(e) => setNewRecipientEmail(e.target.value)}
                      placeholder="Enter email address"
                      type="email"
                      className="flex-1"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addRecipient()
                        }
                      }}
                    />
                    <Button onClick={addRecipient} variant="outline">
                      <Plus className="w-4 h-4 mr-1" />
                      Add
                    </Button>
                  </div>

                  {/* Recipients List */}
                  {recipients.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        Recipients ({recipients.length})
                      </Label>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {recipients.map((recipient, index) => (
                          <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                            <span className="text-sm">{recipient.email}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeRecipient(recipient.email)}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Global Message */}
                  <div>
                    <Label className="text-sm font-medium">Message (Optional)</Label>
                    <Textarea
                      value={globalMessage}
                      onChange={(e) => setGlobalMessage(e.target.value)}
                      placeholder="Add a personal message for all recipients..."
                      className="mt-1"
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Link Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Link Settings & Security</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAdvanced(!showAdvanced)}
                    >
                      <Settings className="w-4 h-4 mr-1" />
                      {showAdvanced ? 'Hide' : 'Show'} Advanced
                    </Button>
                  </CardTitle>
                  <CardDescription>
                    Configure security settings, access controls, and sharing options
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Link Name</Label>
                    <Input
                      value={linkName}
                      onChange={(e) => setLinkName(e.target.value)}
                      className="mt-1"
                    />
                  </div>

                  {/* Always show password and expiry - most common settings */}
                  <div>
                    <Label>Password Protection (Optional)</Label>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label>Expiry Date (Optional)</Label>
                    <Input
                      type="datetime-local"
                      value={expiresAt}
                      onChange={(e) => setExpiresAt(e.target.value)}
                      className="mt-1"
                    />
                  </div>

                  {showAdvanced && (
                    <>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Require Email Verification</Label>
                          <p className="text-sm text-gray-500">Visitors must enter email before viewing</p>
                        </div>
                        <CustomSwitch
                          checked={requireEmail}
                          onCheckedChange={setRequireEmail}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Allow Download</Label>
                          <p className="text-sm text-gray-500">Allow recipients to download the document</p>
                        </div>
                        <CustomSwitch
                          checked={allowDownload}
                          onCheckedChange={setAllowDownload}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Allow Printing</Label>
                          <p className="text-sm text-gray-500">Allow recipients to print the document</p>
                        </div>
                        <CustomSwitch
                          checked={allowPrinting}
                          onCheckedChange={setAllowPrinting}
                        />
                      </div>

                      <div>
                        <Label>View Limit (Optional)</Label>
                        <Input
                          type="number"
                          value={viewLimit}
                          onChange={(e) => setViewLimit(e.target.value)}
                          placeholder="Maximum number of views"
                          className="mt-1"
                          min="1"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Require NDA</Label>
                          <p className="text-sm text-gray-500">Require NDA acceptance before viewing</p>
                        </div>
                        <CustomSwitch
                          checked={requireNda}
                          onCheckedChange={setRequireNda}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Enable Watermark</Label>
                          <p className="text-sm text-gray-500">Add watermark to document pages</p>
                        </div>
                        <CustomSwitch
                          checked={enableWatermark}
                          onCheckedChange={setEnableWatermark}
                        />
                      </div>

                      {enableWatermark && (
                        <div>
                          <Label>Watermark Text</Label>
                          <Input
                            value={watermarkText}
                            onChange={(e) => setWatermarkText(e.target.value)}
                            placeholder="Enter watermark text"
                            className="mt-1"
                          />
                        </div>
                      )}

                      {/* Email Access Controls */}
                      <div>
                        <Label className="text-sm font-medium mb-2 block">Allowed Emails (Optional)</Label>
                        <div className="flex gap-2 mb-2">
                          <Input
                            value={newAllowedEmail}
                            onChange={(e) => setNewAllowedEmail(e.target.value)}
                            placeholder="Enter email address"
                            type="email"
                            className="flex-1"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                addAllowedEmail()
                              }
                            }}
                          />
                          <Button onClick={addAllowedEmail} variant="outline" size="sm">
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                        {allowedEmails.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {allowedEmails.map((email, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {email}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="ml-1 h-auto p-0 text-gray-500 hover:text-red-500"
                                  onClick={() => setAllowedEmails(allowedEmails.filter(e => e !== email))}
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Blocked Emails */}
                      <div>
                        <Label className="text-sm font-medium mb-2 block">Blocked Emails (Optional)</Label>
                        <div className="flex gap-2 mb-2">
                          <Input
                            value={newBlockedEmail}
                            onChange={(e) => setNewBlockedEmail(e.target.value)}
                            placeholder="Enter email address"
                            type="email"
                            className="flex-1"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                addBlockedEmail()
                              }
                            }}
                          />
                          <Button onClick={addBlockedEmail} variant="outline" size="sm">
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                        {blockedEmails.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {blockedEmails.map((email, index) => (
                              <Badge key={index} variant="destructive" className="text-xs">
                                {email}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="ml-1 h-auto p-0 text-white hover:text-gray-200"
                                  onClick={() => setBlockedEmails(blockedEmails.filter(e => e !== email))}
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Allowed Domains */}
                      <div>
                        <Label className="text-sm font-medium mb-2 block">Allowed Domains (Optional)</Label>
                        <div className="flex gap-2 mb-2">
                          <Input
                            value={newAllowedDomain}
                            onChange={(e) => setNewAllowedDomain(e.target.value)}
                            placeholder="e.g., company.com"
                            className="flex-1"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                addAllowedDomain()
                              }
                            }}
                          />
                          <Button onClick={addAllowedDomain} variant="outline" size="sm">
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                        {allowedDomains.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {allowedDomains.map((domain, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {domain}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="ml-1 h-auto p-0 text-gray-500 hover:text-red-500"
                                  onClick={() => setAllowedDomains(allowedDomains.filter(d => d !== domain))}
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Blocked Domains */}
                      <div>
                        <Label className="text-sm font-medium mb-2 block">Blocked Domains (Optional)</Label>
                        <div className="flex gap-2 mb-2">
                          <Input
                            value={newBlockedDomain}
                            onChange={(e) => setNewBlockedDomain(e.target.value)}
                            placeholder="e.g., competitor.com"
                            className="flex-1"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                addBlockedDomain()
                              }
                            }}
                          />
                          <Button onClick={addBlockedDomain} variant="outline" size="sm">
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                        {blockedDomains.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {blockedDomains.map((domain, index) => (
                              <Badge key={index} variant="destructive" className="text-xs">
                                {domain}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="ml-1 h-auto p-0 text-white hover:text-gray-200"
                                  onClick={() => setBlockedDomains(blockedDomains.filter(d => d !== domain))}
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Action Button */}
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateAndSend}
                  disabled={loading || recipients.length === 0}
                  className="min-w-[140px]"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Create & Send
                    </>
                  )}
                </Button>
              </div>
            </>
          ) : (
            /* Success State */
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-green-900">Document Sent Successfully!</h3>
                <p className="text-gray-600">
                  Your document has been sent to {recipients.length} recipient{recipients.length > 1 ? 's' : ''}
                </p>
              </div>

              {/* Share Link */}
              <div className="bg-gray-50 rounded-lg p-4">
                <Label className="text-sm font-medium mb-2 block">Share URL</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="share-url-input"
                    value={`${window.location.origin}/v/${createdLink.linkId}`}
                    readOnly
                    className="flex-1 bg-white"
                    onClick={(e) => {
                      // Select all text when clicked
                      const input = e.target as HTMLInputElement
                      input.select()
                    }}
                  />
                  <Button onClick={handleCopyLink} variant="outline" size="sm">
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
                <p className="text-xs text-gray-500 mt-2">
                  Click the URL to select it, then press Ctrl+C (or Cmd+C) to copy
                </p>
              </div>

              <Button onClick={onClose} className="w-full">
                Done
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
