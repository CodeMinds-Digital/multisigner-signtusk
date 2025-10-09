'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { 
  UserPlus, 
  Mail, 
  Shield, 
  Upload, 
  Download, 
  Eye,
  Edit,
  Trash2,
  Send,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Users,
  Key,
  Settings
} from 'lucide-react'
import { toast } from 'sonner'

interface Collaborator {
  id: string
  email: string
  name: string | null
  role: 'viewer' | 'collaborator' | 'admin'
  status: 'pending' | 'accepted' | 'declined' | 'expired'
  permissions: {
    can_view: boolean
    can_download: boolean
    can_upload: boolean
    can_share: boolean
    can_comment: boolean
    can_manage_users: boolean
  }
  invited_at: string
  accepted_at: string | null
  expires_at: string | null
  last_activity: string | null
  invitation_token: string
}

interface CollaboratorManagerProps {
  dataRoomId: string
}

export function CollaboratorManager({ dataRoomId }: CollaboratorManagerProps) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [loading, setLoading] = useState(true)
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [sending, setSending] = useState(false)

  // Invite form
  const [inviteEmails, setInviteEmails] = useState('')
  const [inviteRole, setInviteRole] = useState<'viewer' | 'collaborator' | 'admin'>('viewer')
  const [inviteMessage, setInviteMessage] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  
  // Permissions
  const [canView, setCanView] = useState(true)
  const [canDownload, setCanDownload] = useState(false)
  const [canUpload, setCanUpload] = useState(false)
  const [canShare, setCanShare] = useState(false)
  const [canComment, setCanComment] = useState(false)
  const [canManageUsers, setCanManageUsers] = useState(false)

  useEffect(() => {
    fetchCollaborators()
  }, [dataRoomId])

  useEffect(() => {
    // Set default permissions based on role
    switch (inviteRole) {
      case 'viewer':
        setCanView(true)
        setCanDownload(false)
        setCanUpload(false)
        setCanShare(false)
        setCanComment(false)
        setCanManageUsers(false)
        break
      case 'collaborator':
        setCanView(true)
        setCanDownload(true)
        setCanUpload(true)
        setCanShare(true)
        setCanComment(true)
        setCanManageUsers(false)
        break
      case 'admin':
        setCanView(true)
        setCanDownload(true)
        setCanUpload(true)
        setCanShare(true)
        setCanComment(true)
        setCanManageUsers(true)
        break
    }
  }, [inviteRole])

  const fetchCollaborators = async () => {
    try {
      const response = await fetch(`/api/send/data-rooms/${dataRoomId}/collaborators`)
      const data = await response.json()
      
      if (data.success) {
        setCollaborators(data.collaborators || [])
      }
    } catch (error) {
      console.error('Error fetching collaborators:', error)
      toast.error('Failed to load collaborators')
    } finally {
      setLoading(false)
    }
  }

  const sendInvitations = async () => {
    if (!inviteEmails.trim()) {
      toast.error('Please enter at least one email address')
      return
    }

    setSending(true)
    
    try {
      // Parse emails (comma or newline separated)
      const emails = inviteEmails
        .split(/[,\n]/)
        .map(email => email.trim())
        .filter(email => email && email.includes('@'))

      if (emails.length === 0) {
        toast.error('Please enter valid email addresses')
        return
      }

      const response = await fetch(`/api/send/data-rooms/${dataRoomId}/collaborators/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emails,
          role: inviteRole,
          message: inviteMessage.trim() || undefined,
          expires_at: expiresAt || null,
          permissions: {
            can_view: canView,
            can_download: canDownload,
            can_upload: canUpload,
            can_share: canShare,
            can_comment: canComment,
            can_manage_users: canManageUsers
          }
        })
      })

      const data = await response.json()

      if (data.success) {
        toast.success(`Invitations sent to ${emails.length} ${emails.length === 1 ? 'person' : 'people'}!`)
        setShowInviteDialog(false)
        resetInviteForm()
        fetchCollaborators()
      } else {
        toast.error(data.error || 'Failed to send invitations')
      }
    } catch (error) {
      console.error('Error sending invitations:', error)
      toast.error('Failed to send invitations')
    } finally {
      setSending(false)
    }
  }

  const resendInvitation = async (collaboratorId: string) => {
    try {
      const response = await fetch(`/api/send/data-rooms/${dataRoomId}/collaborators/${collaboratorId}/resend`, {
        method: 'POST'
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Invitation resent successfully!')
      } else {
        toast.error(data.error || 'Failed to resend invitation')
      }
    } catch (error) {
      console.error('Error resending invitation:', error)
      toast.error('Failed to resend invitation')
    }
  }

  const removeCollaborator = async (collaboratorId: string) => {
    if (!confirm('Are you sure you want to remove this collaborator?')) {
      return
    }

    try {
      const response = await fetch(`/api/send/data-rooms/${dataRoomId}/collaborators/${collaboratorId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Collaborator removed successfully!')
        setCollaborators(collaborators.filter(c => c.id !== collaboratorId))
      } else {
        toast.error(data.error || 'Failed to remove collaborator')
      }
    } catch (error) {
      console.error('Error removing collaborator:', error)
      toast.error('Failed to remove collaborator')
    }
  }

  const updateCollaboratorRole = async (collaboratorId: string, newRole: string) => {
    try {
      const response = await fetch(`/api/send/data-rooms/${dataRoomId}/collaborators/${collaboratorId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Collaborator role updated successfully!')
        fetchCollaborators()
      } else {
        toast.error(data.error || 'Failed to update collaborator role')
      }
    } catch (error) {
      console.error('Error updating collaborator role:', error)
      toast.error('Failed to update collaborator role')
    }
  }

  const resetInviteForm = () => {
    setInviteEmails('')
    setInviteRole('viewer')
    setInviteMessage('')
    setExpiresAt('')
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600" />
      case 'declined':
        return <XCircle className="w-4 h-4 text-red-600" />
      case 'expired':
        return <AlertCircle className="w-4 h-4 text-gray-600" />
      default:
        return <Clock className="w-4 h-4 text-gray-600" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      accepted: 'default',
      pending: 'secondary',
      declined: 'destructive',
      expired: 'outline'
    } as const

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const getRoleBadge = (role: string) => {
    const colors = {
      admin: 'bg-red-100 text-red-800',
      collaborator: 'bg-blue-100 text-blue-800',
      viewer: 'bg-gray-100 text-gray-800'
    }

    return (
      <Badge variant="outline" className={colors[role as keyof typeof colors]}>
        {role.charAt(0).toUpperCase() + role.slice(1)}
      </Badge>
    )
  }

  const getPermissionSummary = (permissions: Collaborator['permissions']) => {
    const activePermissions = []
    if (permissions.can_view) activePermissions.push('View')
    if (permissions.can_download) activePermissions.push('Download')
    if (permissions.can_upload) activePermissions.push('Upload')
    if (permissions.can_share) activePermissions.push('Share')
    if (permissions.can_comment) activePermissions.push('Comment')
    if (permissions.can_manage_users) activePermissions.push('Manage Users')
    
    return activePermissions.join(', ') || 'No permissions'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading collaborators...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Collaborator Management</h2>
          <p className="text-gray-500">Invite and manage external collaborators for your data room</p>
        </div>
        
        <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <UserPlus className="w-4 h-4 mr-2" />
              Invite Collaborators
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Invite Collaborators</DialogTitle>
              <DialogDescription>
                Send invitations to external users to collaborate on this data room
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              {/* Email Addresses */}
              <div>
                <Label htmlFor="inviteEmails">Email Addresses</Label>
                <Textarea
                  id="inviteEmails"
                  value={inviteEmails}
                  onChange={(e) => setInviteEmails(e.target.value)}
                  placeholder="Enter email addresses (comma or newline separated)&#10;john@company.com, jane@company.com"
                  rows={4}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Separate multiple email addresses with commas or new lines
                </p>
              </div>

              {/* Role and Expiration */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Role</Label>
                  <Select value={inviteRole} onValueChange={(value: 'viewer' | 'collaborator' | 'admin') => setInviteRole(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="viewer">Viewer - Read-only access</SelectItem>
                      <SelectItem value="collaborator">Collaborator - Can upload and edit</SelectItem>
                      <SelectItem value="admin">Admin - Full access</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="expiresAt">Invitation Expires (Optional)</Label>
                  <Input
                    id="expiresAt"
                    type="datetime-local"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                  />
                </div>
              </div>

              {/* Permissions */}
              <div>
                <Label>Permissions</Label>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div className="flex items-center space-x-2">
                    <Switch checked={canView} onCheckedChange={setCanView} />
                    <Label className="flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      View Documents
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch checked={canDownload} onCheckedChange={setCanDownload} />
                    <Label className="flex items-center gap-2">
                      <Download className="w-4 h-4" />
                      Download Files
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch checked={canUpload} onCheckedChange={setCanUpload} />
                    <Label className="flex items-center gap-2">
                      <Upload className="w-4 h-4" />
                      Upload Files
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch checked={canShare} onCheckedChange={setCanShare} />
                    <Label className="flex items-center gap-2">
                      <Send className="w-4 h-4" />
                      Share Links
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch checked={canComment} onCheckedChange={setCanComment} />
                    <Label className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Add Comments
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch checked={canManageUsers} onCheckedChange={setCanManageUsers} />
                    <Label className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Manage Users
                    </Label>
                  </div>
                </div>
              </div>

              {/* Custom Message */}
              <div>
                <Label htmlFor="inviteMessage">Custom Message (Optional)</Label>
                <Textarea
                  id="inviteMessage"
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value)}
                  placeholder="Add a personal message to the invitation..."
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setShowInviteDialog(false)} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={sendInvitations} disabled={sending} className="flex-1">
                  {sending ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Send Invitations
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Collaborators List */}
      <div className="space-y-4">
        {collaborators.map((collaborator) => (
          <Card key={collaborator.id}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">{collaborator.name || collaborator.email}</h3>
                      {getStatusIcon(collaborator.status)}
                      {getStatusBadge(collaborator.status)}
                      {getRoleBadge(collaborator.role)}
                    </div>
                    
                    <div className="text-sm text-gray-500 space-y-1">
                      <p>{collaborator.email}</p>
                      <p>Permissions: {getPermissionSummary(collaborator.permissions)}</p>
                      <p>Invited: {new Date(collaborator.invited_at).toLocaleDateString()}</p>
                      {collaborator.last_activity && (
                        <p>Last active: {new Date(collaborator.last_activity).toLocaleDateString()}</p>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {collaborator.status === 'pending' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => resendInvitation(collaborator.id)}
                    >
                      <Mail className="w-4 h-4 mr-1" />
                      Resend
                    </Button>
                  )}
                  
                  <Select
                    value={collaborator.role}
                    onValueChange={(value) => updateCollaboratorRole(collaborator.id, value)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="viewer">Viewer</SelectItem>
                      <SelectItem value="collaborator">Collaborator</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeCollaborator(collaborator.id)}
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

      {collaborators.length === 0 && (
        <div className="text-center py-12">
          <UserPlus className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No collaborators yet</h3>
          <p className="text-gray-500 mb-4">Invite external users to collaborate on this data room</p>
          <Button onClick={() => setShowInviteDialog(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            Invite First Collaborator
          </Button>
        </div>
      )}
    </div>
  )
}
