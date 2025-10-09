'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  Mail, 
  Shield, 
  Eye, 
  Download, 
  Share2,
  MessageSquare,
  Calendar,
  Clock
} from 'lucide-react'
import { toast } from 'sonner'

interface UserGroup {
  id: string
  name: string
  description: string
  color: string
  is_default: boolean
  member_count: number
  created_at: string
  members?: GroupMember[]
  permissions?: GroupPermission[]
}

interface GroupMember {
  id: string
  email: string
  name?: string
  role: 'viewer' | 'collaborator' | 'admin'
  added_at: string
}

interface GroupPermission {
  id: string
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
}

interface UserGroupManagerProps {
  dataRoomId: string
}

export function UserGroupManager({ dataRoomId }: UserGroupManagerProps) {
  const [groups, setGroups] = useState<UserGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedGroup, setSelectedGroup] = useState<UserGroup | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)

  // Create group form
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupDescription, setNewGroupDescription] = useState('')
  const [newGroupColor, setNewGroupColor] = useState('#3B82F6')
  const [newGroupIsDefault, setNewGroupIsDefault] = useState(false)

  // Add member form
  const [newMemberEmail, setNewMemberEmail] = useState('')
  const [newMemberRole, setNewMemberRole] = useState<'viewer' | 'collaborator' | 'admin'>('viewer')

  useEffect(() => {
    fetchGroups()
  }, [dataRoomId])

  const fetchGroups = async () => {
    try {
      const response = await fetch(`/api/send/data-rooms/${dataRoomId}/viewer-groups`)
      const data = await response.json()
      
      if (data.success) {
        setGroups(data.viewer_groups || [])
      } else {
        toast.error('Failed to fetch user groups')
      }
    } catch (error) {
      console.error('Error fetching groups:', error)
      toast.error('Failed to fetch user groups')
    } finally {
      setLoading(false)
    }
  }

  const createGroup = async () => {
    if (!newGroupName.trim()) {
      toast.error('Group name is required')
      return
    }

    try {
      const response = await fetch(`/api/send/data-rooms/${dataRoomId}/viewer-groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newGroupName.trim(),
          description: newGroupDescription.trim() || null,
          color: newGroupColor,
          is_default: newGroupIsDefault
        })
      })

      const data = await response.json()

      if (data.success) {
        toast.success('User group created successfully!')
        setGroups([data.viewer_group, ...groups])
        setShowCreateDialog(false)
        setNewGroupName('')
        setNewGroupDescription('')
        setNewGroupColor('#3B82F6')
        setNewGroupIsDefault(false)
      } else {
        toast.error(data.error || 'Failed to create user group')
      }
    } catch (error) {
      console.error('Error creating group:', error)
      toast.error('Failed to create user group')
    }
  }

  const deleteGroup = async (groupId: string) => {
    if (!confirm('Are you sure you want to delete this user group? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/send/data-rooms/${dataRoomId}/viewer-groups/${groupId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        toast.success('User group deleted successfully!')
        setGroups(groups.filter(g => g.id !== groupId))
        if (selectedGroup?.id === groupId) {
          setSelectedGroup(null)
        }
      } else {
        toast.error(data.error || 'Failed to delete user group')
      }
    } catch (error) {
      console.error('Error deleting group:', error)
      toast.error('Failed to delete user group')
    }
  }

  const addMemberToGroup = async (groupId: string) => {
    if (!newMemberEmail.trim()) {
      toast.error('Email is required')
      return
    }

    try {
      const response = await fetch(`/api/send/data-rooms/${dataRoomId}/viewer-groups/${groupId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newMemberEmail.trim(),
          role: newMemberRole
        })
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Member added successfully!')
        setNewMemberEmail('')
        setNewMemberRole('viewer')
        // Refresh the selected group data
        if (selectedGroup?.id === groupId) {
          fetchGroupDetails(groupId)
        }
        // Update member count in groups list
        setGroups(groups.map(g => 
          g.id === groupId 
            ? { ...g, member_count: (g.member_count || 0) + 1 }
            : g
        ))
      } else {
        toast.error(data.error || 'Failed to add member')
      }
    } catch (error) {
      console.error('Error adding member:', error)
      toast.error('Failed to add member')
    }
  }

  const fetchGroupDetails = async (groupId: string) => {
    try {
      const response = await fetch(`/api/send/data-rooms/${dataRoomId}/viewer-groups/${groupId}`)
      const data = await response.json()
      
      if (data.success) {
        setSelectedGroup(data.viewer_group)
      } else {
        toast.error('Failed to fetch group details')
      }
    } catch (error) {
      console.error('Error fetching group details:', error)
      toast.error('Failed to fetch group details')
    }
  }

  const colorOptions = [
    { value: '#3B82F6', label: 'Blue' },
    { value: '#10B981', label: 'Green' },
    { value: '#F59E0B', label: 'Yellow' },
    { value: '#EF4444', label: 'Red' },
    { value: '#8B5CF6', label: 'Purple' },
    { value: '#06B6D4', label: 'Cyan' },
    { value: '#84CC16', label: 'Lime' },
    { value: '#F97316', label: 'Orange' }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading user groups...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">User Groups</h2>
          <p className="text-gray-500">Manage access permissions for different user groups</p>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Create Group
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create User Group</DialogTitle>
              <DialogDescription>
                Create a new user group to manage permissions for multiple users
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="groupName">Group Name</Label>
                <Input
                  id="groupName"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Enter group name"
                />
              </div>
              <div>
                <Label htmlFor="groupDescription">Description (Optional)</Label>
                <Textarea
                  id="groupDescription"
                  value={newGroupDescription}
                  onChange={(e) => setNewGroupDescription(e.target.value)}
                  placeholder="Enter group description"
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="groupColor">Color</Label>
                <Select value={newGroupColor} onValueChange={setNewGroupColor}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {colorOptions.map((color) => (
                      <SelectItem key={color.value} value={color.value}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-4 h-4 rounded-full" 
                            style={{ backgroundColor: color.value }}
                          />
                          {color.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="isDefault"
                  checked={newGroupIsDefault}
                  onCheckedChange={setNewGroupIsDefault}
                />
                <Label htmlFor="isDefault">Set as default group</Label>
              </div>
              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={createGroup} className="flex-1">
                  Create Group
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Groups Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups.map((group) => (
          <Card key={group.id} className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: group.color }}
                  />
                  <CardTitle className="text-lg">{group.name}</CardTitle>
                  {group.is_default && (
                    <Badge variant="secondary" className="text-xs">Default</Badge>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => fetchGroupDetails(group.id)}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteGroup(group.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              {group.description && (
                <CardDescription>{group.description}</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {group.member_count || 0} members
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {new Date(group.created_at).toLocaleDateString()}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {groups.length === 0 && (
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No user groups yet</h3>
          <p className="text-gray-500 mb-4">Create your first user group to start managing permissions</p>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create First Group
          </Button>
        </div>
      )}

      {/* Group Details Panel */}
      {selectedGroup && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div 
                  className="w-4 h-4 rounded-full" 
                  style={{ backgroundColor: selectedGroup.color }}
                />
                <CardTitle>{selectedGroup.name}</CardTitle>
                {selectedGroup.is_default && (
                  <Badge variant="secondary">Default</Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedGroup(null)}
              >
                ×
              </Button>
            </div>
            {selectedGroup.description && (
              <CardDescription>{selectedGroup.description}</CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Add Member Section */}
            <div>
              <h4 className="font-medium mb-3">Add Member</h4>
              <div className="flex gap-2">
                <Input
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  placeholder="Enter email address"
                  className="flex-1"
                />
                <Select value={newMemberRole} onValueChange={setNewMemberRole}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">Viewer</SelectItem>
                    <SelectItem value="collaborator">Collaborator</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={() => addMemberToGroup(selectedGroup.id)}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Members List */}
            <div>
              <h4 className="font-medium mb-3">Members ({selectedGroup.members?.length || 0})</h4>
              {selectedGroup.members && selectedGroup.members.length > 0 ? (
                <div className="space-y-2">
                  {selectedGroup.members.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <Mail className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium">{member.email}</p>
                          <p className="text-sm text-gray-500">
                            {member.role} • Added {new Date(member.added_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Badge variant={member.role === 'admin' ? 'default' : 'secondary'}>
                        {member.role}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No members in this group yet</p>
              )}
            </div>

            {/* Permissions Summary */}
            <div>
              <h4 className="font-medium mb-3">Permissions ({selectedGroup.permissions?.length || 0})</h4>
              {selectedGroup.permissions && selectedGroup.permissions.length > 0 ? (
                <div className="space-y-2">
                  {selectedGroup.permissions.map((permission) => (
                    <div key={permission.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{permission.resource_name}</p>
                        <p className="text-sm text-gray-500">{permission.resource_type}</p>
                      </div>
                      <div className="flex gap-1">
                        {permission.can_view && <Badge variant="outline" className="text-xs">View</Badge>}
                        {permission.can_download && <Badge variant="outline" className="text-xs">Download</Badge>}
                        {permission.can_share && <Badge variant="outline" className="text-xs">Share</Badge>}
                        {permission.can_comment && <Badge variant="outline" className="text-xs">Comment</Badge>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No specific permissions set</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
