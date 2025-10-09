'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { 
  Link as LinkIcon, 
  Plus, 
  Copy, 
  Eye, 
  Users, 
  Calendar,
  Clock,
  Shield,
  Trash2,
  ExternalLink
} from 'lucide-react'
import { toast } from 'sonner'

interface UserGroup {
  id: string
  name: string
  color: string
  member_count: number
}

interface GroupShareLink {
  id: string
  slug: string
  name: string
  viewer_group_id: string
  group_name: string
  group_color: string
  password_protected: boolean
  expires_at: string | null
  view_limit: number | null
  download_enabled: boolean
  watermark_enabled: boolean
  created_at: string
  total_views: number
  is_active: boolean
}

interface GroupShareLinksProps {
  dataRoomId: string
}

export function GroupShareLinks({ dataRoomId }: GroupShareLinksProps) {
  const [groupLinks, setGroupLinks] = useState<GroupShareLink[]>([])
  const [userGroups, setUserGroups] = useState<UserGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  // Create link form
  const [linkName, setLinkName] = useState('')
  const [selectedGroup, setSelectedGroup] = useState('')
  const [customSlug, setCustomSlug] = useState('')
  const [password, setPassword] = useState('')
  const [passwordProtected, setPasswordProtected] = useState(false)
  const [expiresAt, setExpiresAt] = useState('')
  const [viewLimit, setViewLimit] = useState('')
  const [downloadEnabled, setDownloadEnabled] = useState(true)
  const [watermarkEnabled, setWatermarkEnabled] = useState(false)
  const [screenshotProtection, setScreenshotProtection] = useState(false)
  const [welcomeMessage, setWelcomeMessage] = useState('')

  useEffect(() => {
    fetchData()
  }, [dataRoomId])

  const fetchData = async () => {
    try {
      const [linksRes, groupsRes] = await Promise.all([
        fetch(`/api/send/data-rooms/${dataRoomId}/group-links`),
        fetch(`/api/send/data-rooms/${dataRoomId}/viewer-groups`)
      ])

      const [linksData, groupsData] = await Promise.all([
        linksRes.json(),
        groupsRes.json()
      ])

      if (linksData.success) {
        setGroupLinks(linksData.group_links || [])
      }

      if (groupsData.success) {
        setUserGroups(groupsData.viewer_groups || [])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load group share links')
    } finally {
      setLoading(false)
    }
  }

  const createGroupLink = async () => {
    if (!linkName.trim()) {
      toast.error('Link name is required')
      return
    }

    if (!selectedGroup) {
      toast.error('Please select a user group')
      return
    }

    try {
      const response = await fetch(`/api/send/data-rooms/${dataRoomId}/group-links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: linkName.trim(),
          viewer_group_id: selectedGroup,
          slug: customSlug.trim() || undefined,
          password_protected: passwordProtected,
          password: passwordProtected ? password : undefined,
          expires_at: expiresAt || null,
          view_limit: viewLimit ? parseInt(viewLimit) : null,
          download_enabled: downloadEnabled,
          watermark_enabled: watermarkEnabled,
          screenshot_protection: screenshotProtection,
          welcome_message: welcomeMessage.trim() || undefined
        })
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Group share link created successfully!')
        setShowCreateDialog(false)
        resetForm()
        fetchData()
      } else {
        toast.error(data.error || 'Failed to create group share link')
      }
    } catch (error) {
      console.error('Error creating group link:', error)
      toast.error('Failed to create group share link')
    }
  }

  const deleteGroupLink = async (linkId: string) => {
    if (!confirm('Are you sure you want to delete this group share link?')) {
      return
    }

    try {
      const response = await fetch(`/api/send/data-rooms/${dataRoomId}/group-links/${linkId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Group share link deleted successfully!')
        setGroupLinks(groupLinks.filter(link => link.id !== linkId))
      } else {
        toast.error(data.error || 'Failed to delete group share link')
      }
    } catch (error) {
      console.error('Error deleting group link:', error)
      toast.error('Failed to delete group share link')
    }
  }

  const copyToClipboard = async (url: string, linkId: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(linkId)
      toast.success('Link copied to clipboard!')
      setTimeout(() => setCopied(null), 2000)
    } catch (error) {
      toast.error('Failed to copy link')
    }
  }

  const resetForm = () => {
    setLinkName('')
    setSelectedGroup('')
    setCustomSlug('')
    setPassword('')
    setPasswordProtected(false)
    setExpiresAt('')
    setViewLimit('')
    setDownloadEnabled(true)
    setWatermarkEnabled(false)
    setScreenshotProtection(false)
    setWelcomeMessage('')
  }

  const getShareUrl = (slug: string) => {
    return `${window.location.origin}/v/${slug}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading group share links...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Group Share Links</h2>
          <p className="text-gray-500">Create tailored share links for specific user groups</p>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Create Group Link
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Group Share Link</DialogTitle>
              <DialogDescription>
                Create a customized share link with specific permissions for a user group
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              {/* Basic Settings */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="linkName">Link Name</Label>
                  <Input
                    id="linkName"
                    value={linkName}
                    onChange={(e) => setLinkName(e.target.value)}
                    placeholder="Enter link name"
                  />
                </div>
                <div>
                  <Label>User Group</Label>
                  <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a user group" />
                    </SelectTrigger>
                    <SelectContent>
                      {userGroups.map((group) => (
                        <SelectItem key={group.id} value={group.id}>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: group.color }}
                            />
                            {group.name} ({group.member_count} members)
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="customSlug">Custom URL (Optional)</Label>
                <Input
                  id="customSlug"
                  value={customSlug}
                  onChange={(e) => setCustomSlug(e.target.value)}
                  placeholder="custom-link-name"
                />
              </div>

              {/* Security Settings */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch checked={passwordProtected} onCheckedChange={setPasswordProtected} />
                  <Label>Password Protection</Label>
                </div>
                
                {passwordProtected && (
                  <div>
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
                  <div>
                    <Label htmlFor="expiresAt">Expires At (Optional)</Label>
                    <Input
                      id="expiresAt"
                      type="datetime-local"
                      value={expiresAt}
                      onChange={(e) => setExpiresAt(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="viewLimit">View Limit (Optional)</Label>
                    <Input
                      id="viewLimit"
                      type="number"
                      value={viewLimit}
                      onChange={(e) => setViewLimit(e.target.value)}
                      placeholder="Maximum views"
                    />
                  </div>
                </div>
              </div>

              {/* Feature Settings */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch checked={downloadEnabled} onCheckedChange={setDownloadEnabled} />
                  <Label>Allow Downloads</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch checked={watermarkEnabled} onCheckedChange={setWatermarkEnabled} />
                  <Label>Enable Watermark</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch checked={screenshotProtection} onCheckedChange={setScreenshotProtection} />
                  <Label>Screenshot Protection</Label>
                </div>
              </div>

              <div>
                <Label htmlFor="welcomeMessage">Welcome Message (Optional)</Label>
                <Textarea
                  id="welcomeMessage"
                  value={welcomeMessage}
                  onChange={(e) => setWelcomeMessage(e.target.value)}
                  placeholder="Enter a welcome message for this group"
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={createGroupLink} className="flex-1">
                  Create Link
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Group Links List */}
      <div className="space-y-4">
        {groupLinks.map((link) => (
          <Card key={link.id}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-lg">{link.name}</h3>
                    <Badge 
                      variant="secondary" 
                      style={{ backgroundColor: link.group_color + '20', color: link.group_color }}
                    >
                      <Users className="w-3 h-3 mr-1" />
                      {link.group_name}
                    </Badge>
                    {!link.is_active && (
                      <Badge variant="destructive">Inactive</Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                    <div className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      {link.total_views} views
                    </div>
                    {link.view_limit && (
                      <div className="flex items-center gap-1">
                        <Shield className="w-4 h-4" />
                        {link.view_limit} max views
                      </div>
                    )}
                    {link.expires_at && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        Expires {new Date(link.expires_at).toLocaleDateString()}
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Created {new Date(link.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                    <LinkIcon className="w-4 h-4 text-gray-500" />
                    <code className="flex-1 text-sm font-mono">
                      {getShareUrl(link.slug)}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(getShareUrl(link.slug), link.id)}
                    >
                      {copied === link.id ? (
                        <span className="text-green-600">Copied!</span>
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(getShareUrl(link.slug), '_blank')}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="ml-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteGroupLink(link.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {groupLinks.length === 0 && (
        <div className="text-center py-12">
          <LinkIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No group share links yet</h3>
          <p className="text-gray-500 mb-4">Create customized share links for your user groups</p>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create First Group Link
          </Button>
        </div>
      )}
    </div>
  )
}
