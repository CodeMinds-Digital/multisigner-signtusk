'use client'

import { useState } from 'react'
import { Link as LinkIcon, Copy, Check, Settings, Calendar, Lock, Mail, FileText, Download, Printer, Eye, Plus, X, Shield, Globe, Users, Palette, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CustomSwitch } from '@/components/ui/custom-switch'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'

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

  // Basic Link Settings
  const [linkName, setLinkName] = useState(`${documentTitle} - Share Link`)
  const [accountName, setAccountName] = useState('')
  const [customUrl, setCustomUrl] = useState('')

  // Access Control Settings
  const [password, setPassword] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [viewLimit, setViewLimit] = useState('')
  const [allowDownload, setAllowDownload] = useState(true)
  const [allowPrinting, setAllowPrinting] = useState(true)

  // Email & Domain Restrictions
  const [requireEmail, setRequireEmail] = useState(false)
  const [emailRestrictionType, setEmailRestrictionType] = useState<'none' | 'allow' | 'block'>('none')
  const [allowedEmails, setAllowedEmails] = useState<string[]>([])
  const [blockedEmails, setBlockedEmails] = useState<string[]>([])
  const [allowedDomains, setAllowedDomains] = useState<string[]>([])
  const [blockedDomains, setBlockedDomains] = useState<string[]>([])

  // Separate input states for each field to prevent focus issues
  const [allowedEmailInput, setAllowedEmailInput] = useState('')
  const [blockedEmailInput, setBlockedEmailInput] = useState('')
  const [allowedDomainInput, setAllowedDomainInput] = useState('')
  const [blockedDomainInput, setBlockedDomainInput] = useState('')

  // Geographic & IP Restrictions
  const [allowedCountries, setAllowedCountries] = useState<string[]>([])
  const [blockedCountries, setBlockedCountries] = useState<string[]>([])
  const [allowedIPs, setAllowedIPs] = useState<string[]>([])
  const [blockedIPs, setBlockedIPs] = useState<string[]>([])
  const [newCountryInput, setNewCountryInput] = useState('')
  const [newIPInput, setNewIPInput] = useState('')

  // NDA & Security
  const [requireNda, setRequireNda] = useState(false)
  const [selectedNda, setSelectedNda] = useState('')
  const [enableWatermark, setEnableWatermark] = useState(false)
  const [watermarkText, setWatermarkText] = useState('')

  // Screenshot Protection
  const [screenshotProtection, setScreenshotProtection] = useState(false)
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.5)
  const [watermarkColor, setWatermarkColor] = useState('#000000')
  const [printProtection, setPrintProtection] = useState(false)
  const [rightClickProtection, setRightClickProtection] = useState(false)

  // Customization
  const [welcomeMessage, setWelcomeMessage] = useState('')
  const [welcomeDisplayName, setWelcomeDisplayName] = useState('')
  const [customButtonText, setCustomButtonText] = useState('View Document')
  const [embedCode, setEmbedCode] = useState('')

  // Notifications
  const [enableNotifications, setEnableNotifications] = useState(true)

  // UI State
  const [showEmailDomainModal, setShowEmailDomainModal] = useState(false)
  const [activeTab, setActiveTab] = useState('basic')

  // Helper functions for email/domain management
  const addEmail = (type: 'allow' | 'block') => {
    const inputValue = type === 'allow' ? allowedEmailInput : blockedEmailInput
    if (!inputValue.trim()) return

    const email = inputValue.trim().toLowerCase()

    // Check for valid email format
    if (!email.includes('@')) {
      toast.error('Please enter a valid email address')
      return
    }

    if (type === 'allow') {
      if (allowedEmails.includes(email)) {
        toast.error('Email already added')
        return
      }
      setAllowedEmails(prev => [...prev, email])
      setAllowedEmailInput('')
      toast.success('Email added to allowed list')
    } else {
      if (blockedEmails.includes(email)) {
        toast.error('Email already added')
        return
      }
      setBlockedEmails(prev => [...prev, email])
      setBlockedEmailInput('')
      toast.success('Email added to blocked list')
    }
  }

  const removeEmail = (email: string, type: 'allow' | 'block') => {
    if (type === 'allow') {
      setAllowedEmails(prev => prev.filter(e => e !== email))
    } else {
      setBlockedEmails(prev => prev.filter(e => e !== email))
    }
  }

  const addDomain = (type: 'allow' | 'block') => {
    const inputValue = type === 'allow' ? allowedDomainInput : blockedDomainInput
    if (!inputValue.trim()) return

    const domain = inputValue.trim().toLowerCase()

    // Basic domain validation
    if (!domain.includes('.') || domain.includes('@')) {
      toast.error('Please enter a valid domain (e.g., company.com)')
      return
    }

    if (type === 'allow') {
      if (allowedDomains.includes(domain)) {
        toast.error('Domain already added')
        return
      }
      setAllowedDomains(prev => [...prev, domain])
      setAllowedDomainInput('')
      toast.success('Domain added to allowed list')
    } else {
      if (blockedDomains.includes(domain)) {
        toast.error('Domain already added')
        return
      }
      setBlockedDomains(prev => [...prev, domain])
      setBlockedDomainInput('')
      toast.success('Domain added to blocked list')
    }
  }

  const removeDomain = (domain: string, type: 'allow' | 'block') => {
    if (type === 'allow') {
      setAllowedDomains(prev => prev.filter(d => d !== domain))
    } else {
      setBlockedDomains(prev => prev.filter(d => d !== domain))
    }
  }

  // Helper functions for country management
  const addCountry = (type: 'allow' | 'block') => {
    if (!newCountryInput.trim()) return

    const country = newCountryInput.trim()
    if (type === 'allow') {
      setAllowedCountries(prev => [...prev, country])
    } else {
      setBlockedCountries(prev => [...prev, country])
    }
    setNewCountryInput('')
  }

  const removeCountry = (country: string, type: 'allow' | 'block') => {
    if (type === 'allow') {
      setAllowedCountries(prev => prev.filter(c => c !== country))
    } else {
      setBlockedCountries(prev => prev.filter(c => c !== country))
    }
  }

  // Helper functions for IP management
  const addIP = (type: 'allow' | 'block') => {
    if (!newIPInput.trim()) return

    const ip = newIPInput.trim()
    if (type === 'allow') {
      setAllowedIPs(prev => [...prev, ip])
    } else {
      setBlockedIPs(prev => [...prev, ip])
    }
    setNewIPInput('')
  }

  const removeIP = (ip: string, type: 'allow' | 'block') => {
    if (type === 'allow') {
      setAllowedIPs(prev => prev.filter(i => i !== ip))
    } else {
      setBlockedIPs(prev => prev.filter(i => i !== ip))
    }
  }

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
          accountName: accountName || undefined,
          customUrl: customUrl || undefined,
          password: password || undefined,
          expiresAt: expiresAt || undefined,
          viewLimit: viewLimit ? parseInt(viewLimit) : undefined,
          allowDownload,
          allowPrinting,
          requireEmail: requireEmail || emailRestrictionType !== 'none',
          requireNda,
          enableNotifications,
          enableWatermark,
          watermarkText: enableWatermark ? watermarkText : undefined,
          screenshotProtection,
          watermarkOpacity: enableWatermark ? watermarkOpacity : undefined,
          watermarkColor: enableWatermark ? watermarkColor : undefined,
          printProtection,
          rightClickProtection,
          welcomeMessage: welcomeMessage || undefined,
          welcomeDisplayName: welcomeDisplayName || undefined,
          customButtonText: customButtonText !== 'View Document' ? customButtonText : undefined,
          accessControls: {
            allowedEmails: emailRestrictionType === 'allow' ? allowedEmails : [],
            blockedEmails: emailRestrictionType === 'block' ? blockedEmails : [],
            allowedDomains: emailRestrictionType === 'allow' ? allowedDomains : [],
            blockedDomains: emailRestrictionType === 'block' ? blockedDomains : [],
            allowedCountries,
            blockedCountries,
            allowedIPs,
            blockedIPs
          }
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

  // Access Control Modal Component
  const EmailDomainModal = () => {
    const [modalTab, setModalTab] = useState('email')

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Access Control Restrictions</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowEmailDomainModal(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <Tabs value={modalTab} onValueChange={setModalTab} className="mb-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="email">Email & Domain</TabsTrigger>
              <TabsTrigger value="geographic">Geographic & IP</TabsTrigger>
            </TabsList>

            <TabsContent value="email" className="space-y-6">
              {/* Email Restriction Type Selection */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Email Access Control</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="email-none"
                      name="emailRestriction"
                      value="none"
                      checked={emailRestrictionType === 'none'}
                      onChange={(e) => setEmailRestrictionType(e.target.value as any)}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="email-none" className="font-normal">No email restrictions</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="email-allow"
                      name="emailRestriction"
                      value="allow"
                      checked={emailRestrictionType === 'allow'}
                      onChange={(e) => setEmailRestrictionType(e.target.value as any)}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="email-allow" className="font-normal">Only allow specific emails/domains</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="email-block"
                      name="emailRestriction"
                      value="block"
                      checked={emailRestrictionType === 'block'}
                      onChange={(e) => setEmailRestrictionType(e.target.value as any)}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="email-block" className="font-normal">Block specific emails/domains</Label>
                  </div>
                </div>
              </div>

              {/* Email/Domain Input Fields - Conditional Rendering */}
              {emailRestrictionType === 'allow' && (
                <div className="space-y-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div>
                    <Label className="text-sm font-medium">Allowed Emails</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        placeholder="Enter email address"
                        value={allowedEmailInput}
                        onChange={(e) => setAllowedEmailInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addEmail('allow')}
                      />
                      <Button onClick={() => addEmail('allow')} size="sm">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {allowedEmails.map((email) => (
                        <span key={email} className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs flex items-center gap-1">
                          {email}
                          <X className="w-3 h-3 cursor-pointer" onClick={() => removeEmail(email, 'allow')} />
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Allowed Domains</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        placeholder="Enter domain (e.g., company.com)"
                        value={allowedDomainInput}
                        onChange={(e) => setAllowedDomainInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addDomain('allow')}
                      />
                      <Button onClick={() => addDomain('allow')} size="sm">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {allowedDomains.map((domain) => (
                        <span key={domain} className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs flex items-center gap-1">
                          {domain}
                          <X className="w-3 h-3 cursor-pointer" onClick={() => removeDomain(domain, 'allow')} />
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {emailRestrictionType === 'block' && (
                <div className="space-y-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div>
                    <Label className="text-sm font-medium">Blocked Emails</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        placeholder="Enter email address"
                        value={blockedEmailInput}
                        onChange={(e) => setBlockedEmailInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addEmail('block')}
                      />
                      <Button onClick={() => addEmail('block')} size="sm">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {blockedEmails.map((email) => (
                        <span key={email} className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs flex items-center gap-1">
                          {email}
                          <X className="w-3 h-3 cursor-pointer" onClick={() => removeEmail(email, 'block')} />
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Blocked Domains</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        placeholder="Enter domain (e.g., competitor.com)"
                        value={blockedDomainInput}
                        onChange={(e) => setBlockedDomainInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addDomain('block')}
                      />
                      <Button onClick={() => addDomain('block')} size="sm">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {blockedDomains.map((domain) => (
                        <span key={domain} className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs flex items-center gap-1">
                          {domain}
                          <X className="w-3 h-3 cursor-pointer" onClick={() => removeDomain(domain, 'block')} />
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="geographic" className="space-y-6">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Geographic & IP Restrictions:</strong> Control access based on visitor location and IP addresses.
                  Useful for compliance, regional restrictions, or blocking competitors.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label>Allowed Countries</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      placeholder="Enter country name"
                      value={newCountryInput}
                      onChange={(e) => setNewCountryInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addCountry('allow')}
                    />
                    <Button onClick={() => addCountry('allow')} size="sm">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {allowedCountries.map((country) => (
                      <span key={country} className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs flex items-center gap-1">
                        {country}
                        <X className="w-3 h-3 cursor-pointer" onClick={() => removeCountry(country, 'allow')} />
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Blocked Countries</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      placeholder="Enter country name"
                      value={newCountryInput}
                      onChange={(e) => setNewCountryInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addCountry('block')}
                    />
                    <Button onClick={() => addCountry('block')} size="sm">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {blockedCountries.map((country) => (
                      <span key={country} className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs flex items-center gap-1">
                        {country}
                        <X className="w-3 h-3 cursor-pointer" onClick={() => removeCountry(country, 'block')} />
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Allowed IP Addresses</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      placeholder="Enter IP address"
                      value={newIPInput}
                      onChange={(e) => setNewIPInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addIP('allow')}
                    />
                    <Button onClick={() => addIP('allow')} size="sm">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {allowedIPs.map((ip) => (
                      <span key={ip} className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs flex items-center gap-1">
                        {ip}
                        <X className="w-3 h-3 cursor-pointer" onClick={() => removeIP(ip, 'allow')} />
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Blocked IP Addresses</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      placeholder="Enter IP address"
                      value={newIPInput}
                      onChange={(e) => setNewIPInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addIP('block')}
                    />
                    <Button onClick={() => addIP('block')} size="sm">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {blockedIPs.map((ip) => (
                      <span key={ip} className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs flex items-center gap-1">
                        {ip}
                        <X className="w-3 h-3 cursor-pointer" onClick={() => removeIP(ip, 'block')} />
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Geographic Restrictions:</strong> Visitors from specified countries will be allowed or blocked based on their IP location.
                </p>
                <p className="text-sm text-blue-700 mt-1">
                  <strong>IP Restrictions:</strong> Specific IP addresses or ranges can be allowed or blocked for precise access control.
                </p>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setShowEmailDomainModal(false)}>
              Cancel
            </Button>
            <Button onClick={() => setShowEmailDomainModal(false)}>
              Apply Settings
            </Button>
          </div>
        </div >
      </div >
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {showEmailDomainModal && <EmailDomainModal />}

      <div className="space-y-2">
        <h3 className="text-xl font-semibold flex items-center gap-2">
          <LinkIcon className="w-6 h-6" />
          Create Share Link
        </h3>
        <p className="text-gray-600">
          Configure settings for sharing "{documentTitle}"
        </p>
      </div>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basic">Basic</TabsTrigger>
          <TabsTrigger value="access">Access Control</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="customize">Customize</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-6">
          {/* Company/Client Name */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4" />
                Add a company or client name
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="linkName">Name link (not visible to visitors)</Label>
                <Input
                  id="linkName"
                  value={linkName}
                  onChange={(e) => setLinkName(e.target.value)}
                  placeholder="Enter a name for this link"
                />
              </div>
              <div>
                <Label htmlFor="accountName">Select an account name or enter a new one</Label>
                <Input
                  id="accountName"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="Example Account"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Organize link audiences to aggregate metrics. Leave blank to assign to a generic Example Account. This field is not visible to visitors.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="access" className="space-y-6">
          {/* Manage File Access */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Manage file access
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Viewing Requirements */}
              <div>
                <h4 className="font-medium mb-3">Viewing requirements</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">No email required to view</p>
                      <p className="text-sm text-gray-500">Anyone with the link can view</p>
                    </div>
                    <CustomSwitch
                      checked={!requireEmail && emailRestrictionType === 'none'}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setRequireEmail(false)
                          setEmailRestrictionType('none')
                        }
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Add password protection</p>
                      <p className="text-sm text-gray-500">Require password to access</p>
                    </div>
                    <CustomSwitch
                      checked={!!password}
                      onCheckedChange={(checked) => {
                        if (!checked) setPassword('')
                      }}
                    />
                  </div>

                  {password && (
                    <div className="ml-4">
                      <Input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter password"
                      />
                    </div>
                  )}

                  <div className="border-t pt-3">
                    <Button
                      variant="outline"
                      onClick={() => setShowEmailDomainModal(true)}
                      className="w-full justify-start"
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Configure access restrictions (email, domain, geographic, IP)
                    </Button>
                    {(emailRestrictionType !== 'none' || allowedEmails.length > 0 || blockedEmails.length > 0 || allowedDomains.length > 0 || blockedDomains.length > 0 || allowedCountries.length > 0 || blockedCountries.length > 0 || allowedIPs.length > 0 || blockedIPs.length > 0) && (
                      <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
                        <p className="font-medium text-blue-900">Access Restrictions Active</p>
                        {allowedEmails.length > 0 && (
                          <p className="text-blue-700">✓ Allowed emails: {allowedEmails.join(', ')}</p>
                        )}
                        {allowedDomains.length > 0 && (
                          <p className="text-blue-700">✓ Allowed domains: {allowedDomains.join(', ')}</p>
                        )}
                        {blockedEmails.length > 0 && (
                          <p className="text-blue-700">✗ Blocked emails: {blockedEmails.join(', ')}</p>
                        )}
                        {blockedDomains.length > 0 && (
                          <p className="text-blue-700">✗ Blocked domains: {blockedDomains.join(', ')}</p>
                        )}
                        {allowedCountries.length > 0 && (
                          <p className="text-blue-700">🌍 Allowed countries: {allowedCountries.join(', ')}</p>
                        )}
                        {blockedCountries.length > 0 && (
                          <p className="text-blue-700">🚫 Blocked countries: {blockedCountries.join(', ')}</p>
                        )}
                        {allowedIPs.length > 0 && (
                          <p className="text-blue-700">🔒 Allowed IPs: {allowedIPs.join(', ')}</p>
                        )}
                        {blockedIPs.length > 0 && (
                          <p className="text-blue-700">🚫 Blocked IPs: {blockedIPs.join(', ')}</p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Require visitors to sign an NDA or other agreement to view</p>
                      <p className="text-sm text-gray-500">Upload an NDA or agreement on the Agreements page to use this feature.</p>
                    </div>
                    <CustomSwitch
                      checked={requireNda}
                      onCheckedChange={setRequireNda}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          {/* Extra Security Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Add extra security settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Allow downloads</p>
                  <p className="text-sm text-gray-500">Let visitors download the document</p>
                </div>
                <CustomSwitch
                  checked={allowDownload}
                  onCheckedChange={setAllowDownload}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Set an expiration date</p>
                  <p className="text-sm text-gray-500">Link will stop working after this date</p>
                </div>
                <CustomSwitch
                  checked={!!expiresAt}
                  onCheckedChange={(checked) => {
                    if (!checked) setExpiresAt('')
                  }}
                />
              </div>

              {expiresAt !== '' && (
                <div className="ml-4">
                  <Input
                    type="datetime-local"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                  />
                </div>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Screenshot Protection</p>
                  <p className="text-sm text-gray-500">Prevent screenshots and unauthorized capture</p>
                </div>
                <CustomSwitch
                  checked={screenshotProtection}
                  onCheckedChange={setScreenshotProtection}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Add a watermark to protect from unauthorized use</p>
                  <p className="text-sm text-gray-500">Overlay text on each page</p>
                </div>
                <CustomSwitch
                  checked={enableWatermark}
                  onCheckedChange={setEnableWatermark}
                />
              </div>

              {enableWatermark && (
                <div className="ml-4 space-y-3">
                  <Input
                    value={watermarkText}
                    onChange={(e) => setWatermarkText(e.target.value)}
                    placeholder="Enter watermark text"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium">Opacity</label>
                      <Input
                        type="range"
                        min="0.1"
                        max="1"
                        step="0.1"
                        value={watermarkOpacity}
                        onChange={(e) => setWatermarkOpacity(parseFloat(e.target.value))}
                        className="mt-1"
                      />
                      <span className="text-xs text-gray-500">{Math.round(watermarkOpacity * 100)}%</span>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Color</label>
                      <Input
                        type="color"
                        value={watermarkColor}
                        onChange={(e) => setWatermarkColor(e.target.value)}
                        className="mt-1 h-10"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Print Protection</p>
                  <p className="text-sm text-gray-500">Prevent printing of the document</p>
                </div>
                <CustomSwitch
                  checked={printProtection}
                  onCheckedChange={setPrintProtection}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Right-Click Protection</p>
                  <p className="text-sm text-gray-500">Disable right-click context menu</p>
                </div>
                <CustomSwitch
                  checked={rightClickProtection}
                  onCheckedChange={setRightClickProtection}
                />
              </div>

              <div>
                <Label htmlFor="viewLimit">View limit (optional)</Label>
                <Input
                  id="viewLimit"
                  type="number"
                  value={viewLimit}
                  onChange={(e) => setViewLimit(e.target.value)}
                  placeholder="Maximum number of views"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customize" className="space-y-6">
          {/* Customize Link */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Palette className="w-4 h-4" />
                Customize link
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="customUrl">Create a custom URL</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">yourdomain.com/v/</span>
                  <Input
                    id="customUrl"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    placeholder="custom-link-name"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="welcomeMessage">Set welcome message for visitors</Label>
                <Textarea
                  id="welcomeMessage"
                  value={welcomeMessage}
                  onChange={(e) => setWelcomeMessage(e.target.value)}
                  placeholder="Welcome! Please review this document..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="welcomeDisplayName">Set welcome message display name</Label>
                <Input
                  id="welcomeDisplayName"
                  value={welcomeDisplayName}
                  onChange={(e) => setWelcomeDisplayName(e.target.value)}
                  placeholder="Your Name"
                />
              </div>

              <div>
                <Label htmlFor="customButtonText">Add a custom button</Label>
                <Input
                  id="customButtonText"
                  value={customButtonText}
                  onChange={(e) => setCustomButtonText(e.target.value)}
                  placeholder="View Document"
                />
              </div>

              <div>
                <Label>Embed link on website</Label>
                <div className="mt-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      const embedCode = `<iframe src="${window.location.origin}/v/LINK_ID" width="100%" height="600" frameborder="0"></iframe>`
                      setEmbedCode(embedCode)
                    }}
                  >
                    <Globe className="w-4 h-4 mr-2" />
                    Generate Embed Code
                  </Button>
                  {embedCode && (
                    <div className="mt-2">
                      <Textarea
                        value={embedCode}
                        readOnly
                        rows={3}
                        className="font-mono text-xs"
                      />
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-6 border-t">
        <div className="flex items-center gap-2">
          <CustomSwitch
            checked={enableNotifications}
            onCheckedChange={setEnableNotifications}
          />
          <Label className="text-sm">Enable notifications</Label>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateLink}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {loading ? (
              <>Creating...</>
            ) : (
              <>
                <LinkIcon className="w-4 h-4 mr-2" />
                Create Link
              </>
            )}
          </Button>
        </div>
      </div>


    </div>
  )
}

