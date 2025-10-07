'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { CustomSwitch } from '@/components/ui/custom-switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  ArrowLeft,
  Save,
  Trash2,
  Settings,
  Shield,
  Users,
  Palette,
  Globe,
  Lock,
  Eye,
  Download,
  Watermark,
  AlertTriangle
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface DataRoom {
  id: string
  name: string
  description: string
  is_active: boolean
  settings: {
    branding?: {
      logo_url?: string
      primary_color?: string
      custom_domain?: string
    }
    security?: {
      require_email?: boolean
      watermark_enabled?: boolean
      screenshot_protection?: boolean
      download_enabled?: boolean
      print_enabled?: boolean
    }
    access?: {
      allowed_domains?: string[]
      blocked_domains?: string[]
      geo_restrictions?: string[]
      ip_restrictions?: string[]
    }
    notifications?: {
      email_on_view?: boolean
      email_on_download?: boolean
      webhook_url?: string
    }
  }
  created_at: string
  updated_at: string
}

export default function DataRoomSettingsPage() {
  const params = useParams()
  const router = useRouter()
  const roomId = params.roomId as string

  const [dataRoom, setDataRoom] = useState<DataRoom | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('general')

  // Form states
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isActive, setIsActive] = useState(true)

  // Branding settings
  const [logoUrl, setLogoUrl] = useState('')
  const [primaryColor, setPrimaryColor] = useState('#3B82F6')
  const [customDomain, setCustomDomain] = useState('')

  // Security settings
  const [requireEmail, setRequireEmail] = useState(false)
  const [watermarkEnabled, setWatermarkEnabled] = useState(false)
  const [screenshotProtection, setScreenshotProtection] = useState(false)
  const [downloadEnabled, setDownloadEnabled] = useState(true)
  const [printEnabled, setPrintEnabled] = useState(true)

  // Access control
  const [allowedDomains, setAllowedDomains] = useState('')
  const [blockedDomains, setBlockedDomains] = useState('')
  const [geoRestrictions, setGeoRestrictions] = useState('')
  const [ipRestrictions, setIpRestrictions] = useState('')

  // Notifications
  const [emailOnView, setEmailOnView] = useState(false)
  const [emailOnDownload, setEmailOnDownload] = useState(false)
  const [webhookUrl, setWebhookUrl] = useState('')

  // Fetch data room details
  const fetchDataRoom = async () => {
    try {
      const response = await fetch(`/api/send/data-rooms/${roomId}`)
      if (response.ok) {
        const data = await response.json()
        const room = data.dataRoom
        setDataRoom(room)

        // Populate form fields
        setName(room.name)
        setDescription(room.description || '')
        setIsActive(room.is_active)

        // Branding
        setLogoUrl(room.settings?.branding?.logo_url || '')
        setPrimaryColor(room.settings?.branding?.primary_color || '#3B82F6')
        setCustomDomain(room.settings?.branding?.custom_domain || '')

        // Security
        setRequireEmail(room.settings?.security?.require_email || false)
        setWatermarkEnabled(room.settings?.security?.watermark_enabled || false)
        setScreenshotProtection(room.settings?.security?.screenshot_protection || false)
        setDownloadEnabled(room.settings?.security?.download_enabled ?? true)
        setPrintEnabled(room.settings?.security?.print_enabled ?? true)

        // Access control
        setAllowedDomains(room.settings?.access?.allowed_domains?.join(', ') || '')
        setBlockedDomains(room.settings?.access?.blocked_domains?.join(', ') || '')
        setGeoRestrictions(room.settings?.access?.geo_restrictions?.join(', ') || '')
        setIpRestrictions(room.settings?.access?.ip_restrictions?.join(', ') || '')

        // Notifications
        setEmailOnView(room.settings?.notifications?.email_on_view || false)
        setEmailOnDownload(room.settings?.notifications?.email_on_download || false)
        setWebhookUrl(room.settings?.notifications?.webhook_url || '')
      } else {
        setError('Data room not found')
      }
    } catch (error) {
      console.error('Failed to fetch data room:', error)
      setError('Failed to load data room')
    } finally {
      setLoading(false)
    }
  }

  // Save settings
  const saveSettings = async () => {
    setSaving(true)
    try {
      const response = await fetch(`/api/send/data-rooms/${roomId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          is_active: isActive,
          settings: {
            branding: {
              logo_url: logoUrl.trim() || null,
              primary_color: primaryColor,
              custom_domain: customDomain.trim() || null
            },
            security: {
              require_email: requireEmail,
              watermark_enabled: watermarkEnabled,
              screenshot_protection: screenshotProtection,
              download_enabled: downloadEnabled,
              print_enabled: printEnabled
            },
            access: {
              allowed_domains: allowedDomains.split(',').map(d => d.trim()).filter(Boolean),
              blocked_domains: blockedDomains.split(',').map(d => d.trim()).filter(Boolean),
              geo_restrictions: geoRestrictions.split(',').map(g => g.trim()).filter(Boolean),
              ip_restrictions: ipRestrictions.split(',').map(ip => ip.trim()).filter(Boolean)
            },
            notifications: {
              email_on_view: emailOnView,
              email_on_download: emailOnDownload,
              webhook_url: webhookUrl.trim() || null
            }
          }
        })
      })

      if (response.ok) {
        toast.success('Settings saved successfully')
        fetchDataRoom() // Refresh data
      } else {
        const data = await response.json()
        toast.error(data.error || 'Failed to save settings')
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  // Delete data room
  const deleteDataRoom = async () => {
    if (!confirm('Are you sure you want to delete this data room? This action cannot be undone.')) {
      return
    }

    setSaving(true)
    try {
      const response = await fetch(`/api/send/data-rooms/${roomId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Data room deleted successfully')
        router.push('/send/data-rooms')
      } else {
        const data = await response.json()
        toast.error(data.error || 'Failed to delete data room')
      }
    } catch (error) {
      console.error('Error deleting data room:', error)
      toast.error('Failed to delete data room')
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    if (roomId) {
      fetchDataRoom()
    }
  }, [roomId])

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error || !dataRoom) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <Settings className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">Data Room Not Found</h3>
          <p className="text-gray-600 mb-6">{error || 'The requested data room could not be found.'}</p>
          <Button asChild>
            <Link href="/send/data-rooms">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Data Rooms
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/send/data-rooms/${roomId}`}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Data Room
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Data Room Settings</h1>
            <p className="text-gray-600 mt-1">
              Configure settings for "{dataRoom.name}"
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={saveSettings} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="access">Access Control</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>
                Basic information about your data room
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Data Room Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Data room name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what this data room contains..."
                  rows={3}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Active Status</Label>
                  <p className="text-sm text-gray-500">
                    Inactive data rooms cannot be accessed by viewers
                  </p>
                </div>
                <CustomSwitch
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-red-600">Danger Zone</CardTitle>
              <CardDescription>
                Irreversible and destructive actions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg">
                <div>
                  <h4 className="font-medium text-red-600">Delete Data Room</h4>
                  <p className="text-sm text-gray-600">
                    Permanently delete this data room and all its contents
                  </p>
                </div>
                <Button
                  variant="destructive"
                  onClick={deleteDataRoom}
                  disabled={saving}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branding" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Branding & Appearance</CardTitle>
              <CardDescription>
                Customize the look and feel of your data room
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="logoUrl">Logo URL</Label>
                <Input
                  id="logoUrl"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://example.com/logo.png"
                />
                <p className="text-sm text-gray-500">
                  URL to your company logo (recommended: 200x50px)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="primaryColor">Primary Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="primaryColor"
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-20"
                  />
                  <Input
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    placeholder="#3B82F6"
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="customDomain">Custom Domain</Label>
                <Input
                  id="customDomain"
                  value={customDomain}
                  onChange={(e) => setCustomDomain(e.target.value)}
                  placeholder="docs.yourcompany.com"
                />
                <p className="text-sm text-gray-500">
                  Use your own domain for data room links (requires DNS setup)
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>
                Configure security and protection features
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Require Email Verification</Label>
                  <p className="text-sm text-gray-500">
                    Viewers must verify their email before accessing
                  </p>
                </div>
                <CustomSwitch
                  checked={requireEmail}
                  onCheckedChange={setRequireEmail}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Watermark Protection</Label>
                  <p className="text-sm text-gray-500">
                    Add watermarks to all documents
                  </p>
                </div>
                <CustomSwitch
                  checked={watermarkEnabled}
                  onCheckedChange={setWatermarkEnabled}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Screenshot Protection</Label>
                  <p className="text-sm text-gray-500">
                    Prevent screenshots and screen recording
                  </p>
                </div>
                <CustomSwitch
                  checked={screenshotProtection}
                  onCheckedChange={setScreenshotProtection}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Download Enabled</Label>
                  <p className="text-sm text-gray-500">
                    Allow viewers to download documents
                  </p>
                </div>
                <CustomSwitch
                  checked={downloadEnabled}
                  onCheckedChange={setDownloadEnabled}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Print Enabled</Label>
                  <p className="text-sm text-gray-500">
                    Allow viewers to print documents
                  </p>
                </div>
                <CustomSwitch
                  checked={printEnabled}
                  onCheckedChange={setPrintEnabled}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="access" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Access Control</CardTitle>
              <CardDescription>
                Control who can access your data room
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="allowedDomains">Allowed Domains</Label>
                <Input
                  id="allowedDomains"
                  value={allowedDomains}
                  onChange={(e) => setAllowedDomains(e.target.value)}
                  placeholder="company.com, partner.com"
                />
                <p className="text-sm text-gray-500">
                  Only allow access from these email domains (comma-separated)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="blockedDomains">Blocked Domains</Label>
                <Input
                  id="blockedDomains"
                  value={blockedDomains}
                  onChange={(e) => setBlockedDomains(e.target.value)}
                  placeholder="competitor.com, spam.com"
                />
                <p className="text-sm text-gray-500">
                  Block access from these email domains (comma-separated)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="geoRestrictions">Geographic Restrictions</Label>
                <Input
                  id="geoRestrictions"
                  value={geoRestrictions}
                  onChange={(e) => setGeoRestrictions(e.target.value)}
                  placeholder="US, CA, GB"
                />
                <p className="text-sm text-gray-500">
                  Only allow access from these countries (ISO codes, comma-separated)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ipRestrictions">IP Address Restrictions</Label>
                <Textarea
                  id="ipRestrictions"
                  value={ipRestrictions}
                  onChange={(e) => setIpRestrictions(e.target.value)}
                  placeholder="192.168.1.0/24, 10.0.0.1"
                  rows={3}
                />
                <p className="text-sm text-gray-500">
                  Only allow access from these IP addresses or ranges (comma-separated)
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>
                Configure when and how you receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Email on View</Label>
                  <p className="text-sm text-gray-500">
                    Get notified when someone views the data room
                  </p>
                </div>
                <CustomSwitch
                  checked={emailOnView}
                  onCheckedChange={setEmailOnView}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Email on Download</Label>
                  <p className="text-sm text-gray-500">
                    Get notified when someone downloads a document
                  </p>
                </div>
                <CustomSwitch
                  checked={emailOnDownload}
                  onCheckedChange={setEmailOnDownload}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="webhookUrl">Webhook URL</Label>
                <Input
                  id="webhookUrl"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://your-app.com/webhook"
                />
                <p className="text-sm text-gray-500">
                  Receive real-time notifications via webhook
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
