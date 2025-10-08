'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import {
  Users,
  UserPlus,
  MoreHorizontal,
  Edit,
  Trash2,
  Mail,
  Building,
  Calendar,
  Shield
} from 'lucide-react'
import { toast } from 'sonner'
import { formatRelativeTime } from '@/lib/utils'

interface ViewerGroup {
  id: string
  name: string
  description?: string
  color: string
  is_default: boolean
  created_at: string
  member_count: number
}

interface ViewerGroupMember {
  id: string
  email: string
  name?: string
  company?: string
  role: string
  invited_at: string
  last_access?: string
  access_count: number
}

interface DataroomViewerGroupsProps {
  dataroomId: string
}

export function DataroomViewerGroups({ dataroomId }: DataroomViewerGroupsProps) {
  const [viewerGroups, setViewerGroups] = useState<ViewerGroup[]>([])
  const [loading, setLoading] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingGroup, setEditingGroup] = useState<ViewerGroup | null>(null)
  const [selectedGroup, setSelectedGroup] = useState<ViewerGroup | null>(null)
  const [groupMembers, setGroupMembers] = useState<ViewerGroupMember[]>([])

  // Form state
  const [groupName, setGroupName] = useState('')
  const [groupDescription, setGroupDescription] = useState('')
  const [groupColor, setGroupColor] = useState('#3B82F6')
  const [isDefault, setIsDefault] = useState(false)

  // Fetch viewer groups
  const fetchViewerGroups = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/send/data-rooms/${dataroomId}/viewer-groups`)
      const data = await response.json()

      if (data.success) {
        setViewerGroups(data.viewer_groups)
      } else {
        toast.error('Failed to load viewer groups')
      }
    } catch (error) {
      console.error('Error fetching viewer groups:', error)
      toast.error('Failed to load viewer groups')
    } finally {
      setLoading(false)
    }
  }

  // Create viewer group
  const createViewerGroup = async () => {
    if (!groupName.trim()) {
      toast.error('Group name is required')
      return
    }

    try {
      const response = await fetch(`/api/send/data-rooms/${dataroomId}/viewer-groups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: groupName,
          description: groupDescription,
          color: groupColor,
          is_default: isDefault
        })
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Viewer group created successfully')
        setShowCreateDialog(false)
        resetForm()
        fetchViewerGroups()
      } else {
        toast.error(data.error || 'Failed to create viewer group')
      }
    } catch (error) {
      console.error('Error creating viewer group:', error)
      toast.error('Failed to create viewer group')
    }
  }

  // Update viewer group
  const updateViewerGroup = async () => {
    if (!editingGroup || !groupName.trim()) return

    try {
      const response = await fetch(`/api/send/data-rooms/${dataroomId}/viewer-groups/${editingGroup.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: groupName,
          description: groupDescription,
          color: groupColor,
          is_default: isDefault
        })
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Viewer group updated successfully')
        setEditingGroup(null)
        resetForm()
        fetchViewerGroups()
      } else {
        toast.error(data.error || 'Failed to update viewer group')
      }
    } catch (error) {
      console.error('Error updating viewer group:', error)
      toast.error('Failed to update viewer group')
    }
  }

  // Delete viewer group
  const deleteViewerGroup = async (groupId: string) => {
    if (!confirm('Are you sure you want to delete this viewer group? All members and permissions will be removed.')) {
      return
    }

    try {
      const response = await fetch(`/api/send/data-rooms/${dataroomId}/viewer-groups/${groupId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Viewer group deleted successfully')
        fetchViewerGroups()
      } else {
        toast.error(data.error || 'Failed to delete viewer group')
      }
    } catch (error) {
      console.error('Error deleting viewer group:', error)
      toast.error('Failed to delete viewer group')
    }
  }

  // Fetch group members
  const fetchGroupMembers = async (groupId: string) => {
    try {
      const response = await fetch(`/api/send/data-rooms/${dataroomId}/viewer-groups/${groupId}`)
      const data = await response.json()

      if (data.success) {
        setGroupMembers(data.viewer_group.members || [])
      } else {
        toast.error('Failed to load group members')
      }
    } catch (error) {
      console.error('Error fetching group members:', error)
      toast.error('Failed to load group members')
    }
  }

  // Reset form
  const resetForm = () => {
    setGroupName('')
    setGroupDescription('')
    setGroupColor('#3B82F6')
    setIsDefault(false)
  }

  // Handle group selection
  const handleGroupSelect = (group: ViewerGroup) => {
    setSelectedGroup(group)
    fetchGroupMembers(group.id)
  }

  useEffect(() => {
    fetchViewerGroups()
  }, [dataroomId])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Viewer Groups</h3>
          <p className="text-sm text-gray-500">
            Organize viewers into groups for easier permission management
          </p>
        </div>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <UserPlus className="h-4 w-4 mr-2" />
              Create Group
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Viewer Group</DialogTitle>
              <DialogDescription>
                Create a new group to organize viewers and manage permissions.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="group-name">Group Name</Label>
                <Input
                  id="group-name"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Enter group name"
                />
              </div>
              <div>
                <Label htmlFor="group-description">Description (Optional)</Label>
                <Textarea
                  id="group-description"
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
                  placeholder="Enter group description"
                />
              </div>
              <div>
                <Label htmlFor="group-color">Color</Label>
                <Input
                  id="group-color"
                  type="color"
                  value={groupColor}
                  onChange={(e) => setGroupColor(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                >
                  Cancel
                </Button>
                <Button onClick={createViewerGroup}>
                  Create Group
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Groups List */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : viewerGroups.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-gray-500">No viewer groups found</p>
            <p className="text-sm text-gray-400">Create your first group to get started</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {viewerGroups.map((group) => (
            <Card
              key={group.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleGroupSelect(group)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: group.color }}
                    />
                    <CardTitle className="text-base">{group.name}</CardTitle>
                    {group.is_default && (
                      <Badge variant="secondary" className="text-xs">
                        Default
                      </Badge>
                    )}
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingGroup(group)
                          setGroupName(group.name)
                          setGroupDescription(group.description || '')
                          setGroupColor(group.color)
                          setIsDefault(group.is_default)
                        }}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteViewerGroup(group.id)
                        }}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {group.description && (
                  <CardDescription className="text-sm">
                    {group.description}
                  </CardDescription>
                )}
              </CardHeader>

              <CardContent>
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>{group.member_count} member(s)</span>
                  </div>
                  <span>
                    {formatRelativeTime(group.created_at)}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Group Dialog */}
      <Dialog open={!!editingGroup} onOpenChange={() => setEditingGroup(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Viewer Group</DialogTitle>
            <DialogDescription>
              Update group details and settings.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-group-name">Group Name</Label>
              <Input
                id="edit-group-name"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Enter group name"
              />
            </div>
            <div>
              <Label htmlFor="edit-group-description">Description (Optional)</Label>
              <Textarea
                id="edit-group-description"
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                placeholder="Enter group description"
              />
            </div>
            <div>
              <Label htmlFor="edit-group-color">Color</Label>
              <Input
                id="edit-group-color"
                type="color"
                value={groupColor}
                onChange={(e) => setGroupColor(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setEditingGroup(null)}
              >
                Cancel
              </Button>
              <Button onClick={updateViewerGroup}>
                Update Group
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Group Details Modal */}
      {selectedGroup && (
        <Dialog open={!!selectedGroup} onOpenChange={() => setSelectedGroup(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: selectedGroup.color }}
                />
                {selectedGroup.name}
                {selectedGroup.is_default && (
                  <Badge variant="secondary" className="text-xs">
                    Default
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription>
                {selectedGroup.description || 'No description provided'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Group Members</h4>
                <Button size="sm">
                  <Mail className="h-4 w-4 mr-2" />
                  Invite Members
                </Button>
              </div>

              {groupMembers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No members in this group</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {groupMembers.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{member.name || member.email}</span>
                          <Badge variant="outline" className="text-xs">
                            {member.role}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {member.email}
                          </span>
                          {member.company && (
                            <span className="flex items-center gap-1">
                              <Building className="h-3 w-3" />
                              {member.company}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {member.access_count} access(es)
                          </span>
                        </div>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Shield className="h-4 w-4 mr-2" />
                            Manage Permissions
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Remove from Group
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
