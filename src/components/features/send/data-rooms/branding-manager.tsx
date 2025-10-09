'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { 
  Upload, 
  Image as ImageIcon, 
  Palette, 
  Globe, 
  Eye,
  Download,
  Trash2,
  Save,
  RefreshCw,
  Monitor,
  Smartphone,
  Tablet
} from 'lucide-react'
import { toast } from 'sonner'

interface BrandingSettings {
  id: string
  data_room_id: string
  logo_url: string | null
  banner_url: string | null
  favicon_url: string | null
  primary_color: string
  secondary_color: string
  background_color: string
  text_color: string
  custom_css: string | null
  social_title: string | null
  social_description: string | null
  social_image_url: string | null
  custom_domain: string | null
  show_branding: boolean
  created_at: string
  updated_at: string
}

interface BrandingManagerProps {
  dataRoomId: string
}

export function BrandingManager({ dataRoomId }: BrandingManagerProps) {
  const [settings, setSettings] = useState<BrandingSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [previewMode, setPreviewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')
  
  // Form states
  const [primaryColor, setPrimaryColor] = useState('#3B82F6')
  const [secondaryColor, setSecondaryColor] = useState('#1E40AF')
  const [backgroundColor, setBackgroundColor] = useState('#FFFFFF')
  const [textColor, setTextColor] = useState('#1F2937')
  const [customCss, setCustomCss] = useState('')
  const [socialTitle, setSocialTitle] = useState('')
  const [socialDescription, setSocialDescription] = useState('')
  const [customDomain, setCustomDomain] = useState('')
  const [showBranding, setShowBranding] = useState(true)
  
  // File upload refs
  const logoInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)
  const faviconInputRef = useRef<HTMLInputElement>(null)
  const socialImageInputRef = useRef<HTMLInputElement>(null)
  
  // File states
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [bannerFile, setBannerFile] = useState<File | null>(null)
  const [faviconFile, setFaviconFile] = useState<File | null>(null)
  const [socialImageFile, setSocialImageFile] = useState<File | null>(null)
  
  // Preview URLs
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [bannerPreview, setBannerPreview] = useState<string | null>(null)
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null)
  const [socialImagePreview, setSocialImagePreview] = useState<string | null>(null)

  useEffect(() => {
    fetchBrandingSettings()
  }, [dataRoomId])

  const fetchBrandingSettings = async () => {
    try {
      const response = await fetch(`/api/send/data-rooms/${dataRoomId}/branding`)
      const data = await response.json()
      
      if (data.success && data.branding) {
        const branding = data.branding
        setSettings(branding)
        
        // Populate form fields
        setPrimaryColor(branding.primary_color || '#3B82F6')
        setSecondaryColor(branding.secondary_color || '#1E40AF')
        setBackgroundColor(branding.background_color || '#FFFFFF')
        setTextColor(branding.text_color || '#1F2937')
        setCustomCss(branding.custom_css || '')
        setSocialTitle(branding.social_title || '')
        setSocialDescription(branding.social_description || '')
        setCustomDomain(branding.custom_domain || '')
        setShowBranding(branding.show_branding ?? true)
        
        // Set preview URLs
        setLogoPreview(branding.logo_url)
        setBannerPreview(branding.banner_url)
        setFaviconPreview(branding.favicon_url)
        setSocialImagePreview(branding.social_image_url)
      }
    } catch (error) {
      console.error('Error fetching branding settings:', error)
      toast.error('Failed to load branding settings')
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = (file: File, type: 'logo' | 'banner' | 'favicon' | 'social') => {
    if (!file) return

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a valid image file (JPEG, PNG, GIF, WebP)')
      return
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB')
      return
    }

    // Create preview URL
    const previewUrl = URL.createObjectURL(file)
    
    switch (type) {
      case 'logo':
        setLogoFile(file)
        setLogoPreview(previewUrl)
        break
      case 'banner':
        setBannerFile(file)
        setBannerPreview(previewUrl)
        break
      case 'favicon':
        setFaviconFile(file)
        setFaviconPreview(previewUrl)
        break
      case 'social':
        setSocialImageFile(file)
        setSocialImagePreview(previewUrl)
        break
    }
  }

  const uploadFile = async (file: File, type: string): Promise<string | null> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', type)
    formData.append('dataRoomId', dataRoomId)

    try {
      const response = await fetch('/api/send/data-rooms/branding/upload', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()
      if (data.success) {
        return data.url
      } else {
        throw new Error(data.error || 'Upload failed')
      }
    } catch (error) {
      console.error(`Error uploading ${type}:`, error)
      toast.error(`Failed to upload ${type}`)
      return null
    }
  }

  const saveBrandingSettings = async () => {
    setSaving(true)
    
    try {
      // Upload files if they exist
      let logoUrl = logoPreview
      let bannerUrl = bannerPreview
      let faviconUrl = faviconPreview
      let socialImageUrl = socialImagePreview

      if (logoFile) {
        logoUrl = await uploadFile(logoFile, 'logo')
      }
      if (bannerFile) {
        bannerUrl = await uploadFile(bannerFile, 'banner')
      }
      if (faviconFile) {
        faviconUrl = await uploadFile(faviconFile, 'favicon')
      }
      if (socialImageFile) {
        socialImageUrl = await uploadFile(socialImageFile, 'social')
      }

      // Save branding settings
      const response = await fetch(`/api/send/data-rooms/${dataRoomId}/branding`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logo_url: logoUrl,
          banner_url: bannerUrl,
          favicon_url: faviconUrl,
          primary_color: primaryColor,
          secondary_color: secondaryColor,
          background_color: backgroundColor,
          text_color: textColor,
          custom_css: customCss || null,
          social_title: socialTitle || null,
          social_description: socialDescription || null,
          social_image_url: socialImageUrl,
          custom_domain: customDomain || null,
          show_branding: showBranding
        })
      })

      const data = await response.json()
      
      if (data.success) {
        toast.success('Branding settings saved successfully!')
        fetchBrandingSettings()
        
        // Clear file states
        setLogoFile(null)
        setBannerFile(null)
        setFaviconFile(null)
        setSocialImageFile(null)
      } else {
        toast.error(data.error || 'Failed to save branding settings')
      }
    } catch (error) {
      console.error('Error saving branding settings:', error)
      toast.error('Failed to save branding settings')
    } finally {
      setSaving(false)
    }
  }

  const removeImage = (type: 'logo' | 'banner' | 'favicon' | 'social') => {
    switch (type) {
      case 'logo':
        setLogoFile(null)
        setLogoPreview(null)
        break
      case 'banner':
        setBannerFile(null)
        setBannerPreview(null)
        break
      case 'favicon':
        setFaviconFile(null)
        setFaviconPreview(null)
        break
      case 'social':
        setSocialImageFile(null)
        setSocialImagePreview(null)
        break
    }
  }

  const resetToDefaults = () => {
    setPrimaryColor('#3B82F6')
    setSecondaryColor('#1E40AF')
    setBackgroundColor('#FFFFFF')
    setTextColor('#1F2937')
    setCustomCss('')
    setSocialTitle('')
    setSocialDescription('')
    setCustomDomain('')
    setShowBranding(true)
    
    // Clear all images
    removeImage('logo')
    removeImage('banner')
    removeImage('favicon')
    removeImage('social')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading branding settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Data Room Branding</h2>
          <p className="text-gray-500">Customize the appearance and branding of your data room</p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={resetToDefaults}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Reset to Defaults
          </Button>
          <Button onClick={saveBrandingSettings} disabled={saving}>
            {saving ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Settings */}
        <div className="space-y-6">
          {/* Logo Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                Logo & Images
              </CardTitle>
              <CardDescription>
                Upload your brand assets for a professional appearance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Logo */}
              <div>
                <Label>Company Logo</Label>
                <div className="mt-2 flex items-center gap-4">
                  {logoPreview ? (
                    <div className="relative">
                      <img src={logoPreview} alt="Logo" className="w-16 h-16 object-contain border rounded" />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500 text-white hover:bg-red-600"
                        onClick={() => removeImage('logo')}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="w-16 h-16 border-2 border-dashed border-gray-300 rounded flex items-center justify-center">
                      <ImageIcon className="w-6 h-6 text-gray-400" />
                    </div>
                  )}
                  <div>
                    <Button
                      variant="outline"
                      onClick={() => logoInputRef.current?.click()}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Logo
                    </Button>
                    <p className="text-sm text-gray-500 mt-1">PNG, JPG up to 5MB</p>
                  </div>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'logo')}
                  />
                </div>
              </div>

              {/* Banner */}
              <div>
                <Label>Banner Image</Label>
                <div className="mt-2 flex items-center gap-4">
                  {bannerPreview ? (
                    <div className="relative">
                      <img src={bannerPreview} alt="Banner" className="w-24 h-12 object-cover border rounded" />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500 text-white hover:bg-red-600"
                        onClick={() => removeImage('banner')}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="w-24 h-12 border-2 border-dashed border-gray-300 rounded flex items-center justify-center">
                      <ImageIcon className="w-4 h-4 text-gray-400" />
                    </div>
                  )}
                  <div>
                    <Button
                      variant="outline"
                      onClick={() => bannerInputRef.current?.click()}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Banner
                    </Button>
                    <p className="text-sm text-gray-500 mt-1">Recommended: 1200x300px</p>
                  </div>
                  <input
                    ref={bannerInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'banner')}
                  />
                </div>
              </div>

              {/* Favicon */}
              <div>
                <Label>Favicon</Label>
                <div className="mt-2 flex items-center gap-4">
                  {faviconPreview ? (
                    <div className="relative">
                      <img src={faviconPreview} alt="Favicon" className="w-8 h-8 object-contain border rounded" />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500 text-white hover:bg-red-600"
                        onClick={() => removeImage('favicon')}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="w-8 h-8 border-2 border-dashed border-gray-300 rounded flex items-center justify-center">
                      <ImageIcon className="w-3 h-3 text-gray-400" />
                    </div>
                  )}
                  <div>
                    <Button
                      variant="outline"
                      onClick={() => faviconInputRef.current?.click()}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Favicon
                    </Button>
                    <p className="text-sm text-gray-500 mt-1">32x32px ICO or PNG</p>
                  </div>
                  <input
                    ref={faviconInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'favicon')}
                  />
                </div>
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
              <CardDescription>
                Customize the colors to match your brand
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="primaryColor">Primary Color</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="primaryColor"
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-12 h-10 p-1 border rounded"
                    />
                    <Input
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      placeholder="#3B82F6"
                      className="flex-1"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="secondaryColor">Secondary Color</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="secondaryColor"
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="w-12 h-10 p-1 border rounded"
                    />
                    <Input
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      placeholder="#1E40AF"
                      className="flex-1"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="backgroundColor">Background Color</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="backgroundColor"
                      type="color"
                      value={backgroundColor}
                      onChange={(e) => setBackgroundColor(e.target.value)}
                      className="w-12 h-10 p-1 border rounded"
                    />
                    <Input
                      value={backgroundColor}
                      onChange={(e) => setBackgroundColor(e.target.value)}
                      placeholder="#FFFFFF"
                      className="flex-1"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="textColor">Text Color</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="textColor"
                      type="color"
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                      className="w-12 h-10 p-1 border rounded"
                    />
                    <Input
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                      placeholder="#1F2937"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Preview & Advanced */}
        <div className="space-y-6">
          {/* Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Live Preview
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  variant={previewMode === 'desktop' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPreviewMode('desktop')}
                >
                  <Monitor className="w-4 h-4" />
                </Button>
                <Button
                  variant={previewMode === 'tablet' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPreviewMode('tablet')}
                >
                  <Tablet className="w-4 h-4" />
                </Button>
                <Button
                  variant={previewMode === 'mobile' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPreviewMode('mobile')}
                >
                  <Smartphone className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div 
                className={`border rounded-lg overflow-hidden ${
                  previewMode === 'mobile' ? 'max-w-sm mx-auto' : 
                  previewMode === 'tablet' ? 'max-w-md mx-auto' : 'w-full'
                }`}
                style={{ 
                  backgroundColor: backgroundColor,
                  color: textColor 
                }}
              >
                {/* Preview Header */}
                {bannerPreview && (
                  <div className="w-full h-20 bg-cover bg-center" style={{ backgroundImage: `url(${bannerPreview})` }} />
                )}
                
                <div className="p-4">
                  {/* Logo */}
                  {logoPreview && (
                    <div className="mb-4">
                      <img src={logoPreview} alt="Logo" className="h-12 object-contain" />
                    </div>
                  )}
                  
                  {/* Sample Content */}
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold" style={{ color: primaryColor }}>
                      Sample Data Room
                    </h3>
                    <p className="text-sm opacity-75">
                      This is how your data room will appear to visitors
                    </p>
                    <div className="flex gap-2">
                      <div 
                        className="px-3 py-1 rounded text-sm text-white"
                        style={{ backgroundColor: primaryColor }}
                      >
                        Primary Button
                      </div>
                      <div 
                        className="px-3 py-1 rounded text-sm text-white"
                        style={{ backgroundColor: secondaryColor }}
                      >
                        Secondary Button
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Social Media Cards */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Social Media Cards
              </CardTitle>
              <CardDescription>
                Customize how your data room appears when shared on social media
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="socialTitle">Social Title</Label>
                <Input
                  id="socialTitle"
                  value={socialTitle}
                  onChange={(e) => setSocialTitle(e.target.value)}
                  placeholder="Your Data Room Title"
                />
              </div>
              
              <div>
                <Label htmlFor="socialDescription">Social Description</Label>
                <Textarea
                  id="socialDescription"
                  value={socialDescription}
                  onChange={(e) => setSocialDescription(e.target.value)}
                  placeholder="A brief description of your data room"
                  rows={3}
                />
              </div>
              
              <div>
                <Label>Social Image</Label>
                <div className="mt-2 flex items-center gap-4">
                  {socialImagePreview ? (
                    <div className="relative">
                      <img src={socialImagePreview} alt="Social" className="w-24 h-12 object-cover border rounded" />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500 text-white hover:bg-red-600"
                        onClick={() => removeImage('social')}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="w-24 h-12 border-2 border-dashed border-gray-300 rounded flex items-center justify-center">
                      <ImageIcon className="w-4 h-4 text-gray-400" />
                    </div>
                  )}
                  <div>
                    <Button
                      variant="outline"
                      onClick={() => socialImageInputRef.current?.click()}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Image
                    </Button>
                    <p className="text-sm text-gray-500 mt-1">1200x630px recommended</p>
                  </div>
                  <input
                    ref={socialImageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'social')}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Advanced Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Advanced Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="customDomain">Custom Domain</Label>
                <Input
                  id="customDomain"
                  value={customDomain}
                  onChange={(e) => setCustomDomain(e.target.value)}
                  placeholder="dataroom.yourcompany.com"
                />
              </div>
              
              <div>
                <Label htmlFor="customCss">Custom CSS</Label>
                <Textarea
                  id="customCss"
                  value={customCss}
                  onChange={(e) => setCustomCss(e.target.value)}
                  placeholder="/* Add your custom CSS here */"
                  rows={4}
                  className="font-mono text-sm"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch checked={showBranding} onCheckedChange={setShowBranding} />
                <Label>Show Custom Branding</Label>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
