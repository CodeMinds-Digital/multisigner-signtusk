'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { CustomSwitch } from '@/components/ui/custom-switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Palette, Upload, Globe, Mail, Eye, Save } from 'lucide-react'
import { toast } from 'sonner'
import { Breadcrumb } from '@/components/ui/breadcrumb'

interface BrandingSettings {
  id?: string
  logo_url?: string
  logo_dark_url?: string
  favicon_url?: string
  primary_color: string
  secondary_color: string
  font_family: string
  custom_css?: string
  remove_branding: boolean
  powered_by_text?: string
  custom_footer?: string
}

interface CustomDomain {
  id?: string
  domain: string
  verified: boolean
  verification_token?: string
}

export default function BrandingPage() {
  const [settings, setSettings] = useState<BrandingSettings>({
    primary_color: '#10b981',
    secondary_color: '#059669',
    font_family: 'Inter',
    remove_branding: false
  })
  const [customDomain, setCustomDomain] = useState<CustomDomain | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [faviconFile, setFaviconFile] = useState<File | null>(null)
  const [newDomainInput, setNewDomainInput] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [dnsInstructions, setDnsInstructions] = useState<any>(null)
  const [verificationResult, setVerificationResult] = useState<any>(null)

  const supabase = createClientComponentClient()

  const fontOptions = [
    'Inter',
    'Roboto',
    'Open Sans',
    'Lato',
    'Montserrat',
    'Poppins',
    'Raleway',
    'Ubuntu'
  ]

  useEffect(() => {
    loadSettings()
    loadCustomDomain()
  }, [])

  async function loadSettings() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('send_branding_settings')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (data) {
        setSettings(data)
      }
    } catch (error) {
      console.error('Error loading settings:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadCustomDomain() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('send_custom_domains')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (data) {
        setCustomDomain(data)
      }
    } catch (error) {
      console.error('Error loading custom domain:', error)
    }
  }

  async function uploadFile(file: File, bucket: string, path: string): Promise<string | null> {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, file, { upsert: true })

      if (error) throw error

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(path)

      return publicUrl
    } catch (error) {
      console.error('Error uploading file:', error)
      return null
    }
  }

  async function handleLogoUpload() {
    if (!logoFile) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const path = `${user.id}/logo.png`
    const url = await uploadFile(logoFile, 'send-brand-assets', path)

    if (url) {
      setSettings({ ...settings, logo_url: url })
      toast.success('Logo uploaded successfully')
    } else {
      toast.error('Failed to upload logo')
    }
  }

  async function handleFaviconUpload() {
    if (!faviconFile) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const path = `${user.id}/favicon.ico`
    const url = await uploadFile(faviconFile, 'send-brand-assets', path)

    if (url) {
      setSettings({ ...settings, favicon_url: url })
      toast.success('Favicon uploaded successfully')
    } else {
      toast.error('Failed to upload favicon')
    }
  }

  async function saveSettings() {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('send_branding_settings')
        .upsert({
          user_id: user.id,
          ...settings
        })

      if (error) throw error

      toast.success('Branding settings saved')
    } catch (error: any) {
      toast.error(error.message || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  async function addCustomDomain(domain: string) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      const response = await fetch('/api/send/domains', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ domain })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add domain')
      }

      setCustomDomain(data.domain)
      setDnsInstructions(data.instructions)
      toast.success('Custom domain added. Please configure DNS records to verify ownership.')
    } catch (error: any) {
      toast.error(error.message || 'Failed to add custom domain')
    }
  }

  async function verifyDomain() {
    if (!customDomain) return

    try {
      setVerifying(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      const response = await fetch(`/api/send/domains/${customDomain.id}/verify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify domain')
      }

      setCustomDomain(data.domain)
      setVerificationResult(data.verification)

      if (data.verification.ownershipVerified && data.verification.dnsConfigured) {
        toast.success('Domain verified successfully!')
      } else if (data.verification.ownershipVerified) {
        toast.warning('Domain ownership verified, but DNS configuration is incomplete')
      } else {
        toast.error('Domain verification failed. Please check your DNS records.')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to verify domain')
    } finally {
      setVerifying(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <Breadcrumb
        items={[
          { label: 'Settings', href: '/send' },
          { label: 'Branding' }
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Branding</h1>
          <p className="text-muted-foreground">Customize logos, colors, and domain for your shared documents</p>
        </div>
        <Button onClick={saveSettings} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <Tabs defaultValue="visual" className="space-y-6">
        <TabsList>
          <TabsTrigger value="visual">
            <Palette className="h-4 w-4 mr-2" />
            Visual Identity
          </TabsTrigger>
          <TabsTrigger value="domain">
            <Globe className="h-4 w-4 mr-2" />
            Custom Domain
          </TabsTrigger>
          <TabsTrigger value="email">
            <Mail className="h-4 w-4 mr-2" />
            Email Templates
          </TabsTrigger>
          <TabsTrigger value="preview">
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </TabsTrigger>
        </TabsList>

        {/* Visual Identity Tab */}
        <TabsContent value="visual" className="space-y-6">
          {/* Logo Upload */}
          <Card>
            <CardHeader>
              <CardTitle>Logo & Favicon</CardTitle>
              <CardDescription>Upload your brand assets</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="logo">Logo</Label>
                  <div className="mt-2 space-y-2">
                    {settings.logo_url && (
                      <div className="p-4 border rounded-lg">
                        <img src={settings.logo_url} alt="Logo" className="h-12 object-contain" />
                      </div>
                    )}
                    <Input
                      id="logo"
                      type="file"
                      accept="image/png,image/svg+xml,image/jpeg"
                      onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                    />
                    <Button onClick={handleLogoUpload} disabled={!logoFile} size="sm">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Logo
                    </Button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="favicon">Favicon</Label>
                  <div className="mt-2 space-y-2">
                    {settings.favicon_url && (
                      <div className="p-4 border rounded-lg">
                        <img src={settings.favicon_url} alt="Favicon" className="h-8 object-contain" />
                      </div>
                    )}
                    <Input
                      id="favicon"
                      type="file"
                      accept="image/x-icon,image/png"
                      onChange={(e) => setFaviconFile(e.target.files?.[0] || null)}
                    />
                    <Button onClick={handleFaviconUpload} disabled={!faviconFile} size="sm">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Favicon
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Colors */}
          <Card>
            <CardHeader>
              <CardTitle>Brand Colors</CardTitle>
              <CardDescription>Choose your brand colors</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="primary-color">Primary Color</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      id="primary-color"
                      type="color"
                      value={settings.primary_color}
                      onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                      className="w-20 h-10"
                    />
                    <Input
                      value={settings.primary_color}
                      onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                      placeholder="#10b981"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="secondary-color">Secondary Color</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      id="secondary-color"
                      type="color"
                      value={settings.secondary_color}
                      onChange={(e) => setSettings({ ...settings, secondary_color: e.target.value })}
                      className="w-20 h-10"
                    />
                    <Input
                      value={settings.secondary_color}
                      onChange={(e) => setSettings({ ...settings, secondary_color: e.target.value })}
                      placeholder="#059669"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Typography */}
          <Card>
            <CardHeader>
              <CardTitle>Typography</CardTitle>
              <CardDescription>Select your brand font</CardDescription>
            </CardHeader>
            <CardContent>
              <div>
                <Label htmlFor="font-family">Font Family</Label>
                <Select
                  value={settings.font_family}
                  onValueChange={(value) => setSettings({ ...settings, font_family: value })}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fontOptions.map((font) => (
                      <SelectItem key={font} value={font}>
                        <span style={{ fontFamily: font }}>{font}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* White Label */}
          <Card>
            <CardHeader>
              <CardTitle>White Label</CardTitle>
              <CardDescription>Remove SendTusk branding</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="remove-branding">Remove SendTusk Branding</Label>
                  <p className="text-sm text-muted-foreground">
                    Hide "Powered by SendTusk" from shared documents
                  </p>
                </div>
                <CustomSwitch
                  checked={settings.remove_branding}
                  onCheckedChange={(checked) => setSettings({ ...settings, remove_branding: checked })}
                />
              </div>
              {settings.remove_branding && (
                <>
                  <div>
                    <Label htmlFor="powered-by">Custom Powered By Text</Label>
                    <Input
                      id="powered-by"
                      value={settings.powered_by_text || ''}
                      onChange={(e) => setSettings({ ...settings, powered_by_text: e.target.value })}
                      placeholder="Powered by Acme Corp"
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="custom-footer">Custom Footer Text</Label>
                    <Input
                      id="custom-footer"
                      value={settings.custom_footer || ''}
                      onChange={(e) => setSettings({ ...settings, custom_footer: e.target.value })}
                      placeholder="© 2025 Acme Corp. All rights reserved."
                      className="mt-2"
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Custom CSS */}
          <Card>
            <CardHeader>
              <CardTitle>Custom CSS</CardTitle>
              <CardDescription>Add custom styles (advanced)</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={settings.custom_css || ''}
                onChange={(e) => setSettings({ ...settings, custom_css: e.target.value })}
                placeholder=".viewer { border-radius: 16px; }"
                rows={6}
                className="font-mono text-sm"
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Custom Domain Tab */}
        <TabsContent value="domain" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Custom Domain</CardTitle>
              <CardDescription>Use your own domain for shared documents</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!customDomain ? (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="domain">Domain Name</Label>
                    <div className="flex gap-2 mt-2">
                      <Input
                        id="domain"
                        value={newDomainInput}
                        onChange={(e) => setNewDomainInput(e.target.value)}
                        placeholder="docs.yourdomain.com"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newDomainInput.trim()) {
                            addCustomDomain(newDomainInput.trim())
                          }
                        }}
                      />
                      <Button
                        onClick={() => addCustomDomain(newDomainInput.trim())}
                        disabled={!newDomainInput.trim()}
                      >
                        Add Domain
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="font-medium">{customDomain.domain}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {customDomain.verified ? (
                            <span className="text-sm text-green-600 flex items-center gap-1">
                              ✓ Verified and Active
                            </span>
                          ) : (
                            <span className="text-sm text-orange-600 flex items-center gap-1">
                              ⚠️ Pending Verification
                            </span>
                          )}
                          {verificationResult && (
                            <div className="text-xs text-gray-500">
                              {verificationResult.ownershipVerified ? '✓ Ownership' : '✗ Ownership'} |
                              {verificationResult.dnsConfigured ? '✓ DNS' : '✗ DNS'}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={verifyDomain}
                          disabled={verifying}
                          variant="outline"
                          size="sm"
                        >
                          {verifying ? 'Verifying...' : 'Check Status'}
                        </Button>
                        <Button
                          onClick={() => {
                            setCustomDomain(null)
                            setDnsInstructions(null)
                            setVerificationResult(null)
                          }}
                          variant="destructive"
                          size="sm"
                        >
                          Remove
                        </Button>
                      </div>
                    </div>

                    {dnsInstructions && !customDomain.verified && (
                      <div className="space-y-4 text-sm">
                        <div>
                          <p className="font-medium mb-2">Step 1: Verify Domain Ownership</p>
                          <div className="p-3 bg-blue-50 border border-blue-200 rounded font-mono text-xs">
                            <p><strong>Type:</strong> {dnsInstructions.ownership.type}</p>
                            <p><strong>Name:</strong> {dnsInstructions.ownership.name}</p>
                            <p><strong>Value:</strong> {dnsInstructions.ownership.value}</p>
                          </div>
                          <p className="text-xs text-gray-600 mt-1">{dnsInstructions.ownership.description}</p>
                        </div>

                        <div>
                          <p className="font-medium mb-2">Step 2: Configure Domain Routing (Choose One)</p>
                          {dnsInstructions.routing.map((record: any, index: number) => (
                            <div key={index} className="p-3 bg-gray-50 border rounded font-mono text-xs mb-2">
                              <p><strong>Type:</strong> {record.type}</p>
                              <p><strong>Name:</strong> {record.name}</p>
                              <p><strong>Value:</strong> {record.value}</p>
                              <p className="text-gray-600 mt-1 font-sans">{record.description}</p>
                            </div>
                          ))}
                        </div>

                        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-xs">
                          <p className="font-medium text-yellow-800">⚠️ Important Notes:</p>
                          <ul className="list-disc list-inside mt-1 text-yellow-700 space-y-1">
                            <li>DNS changes can take up to 24 hours to propagate</li>
                            <li>Both ownership verification and routing must be configured</li>
                            <li>Use the "Check Status" button to verify your configuration</li>
                          </ul>
                        </div>
                      </div>
                    )}

                    {verificationResult && (
                      <div className="mt-4 p-3 border rounded text-sm">
                        <p className="font-medium mb-2">Verification Status:</p>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {verificationResult.ownershipVerified ? '✅' : '❌'}
                            <span>Domain Ownership: {verificationResult.ownershipVerified ? 'Verified' : 'Not Verified'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {verificationResult.dnsConfigured ? '✅' : '❌'}
                            <span>DNS Configuration: {verificationResult.dnsConfigured ? 'Configured' : 'Not Configured'}</span>
                          </div>
                        </div>
                        {verificationResult.details && (
                          <details className="mt-2">
                            <summary className="cursor-pointer text-xs text-gray-600">View Technical Details</summary>
                            <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                              {JSON.stringify(verificationResult.details, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Templates Tab */}
        <TabsContent value="email" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Email Templates</CardTitle>
              <CardDescription>Customize email notifications (Coming Soon)</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Email template customization will be available soon. You'll be able to customize:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm text-muted-foreground">
                <li>Document viewed notifications</li>
                <li>NDA acceptance emails</li>
                <li>Link expiration warnings</li>
                <li>Weekly digest emails</li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preview Tab */}
        <TabsContent value="preview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
              <CardDescription>See how your branding will look</CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className="p-8 border rounded-lg"
                style={{
                  backgroundColor: '#ffffff',
                  fontFamily: settings.font_family
                }}
              >
                {settings.logo_url && (
                  <img src={settings.logo_url} alt="Logo" className="h-12 mb-6" />
                )}
                <h2
                  className="text-2xl font-bold mb-4"
                  style={{ color: settings.primary_color }}
                >
                  Sample Document Title
                </h2>
                <p className="text-muted-foreground mb-4">
                  This is how your shared documents will appear with your custom branding.
                </p>
                <Button style={{ backgroundColor: settings.primary_color }}>
                  View Document
                </Button>
                {!settings.remove_branding ? (
                  <p className="text-xs text-muted-foreground mt-8">
                    Powered by SendTusk
                  </p>
                ) : settings.powered_by_text ? (
                  <p className="text-xs text-muted-foreground mt-8">
                    {settings.powered_by_text}
                  </p>
                ) : null}
                {settings.custom_footer && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {settings.custom_footer}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

