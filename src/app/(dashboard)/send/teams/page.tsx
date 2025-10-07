'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useAuth } from '@/components/providers/secure-auth-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Users, Plus, Mail, Crown, UserCheck, UserX, Settings, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

interface Team {
  id: string
  name: string
  slug: string
  owner_id: string
  plan: string
  created_at: string
  member_count?: number
}

interface TeamMember {
  id: string
  user_id: string
  role: string
  permissions: string[]
  created_at: string
  user_email?: string
}

export default function TeamsPage() {
  const { user } = useAuth()
  const [teams, setTeams] = useState<Team[]>([])
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)

  const [newTeamName, setNewTeamName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('member')

  const supabase = createClientComponentClient()

  useEffect(() => {
    if (user) {
      loadTeams()
    }
  }, [user])

  useEffect(() => {
    if (selectedTeam) {
      loadTeamMembers(selectedTeam.id)
    }
  }, [selectedTeam])

  async function loadTeams() {
    try {
      if (!user) return

      const response = await fetch('/api/send/teams')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load teams')
      }

      const allTeams = data.teams || []
      setTeams(allTeams as Team[])
      if (allTeams.length > 0 && !selectedTeam) {
        setSelectedTeam(allTeams[0] as Team)
      }
    } catch (error: any) {
      console.error('Error loading teams:', error)
      toast.error(error.message || 'Failed to load teams')
    } finally {
      setLoading(false)
    }
  }

  async function loadTeamMembers(teamId: string) {
    try {
      // Get team members with user profile data
      const { data: members } = await supabase
        .from('send_team_members')
        .select(`
          id,
          user_id,
          role,
          permissions,
          created_at
        `)
        .eq('team_id', teamId)

      // Get user profiles for the members
      if (members && members.length > 0) {
        const userIds = members.map(m => m.user_id)
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('id, email, full_name')
          .in('id', userIds)

        // Combine member data with profile data
        const membersWithProfiles = members.map(member => ({
          ...member,
          email: profiles?.find(p => p.id === member.user_id)?.email || 'Unknown',
          full_name: profiles?.find(p => p.id === member.user_id)?.full_name || 'Unknown User'
        }))

        setMembers(membersWithProfiles as TeamMember[])
      } else {
        setMembers([])
      }
    } catch (error) {
      console.error('Error loading members:', error)
    }
  }

  async function createTeam() {
    if (!newTeamName.trim()) {
      toast.error('Please enter a team name')
      return
    }

    if (!user) {
      toast.error('You must be logged in to create a team')
      return
    }

    try {
      const response = await fetch('/api/send/teams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newTeamName,
          plan: 'free'
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create team')
      }

      toast.success('Team created successfully')
      setCreateDialogOpen(false)
      setNewTeamName('')
      loadTeams()
    } catch (error: any) {
      toast.error(error.message || 'Failed to create team')
    }
  }

  async function inviteMember() {
    if (!selectedTeam) return

    try {
      const token = Math.random().toString(36).substring(2, 15)
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7) // 7 days

      const { error } = await supabase
        .from('send_team_invitations')
        .insert({
          team_id: selectedTeam.id,
          email: inviteEmail,
          role: inviteRole,
          token,
          expires_at: expiresAt.toISOString()
        })

      if (error) throw error

      toast.success(`Invitation sent to ${inviteEmail}`)
      setInviteDialogOpen(false)
      setInviteEmail('')
      setInviteRole('member')
    } catch (error: any) {
      toast.error(error.message || 'Failed to send invitation')
    }
  }

  async function removeMember(memberId: string) {
    if (!confirm('Are you sure you want to remove this member?')) return

    try {
      const { error } = await supabase
        .from('send_team_members')
        .delete()
        .eq('id', memberId)

      if (error) throw error

      toast.success('Member removed')
      if (selectedTeam) {
        loadTeamMembers(selectedTeam.id)
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove member')
    }
  }

  async function updateMemberRole(memberId: string, newRole: string) {
    try {
      const { error } = await supabase
        .from('send_team_members')
        .update({ role: newRole })
        .eq('id', memberId)

      if (error) throw error

      toast.success('Role updated')
      if (selectedTeam) {
        loadTeamMembers(selectedTeam.id)
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update role')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Teams</h1>
          <p className="text-muted-foreground">Manage your teams and collaborate with others</p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Team
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Team</DialogTitle>
              <DialogDescription>
                Create a team to collaborate with others on documents
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="team-name">Team Name</Label>
                <Input
                  id="team-name"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newTeamName.trim()) {
                      e.preventDefault()
                      createTeam()
                    }
                  }}
                  placeholder="Acme Inc."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={createTeam}
                disabled={!newTeamName.trim()}
              >
                Create Team
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Teams List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Your Teams</CardTitle>
            <CardDescription>Select a team to manage</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {teams.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No teams yet. Create one to get started.
              </p>
            ) : (
              teams.map((team) => (
                <button
                  key={team.id}
                  onClick={() => setSelectedTeam(team)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${selectedTeam?.id === team.id
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'hover:bg-muted border-transparent'
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span className="font-medium">{team.name}</span>
                    </div>
                    <Badge variant="outline">{team.plan}</Badge>
                  </div>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        {/* Team Details */}
        {selectedTeam && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{selectedTeam.name}</CardTitle>
                  <CardDescription>Manage team members and settings</CardDescription>
                </div>
                <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Mail className="h-4 w-4 mr-2" />
                      Invite Member
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Invite Team Member</DialogTitle>
                      <DialogDescription>
                        Send an invitation to join {selectedTeam.name}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="invite-email">Email Address</Label>
                        <Input
                          id="invite-email"
                          type="email"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          placeholder="colleague@example.com"
                        />
                      </div>
                      <div>
                        <Label htmlFor="invite-role">Role</Label>
                        <Select value={inviteRole} onValueChange={setInviteRole}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="member">Member</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={inviteMember} disabled={!inviteEmail}>
                        Send Invitation
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <h3 className="font-semibold">Team Members ({members.length})</h3>
                {members.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No members yet. Invite someone to collaborate.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {members.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <UserCheck className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{member.user_email || 'User'}</p>
                            <p className="text-sm text-muted-foreground capitalize">{member.role}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Select
                            value={member.role}
                            onValueChange={(value) => updateMemberRole(member.id, value)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="member">Member</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeMember(member.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

