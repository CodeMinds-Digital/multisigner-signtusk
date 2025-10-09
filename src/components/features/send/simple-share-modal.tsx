'use client'

import { useState } from 'react'
import { Link as LinkIcon, Copy, Check, Settings, Calendar, Lock, Mail, X, Shield, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CustomSwitch } from '@/components/ui/custom-switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { ShareSidebar } from './share-sidebar'

interface SimpleShareModalProps {
  documentId: string
  documentTitle: string
  isOpen: boolean
  onClose: () => void
  onLinkCreated?: (link: any) => void
}

export function SimpleShareModal({
  documentId,
  documentTitle,
  isOpen,
  onClose,
  onLinkCreated
}: SimpleShareModalProps) {
  const [loading, setLoading] = useState(false)
  const [createdLink, setCreatedLink] = useState<any | null>(null)
  const [copied, setCopied] = useState(false)
  const [showSidebar, setShowSidebar] = useState(false)
  
  // Basic settings
  const [linkName, setLinkName] = useState(`${documentTitle} - Share Link`)
  const [password, setPassword] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [requireEmail, setRequireEmail] = useState(false)
  const [allowDownload, setAllowDownload] = useState(true)
  const [enableNotifications, setEnableNotifications] = useState(true)
  
  // Advanced settings (managed by sidebar)
  const [advancedSettings, setAdvancedSettings] = useState({
    viewLimit: '',
    allowPrinting: true,
    allowedEmails: [] as string[],
    blockedEmails: [] as string[],
    allowedDomains: [] as string[],
    blockedDomains: [] as string[],
    allowedCountries: [] as string[],
    blockedCountries: [] as string[],
    allowedIPs: [] as string[],
    blockedIPs: [] as string[],
    requireNda: false,
    enableWatermark: false,
    watermarkText: '',
    screenshotProtection: false,
    customUrl: '',
    accountName: '',
    welcomeMessage: '',
    customButtonText: 'View Document'
  })

  const handleCreateLink = async () => {
    setLoading(true)
    
    try {
      const response = await fetch('/api/send/links/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          documentId,
          name: linkName,
          password: password || undefined,
          expiresAt: expiresAt || undefined,
          requireEmail,
          allowDownload,
          enableNotifications,
          ...advancedSettings,
          viewLimit: advancedSettings.viewLimit ? parseInt(advancedSettings.viewLimit) : undefined
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create link')
      }

      setCreatedLink(data.link)
      toast.success('Share link created successfully!')
      
      if (onLinkCreated) {
        onLinkCreated(data.link)
      }
    } catch (error) {
      console.error('Error creating link:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create link')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async () => {
    if (!createdLink?.url) return
    
    try {
      await navigator.clipboard.writeText(createdLink.url)
      setCopied(true)
      toast.success('Link copied to clipboard!')
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast.error('Failed to copy link')
    }
  }

  const handleClose = () => {
    setCreatedLink(null)
    setCopied(false)
    setShowSidebar(false)
    onClose()
  }

  const hasAdvancedSettings = () => {
    return advancedSettings.viewLimit || 
           !advancedSettings.allowPrinting ||
           advancedSettings.allowedEmails.length > 0 ||
           advancedSettings.blockedEmails.length > 0 ||
           advancedSettings.allowedDomains.length > 0 ||
           advancedSettings.blockedDomains.length > 0 ||
           advancedSettings.allowedCountries.length > 0 ||
           advancedSettings.blockedCountries.length > 0 ||
           advancedSettings.allowedIPs.length > 0 ||
           advancedSettings.blockedIPs.length > 0 ||
           advancedSettings.requireNda ||
           advancedSettings.enableWatermark ||
           advancedSettings.screenshotProtection ||
           advancedSettings.customUrl ||
           advancedSettings.accountName ||
           advancedSettings.welcomeMessage ||
           advancedSettings.customButtonText !== 'View Document'
  }

  if (createdLink) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="w-5 h-5 text-green-600" />
              Link Created Successfully
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-green-800 mb-2">Your share link is ready!</p>
              <div className="flex items-center gap-2">
                <Input
                  value={createdLink.url}
                  readOnly
                  className="text-sm"
                />
                <Button
                  size="sm"
                  onClick={copyToClipboard}
                  className={copied ? 'bg-green-600' : ''}
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
              <Button onClick={() => window.open(`/send/analytics/${documentId}`, '_blank')}>
                View Analytics
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LinkIcon className="w-5 h-5" />
              Share "{documentTitle}"
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Link Name */}
            <div className="space-y-2">
              <Label htmlFor="linkName">Link Name</Label>
              <Input
                id="linkName"
                value={linkName}
                onChange={(e) => setLinkName(e.target.value)}
                placeholder="Enter a name for this link"
              />
            </div>

            {/* Basic Security */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Basic Security</CardTitle>
                <CardDescription>Essential protection settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">Password (optional)</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter password"
                      />
                      <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="expires">Expires (optional)</Label>
                    <div className="relative">
                      <Input
                        id="expires"
                        type="datetime-local"
                        value={expiresAt}
                        onChange={(e) => setExpiresAt(e.target.value)}
                      />
                      <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Require email to view</p>
                    <p className="text-sm text-gray-500">Visitors must enter email before viewing</p>
                  </div>
                  <CustomSwitch
                    checked={requireEmail}
                    onCheckedChange={setRequireEmail}
                  />
                </div>

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
              </CardContent>
            </Card>

            {/* Advanced Settings Button */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium">Advanced Settings</p>
                <p className="text-sm text-gray-500">
                  {hasAdvancedSettings() 
                    ? 'Custom restrictions and features configured' 
                    : 'Access controls, watermarks, NDAs, and more'
                  }
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => setShowSidebar(true)}
                className="flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                {hasAdvancedSettings() ? 'Edit Settings' : 'Configure'}
              </Button>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex items-center gap-2">
                <CustomSwitch
                  checked={enableNotifications}
                  onCheckedChange={setEnableNotifications}
                />
                <Label className="text-sm">Email notifications</Label>
              </div>

              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateLink}
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {loading ? 'Creating...' : 'Create Link'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Advanced Settings Sidebar */}
      <ShareSidebar
        isOpen={showSidebar}
        onClose={() => setShowSidebar(false)}
        settings={advancedSettings}
        onSettingsChange={setAdvancedSettings}
        documentTitle={documentTitle}
      />
    </>
  )
}
