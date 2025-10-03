'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/providers/secure-auth-provider'
import { Building2, Users, Shield, AlertCircle, CheckCircle, Clock, Mail } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { InvitationManagement } from '@/components/features/corporate/invitation-management'
import { AuditLogViewer } from '@/components/features/corporate/audit-log-viewer'

interface CorporateAccount {
  id: string
  company_name: string
  email_domain: string
  access_mode: 'open' | 'approval' | 'invite_only'
  created_at: string
}

interface UserProfile {
  corporate_role: string | null
  corporate_account_id: string | null
  account_type: string
}

export default function CorporateSettingsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [corporateAccount, setCorporateAccount] = useState<CorporateAccount | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [selectedMode, setSelectedMode] = useState<'open' | 'approval' | 'invite_only'>('invite_only')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [pendingMode, setPendingMode] = useState<'open' | 'approval' | 'invite_only' | null>(null)

  useEffect(() => {
    if (user) {
      fetchCorporateSettings()
    }
  }, [user])

  const fetchCorporateSettings = async () => {
    try {
      const response = await fetch('/api/corporate/settings')
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

        setCorporateAccount(data.corporateAccount)
        setSelectedMode(data.corporateAccount.access_mode)
        setLoading(false)
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to load settings' })
        setLoading(false)
      }
    } catch (error) {
      console.error('Error fetching enterprise settings:', error)
      setMessage({ type: 'error', text: 'Failed to load enterprise settings' })
      setLoading(false)
    }
  }

  const handleModeChange = (mode: 'open' | 'approval' | 'invite_only') => {
    setPendingMode(mode)
    setShowConfirmDialog(true)
  }

  const confirmModeChange = async () => {
    if (!pendingMode) return

    setSaving(true)
    setMessage(null)
    setShowConfirmDialog(false)

    try {
      const response = await fetch('/api/corporate/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_mode: pendingMode })
      })

      const data = await response.json()

      if (response.ok) {
        setSelectedMode(pendingMode)
        setCorporateAccount(prev => prev ? { ...prev, access_mode: pendingMode } : null)
        setMessage({ type: 'success', text: 'Access mode updated successfully!' })
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update access mode' })
      }
    } catch (error) {
      console.error('Error updating access mode:', error)
      setMessage({ type: 'error', text: 'Failed to update access mode' })
    } finally {
      setSaving(false)
      setPendingMode(null)
    }
  }

  const cancelModeChange = () => {
    setShowConfirmDialog(false)
    setPendingMode(null)
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading enterprise settings...</div>
        </div>
      </div>
    )
  }

  if (!corporateAccount) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">This page is only available for enterprise account administrators.</p>
        </div>
      </div>
    )
  }

  const accessModes = [
    {
      id: 'open' as const,
      name: 'Open Mode',
      icon: Users,
      color: 'green' as const,
      description: 'Anyone with your company email domain can join automatically',
      details: [
        'Users are auto-approved as Members',
        'Immediate access after email verification',
        'Best for trusted internal teams',
        'No admin approval required'
      ],
      warning: 'Anyone with your email domain can join. Make sure your domain is secure.'
    },
    {
      id: 'approval' as const,
      name: 'Approval Mode',
      icon: Clock,
      color: 'blue' as const,
      description: 'Users can request access, but admin approval is required',
      details: [
        'Users submit access requests',
        'Admin reviews and approves/declines',
        'Email notifications sent to users',
        'Balanced security and flexibility'
      ],
      warning: 'You will need to manually approve each new user request.'
    },
    {
      id: 'invite_only' as const,
      name: 'Invite-Only Mode',
      icon: Mail,
      color: 'purple' as const,
      description: 'Only invited users can join (most secure)',
      details: [
        'Admins send invitation emails',
        'Users cannot self-signup',
        'Maximum security and control',
        'Best for sensitive organizations'
      ],
      warning: 'Users cannot signup on their own. You must invite them manually.'
    }
  ]

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Building2 className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Enterprise Settings</h1>
        </div>
        <p className="text-gray-600">Manage your enterprise account settings and access control</p>
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

      {/* Company Info */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Company Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-600">Company Name</label>
            <p className="text-lg text-gray-900">{corporateAccount.company_name}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">Email Domain</label>
            <p className="text-lg text-gray-900">@{corporateAccount.email_domain}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">Your Role</label>
            <p className="text-lg text-gray-900 capitalize">{userProfile?.corporate_role}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">Account Created</label>
            <p className="text-lg text-gray-900">
              {new Date(corporateAccount.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Invitation Management */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <InvitationManagement />
      </div>

      {/* Access Control Modes */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-2 mb-6">
          <Shield className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">Access Control Mode</h2>
        </div>

        <p className="text-gray-600 mb-6">
          Choose how users from your domain can join your enterprise account
        </p>

        <div className="space-y-4">
          {accessModes.map((mode) => {
            const Icon = mode.icon
            const isSelected = selectedMode === mode.id
            const colorClasses = {
              green: 'border-green-500 bg-green-50',
              blue: 'border-blue-500 bg-blue-50',
              purple: 'border-purple-500 bg-purple-50'
            }

            return (
              <div
                key={mode.id}
                className={`border-2 rounded-lg p-5 cursor-pointer transition-all ${isSelected
                  ? colorClasses[mode.color]
                  : 'border-gray-200 hover:border-gray-300'
                  }`}
                onClick={() => !saving && handleModeChange(mode.id)}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg ${isSelected
                    ? `bg-${mode.color}-100`
                    : 'bg-gray-100'
                    }`}>
                    <Icon className={`w-6 h-6 ${isSelected
                      ? `text-${mode.color}-600`
                      : 'text-gray-600'
                      }`} />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{mode.name}</h3>
                      {isSelected && (
                        <span className="px-2 py-1 bg-blue-600 text-white text-xs font-medium rounded">
                          Active
                        </span>
                      )}
                    </div>

                    <p className="text-gray-600 mb-3">{mode.description}</p>

                    <ul className="space-y-1 mb-3">
                      {mode.details.map((detail, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                          <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>

                    {!isSelected && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded p-3 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-yellow-800">{mode.warning}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Audit Log Viewer */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <AuditLogViewer />
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && pendingMode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Confirm Access Mode Change</h3>

            <p className="text-gray-600 mb-4">
              Are you sure you want to change the access mode to{' '}
              <span className="font-semibold">
                {accessModes.find(m => m.id === pendingMode)?.name}
              </span>?
            </p>

            <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-6">
              <p className="text-sm text-yellow-800">
                {accessModes.find(m => m.id === pendingMode)?.warning}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={confirmModeChange}
                disabled={saving}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Confirm'}
              </button>
              <button
                onClick={cancelModeChange}
                disabled={saving}
                className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

