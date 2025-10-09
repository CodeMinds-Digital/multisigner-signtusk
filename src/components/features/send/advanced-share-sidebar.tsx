'use client'

import { useState } from 'react'
import { X, Shield, Mail, Globe, Lock, Palette, Settings, Plus, Trash2, Eye, EyeOff, Link as LinkIcon, Copy, Check, Send, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CustomSwitch } from '@/components/ui/custom-switch'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

interface Document {
  id: string
  title: string
  file_name: string
  file_size: number
  file_type: string
  created_at: string
}

interface AdvancedShareSidebarProps {
  isOpen: boolean
  onClose: () => void
  document: Document
}

export function AdvancedShareSidebar({
  isOpen,
  onClose,
  document
}: AdvancedShareSidebarProps) {
  const [loading, setLoading] = useState(false)
  const [createdLink, setCreatedLink] = useState<any | null>(null)
  const [copied, setCopied] = useState(false)

  // Basic settings
  const [linkName, setLinkName] = useState(`${document.title} - Share Link`)
  const [password, setPassword] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [requireEmail, setRequireEmail] = useState(false)
  const [allowDownload, setAllowDownload] = useState(true)
  const [allowPrinting, setAllowPrinting] = useState(true)
  const [enableNotifications, setEnableNotifications] = useState(true)

  // Advanced settings
  const [viewLimit, setViewLimit] = useState('')
  const [allowedEmails, setAllowedEmails] = useState<string[]>([])
  const [blockedEmails, setBlockedEmails] = useState<string[]>([])
  const [allowedDomains, setAllowedDomains] = useState<string[]>([])
  const [blockedDomains, setBlockedDomains] = useState<string[]>([])
  const [allowedCountries, setAllowedCountries] = useState<string[]>([])
  const [blockedCountries, setBlockedCountries] = useState<string[]>([])
  const [allowedIPs, setAllowedIPs] = useState<string[]>([])
  const [blockedIPs, setBlockedIPs] = useState<string[]>([])
  const [requireNda, setRequireNda] = useState(false)
  const [enableWatermark, setEnableWatermark] = useState(false)
  const [watermarkText, setWatermarkText] = useState('')
  const [screenshotProtection, setScreenshotProtection] = useState(false)
  const [customUrl, setCustomUrl] = useState('')
  const [welcomeMessage, setWelcomeMessage] = useState('')
  const [accountName, setAccountName] = useState('')
  const [customButtonText, setCustomButtonText] = useState('View Document')

  // Email sending states
  const [showEmailForm, setShowEmailForm] = useState(false)
  const [recipientEmail, setRecipientEmail] = useState('')
  const [emailMessage, setEmailMessage] = useState('')
  const [sendingEmail, setSendingEmail] = useState(false)

  // UI states
  const [newAllowedEmail, setNewAllowedEmail] = useState('')
  const [newBlockedEmail, setNewBlockedEmail] = useState('')
  const [newAllowedDomain, setNewAllowedDomain] = useState('')
  const [newBlockedDomain, setNewBlockedDomain] = useState('')
  const [newAllowedCountry, setNewAllowedCountry] = useState('')
  const [newBlockedCountry, setNewBlockedCountry] = useState('')
  const [newAllowedIP, setNewAllowedIP] = useState('')
  const [newBlockedIP, setNewBlockedIP] = useState('')

  const handleCreateLink = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/send/links', {
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
          enableNotifications,
          viewLimit: viewLimit ? parseInt(viewLimit) : undefined,
          allowedEmails,
          blockedEmails,
          allowedDomains,
          blockedDomains,
          allowedCountries,
          blockedCountries,
          allowedIPs,
          blockedIPs,
          requireNda,
          enableWatermark,
          watermarkText: watermarkText || undefined,
          screenshotProtection,
          customUrl: customUrl || undefined,
          welcomeMessage: welcomeMessage || undefined,
          accountName: accountName || undefined,
          customButtonText: customButtonText || 'View Document'
        })
      })

      const data = await response.json()

      if (response.ok) {
        setCreatedLink(data.link)
        toast.success('Share link created successfully!')
      } else {
        const errorMessage = data.error || `Failed to create share link (${response.status})`
        toast.error(errorMessage)
      }
    } catch (error) {
      console.error('Failed to create link:', error)
      toast.error('Failed to create share link')
    } finally {
      setLoading(false)
    }
  }

  const handleCopyLink = async () => {
    if (!createdLink) return

    const shareUrl = `${window.location.origin}/v/${createdLink.linkId}`
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      toast.success('Link copied to clipboard!')
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast.error('Failed to copy link')
    }
  }

  const sendEmail = async () => {
    if (!recipientEmail.trim()) {
      toast.error('Please enter recipient email')
      return
    }

    if (!createdLink) {
      toast.error('Please create a share link first')
      return
    }

    setSendingEmail(true)
    try {
      const response = await fetch('/api/send/links/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          linkId: createdLink.linkId,
          recipientEmail: recipientEmail.trim(),
          message: emailMessage.trim() || undefined,
          documentTitle: document.title,
          shareUrl: `${window.location.origin}/v/${createdLink.linkId}`,
          password: password || undefined
        })
      })

      const data = await response.json()

      if (response.ok) {
        toast.success(`Document sent to ${recipientEmail}`)
        setRecipientEmail('')
        setEmailMessage('')
        setShowEmailForm(false)
      } else {
        toast.error(data.error || 'Failed to send email')
      }
    } catch (error) {
      console.error('Failed to send email:', error)
      toast.error('Failed to send email')
    } finally {
      setSendingEmail(false)
    }
  }

  const addEmail = (type: 'allowed' | 'blocked') => {
    if (!newEmail.trim()) return

    if (type === 'allowed') {
      setAllowedEmails([...allowedEmails, newEmail.trim()])
    } else {
      setBlockedEmails([...blockedEmails, newEmail.trim()])
    }
    setNewEmail('')
  }

  const removeEmail = (email: string, type: 'allowed' | 'blocked') => {
    if (type === 'allowed') {
      setAllowedEmails(allowedEmails.filter(e => e !== email))
    } else {
      setBlockedEmails(blockedEmails.filter(e => e !== email))
    }
  }

  const addDomain = (type: 'allowed' | 'blocked') => {
    if (!newDomain.trim()) return

    if (type === 'allowed') {
      setAllowedDomains([...allowedDomains, newDomain.trim()])
    } else {
      setBlockedDomains([...blockedDomains, newDomain.trim()])
    }
    setNewDomain('')
  }

  const removeDomain = (domain: string, type: 'allowed' | 'blocked') => {
    if (type === 'allowed') {
      setAllowedDomains(allowedDomains.filter(d => d !== domain))
    } else {
      setBlockedDomains(blockedDomains.filter(d => d !== domain))
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop - only covers the left side, not the sidebar area */}
      <div
        className="flex-1 bg-black/20"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div className="w-full max-w-2xl bg-white shadow-2xl flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold">Advanced Share Settings</h2>
            <p className="text-sm text-gray-500 mt-1">{document.title}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {createdLink ? (
            // Success state
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <LinkIcon className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Share Link Created!</h3>
                <p className="text-gray-600">Your advanced share link is ready</p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <Label className="text-sm font-medium mb-2 block">Share URL</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={`${window.location.origin}/v/${createdLink.linkId}`}
                    readOnly
                    className="flex-1 bg-white"
                  />
                  <Button
                    onClick={handleCopyLink}
                    variant="outline"
                    size="sm"
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
                  <Button
                    onClick={() => setShowEmailForm(!showEmailForm)}
                    variant="outline"
                    size="sm"
                    className="ml-2"
                  >
                    <Mail className="w-4 h-4 mr-1" />
                    Send via Email
                  </Button>
                </div>
              </div>

              {/* Email Form */}
              {showEmailForm && (
                <div className="bg-blue-50 rounded-lg p-4 mb-6 border border-blue-200">
                  <h4 className="font-medium text-blue-900 mb-3">Send Document via Email</h4>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium">Recipient Email</Label>
                      <Input
                        value={recipientEmail}
                        onChange={(e) => setRecipientEmail(e.target.value)}
                        placeholder="Enter recipient email address"
                        className="bg-white mt-1"
                        type="email"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Message (Optional)</Label>
                      <Textarea
                        value={emailMessage}
                        onChange={(e) => setEmailMessage(e.target.value)}
                        placeholder="Add a personal message..."
                        className="bg-white mt-1"
                        rows={3}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={sendEmail}
                        disabled={sendingEmail || !recipientEmail.trim()}
                        className="flex-1"
                      >
                        {sendingEmail ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4 mr-1" />
                            Send Email
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={() => setShowEmailForm(false)}
                        variant="outline"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <Button onClick={onClose} className="flex-1">
                  Done
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setCreatedLink(null)}
                  className="flex-1"
                >
                  Create Another
                </Button>
              </div>
            </div>
          ) : (
            // Configuration state
            <Tabs defaultValue="basic" className="p-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="basic">Basic Settings</TabsTrigger>
                <TabsTrigger value="advanced">Advanced Settings</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-6 mt-6">
                {/* Basic Settings */}
                <Card className="bg-white">
                  <CardHeader>
                    <CardTitle className="text-lg">Basic Settings</CardTitle>
                    <CardDescription>Essential sharing configuration</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="linkName">Link Name</Label>
                      <Input
                        id="linkName"
                        value={linkName}
                        onChange={(e) => setLinkName(e.target.value)}
                        placeholder="Enter link name"
                        className="bg-white"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="password">Password (Optional)</Label>
                        <Input
                          id="password"
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Set password"
                          className="bg-white"
                        />
                      </div>
                      <div>
                        <Label htmlFor="expiresAt">Expires At (Optional)</Label>
                        <Input
                          id="expiresAt"
                          type="datetime-local"
                          value={expiresAt}
                          onChange={(e) => setExpiresAt(e.target.value)}
                          className="bg-white"
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
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
                          <p className="text-sm text-gray-500">Let visitors download the document</p>
                        </div>
                        <CustomSwitch
                          checked={allowDownload}
                          onCheckedChange={setAllowDownload}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Allow Printing</Label>
                          <p className="text-sm text-gray-500">Enable print functionality</p>
                        </div>
                        <CustomSwitch
                          checked={allowPrinting}
                          onCheckedChange={setAllowPrinting}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Enable Notifications</Label>
                          <p className="text-sm text-gray-500">Get notified when document is viewed</p>
                        </div>
                        <CustomSwitch
                          checked={enableNotifications}
                          onCheckedChange={setEnableNotifications}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="advanced" className="space-y-6 mt-6">
                {/* Security Settings */}
                <Card className="bg-white">
                  <CardHeader>
                    <CardTitle className="text-lg">Security & Protection</CardTitle>
                    <CardDescription>Advanced security features</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
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
                          <Label htmlFor="watermarkText">Watermark Text</Label>
                          <Input
                            id="watermarkText"
                            value={watermarkText}
                            onChange={(e) => setWatermarkText(e.target.value)}
                            placeholder="Enter custom watermark text"
                            className="bg-white"
                          />
                          <p className="text-sm text-gray-500 mt-1">Leave empty to use default watermark</p>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Screenshot Protection</Label>
                          <p className="text-sm text-gray-500">Prevent screenshots and screen recording</p>
                        </div>
                        <CustomSwitch
                          checked={screenshotProtection}
                          onCheckedChange={setScreenshotProtection}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Customization */}
                <Card className="bg-white">
                  <CardHeader>
                    <CardTitle className="text-lg">Customization</CardTitle>
                    <CardDescription>Branding and personalization</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="customUrl">Custom URL (Optional)</Label>
                      <Input
                        id="customUrl"
                        value={customUrl}
                        onChange={(e) => setCustomUrl(e.target.value)}
                        placeholder="custom-link-name"
                        className="bg-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="welcomeMessage">Welcome Message</Label>
                      <Textarea
                        id="welcomeMessage"
                        value={welcomeMessage}
                        onChange={(e) => setWelcomeMessage(e.target.value)}
                        placeholder="Enter a welcome message for viewers"
                        rows={3}
                        className="bg-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="accountName">Account Name</Label>
                      <Input
                        id="accountName"
                        value={accountName}
                        onChange={(e) => setAccountName(e.target.value)}
                        placeholder="Your company or account name"
                        className="bg-white"
                      />
                      <p className="text-sm text-gray-500 mt-1">This will be displayed as the sender</p>
                    </div>
                    <div>
                      <Label htmlFor="customButtonText">Custom Button Text</Label>
                      <Input
                        id="customButtonText"
                        value={customButtonText}
                        onChange={(e) => setCustomButtonText(e.target.value)}
                        placeholder="View Document"
                        className="bg-white"
                      />
                      <p className="text-sm text-gray-500 mt-1">Text displayed on the main action button</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Access Control */}
                <Card className="bg-white">
                  <CardHeader>
                    <CardTitle className="text-lg">Access Control</CardTitle>
                    <CardDescription>Limit and control access</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* View Limit */}
                    <div>
                      <Label htmlFor="viewLimit">View Limit (Optional)</Label>
                      <Input
                        id="viewLimit"
                        type="number"
                        value={viewLimit}
                        onChange={(e) => setViewLimit(e.target.value)}
                        placeholder="Maximum number of views"
                        className="bg-white"
                      />
                    </div>

                    {/* Allowed Emails */}
                    <div>
                      <Label>Allowed Emails (Optional)</Label>
                      <p className="text-sm text-gray-500 mb-2">Only these emails can access the document</p>
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <Input
                            value={newAllowedEmail}
                            onChange={(e) => setNewAllowedEmail(e.target.value)}
                            placeholder="Enter email address"
                            className="bg-white"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                if (newAllowedEmail && !allowedEmails.includes(newAllowedEmail)) {
                                  setAllowedEmails([...allowedEmails, newAllowedEmail])
                                  setNewAllowedEmail('')
                                }
                              }
                            }}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              if (newAllowedEmail && !allowedEmails.includes(newAllowedEmail)) {
                                setAllowedEmails([...allowedEmails, newAllowedEmail])
                                setNewAllowedEmail('')
                              }
                            }}
                          >
                            Add
                          </Button>
                        </div>
                        {allowedEmails.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {allowedEmails.map((email, index) => (
                              <div key={index} className="flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                                {email}
                                <button
                                  type="button"
                                  onClick={() => setAllowedEmails(allowedEmails.filter((_, i) => i !== index))}
                                  className="ml-1 text-blue-600 hover:text-blue-800"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Blocked Emails */}
                    <div>
                      <Label>Blocked Emails (Optional)</Label>
                      <p className="text-sm text-gray-500 mb-2">These emails cannot access the document</p>
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <Input
                            value={newBlockedEmail}
                            onChange={(e) => setNewBlockedEmail(e.target.value)}
                            placeholder="Enter email address to block"
                            className="bg-white"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                if (newBlockedEmail && !blockedEmails.includes(newBlockedEmail)) {
                                  setBlockedEmails([...blockedEmails, newBlockedEmail])
                                  setNewBlockedEmail('')
                                }
                              }
                            }}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              if (newBlockedEmail && !blockedEmails.includes(newBlockedEmail)) {
                                setBlockedEmails([...blockedEmails, newBlockedEmail])
                                setNewBlockedEmail('')
                              }
                            }}
                          >
                            Block
                          </Button>
                        </div>
                        {blockedEmails.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {blockedEmails.map((email, index) => (
                              <div key={index} className="flex items-center gap-1 bg-red-100 text-red-800 px-2 py-1 rounded text-sm">
                                {email}
                                <button
                                  type="button"
                                  onClick={() => setBlockedEmails(blockedEmails.filter((_, i) => i !== index))}
                                  className="ml-1 text-red-600 hover:text-red-800"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Domain Restrictions */}
                <Card className="bg-white">
                  <CardHeader>
                    <CardTitle className="text-lg">Domain Restrictions</CardTitle>
                    <CardDescription>Control access by email domains</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Allowed Domains */}
                    <div>
                      <Label>Allowed Domains (Optional)</Label>
                      <p className="text-sm text-gray-500 mb-2">Only emails from these domains can access</p>
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <Input
                            value={newAllowedDomain}
                            onChange={(e) => setNewAllowedDomain(e.target.value)}
                            placeholder="Enter domain (e.g., company.com)"
                            className="bg-white"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                if (newAllowedDomain && !allowedDomains.includes(newAllowedDomain)) {
                                  setAllowedDomains([...allowedDomains, newAllowedDomain])
                                  setNewAllowedDomain('')
                                }
                              }
                            }}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              if (newAllowedDomain && !allowedDomains.includes(newAllowedDomain)) {
                                setAllowedDomains([...allowedDomains, newAllowedDomain])
                                setNewAllowedDomain('')
                              }
                            }}
                          >
                            Add
                          </Button>
                        </div>
                        {allowedDomains.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {allowedDomains.map((domain, index) => (
                              <div key={index} className="flex items-center gap-1 bg-green-100 text-green-800 px-2 py-1 rounded text-sm">
                                {domain}
                                <button
                                  type="button"
                                  onClick={() => setAllowedDomains(allowedDomains.filter((_, i) => i !== index))}
                                  className="ml-1 text-green-600 hover:text-green-800"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Blocked Domains */}
                    <div>
                      <Label>Blocked Domains (Optional)</Label>
                      <p className="text-sm text-gray-500 mb-2">Emails from these domains cannot access</p>
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <Input
                            value={newBlockedDomain}
                            onChange={(e) => setNewBlockedDomain(e.target.value)}
                            placeholder="Enter domain to block (e.g., spam.com)"
                            className="bg-white"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                if (newBlockedDomain && !blockedDomains.includes(newBlockedDomain)) {
                                  setBlockedDomains([...blockedDomains, newBlockedDomain])
                                  setNewBlockedDomain('')
                                }
                              }
                            }}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              if (newBlockedDomain && !blockedDomains.includes(newBlockedDomain)) {
                                setBlockedDomains([...blockedDomains, newBlockedDomain])
                                setNewBlockedDomain('')
                              }
                            }}
                          >
                            Block
                          </Button>
                        </div>
                        {blockedDomains.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {blockedDomains.map((domain, index) => (
                              <div key={index} className="flex items-center gap-1 bg-red-100 text-red-800 px-2 py-1 rounded text-sm">
                                {domain}
                                <button
                                  type="button"
                                  onClick={() => setBlockedDomains(blockedDomains.filter((_, i) => i !== index))}
                                  className="ml-1 text-red-600 hover:text-red-800"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Geographic Restrictions */}
                <Card className="bg-white">
                  <CardHeader>
                    <CardTitle className="text-lg">Geographic Restrictions</CardTitle>
                    <CardDescription>Control access by country location</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Allowed Countries */}
                    <div>
                      <Label>Allowed Countries (Optional)</Label>
                      <p className="text-sm text-gray-500 mb-2">Only viewers from these countries can access</p>
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <Input
                            value={newAllowedCountry}
                            onChange={(e) => setNewAllowedCountry(e.target.value)}
                            placeholder="Enter country name (e.g., United States)"
                            className="bg-white"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                if (newAllowedCountry && !allowedCountries.includes(newAllowedCountry)) {
                                  setAllowedCountries([...allowedCountries, newAllowedCountry])
                                  setNewAllowedCountry('')
                                }
                              }
                            }}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              if (newAllowedCountry && !allowedCountries.includes(newAllowedCountry)) {
                                setAllowedCountries([...allowedCountries, newAllowedCountry])
                                setNewAllowedCountry('')
                              }
                            }}
                          >
                            Add
                          </Button>
                        </div>
                        {allowedCountries.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {allowedCountries.map((country, index) => (
                              <div key={index} className="flex items-center gap-1 bg-green-100 text-green-800 px-2 py-1 rounded text-sm">
                                {country}
                                <button
                                  type="button"
                                  onClick={() => setAllowedCountries(allowedCountries.filter((_, i) => i !== index))}
                                  className="ml-1 text-green-600 hover:text-green-800"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Blocked Countries */}
                    <div>
                      <Label>Blocked Countries (Optional)</Label>
                      <p className="text-sm text-gray-500 mb-2">Viewers from these countries cannot access</p>
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <Input
                            value={newBlockedCountry}
                            onChange={(e) => setNewBlockedCountry(e.target.value)}
                            placeholder="Enter country name (e.g., China)"
                            className="bg-white"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                if (newBlockedCountry && !blockedCountries.includes(newBlockedCountry)) {
                                  setBlockedCountries([...blockedCountries, newBlockedCountry])
                                  setNewBlockedCountry('')
                                }
                              }
                            }}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              if (newBlockedCountry && !blockedCountries.includes(newBlockedCountry)) {
                                setBlockedCountries([...blockedCountries, newBlockedCountry])
                                setNewBlockedCountry('')
                              }
                            }}
                          >
                            Block
                          </Button>
                        </div>
                        {blockedCountries.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {blockedCountries.map((country, index) => (
                              <div key={index} className="flex items-center gap-1 bg-red-100 text-red-800 px-2 py-1 rounded text-sm">
                                {country}
                                <button
                                  type="button"
                                  onClick={() => setBlockedCountries(blockedCountries.filter((_, i) => i !== index))}
                                  className="ml-1 text-red-600 hover:text-red-800"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* IP Restrictions */}
                <Card className="bg-white">
                  <CardHeader>
                    <CardTitle className="text-lg">IP Restrictions</CardTitle>
                    <CardDescription>Control access by IP address</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Allowed IPs */}
                    <div>
                      <Label>Allowed IP Addresses (Optional)</Label>
                      <p className="text-sm text-gray-500 mb-2">Only these IP addresses can access</p>
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <Input
                            value={newAllowedIP}
                            onChange={(e) => setNewAllowedIP(e.target.value)}
                            placeholder="Enter IP address (e.g., 192.168.1.1)"
                            className="bg-white"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                if (newAllowedIP && !allowedIPs.includes(newAllowedIP)) {
                                  setAllowedIPs([...allowedIPs, newAllowedIP])
                                  setNewAllowedIP('')
                                }
                              }
                            }}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              if (newAllowedIP && !allowedIPs.includes(newAllowedIP)) {
                                setAllowedIPs([...allowedIPs, newAllowedIP])
                                setNewAllowedIP('')
                              }
                            }}
                          >
                            Add
                          </Button>
                        </div>
                        {allowedIPs.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {allowedIPs.map((ip, index) => (
                              <div key={index} className="flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                                {ip}
                                <button
                                  type="button"
                                  onClick={() => setAllowedIPs(allowedIPs.filter((_, i) => i !== index))}
                                  className="ml-1 text-blue-600 hover:text-blue-800"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Blocked IPs */}
                    <div>
                      <Label>Blocked IP Addresses (Optional)</Label>
                      <p className="text-sm text-gray-500 mb-2">These IP addresses cannot access</p>
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <Input
                            value={newBlockedIP}
                            onChange={(e) => setNewBlockedIP(e.target.value)}
                            placeholder="Enter IP address (e.g., 10.0.0.1)"
                            className="bg-white"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                if (newBlockedIP && !blockedIPs.includes(newBlockedIP)) {
                                  setBlockedIPs([...blockedIPs, newBlockedIP])
                                  setNewBlockedIP('')
                                }
                              }
                            }}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              if (newBlockedIP && !blockedIPs.includes(newBlockedIP)) {
                                setBlockedIPs([...blockedIPs, newBlockedIP])
                                setNewBlockedIP('')
                              }
                            }}
                          >
                            Block
                          </Button>
                        </div>
                        {blockedIPs.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {blockedIPs.map((ip, index) => (
                              <div key={index} className="flex items-center gap-1 bg-red-100 text-red-800 px-2 py-1 rounded text-sm">
                                {ip}
                                <button
                                  type="button"
                                  onClick={() => setBlockedIPs(blockedIPs.filter((_, i) => i !== index))}
                                  className="ml-1 text-red-600 hover:text-red-800"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </div>

        {/* Footer */}
        {!createdLink && (
          <div className="p-6 border-t bg-white">
            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={handleCreateLink}
                disabled={loading}
                className="flex-1"
              >
                {loading ? 'Creating...' : 'Create Share Link'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
