'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/providers/secure-auth-provider'
import { NotificationPreferences } from '@/lib/notification-service'
import { useToast } from '@/components/ui/toast'

export function EmailPreferencesSettings() {
  const { user } = useAuth()
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email_notifications: true,
    push_notifications: true,
    signature_requests: true,
    document_updates: true,
    reminders: true,
    marketing: false,
    progress_updates: true,
    document_viewed_emails: false,
    other_signer_notifications: false
  })

  useEffect(() => {
    loadPreferences()
  }, [user])

  const loadPreferences = async () => {
    if (!user) return

    try {
      setLoading(true)
      const response = await fetch('/api/user/notification-preferences')

      if (!response.ok) {
        throw new Error('Failed to fetch preferences')
      }

      const prefs = await response.json()
      setPreferences(prefs)
    } catch (error) {
      console.error('Error loading preferences:', error)
      toast.error('Failed to load email preferences')
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = async (key: keyof NotificationPreferences) => {
    if (!user) return

    const newValue = !preferences[key]
    const newPreferences = { ...preferences, [key]: newValue }

    // Optimistic update
    setPreferences(newPreferences)

    try {
      setSaving(true)
      const response = await fetch('/api/user/notification-preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          [key]: newValue
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update preferences')
      }

      const result = await response.json()

      if (result.success) {
        toast.success('Email preferences updated')
      } else {
        // Revert on failure
        setPreferences(preferences)
        toast.error('Failed to update preferences')
      }
    } catch (error) {
      console.error('Error updating preferences:', error)
      // Revert on error
      setPreferences(preferences)
      toast.error('Failed to update preferences')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900">Email Preferences</h2>
        <p className="mt-1 text-sm text-gray-600">
          Control which email notifications you receive. In-app notifications will still be created.
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* Master Toggle */}
        <div className="pb-6 border-b border-gray-200">
          <PreferenceToggle
            label="Email Notifications"
            description="Master switch for all email notifications"
            enabled={preferences.email_notifications}
            onChange={() => handleToggle('email_notifications')}
            disabled={saving}
            badge="Master"
          />
        </div>

        {/* Essential Emails */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Essential Emails</h3>
          <p className="text-sm text-gray-600">
            These emails are important for document workflow
          </p>

          <PreferenceToggle
            label="Signature Requests"
            description="When someone requests your signature on a document"
            enabled={preferences.signature_requests}
            onChange={() => handleToggle('signature_requests')}
            disabled={saving || !preferences.email_notifications}
            badge="Recommended"
          />

          <PreferenceToggle
            label="Reminders"
            description="Automatic reminders for pending signatures"
            enabled={preferences.reminders}
            onChange={() => handleToggle('reminders')}
            disabled={saving || !preferences.email_notifications}
            badge="Recommended"
          />

          <PreferenceToggle
            label="Document Updates"
            description="When documents are completed, expired, or declined"
            enabled={preferences.document_updates}
            onChange={() => handleToggle('document_updates')}
            disabled={saving || !preferences.email_notifications}
            badge="Recommended"
          />
        </div>

        {/* Progress Updates */}
        <div className="space-y-4 pt-6 border-t border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Progress Updates</h3>
          <p className="text-sm text-gray-600">
            Get notified about document progress
          </p>

          <PreferenceToggle
            label="Progress Updates"
            description="When signatures are completed or PDFs are generated"
            enabled={preferences.progress_updates}
            onChange={() => handleToggle('progress_updates')}
            disabled={saving || !preferences.email_notifications}
          />
        </div>

        {/* Reduced Email Volume (Phase 1 Optimization) */}
        <div className="space-y-4 pt-6 border-t border-gray-200">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-gray-900">Detailed Activity</h3>
            <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded">
              ⚡ Phase 1 Optimization
            </span>
          </div>
          <p className="text-sm text-gray-600">
            These emails are disabled by default to reduce email volume. You can enable them if needed.
          </p>

          <PreferenceToggle
            label="Document Viewed Notifications"
            description="When someone views or accesses your document (can be frequent)"
            enabled={preferences.document_viewed_emails}
            onChange={() => handleToggle('document_viewed_emails')}
            disabled={saving || !preferences.email_notifications}
            badge="Disabled by default"
            badgeColor="yellow"
          />

          <PreferenceToggle
            label="Other Signer Progress"
            description="When other signers sign documents you're also signing (can be spammy)"
            enabled={preferences.other_signer_notifications}
            onChange={() => handleToggle('other_signer_notifications')}
            disabled={saving || !preferences.email_notifications}
            badge="Disabled by default"
            badgeColor="yellow"
          />
        </div>

        {/* Marketing */}
        <div className="space-y-4 pt-6 border-t border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Marketing & Updates</h3>

          <PreferenceToggle
            label="Marketing Emails"
            description="Product updates, tips, and promotional content"
            enabled={preferences.marketing}
            onChange={() => handleToggle('marketing')}
            disabled={saving || !preferences.email_notifications}
          />
        </div>

        {/* Email Volume Estimate */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="text-blue-600 text-xl">📊</div>
            <div>
              <h4 className="font-semibold text-blue-900">Estimated Email Volume</h4>
              <p className="text-sm text-blue-700 mt-1">
                {getEmailVolumeEstimate(preferences)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface PreferenceToggleProps {
  label: string
  description: string
  enabled: boolean
  onChange: () => void
  disabled?: boolean
  badge?: string
  badgeColor?: 'blue' | 'yellow' | 'green'
}

function PreferenceToggle({
  label,
  description,
  enabled,
  onChange,
  disabled = false,
  badge,
  badgeColor = 'blue'
}: PreferenceToggleProps) {
  const badgeColors = {
    blue: 'bg-blue-100 text-blue-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    green: 'bg-green-100 text-green-800'
  }

  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <label className="font-medium text-gray-900">{label}</label>
          {badge && (
            <span className={`px-2 py-0.5 text-xs font-medium rounded ${badgeColors[badgeColor]}`}>
              {badge}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-600 mt-1">{description}</p>
      </div>
      <button
        onClick={onChange}
        disabled={disabled}
        className={`
          relative inline-flex h-6 w-11 items-center rounded-full transition-colors
          ${enabled ? 'bg-blue-600' : 'bg-gray-300'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <span
          className={`
            inline-block h-4 w-4 transform rounded-full bg-white transition-transform
            ${enabled ? 'translate-x-6' : 'translate-x-1'}
          `}
        />
      </button>
    </div>
  )
}

function getEmailVolumeEstimate(prefs: NotificationPreferences): string {
  if (!prefs.email_notifications) {
    return 'No emails will be sent (all disabled)'
  }

  let emailCount = 0
  const features: string[] = []

  if (prefs.signature_requests) {
    emailCount += 1
    features.push('signature requests')
  }
  if (prefs.reminders) {
    emailCount += 2
    features.push('reminders')
  }
  if (prefs.document_updates) {
    emailCount += 2
    features.push('document updates')
  }
  if (prefs.progress_updates) {
    emailCount += 2
    features.push('progress updates')
  }
  if (prefs.document_viewed_emails) {
    emailCount += 5
    features.push('view notifications')
  }
  if (prefs.other_signer_notifications) {
    emailCount += 3
    features.push('signer progress')
  }

  const volume = emailCount <= 5 ? 'Low' : emailCount <= 10 ? 'Medium' : 'High'

  return `${volume} volume (~${emailCount} emails per document). Enabled: ${features.join(', ')}.`
}

