'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CustomSwitch } from '@/components/ui/custom-switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { 
  Shield, 
  Lock, 
  Eye, 
  Globe, 
  Clock, 
  Users, 
  Save, 
  AlertTriangle,
  CheckCircle2,
  XCircle
} from 'lucide-react'
import { toast } from 'sonner'

interface SecuritySettings {
  // Default Security
  default_password_protection: boolean
  default_email_verification: boolean
  default_nda_required: boolean
  default_watermark_enabled: boolean
  default_screenshot_protection: boolean
  default_download_enabled: boolean
  default_print_enabled: boolean
  
  // Access Controls
  ip_whitelist_enabled: boolean
  ip_whitelist: string[]
  geo_restrictions_enabled: boolean
  allowed_countries: string[]
  blocked_countries: string[]
  
  // Session Management
  session_timeout_minutes: number
  max_concurrent_sessions: number
  force_logout_on_suspicious_activity: boolean
  
  // Audit & Compliance
  audit_log_retention_days: number
  compliance_mode: 'standard' | 'strict' | 'enterprise'
  data_retention_days: number
}

const COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'JP', name: 'Japan' },
  { code: 'AU', name: 'Australia' },
  { code: 'IN', name: 'India' },
  { code: 'SG', name: 'Singapore' },
  { code: 'NL', name: 'Netherlands' }
]

export default function SecurityPage() {
  const [settings, setSettings] = useState<SecuritySettings>({
    default_password_protection: false,
    default_email_verification: true,
    default_nda_required: false,
    default_watermark_enabled: true,
    default_screenshot_protection: false,
    default_download_enabled: true,
    default_print_enabled: false,
    ip_whitelist_enabled: false,
    ip_whitelist: [],
    geo_restrictions_enabled: false,
    allowed_countries: [],
    blocked_countries: [],
    session_timeout_minutes: 60,
    max_concurrent_sessions: 5,
    force_logout_on_suspicious_activity: true,
    audit_log_retention_days: 90,
    compliance_mode: 'standard',
    data_retention_days: 365
  })
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [newIpAddress, setNewIpAddress] = useState('')

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/send/settings/security')
      if (response.ok) {
        const data = await response.json()
        setSettings(prev => ({ ...prev, ...data.settings }))
      }
    } catch (error) {
      console.error('Failed to load security settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/send/settings/security', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })

      if (response.ok) {
        toast.success('Security settings saved successfully')
      } else {
        throw new Error('Failed to save settings')
      }
    } catch (error) {
      toast.error('Failed to save security settings')
    } finally {
      setSaving(false)
    }
  }

  const updateSetting = (key: keyof SecuritySettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const addIpAddress = () => {
    if (newIpAddress && !settings.ip_whitelist.includes(newIpAddress)) {
      updateSetting('ip_whitelist', [...settings.ip_whitelist, newIpAddress])
      setNewIpAddress('')
    }
  }

  const removeIpAddress = (ip: string) => {
    updateSetting('ip_whitelist', settings.ip_whitelist.filter(addr => addr !== ip))
  }

  const getComplianceBadge = (mode: string) => {
    switch (mode) {
      case 'standard':
        return <Badge variant="secondary">Standard</Badge>
      case 'strict':
        return <Badge variant="destructive">Strict</Badge>
      case 'enterprise':
        return <Badge variant="default">Enterprise</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <Breadcrumb
        items={[
          { label: 'Settings', href: '/send/settings' },
          { label: 'Security' }
        ]}
      />

      <div>
        <h1 className="text-3xl font-bold text-gray-900">Security Settings</h1>
        <p className="text-gray-600 mt-1">
          Configure security policies and access controls for your documents
        </p>
      </div>

      <Tabs defaultValue="defaults" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="defaults" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Defaults
          </TabsTrigger>
          <TabsTrigger value="access" className="flex items-center gap-2">
            <Lock className="w-4 h-4" />
            Access Control
          </TabsTrigger>
          <TabsTrigger value="sessions" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Sessions
          </TabsTrigger>
          <TabsTrigger value="compliance" className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Compliance
          </TabsTrigger>
        </TabsList>

        {/* Default Security Settings */}
        <TabsContent value="defaults" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Default Security Settings
              </CardTitle>
              <CardDescription>
                These settings will be applied to all new documents by default
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-medium">Password Protection</Label>
                      <p className="text-sm text-gray-500">Require password for document access</p>
                    </div>
                    <CustomSwitch
                      checked={settings.default_password_protection}
                      onCheckedChange={(checked) => updateSetting('default_password_protection', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-medium">Email Verification</Label>
                      <p className="text-sm text-gray-500">Require email verification before access</p>
                    </div>
                    <CustomSwitch
                      checked={settings.default_email_verification}
                      onCheckedChange={(checked) => updateSetting('default_email_verification', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-medium">NDA Required</Label>
                      <p className="text-sm text-gray-500">Require NDA acceptance before viewing</p>
                    </div>
                    <CustomSwitch
                      checked={settings.default_nda_required}
                      onCheckedChange={(checked) => updateSetting('default_nda_required', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-medium">Watermark</Label>
                      <p className="text-sm text-gray-500">Add watermark to documents</p>
                    </div>
                    <CustomSwitch
                      checked={settings.default_watermark_enabled}
                      onCheckedChange={(checked) => updateSetting('default_watermark_enabled', checked)}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-medium">Screenshot Protection</Label>
                      <p className="text-sm text-gray-500">Prevent screenshots and screen recording</p>
                    </div>
                    <CustomSwitch
                      checked={settings.default_screenshot_protection}
                      onCheckedChange={(checked) => updateSetting('default_screenshot_protection', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-medium">Download Enabled</Label>
                      <p className="text-sm text-gray-500">Allow document downloads</p>
                    </div>
                    <CustomSwitch
                      checked={settings.default_download_enabled}
                      onCheckedChange={(checked) => updateSetting('default_download_enabled', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-medium">Print Enabled</Label>
                      <p className="text-sm text-gray-500">Allow document printing</p>
                    </div>
                    <CustomSwitch
                      checked={settings.default_print_enabled}
                      onCheckedChange={(checked) => updateSetting('default_print_enabled', checked)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Access Control */}
        <TabsContent value="access" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5" />
                IP Whitelist
              </CardTitle>
              <CardDescription>
                Restrict access to specific IP addresses
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Enable IP Whitelist</Label>
                  <p className="text-sm text-gray-500">Only allow access from whitelisted IP addresses</p>
                </div>
                <CustomSwitch
                  checked={settings.ip_whitelist_enabled}
                  onCheckedChange={(checked) => updateSetting('ip_whitelist_enabled', checked)}
                />
              </div>

              {settings.ip_whitelist_enabled && (
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter IP address (e.g., 192.168.1.1)"
                      value={newIpAddress}
                      onChange={(e) => setNewIpAddress(e.target.value)}
                    />
                    <Button onClick={addIpAddress} variant="outline">
                      Add
                    </Button>
                  </div>

                  {settings.ip_whitelist.length > 0 && (
                    <div className="space-y-2">
                      <Label>Whitelisted IP Addresses</Label>
                      <div className="space-y-2">
                        {settings.ip_whitelist.map((ip, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <span className="font-mono text-sm">{ip}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeIpAddress(ip)}
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Geographic Restrictions
              </CardTitle>
              <CardDescription>
                Control access based on geographic location
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Enable Geographic Restrictions</Label>
                  <p className="text-sm text-gray-500">Restrict access based on country</p>
                </div>
                <CustomSwitch
                  checked={settings.geo_restrictions_enabled}
                  onCheckedChange={(checked) => updateSetting('geo_restrictions_enabled', checked)}
                />
              </div>

              {settings.geo_restrictions_enabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Allowed Countries</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select countries to allow" />
                      </SelectTrigger>
                      <SelectContent>
                        {COUNTRIES.map((country) => (
                          <SelectItem key={country.code} value={country.code}>
                            {country.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Blocked Countries</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select countries to block" />
                      </SelectTrigger>
                      <SelectContent>
                        {COUNTRIES.map((country) => (
                          <SelectItem key={country.code} value={country.code}>
                            {country.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={saveSettings} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </Tabs>
    </div>
  )
}
