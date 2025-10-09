'use client'

import { useState } from 'react'
import { X, Shield, Mail, Globe, Lock, Palette, Settings, Plus, Trash2, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CustomSwitch } from '@/components/ui/custom-switch'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

interface ShareSidebarProps {
  isOpen: boolean
  onClose: () => void
  settings: any
  onSettingsChange: (settings: any) => void
  documentTitle: string
}

export function ShareSidebar({
  isOpen,
  onClose,
  settings,
  onSettingsChange,
  documentTitle
}: ShareSidebarProps) {
  const [newEmail, setNewEmail] = useState('')
  const [newDomain, setNewDomain] = useState('')
  const [newCountry, setNewCountry] = useState('')
  const [newIP, setNewIP] = useState('')

  const updateSettings = (updates: any) => {
    onSettingsChange({ ...settings, ...updates })
  }

  const addEmail = (type: 'allowed' | 'blocked') => {
    if (!newEmail.trim()) return

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(newEmail)) return

    const key = type === 'allowed' ? 'allowedEmails' : 'blockedEmails'
    const currentEmails = settings[key] || []

    if (!currentEmails.includes(newEmail)) {
      updateSettings({
        [key]: [...currentEmails, newEmail]
      })
    }
    setNewEmail('')
  }

  const removeEmail = (email: string, type: 'allowed' | 'blocked') => {
    const key = type === 'allowed' ? 'allowedEmails' : 'blockedEmails'
    const currentEmails = settings[key] || []
    updateSettings({
      [key]: currentEmails.filter((e: string) => e !== email)
    })
  }

  const addDomain = (type: 'allowed' | 'blocked') => {
    if (!newDomain.trim()) return

    const key = type === 'allowed' ? 'allowedDomains' : 'blockedDomains'
    const currentDomains = settings[key] || []

    if (!currentDomains.includes(newDomain)) {
      updateSettings({
        [key]: [...currentDomains, newDomain]
      })
    }
    setNewDomain('')
  }

  const removeDomain = (domain: string, type: 'allowed' | 'blocked') => {
    const key = type === 'allowed' ? 'allowedDomains' : 'blockedDomains'
    const currentDomains = settings[key] || []
    updateSettings({
      [key]: currentDomains.filter((d: string) => d !== domain)
    })
  }

  const addCountry = (type: 'allowed' | 'blocked') => {
    if (!newCountry.trim()) return

    const key = type === 'allowed' ? 'allowedCountries' : 'blockedCountries'
    const currentCountries = settings[key] || []

    if (!currentCountries.includes(newCountry)) {
      updateSettings({
        [key]: [...currentCountries, newCountry]
      })
    }
    setNewCountry('')
  }

  const removeCountry = (country: string, type: 'allowed' | 'blocked') => {
    const key = type === 'allowed' ? 'allowedCountries' : 'blockedCountries'
    const currentCountries = settings[key] || []
    updateSettings({
      [key]: currentCountries.filter((c: string) => c !== country)
    })
  }

  const addIP = (type: 'allowed' | 'blocked') => {
    if (!newIP.trim()) return

    const key = type === 'allowed' ? 'allowedIPs' : 'blockedIPs'
    const currentIPs = settings[key] || []

    if (!currentIPs.includes(newIP)) {
      updateSettings({
        [key]: [...currentIPs, newIP]
      })
    }
    setNewIP('')
  }

  const removeIP = (ip: string, type: 'allowed' | 'blocked') => {
    const key = type === 'allowed' ? 'allowedIPs' : 'blockedIPs'
    const currentIPs = settings[key] || []
    updateSettings({
      [key]: currentIPs.filter((i: string) => i !== ip)
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black bg-opacity-50" onClick={onClose} />

      {/* Sidebar */}
      <div className="w-full sm:w-96 max-w-md bg-white shadow-xl overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold">Advanced Settings</h3>
              <p className="text-sm text-gray-500">Configure advanced sharing options</p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          <Tabs defaultValue="access" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
              <TabsTrigger value="access" className="text-xs">Access</TabsTrigger>
              <TabsTrigger value="security" className="text-xs">Security</TabsTrigger>
              <TabsTrigger value="branding" className="text-xs">Branding</TabsTrigger>
              <TabsTrigger value="other" className="text-xs">Other</TabsTrigger>
            </TabsList>

            {/* Access Control Tab */}
            <TabsContent value="access" className="space-y-4">
              {/* View Limit */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">View Limit</CardTitle>
                </CardHeader>
                <CardContent>
                  <Input
                    type="number"
                    placeholder="Unlimited"
                    value={settings.viewLimit}
                    onChange={(e) => updateSettings({ viewLimit: e.target.value })}
                  />
                  <p className="text-xs text-gray-500 mt-1">Maximum number of views allowed</p>
                </CardContent>
              </Card>

              {/* Email Restrictions */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email Restrictions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Allowed Emails */}
                  <div>
                    <Label className="text-xs">Allowed Emails</Label>
                    <div className="flex flex-col sm:flex-row gap-2 mt-1">
                      <Input
                        placeholder="user@example.com"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addEmail('allowed')}
                        className="flex-1"
                      />
                      <Button size="sm" onClick={() => addEmail('allowed')} className="sm:w-auto w-full">
                        <Plus className="w-3 h-3 mr-1" />
                        Add
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {(settings.allowedEmails || []).map((email: string) => (
                        <Badge key={email} variant="secondary" className="text-xs">
                          {email}
                          <button
                            onClick={() => removeEmail(email, 'allowed')}
                            className="ml-1 hover:text-red-600"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Blocked Emails */}
                  <div>
                    <Label className="text-xs">Blocked Emails</Label>
                    <div className="flex flex-col sm:flex-row gap-2 mt-1">
                      <Input
                        placeholder="blocked@example.com"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addEmail('blocked')}
                        className="flex-1"
                      />
                      <Button size="sm" variant="destructive" onClick={() => addEmail('blocked')} className="sm:w-auto w-full">
                        <Plus className="w-3 h-3 mr-1" />
                        Block
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {(settings.blockedEmails || []).map((email: string) => (
                        <Badge key={email} variant="destructive" className="text-xs">
                          {email}
                          <button
                            onClick={() => removeEmail(email, 'blocked')}
                            className="ml-1 hover:text-white"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Domain Restrictions */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    Domain Restrictions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Allowed Domains */}
                  <div>
                    <Label className="text-xs">Allowed Domains</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        placeholder="company.com"
                        value={newDomain}
                        onChange={(e) => setNewDomain(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addDomain('allowed')}
                      />
                      <Button size="sm" onClick={() => addDomain('allowed')}>
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {(settings.allowedDomains || []).map((domain: string) => (
                        <Badge key={domain} variant="secondary" className="text-xs">
                          {domain}
                          <button
                            onClick={() => removeDomain(domain, 'allowed')}
                            className="ml-1 hover:text-red-600"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Blocked Domains */}
                  <div>
                    <Label className="text-xs">Blocked Domains</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        placeholder="competitor.com"
                        value={newDomain}
                        onChange={(e) => setNewDomain(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addDomain('blocked')}
                      />
                      <Button size="sm" variant="destructive" onClick={() => addDomain('blocked')}>
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {(settings.blockedDomains || []).map((domain: string) => (
                        <Badge key={domain} variant="destructive" className="text-xs">
                          {domain}
                          <button
                            onClick={() => removeDomain(domain, 'blocked')}
                            className="ml-1 hover:text-white"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security" className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Security Features
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Allow printing</p>
                      <p className="text-xs text-gray-500">Let visitors print the document</p>
                    </div>
                    <CustomSwitch
                      checked={settings.allowPrinting}
                      onCheckedChange={(checked) => updateSettings({ allowPrinting: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Require NDA</p>
                      <p className="text-xs text-gray-500">Visitors must accept NDA first</p>
                    </div>
                    <CustomSwitch
                      checked={settings.requireNda}
                      onCheckedChange={(checked) => updateSettings({ requireNda: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Enable watermark</p>
                      <p className="text-xs text-gray-500">Add watermark to document</p>
                    </div>
                    <CustomSwitch
                      checked={settings.enableWatermark}
                      onCheckedChange={(checked) => updateSettings({ enableWatermark: checked })}
                    />
                  </div>

                  {settings.enableWatermark && (
                    <div>
                      <Label className="text-xs">Watermark Text</Label>
                      <Input
                        placeholder="Confidential"
                        value={settings.watermarkText}
                        onChange={(e) => updateSettings({ watermarkText: e.target.value })}
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Screenshot protection</p>
                      <p className="text-xs text-gray-500">Prevent screenshots</p>
                    </div>
                    <CustomSwitch
                      checked={settings.screenshotProtection}
                      onCheckedChange={(checked) => updateSettings({ screenshotProtection: checked })}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Branding Tab */}
            <TabsContent value="branding" className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Palette className="w-4 h-4" />
                    Branding & Customization
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-xs">Custom URL</Label>
                    <Input
                      placeholder="my-custom-link"
                      value={settings.customUrl}
                      onChange={(e) => updateSettings({ customUrl: e.target.value })}
                    />
                    <p className="text-xs text-gray-500 mt-1">Create a custom short URL</p>
                  </div>

                  <div>
                    <Label className="text-xs">Account/Company Name</Label>
                    <Input
                      placeholder="Your Company"
                      value={settings.accountName}
                      onChange={(e) => updateSettings({ accountName: e.target.value })}
                    />
                    <p className="text-xs text-gray-500 mt-1">Displayed to visitors</p>
                  </div>

                  <div>
                    <Label className="text-xs">Welcome Message</Label>
                    <Textarea
                      placeholder="Welcome! Please review this document..."
                      value={settings.welcomeMessage}
                      onChange={(e) => updateSettings({ welcomeMessage: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label className="text-xs">Custom Button Text</Label>
                    <Input
                      placeholder="View Document"
                      value={settings.customButtonText}
                      onChange={(e) => updateSettings({ customButtonText: e.target.value })}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Other Tab */}
            <TabsContent value="other" className="space-y-4">
              {/* Geographic Restrictions */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    Geographic Restrictions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Allowed Countries */}
                  <div>
                    <Label className="text-xs">Allowed Countries</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        placeholder="United States"
                        value={newCountry}
                        onChange={(e) => setNewCountry(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addCountry('allowed')}
                      />
                      <Button size="sm" onClick={() => addCountry('allowed')}>
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {(settings.allowedCountries || []).map((country: string) => (
                        <Badge key={country} variant="secondary" className="text-xs">
                          {country}
                          <button
                            onClick={() => removeCountry(country, 'allowed')}
                            className="ml-1 hover:text-red-600"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Blocked Countries */}
                  <div>
                    <Label className="text-xs">Blocked Countries</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        placeholder="Country name"
                        value={newCountry}
                        onChange={(e) => setNewCountry(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addCountry('blocked')}
                      />
                      <Button size="sm" variant="destructive" onClick={() => addCountry('blocked')}>
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {(settings.blockedCountries || []).map((country: string) => (
                        <Badge key={country} variant="destructive" className="text-xs">
                          {country}
                          <button
                            onClick={() => removeCountry(country, 'blocked')}
                            className="ml-1 hover:text-white"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* IP Restrictions */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">IP Address Restrictions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Allowed IPs */}
                  <div>
                    <Label className="text-xs">Allowed IP Addresses</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        placeholder="192.168.1.1"
                        value={newIP}
                        onChange={(e) => setNewIP(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addIP('allowed')}
                      />
                      <Button size="sm" onClick={() => addIP('allowed')}>
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {(settings.allowedIPs || []).map((ip: string) => (
                        <Badge key={ip} variant="secondary" className="text-xs">
                          {ip}
                          <button
                            onClick={() => removeIP(ip, 'allowed')}
                            className="ml-1 hover:text-red-600"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Blocked IPs */}
                  <div>
                    <Label className="text-xs">Blocked IP Addresses</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        placeholder="192.168.1.100"
                        value={newIP}
                        onChange={(e) => setNewIP(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addIP('blocked')}
                      />
                      <Button size="sm" variant="destructive" onClick={() => addIP('blocked')}>
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {(settings.blockedIPs || []).map((ip: string) => (
                        <Badge key={ip} variant="destructive" className="text-xs">
                          {ip}
                          <button
                            onClick={() => removeIP(ip, 'blocked')}
                            className="ml-1 hover:text-white"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <Separator className="my-6" />

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={onClose}>
              Apply Settings
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
