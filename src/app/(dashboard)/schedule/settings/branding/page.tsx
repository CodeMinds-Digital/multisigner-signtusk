'use client'

import { useState } from 'react'
import { Palette, Upload, Eye, Save, Image, Type, Monitor } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { CustomSwitch } from '@/components/ui/custom-switch'

export default function BrandingPage() {
  const [branding, setBranding] = useState({
    companyName: 'TuskHub',
    logo: '',
    primaryColor: '#3B82F6',
    secondaryColor: '#8B5CF6',
    accentColor: '#10B981',
    customDomain: '',
    showPoweredBy: true
  })

  const [pageSettings, setPageSettings] = useState({
    welcomeMessage: 'Welcome! Please select a time that works for you.',
    thankYouMessage: 'Thank you for booking! You will receive a confirmation email shortly.',
    customCSS: '',
    favicon: ''
  })

  const [emailBranding, setEmailBranding] = useState({
    headerColor: '#3B82F6',
    footerText: 'Powered by TuskHub',
    customFooter: false,
    footerMessage: ''
  })

  const handleSave = () => {
    console.log('Saving branding settings:', { branding, pageSettings, emailBranding })
  }

  const colorPresets = [
    { name: 'Blue', primary: '#3B82F6', secondary: '#8B5CF6' },
    { name: 'Green', primary: '#10B981', secondary: '#059669' },
    { name: 'Purple', primary: '#8B5CF6', secondary: '#7C3AED' },
    { name: 'Red', primary: '#EF4444', secondary: '#DC2626' },
    { name: 'Orange', primary: '#F59E0B', secondary: '#D97706' },
    { name: 'Pink', primary: '#EC4899', secondary: '#DB2777' }
  ]

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Branding Settings</h1>
          <p className="text-gray-600 mt-1">Customize your meeting booking pages and email templates</p>
        </div>
        <Button onClick={handleSave}>
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general">
            <Palette className="w-4 h-4 mr-2" />
            General
          </TabsTrigger>
          <TabsTrigger value="pages">
            <Monitor className="w-4 h-4 mr-2" />
            Booking Pages
          </TabsTrigger>
          <TabsTrigger value="emails">
            <Type className="w-4 h-4 mr-2" />
            Email Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          {/* Company Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="w-5 h-5" />
                Company Information
              </CardTitle>
              <CardDescription>Basic company details and branding</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="company-name">Company Name</Label>
                <Input
                  id="company-name"
                  value={branding.companyName}
                  onChange={(e) => setBranding(prev => ({ ...prev, companyName: e.target.value }))}
                  placeholder="Your Company Name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="logo">Company Logo</Label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                    {branding.logo ? (
                      <img src={branding.logo} alt="Logo" className="w-full h-full object-contain" />
                    ) : (
                      <Image className="w-6 h-6 text-gray-400" />
                    )}
                  </div>
                  <Button variant="outline">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Logo
                  </Button>
                </div>
                <p className="text-sm text-gray-600">Recommended size: 200x200px, PNG or SVG format</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="custom-domain">Custom Domain (Optional)</Label>
                <Input
                  id="custom-domain"
                  value={branding.customDomain}
                  onChange={(e) => setBranding(prev => ({ ...prev, customDomain: e.target.value }))}
                  placeholder="meetings.yourcompany.com"
                />
                <p className="text-sm text-gray-600">Use your own domain for booking pages</p>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">Show "Powered by TuskHub"</Label>
                  <p className="text-sm text-gray-600">Display TuskHub branding on booking pages</p>
                </div>
                <CustomSwitch
                  checked={branding.showPoweredBy}
                  onCheckedChange={(checked) => setBranding(prev => ({ ...prev, showPoweredBy: checked }))}
                />
              </div>
            </CardContent>
          </Card>

          {/* Color Scheme */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Color Scheme
              </CardTitle>
              <CardDescription>Customize your brand colors</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {colorPresets.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => setBranding(prev => ({ 
                      ...prev, 
                      primaryColor: preset.primary, 
                      secondaryColor: preset.secondary 
                    }))}
                    className="p-3 border rounded-lg hover:shadow-md transition-shadow"
                  >
                    <div className="flex gap-2 mb-2">
                      <div 
                        className="w-6 h-6 rounded" 
                        style={{ backgroundColor: preset.primary }}
                      />
                      <div 
                        className="w-6 h-6 rounded" 
                        style={{ backgroundColor: preset.secondary }}
                      />
                    </div>
                    <div className="text-sm font-medium">{preset.name}</div>
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primary-color">Primary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="primary-color"
                      type="color"
                      value={branding.primaryColor}
                      onChange={(e) => setBranding(prev => ({ ...prev, primaryColor: e.target.value }))}
                      className="w-16 h-10 p-1"
                    />
                    <Input
                      value={branding.primaryColor}
                      onChange={(e) => setBranding(prev => ({ ...prev, primaryColor: e.target.value }))}
                      placeholder="#3B82F6"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="secondary-color">Secondary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="secondary-color"
                      type="color"
                      value={branding.secondaryColor}
                      onChange={(e) => setBranding(prev => ({ ...prev, secondaryColor: e.target.value }))}
                      className="w-16 h-10 p-1"
                    />
                    <Input
                      value={branding.secondaryColor}
                      onChange={(e) => setBranding(prev => ({ ...prev, secondaryColor: e.target.value }))}
                      placeholder="#8B5CF6"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accent-color">Accent Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="accent-color"
                      type="color"
                      value={branding.accentColor}
                      onChange={(e) => setBranding(prev => ({ ...prev, accentColor: e.target.value }))}
                      className="w-16 h-10 p-1"
                    />
                    <Input
                      value={branding.accentColor}
                      onChange={(e) => setBranding(prev => ({ ...prev, accentColor: e.target.value }))}
                      placeholder="#10B981"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pages" className="space-y-6">
          {/* Booking Page Customization */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="w-5 h-5" />
                Booking Page Content
              </CardTitle>
              <CardDescription>Customize the content on your booking pages</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="welcome-message">Welcome Message</Label>
                <Textarea
                  id="welcome-message"
                  value={pageSettings.welcomeMessage}
                  onChange={(e) => setPageSettings(prev => ({ ...prev, welcomeMessage: e.target.value }))}
                  placeholder="Welcome! Please select a time that works for you."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="thank-you-message">Thank You Message</Label>
                <Textarea
                  id="thank-you-message"
                  value={pageSettings.thankYouMessage}
                  onChange={(e) => setPageSettings(prev => ({ ...prev, thankYouMessage: e.target.value }))}
                  placeholder="Thank you for booking! You will receive a confirmation email shortly."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="custom-css">Custom CSS (Advanced)</Label>
                <Textarea
                  id="custom-css"
                  value={pageSettings.customCSS}
                  onChange={(e) => setPageSettings(prev => ({ ...prev, customCSS: e.target.value }))}
                  placeholder="/* Add your custom CSS here */"
                  rows={5}
                  className="font-mono text-sm"
                />
                <p className="text-sm text-gray-600">Add custom CSS to further customize your booking pages</p>
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Preview
              </CardTitle>
              <CardDescription>See how your booking page will look</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline">
                <Eye className="w-4 h-4 mr-2" />
                Preview Booking Page
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="emails" className="space-y-6">
          {/* Email Template Branding */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Type className="w-5 h-5" />
                Email Template Branding
              </CardTitle>
              <CardDescription>Customize the appearance of your email notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="header-color">Email Header Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="header-color"
                    type="color"
                    value={emailBranding.headerColor}
                    onChange={(e) => setEmailBranding(prev => ({ ...prev, headerColor: e.target.value }))}
                    className="w-16 h-10 p-1"
                  />
                  <Input
                    value={emailBranding.headerColor}
                    onChange={(e) => setEmailBranding(prev => ({ ...prev, headerColor: e.target.value }))}
                    placeholder="#3B82F6"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">Custom Footer</Label>
                  <p className="text-sm text-gray-600">Use custom footer instead of default</p>
                </div>
                <CustomSwitch
                  checked={emailBranding.customFooter}
                  onCheckedChange={(checked) => setEmailBranding(prev => ({ ...prev, customFooter: checked }))}
                />
              </div>

              {emailBranding.customFooter ? (
                <div className="space-y-2">
                  <Label htmlFor="footer-message">Custom Footer Message</Label>
                  <Textarea
                    id="footer-message"
                    value={emailBranding.footerMessage}
                    onChange={(e) => setEmailBranding(prev => ({ ...prev, footerMessage: e.target.value }))}
                    placeholder="Your custom footer message..."
                    rows={3}
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="footer-text">Footer Text</Label>
                  <Input
                    id="footer-text"
                    value={emailBranding.footerText}
                    onChange={(e) => setEmailBranding(prev => ({ ...prev, footerText: e.target.value }))}
                    placeholder="Powered by TuskHub"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
