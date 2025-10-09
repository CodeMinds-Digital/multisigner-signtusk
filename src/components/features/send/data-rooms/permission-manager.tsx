'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { 
  Shield, 
  Folder, 
  FileText, 
  Eye, 
  Download, 
  Share2, 
  MessageSquare, 
  Print,
  Plus,
  Edit,
  Trash2,
  Calendar,
  Clock,
  Users
} from 'lucide-react'
import { toast } from 'sonner'

interface Permission {
  id: string
  viewer_group_id?: string
  viewer_email?: string
  resource_type: 'folder' | 'document'
  resource_id: string
  resource_name: string
  can_view: boolean
  can_download: boolean
  can_print: boolean
  can_share: boolean
  can_comment: boolean
  access_starts_at?: string
  access_expires_at?: string
  created_at: string
  group_name?: string
  group_color?: string
}

interface UserGroup {
  id: string
  name: string
  color: string
  member_count: number
}

interface Resource {
  id: string
  name: string
  type: 'folder' | 'document'
  path: string
}

interface PermissionManagerProps {
  dataRoomId: string
}

export function PermissionManager({ dataRoomId }: PermissionManagerProps) {
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [userGroups, setUserGroups] = useState<UserGroup[]>([])
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  // Create permission form
  const [selectedGroup, setSelectedGroup] = useState('')
  const [selectedEmail, setSelectedEmail] = useState('')
  const [selectedResource, setSelectedResource] = useState('')
  const [permissionType, setPermissionType] = useState<'group' | 'individual'>('group')
  const [canView, setCanView] = useState(true)
  const [canDownload, setCanDownload] = useState(false)
  const [canPrint, setCanPrint] = useState(false)
  const [canShare, setCanShare] = useState(false)
  const [canComment, setCanComment] = useState(false)
  const [accessStartsAt, setAccessStartsAt] = useState('')
  const [accessExpiresAt, setAccessExpiresAt] = useState('')

  useEffect(() => {
    fetchData()
  }, [dataRoomId])

  const fetchData = async () => {
    try {
      const [permissionsRes, groupsRes, resourcesRes] = await Promise.all([
        fetch(`/api/send/data-rooms/${dataRoomId}/permissions`),
        fetch(`/api/send/data-rooms/${dataRoomId}/viewer-groups`),
        fetch(`/api/send/data-rooms/${dataRoomId}/resources`)
      ])

      const [permissionsData, groupsData, resourcesData] = await Promise.all([
        permissionsRes.json(),
        groupsRes.json(),
        resourcesRes.json()
      ])

      if (permissionsData.success) {
        setPermissions(permissionsData.permissions || [])
      }

      if (groupsData.success) {
        setUserGroups(groupsData.viewer_groups || [])
      }

      if (resourcesData.success) {
        setResources(resourcesData.resources || [])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load permission data')
    } finally {
      setLoading(false)
    }
  }

  const createPermission = async () => {
    if (!selectedResource) {
      toast.error('Please select a resource')
      return
    }

    if (permissionType === 'group' && !selectedGroup) {
      toast.error('Please select a user group')
      return
    }

    if (permissionType === 'individual' && !selectedEmail) {
      toast.error('Please enter an email address')
      return
    }

    try {
      const response = await fetch(`/api/send/data-rooms/${dataRoomId}/permissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          viewer_group_id: permissionType === 'group' ? selectedGroup : null,
          viewer_email: permissionType === 'individual' ? selectedEmail : null,
          resource_type: resources.find(r => r.id === selectedResource)?.type,
          resource_id: selectedResource,
          can_view: canView,
          can_download: canDownload,
          can_print: canPrint,
          can_share: canShare,
          can_comment: canComment,
          access_starts_at: accessStartsAt || null,
          access_expires_at: accessExpiresAt || null
        })
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Permission created successfully!')
        setShowCreateDialog(false)
        resetForm()
        fetchData()
      } else {
        toast.error(data.error || 'Failed to create permission')
      }
    } catch (error) {
      console.error('Error creating permission:', error)
      toast.error('Failed to create permission')
    }
  }

  const deletePermission = async (permissionId: string) => {
    if (!confirm('Are you sure you want to delete this permission?')) {
      return
    }

    try {
      const response = await fetch(`/api/send/data-rooms/${dataRoomId}/permissions/${permissionId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Permission deleted successfully!')
        setPermissions(permissions.filter(p => p.id !== permissionId))
      } else {
        toast.error(data.error || 'Failed to delete permission')
      }
    } catch (error) {
      console.error('Error deleting permission:', error)
      toast.error('Failed to delete permission')
    }
  }

  const resetForm = () => {
    setSelectedGroup('')
    setSelectedEmail('')
    setSelectedResource('')
    setPermissionType('group')
    setCanView(true)
    setCanDownload(false)
    setCanPrint(false)
    setCanShare(false)
    setCanComment(false)
    setAccessStartsAt('')
    setAccessExpiresAt('')
  }

  const getResourceIcon = (type: string) => {
    return type === 'folder' ? <Folder className="w-4 h-4" /> : <FileText className="w-4 h-4" />
  }

  const getPermissionBadges = (permission: Permission) => {
    const badges = []
    if (permission.can_view) badges.push(<Badge key="view" variant="outline" className="text-xs">View</Badge>)
    if (permission.can_download) badges.push(<Badge key="download" variant="outline" className="text-xs">Download</Badge>)
    if (permission.can_print) badges.push(<Badge key="print" variant="outline" className="text-xs">Print</Badge>)
    if (permission.can_share) badges.push(<Badge key="share" variant="outline" className="text-xs">Share</Badge>)
    if (permission.can_comment) badges.push(<Badge key="comment" variant="outline" className="text-xs">Comment</Badge>)
    return badges
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading permissions...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Permission Manager</h2>
          <p className="text-gray-500">Control access to folders and documents</p>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Permission
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Permission</DialogTitle>
              <DialogDescription>
                Set specific permissions for users or groups on folders and documents
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              {/* Permission Type */}
              <div>
                <Label>Permission Type</Label>
                <Select value={permissionType} onValueChange={(value: 'group' | 'individual') => setPermissionType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="group">User Group</SelectItem>
                    <SelectItem value="individual">Individual User</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Target Selection */}
              {permissionType === 'group' ? (
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
              ) : (
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={selectedEmail}
                    onChange={(e) => setSelectedEmail(e.target.value)}
                    placeholder="Enter email address"
                  />
                </div>
              )}

              {/* Resource Selection */}
              <div>
                <Label>Resource</Label>
                <Select value={selectedResource} onValueChange={setSelectedResource}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a folder or document" />
                  </SelectTrigger>
                  <SelectContent>
                    {resources.map((resource) => (
                      <SelectItem key={resource.id} value={resource.id}>
                        <div className="flex items-center gap-2">
                          {getResourceIcon(resource.type)}
                          {resource.name}
                          <Badge variant="secondary" className="text-xs">{resource.type}</Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Permissions */}
              <div>
                <Label>Permissions</Label>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div className="flex items-center space-x-2">
                    <Switch checked={canView} onCheckedChange={setCanView} />
                    <Label className="flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      View
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch checked={canDownload} onCheckedChange={setCanDownload} />
                    <Label className="flex items-center gap-2">
                      <Download className="w-4 h-4" />
                      Download
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch checked={canPrint} onCheckedChange={setCanPrint} />
                    <Label className="flex items-center gap-2">
                      <Print className="w-4 h-4" />
                      Print
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch checked={canShare} onCheckedChange={setCanShare} />
                    <Label className="flex items-center gap-2">
                      <Share2 className="w-4 h-4" />
                      Share
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch checked={canComment} onCheckedChange={setCanComment} />
                    <Label className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Comment
                    </Label>
                  </div>
                </div>
              </div>

              {/* Time Restrictions */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="accessStartsAt">Access Starts (Optional)</Label>
                  <Input
                    id="accessStartsAt"
                    type="datetime-local"
                    value={accessStartsAt}
                    onChange={(e) => setAccessStartsAt(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="accessExpiresAt">Access Expires (Optional)</Label>
                  <Input
                    id="accessExpiresAt"
                    type="datetime-local"
                    value={accessExpiresAt}
                    onChange={(e) => setAccessExpiresAt(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={createPermission} className="flex-1">
                  Create Permission
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Permissions List */}
      <div className="space-y-4">
        {permissions.map((permission) => (
          <Card key={permission.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    {getResourceIcon(permission.resource_type)}
                    <div>
                      <p className="font-medium">{permission.resource_name}</p>
                      <p className="text-sm text-gray-500">{permission.resource_type}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {permission.viewer_group_id ? (
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-gray-500" />
                        <Badge 
                          variant="secondary" 
                          style={{ backgroundColor: permission.group_color + '20', color: permission.group_color }}
                        >
                          {permission.group_name}
                        </Badge>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{permission.viewer_email}</Badge>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-1">
                    {getPermissionBadges(permission)}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {(permission.access_starts_at || permission.access_expires_at) && (
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <Clock className="w-4 h-4" />
                      Time-limited
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deletePermission(permission.id)}
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

      {permissions.length === 0 && (
        <div className="text-center py-12">
          <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No permissions set</h3>
          <p className="text-gray-500 mb-4">Create specific permissions to control access to your content</p>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add First Permission
          </Button>
        </div>
      )}
    </div>
  )
}
