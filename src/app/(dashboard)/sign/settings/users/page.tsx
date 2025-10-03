'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/providers/secure-auth-provider'
import { Users, Search, Filter, Plus, MoreVertical, Shield, UserX, UserCheck, Trash2, AlertCircle, CheckCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ApprovalQueue } from '@/components/features/corporate/approval-queue'

interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  corporate_role: string
  account_status: string
  created_at: string
  email_verified: boolean
}

interface UserProfile {
  corporate_role: string | null
  corporate_account_id: string | null
  account_type: string
}

export default function UsersManagementPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showActionMenu, setShowActionMenu] = useState<string | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [confirmAction, setConfirmAction] = useState<{ action: string; user: User } | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    if (user) {
      checkPermissionsAndFetchUsers()
    }
  }, [user])

  useEffect(() => {
    filterUsers()
  }, [users, searchQuery, roleFilter, statusFilter])

  const checkPermissionsAndFetchUsers = async () => {
    try {
      const response = await fetch('/api/corporate/users')
      const data = await response.json()

      if (response.ok) {
        setUserProfile(data.userProfile)

        // Check if user is enterprise and has admin/owner role
        if (data.userProfile.account_type !== 'enterprise') {
          router.replace('/settings/documents')
          return
        }

        if (!['owner', 'admin'].includes(data.userProfile.corporate_role)) {
          router.replace('/settings/documents')
          return
        }

        setUsers(data.users)
        setFilteredUsers(data.users)
        setLoading(false)
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to load users' })
        setLoading(false)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
      setMessage({ type: 'error', text: 'Failed to load users' })
      setLoading(false)
    }
  }

  const filterUsers = () => {
    let filtered = [...users]

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(u =>
        u.email.toLowerCase().includes(query) ||
        u.first_name?.toLowerCase().includes(query) ||
        u.last_name?.toLowerCase().includes(query)
      )
    }

    // Role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(u => u.corporate_role === roleFilter)
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(u => u.account_status === statusFilter)
    }

    setFilteredUsers(filtered)
  }

  const getStatusBadge = (status: string) => {
    if (status === 'active') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
          <CheckCircle className="w-3 h-3" />
          Active
        </span>
      )
    }

    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded">
        <AlertCircle className="w-3 h-3" />
        Suspended
      </span>
    )
  }

  const getRoleBadge = (role: string) => {
    const colors = {
      owner: 'bg-purple-100 text-purple-800',
      admin: 'bg-blue-100 text-blue-800',
      member: 'bg-gray-100 text-gray-800'
    }

    return (
      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded capitalize ${colors[role as keyof typeof colors] || colors.member}`}>
        {role}
      </span>
    )
  }

  const handleUserAction = async (action: string, targetUser: User, newRole?: string) => {
    setShowActionMenu(null)
    setActionLoading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/corporate/users/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          targetUserId: targetUser.id,
          newRole
        })
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: data.message })
        checkPermissionsAndFetchUsers() // Refresh users list
        setShowConfirmDialog(false)
        setConfirmAction(null)
      } else {
        setMessage({ type: 'error', text: data.error || 'Action failed' })
      }
    } catch (error) {
      console.error('Error performing user action:', error)
      setMessage({ type: 'error', text: 'Failed to perform action' })
    } finally {
      setActionLoading(false)
    }
  }

  const confirmUserAction = (action: string, targetUser: User) => {
    setConfirmAction({ action, user: targetUser })
    setShowConfirmDialog(true)
    setShowActionMenu(null)
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading users...</div>
        </div>
      </div>
    )
  }

  if (!userProfile || !['owner', 'admin'].includes(userProfile.corporate_role || '')) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">This page is only available for enterprise account administrators.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-8 h-8 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
            </div>
            <p className="text-gray-600">Manage your corporate account users</p>
          </div>
          <Button
            onClick={() => router.push('/settings/corporate')}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Invite User
          </Button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-6 p-4 rounded-lg flex items-start gap-3 ${message.type === 'success'
          ? 'bg-green-50 text-green-800 border border-green-200'
          : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          )}
          <p>{message.text}</p>
        </div>
      )}

      {/* Approval Queue */}
      <div className="mb-6">
        <ApprovalQueue />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Role Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Roles</option>
              <option value="owner">Owner</option>
              <option value="admin">Admin</option>
              <option value="member">Member</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>

        {/* Results count */}
        <div className="mt-4 text-sm text-gray-600">
          Showing {filteredUsers.length} of {users.length} users
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {filteredUsers.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No users found</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-medium">
                          {u.first_name?.[0]}{u.last_name?.[0]}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {u.first_name} {u.last_name}
                        </div>
                        {!u.email_verified && (
                          <div className="text-xs text-yellow-600">Email not verified</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {u.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getRoleBadge(u.corporate_role)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(u.account_status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm relative">
                    {u.id !== user?.id && u.corporate_role !== 'owner' && (
                      <>
                        <button
                          onClick={() => setShowActionMenu(showActionMenu === u.id ? null : u.id)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <MoreVertical className="w-5 h-5" />
                        </button>

                        {/* Action Menu Dropdown */}
                        {showActionMenu === u.id && (
                          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                            <div className="py-1">
                              {/* Change Role */}
                              {userProfile?.corporate_role === 'owner' && (
                                <>
                                  {u.corporate_role === 'member' && (
                                    <button
                                      onClick={() => handleUserAction('change_role', u, 'admin')}
                                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                    >
                                      <Shield className="w-4 h-4" />
                                      Promote to Admin
                                    </button>
                                  )}
                                  {u.corporate_role === 'admin' && (
                                    <button
                                      onClick={() => handleUserAction('change_role', u, 'member')}
                                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                    >
                                      <Shield className="w-4 h-4" />
                                      Demote to Member
                                    </button>
                                  )}
                                </>
                              )}

                              {/* Suspend/Reactivate */}
                              {u.account_status === 'active' ? (
                                <button
                                  onClick={() => confirmUserAction('suspend', u)}
                                  className="w-full text-left px-4 py-2 text-sm text-yellow-700 hover:bg-yellow-50 flex items-center gap-2"
                                >
                                  <UserX className="w-4 h-4" />
                                  Suspend User
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleUserAction('reactivate', u)}
                                  className="w-full text-left px-4 py-2 text-sm text-green-700 hover:bg-green-50 flex items-center gap-2"
                                >
                                  <UserCheck className="w-4 h-4" />
                                  Reactivate User
                                </button>
                              )}

                              {/* Remove */}
                              <button
                                onClick={() => confirmUserAction('remove', u)}
                                className="w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50 flex items-center gap-2"
                              >
                                <Trash2 className="w-4 h-4" />
                                Remove User
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && confirmAction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className={`p-3 rounded-full ${confirmAction.action === 'remove'
                ? 'bg-red-100'
                : 'bg-yellow-100'
                }`}>
                <AlertCircle className={`w-6 h-6 ${confirmAction.action === 'remove'
                  ? 'text-red-600'
                  : 'text-yellow-600'
                  }`} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {confirmAction.action === 'remove' && 'Remove User'}
                  {confirmAction.action === 'suspend' && 'Suspend User'}
                </h3>
                <p className="text-gray-600 mb-4">
                  {confirmAction.action === 'remove' && (
                    <>
                      Are you sure you want to remove{' '}
                      <span className="font-semibold">
                        {confirmAction.user.first_name} {confirmAction.user.last_name}
                      </span>
                      ? This action cannot be undone.
                    </>
                  )}
                  {confirmAction.action === 'suspend' && (
                    <>
                      Are you sure you want to suspend{' '}
                      <span className="font-semibold">
                        {confirmAction.user.first_name} {confirmAction.user.last_name}
                      </span>
                      ? They will not be able to log in until reactivated.
                    </>
                  )}
                </p>

                <div className={`p-3 rounded-lg mb-4 ${confirmAction.action === 'remove'
                  ? 'bg-red-50 border border-red-200'
                  : 'bg-yellow-50 border border-yellow-200'
                  }`}>
                  <p className={`text-sm ${confirmAction.action === 'remove'
                    ? 'text-red-800'
                    : 'text-yellow-800'
                    }`}>
                    {confirmAction.action === 'remove' &&
                      'This will permanently delete the user account and all associated data.'
                    }
                    {confirmAction.action === 'suspend' &&
                      'The user will be logged out and cannot access the system until reactivated.'
                    }
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={() => handleUserAction(confirmAction.action, confirmAction.user)}
                    disabled={actionLoading}
                    className={`flex-1 ${confirmAction.action === 'remove'
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-yellow-600 hover:bg-yellow-700'
                      }`}
                  >
                    {actionLoading ? 'Processing...' : 'Confirm'}
                  </Button>
                  <Button
                    onClick={() => {
                      setShowConfirmDialog(false)
                      setConfirmAction(null)
                    }}
                    disabled={actionLoading}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

