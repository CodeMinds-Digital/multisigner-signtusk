'use client'

import { useState, useEffect } from 'react'
import { FileText, User, Shield, Mail, UserX, UserCheck, Trash2, Clock } from 'lucide-react'

interface AuditLog {
  id: string
  action: string
  details: any
  created_at: string
  admin_profile: {
    email: string
    first_name: string
    last_name: string
  }
  target_profile?: {
    email: string
    first_name: string
    last_name: string
  }
}

export function AuditLogViewer() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    fetchAuditLogs()
  }, [])

  const fetchAuditLogs = async () => {
    try {
      const response = await fetch('/api/corporate/audit-logs')
      if (response.ok) {
        const data = await response.json()
        setLogs(data.logs)
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'user_invited':
        return <Mail className="w-4 h-4 text-blue-600" />
      case 'invitation_accepted':
        return <UserCheck className="w-4 h-4 text-green-600" />
      case 'user_auto_joined':
        return <UserCheck className="w-4 h-4 text-green-600" />
      case 'role_changed':
        return <Shield className="w-4 h-4 text-purple-600" />
      case 'user_suspended':
        return <UserX className="w-4 h-4 text-yellow-600" />
      case 'user_reactivated':
        return <UserCheck className="w-4 h-4 text-green-600" />
      case 'user_removed':
        return <Trash2 className="w-4 h-4 text-red-600" />
      case 'access_mode_changed':
        return <Shield className="w-4 h-4 text-blue-600" />
      default:
        return <FileText className="w-4 h-4 text-gray-600" />
    }
  }

  const getActionLabel = (action: string) => {
    const labels: { [key: string]: string } = {
      user_invited: 'User Invited',
      invitation_accepted: 'Invitation Accepted',
      user_auto_joined: 'User Auto-Joined',
      role_changed: 'Role Changed',
      user_suspended: 'User Suspended',
      user_reactivated: 'User Reactivated',
      user_removed: 'User Removed',
      access_mode_changed: 'Access Mode Changed'
    }
    return labels[action] || action
  }

  const getActionDescription = (log: AuditLog) => {
    const admin = `${log.admin_profile.first_name} ${log.admin_profile.last_name}`
    const target = log.target_profile 
      ? `${log.target_profile.first_name} ${log.target_profile.last_name}`
      : log.details?.email || 'Unknown'

    switch (log.action) {
      case 'user_invited':
        return `${admin} invited ${log.details.email} as ${log.details.role}`
      
      case 'invitation_accepted':
        return `${target} accepted invitation and joined as ${log.details.role}`
      
      case 'user_auto_joined':
        return `${target} auto-joined via Open Mode`
      
      case 'role_changed':
        return `${admin} changed ${target}'s role from ${log.details.old_role} to ${log.details.new_role}`
      
      case 'user_suspended':
        return `${admin} suspended ${target}`
      
      case 'user_reactivated':
        return `${admin} reactivated ${target}`
      
      case 'user_removed':
        return `${admin} removed ${log.details.target_email} (${log.details.target_role})`
      
      case 'access_mode_changed':
        return `${admin} changed access mode to ${log.details.new_access_mode}`
      
      default:
        return `${admin} performed ${log.action}`
    }
  }

  const filteredLogs = filter === 'all' 
    ? logs 
    : logs.filter(log => log.action === filter)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading audit logs...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Audit Log</h3>
          <p className="text-sm text-gray-600">Track all administrative actions</p>
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Actions</option>
          <option value="user_invited">Invitations</option>
          <option value="role_changed">Role Changes</option>
          <option value="user_suspended">Suspensions</option>
          <option value="user_removed">Removals</option>
          <option value="access_mode_changed">Access Mode</option>
        </select>
      </div>

      {/* Logs List */}
      {filteredLogs.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No audit logs found</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="divide-y divide-gray-200">
            {filteredLogs.map((log) => (
              <div key={log.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    {getActionIcon(log.action)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-900">
                        {getActionLabel(log.action)}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {getActionDescription(log)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-sm text-blue-600 font-medium">Total Actions</div>
          <div className="text-2xl font-bold text-blue-900">{logs.length}</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-sm text-green-600 font-medium">Invitations</div>
          <div className="text-2xl font-bold text-green-900">
            {logs.filter(l => l.action === 'user_invited').length}
          </div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="text-sm text-purple-600 font-medium">Role Changes</div>
          <div className="text-2xl font-bold text-purple-900">
            {logs.filter(l => l.action === 'role_changed').length}
          </div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="text-sm text-yellow-600 font-medium">Suspensions</div>
          <div className="text-2xl font-bold text-yellow-900">
            {logs.filter(l => l.action === 'user_suspended').length}
          </div>
        </div>
      </div>
    </div>
  )
}

