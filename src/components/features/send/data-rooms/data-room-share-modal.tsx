'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { CustomSwitch } from '@/components/ui/custom-switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  X,
  Share2,
  Copy,
  Mail,
  Link as LinkIcon,
  Shield,
  Clock,
  Users,
  Eye,
  Settings,
  Globe,
  Lock,
  Calendar,
  Download
} from 'lucide-react'
import { toast } from 'sonner'

interface DataRoom {
  id: string
  name: string
  description: string
  is_active: boolean
}

interface ShareLink {
  id: string
  slug: string
  name: string
  password_protected: boolean
  expires_at: string | null
  view_limit: number | null
  download_enabled: boolean
  watermark_enabled: boolean
  created_at: string
  total_views: number
}

interface DataRoomShareModalProps {
  dataRoom: DataRoom
  onClose: () => void
}

export function DataRoomShareModal({ dataRoom, onClose }: DataRoomShareModalProps) {
  const [loading, setLoading] = useState(false)
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([])
  const [activeTab, setActiveTab] = useState('links')

  // Link creation form
  const [linkName, setLinkName] = useState('')
  const [customSlug, setCustomSlug] = useState('')
  const [password, setPassword] = useState('')
  const [passwordProtected, setPasswordProtected] = useState(false)
  const [expiresAt, setExpiresAt] = useState('')
  const [viewLimit, setViewLimit] = useState('')
  const [downloadEnabled, setDownloadEnabled] = useState(true)
  const [watermarkEnabled, setWatermarkEnabled] = useState(false)
  const [screenshotProtection, setScreenshotProtection] = useState(false)

  // Email sharing
  const [emailRecipients, setEmailRecipients] = useState('')
  const [emailSubject, setEmailSubject] = useState('')
  const [emailMessage, setEmailMessage] = useState('')

  // Fetch existing share links
  const fetchShareLinks = async () => {
    try {
      const response = await fetch(`/api/send/data-rooms/${dataRoom.id}/links`)
      if (response.ok) {
        const data = await response.json()
        setShareLinks(data.links || [])
      }
    } catch (error) {
      console.error('Failed to fetch share links:', error)
    }
  }

  // Create share link
  const createShareLink = async () => {
    if (!linkName.trim()) {
      toast.error('Link name is required')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/send/data-rooms/${dataRoom.id}/links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: linkName.trim(),
          slug: customSlug.trim() || undefined,
          password_protected: passwordProtected,
          password: passwordProtected ? password : undefined,
          expires_at: expiresAt || null,
          view_limit: viewLimit ? parseInt(viewLimit) : null,
          download_enabled: downloadEnabled,
          watermark_enabled: watermarkEnabled,
          screenshot_protection: screenshotProtection,
          access_controls: {
            require_email: false,
            allowed_emails: [],
            blocked_emails: [],
            allowed_domains: [],
            blocked_domains: [],
            geo_restrictions: []
          }
        })
      })

      if (response.ok) {
        const data = await response.json()
        toast.success('Share link created successfully')
        setShareLinks([data.link, ...shareLinks])

        // Reset form
        setLinkName('')
        setCustomSlug('')
        setPassword('')
        setPasswordProtected(false)
        setExpiresAt('')
        setViewLimit('')
        setDownloadEnabled(true)
        setWatermarkEnabled(false)
        setScreenshotProtection(false)
      } else {
        const data = await response.json()
        toast.error(data.error || 'Failed to create share link')
      }
    } catch (error) {
      console.error('Error creating share link:', error)
      toast.error('Failed to create share link')
    } finally {
      setLoading(false)
    }
  }

  // Copy link to clipboard
  const copyLink = async (slug: string) => {
    const url = `${window.location.origin}/v/${slug}`
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Link copied to clipboard')
    } catch (error) {
      toast.error('Failed to copy link')
    }
  }

  // Send email invitations
  const sendEmailInvitations = async () => {
    if (!emailRecipients.trim()) {
      toast.error('Email recipients are required')
      return
    }

    setLoading(true)
    try {
      const emails = emailRecipients.split(',').map(email => email.trim()).filter(Boolean)

      const response = await fetch(`/api/send/data-rooms/${dataRoom.id}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emails,
          subject: emailSubject || `Access to ${dataRoom.name}`,
          message: emailMessage
        })
      })

      if (response.ok) {
        toast.success(`Invitations sent to ${emails.length} recipient${emails.length !== 1 ? 's' : ''}`)
        setEmailRecipients('')
        setEmailSubject('')
        setEmailMessage('')
      } else {
        const data = await response.json()
        toast.error(data.error || 'Failed to send invitations')
      }
    } catch (error) {
      console.error('Error sending invitations:', error)
      toast.error('Failed to send invitations')
    } finally {
      setLoading(false)
    }
  }

  // Delete share link
  const deleteShareLink = async (linkId: string) => {
    if (!confirm('Are you sure you want to delete this share link?')) {
      return
    }

    try {
      const response = await fetch(`/api/send/data-rooms/${dataRoom.id}/links/${linkId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Share link deleted')
        setShareLinks(shareLinks.filter(link => link.id !== linkId))
      } else {
        toast.error('Failed to delete share link')
      }
    } catch (error) {
      console.error('Error deleting share link:', error)
      toast.error('Failed to delete share link')
    }
  }

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  useEffect(() => {
    fetchShareLinks()
    setEmailSubject(`Access to ${dataRoom.name}`)
    setEmailMessage(`Hi,\n\nI'm sharing the "${dataRoom.name}" data room with you. You can access all the documents using the link below.\n\nBest regards`)
  }, [dataRoom])

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Share2 className="h-5 w-5 text-blue-600" />
              <DialogTitle>Share Data Room</DialogTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <DialogDescription>
            Share "{dataRoom.name}" with others by creating secure links or sending email invitations
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="links">Share Links</TabsTrigger>
            <TabsTrigger value="email">Email Invitations</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="links" className="space-y-6">
            {/* Create New Link */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Create Share Link</CardTitle>
                <CardDescription>
                  Generate a secure link to share this data room
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="linkName">Link Name *</Label>
                    <Input
                      id="linkName"
                      value={linkName}
                      onChange={(e) => setLinkName(e.target.value)}
                      placeholder="e.g., Client Review Link"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customSlug">Custom URL (optional)</Label>
                    <Input
                      id="customSlug"
                      value={customSlug}
                      onChange={(e) => setCustomSlug(e.target.value)}
                      placeholder="custom-url"
                    />
                  </div>
                </div>

                {/* Security Settings */}
                <div className="space-y-4">
                  <h4 className="font-medium">Security Settings</h4>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Password Protection</Label>
                      <p className="text-sm text-gray-500">Require a password to access</p>
                    </div>
                    <CustomSwitch
                      checked={passwordProtected}
                      onCheckedChange={setPasswordProtected}
                    />
                  </div>

                  {passwordProtected && (
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter password"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="expiresAt">Expiration Date</Label>
                      <Input
                        id="expiresAt"
                        type="datetime-local"
                        value={expiresAt}
                        onChange={(e) => setExpiresAt(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="viewLimit">View Limit</Label>
                      <Input
                        id="viewLimit"
                        type="number"
                        value={viewLimit}
                        onChange={(e) => setViewLimit(e.target.value)}
                        placeholder="Unlimited"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Download Enabled</Label>
                      <p className="text-sm text-gray-500">Allow document downloads</p>
                    </div>
                    <CustomSwitch
                      checked={downloadEnabled}
                      onCheckedChange={setDownloadEnabled}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Watermark</Label>
                      <p className="text-sm text-gray-500">Add watermark to documents</p>
                    </div>
                    <CustomSwitch
                      checked={watermarkEnabled}
                      onCheckedChange={setWatermarkEnabled}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Screenshot Protection</Label>
                      <p className="text-sm text-gray-500">Prevent screenshots and printing</p>
                    </div>
                    <CustomSwitch
                      checked={screenshotProtection}
                      onCheckedChange={setScreenshotProtection}
                    />
                  </div>
                </div>

                <Button onClick={createShareLink} disabled={loading || !linkName.trim()}>
                  {loading ? 'Creating...' : 'Create Share Link'}
                </Button>
              </CardContent>
            </Card>

            {/* Existing Links */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Existing Share Links</CardTitle>
                <CardDescription>
                  Manage your existing share links
                </CardDescription>
              </CardHeader>
              <CardContent>
                {shareLinks.length === 0 ? (
                  <div className="text-center py-8">
                    <LinkIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <h4 className="font-medium mb-1">No share links yet</h4>
                    <p className="text-sm text-gray-600">
                      Create your first share link to get started
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {shareLinks.map((link) => (
                      <div key={link.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-medium">{link.name}</h4>
                              <div className="flex gap-1">
                                {link.password_protected && (
                                  <Badge variant="secondary">
                                    <Lock className="h-3 w-3 mr-1" />
                                    Password
                                  </Badge>
                                )}
                                {link.expires_at && (
                                  <Badge variant="secondary">
                                    <Clock className="h-3 w-3 mr-1" />
                                    Expires
                                  </Badge>
                                )}
                                {link.watermark_enabled && (
                                  <Badge variant="secondary">
                                    <Shield className="h-3 w-3 mr-1" />
                                    Watermark
                                  </Badge>
                                )}
                              </div>
                            </div>

                            <div className="text-sm text-gray-600 space-y-1">
                              <p>
                                <strong>URL:</strong> {window.location.origin}/v/{link.slug}
                              </p>
                              <p>
                                <strong>Views:</strong> {link.total_views}
                                {link.view_limit && ` / ${link.view_limit}`}
                              </p>
                              {link.expires_at && (
                                <p>
                                  <strong>Expires:</strong> {formatDate(link.expires_at)}
                                </p>
                              )}
                              <p>
                                <strong>Created:</strong> {formatDate(link.created_at)}
                              </p>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyLink(link.slug)}
                            >
                              <Copy className="h-4 w-4 mr-1" />
                              Copy
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteShareLink(link.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="email" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Send Email Invitations</CardTitle>
                <CardDescription>
                  Send direct email invitations to access this data room
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="emailRecipients">Recipients *</Label>
                  <Textarea
                    id="emailRecipients"
                    value={emailRecipients}
                    onChange={(e) => setEmailRecipients(e.target.value)}
                    placeholder="Enter email addresses separated by commas"
                    rows={3}
                  />
                  <p className="text-sm text-gray-500">
                    Separate multiple email addresses with commas
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emailSubject">Subject</Label>
                  <Input
                    id="emailSubject"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    placeholder="Email subject"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emailMessage">Message</Label>
                  <Textarea
                    id="emailMessage"
                    value={emailMessage}
                    onChange={(e) => setEmailMessage(e.target.value)}
                    placeholder="Custom message (optional)"
                    rows={5}
                  />
                </div>

                <Button
                  onClick={sendEmailInvitations}
                  disabled={loading || !emailRecipients.trim()}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  {loading ? 'Sending...' : 'Send Invitations'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Share Analytics</CardTitle>
                <CardDescription>
                  View analytics for all share links
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <LinkIcon className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold">{shareLinks.length}</p>
                    <p className="text-sm text-gray-600">Total Links</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <Eye className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold">
                      {shareLinks.reduce((sum, link) => sum + link.total_views, 0)}
                    </p>
                    <p className="text-sm text-gray-600">Total Views</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <Shield className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold">
                      {shareLinks.filter(link => link.password_protected).length}
                    </p>
                    <p className="text-sm text-gray-600">Protected Links</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <Clock className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold">
                      {shareLinks.filter(link => link.expires_at && new Date(link.expires_at) > new Date()).length}
                    </p>
                    <p className="text-sm text-gray-600">Active Links</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
