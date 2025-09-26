'use client'

import React, { useState, useEffect } from 'react'
import {
  Shield,
  Lock,
  Eye,
  Clock,
  Globe,
  Smartphone,
  AlertTriangle,
  CheckCircle,
  Settings,
  Key,
  Monitor,
  UserX,
  RefreshCw,
  Download,
  Trash2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CustomSwitch } from '@/components/ui/custom-switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/components/providers/secure-auth-provider'

interface GeneralSecurityConfig {
  // Password & Account Security
  passwordLastChanged?: string
  loginNotifications: boolean
  suspiciousActivityAlerts: boolean

  // Session Management
  sessionTimeout: number // in minutes
  maxActiveSessions: number
  logoutOtherDevices: boolean

  // Access Control
  ipWhitelisting: boolean
  allowedIPs: string[]
  geolocationRestrictions: boolean
  allowedCountries: string[]

  // Privacy & Data
  activityLogging: boolean
  dataRetentionPeriod: number // in days
  shareUsageAnalytics: boolean

  // Account Protection
  accountLockoutEnabled: boolean
  maxFailedAttempts: number
  lockoutDuration: number // in minutes
}

export function GeneralSecuritySettings() {
  const { user } = useAuth()
  const [config, setConfig] = useState<GeneralSecurityConfig>({
    loginNotifications: true,
    suspiciousActivityAlerts: true,
    sessionTimeout: 480, // 8 hours
    maxActiveSessions: 5,
    logoutOtherDevices: false,
    ipWhitelisting: false,
    allowedIPs: [],
    geolocationRestrictions: false,
    allowedCountries: [],
    activityLogging: true,
    dataRetentionPeriod: 365,
    shareUsageAnalytics: false,
    accountLockoutEnabled: true,
    maxFailedAttempts: 5,
    lockoutDuration: 30
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [activeSessions, setActiveSessions] = useState<any[]>([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    loadSecurityConfig()
    loadActiveSessions()
  }, [])

  const loadSecurityConfig = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/user/security-config', {
        credentials: 'include'
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setConfig(prev => ({ ...prev, ...result.data }))
        }
      }
    } catch (err) {
      console.error('Failed to load security config:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadActiveSessions = async () => {
    try {
      setRefreshing(true)
      setError('')
      const response = await fetch('/api/user/active-sessions', {
        credentials: 'include'
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setActiveSessions(result.data || [])
          if (result.data && result.data.length > 0) {
            setSuccess('Active sessions refreshed successfully')
          } else {
            setSuccess(result.message || 'No active sessions found')
          }
          setTimeout(() => setSuccess(''), 3000)
        } else {
          setError(result.error || 'Failed to load active sessions')
        }
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to load active sessions')
      }
    } catch (err) {
      console.error('Failed to load active sessions:', err)
      setError('Failed to load active sessions')
    } finally {
      setRefreshing(false)
    }
  }

  const updateConfig = async (updates: Partial<GeneralSecurityConfig>) => {
    try {
      setSaving(true)
      setError('')

      const response = await fetch('/api/user/security-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates)
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setConfig(prev => ({ ...prev, ...updates }))
          setSuccess('Security settings updated successfully')
          setTimeout(() => setSuccess(''), 3000)
        } else {
          setError(result.error || 'Failed to update settings')
        }
      } else {
        setError('Failed to update security settings')
      }
    } catch (err) {
      setError('An error occurred while updating settings')
    } finally {
      setSaving(false)
    }
  }

  const handleLogoutOtherDevices = async () => {
    if (confirm('This will log out all other devices. Continue?')) {
      try {
        const response = await fetch('/api/auth/logout-other-devices', {
          method: 'POST',
          credentials: 'include'
        })

        if (response.ok) {
          setSuccess('Successfully logged out all other devices')
          loadActiveSessions()
        } else {
          setError('Failed to logout other devices')
        }
      } catch (err) {
        setError('An error occurred')
      }
    }
  }

  const handleChangePassword = () => {
    // Redirect to password change page or open modal
    window.location.href = '/settings/change-password'
  }

  const handleDownloadSecurityReport = async () => {
    try {
      setError('')
      const response = await fetch('/api/user/security-report', {
        credentials: 'include'
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `security-report-${new Date().toISOString().split('T')[0]}.txt`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        setSuccess('Security report downloaded successfully')
        setTimeout(() => setSuccess(''), 3000)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to download security report')
      }
    } catch (err) {
      console.error('Download error:', err)
      setError('Failed to download security report')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading security settings...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Status Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
          <AlertTriangle className="w-5 h-5 text-red-500 mr-3" />
          <span className="text-red-800">{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center">
          <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
          <span className="text-green-800">{success}</span>
        </div>
      )}

      {/* Password & Account Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Lock className="w-5 h-5 mr-2" />
            Password & Account Security
          </CardTitle>
          <CardDescription>
            Manage your password and basic account security settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Password</h4>
              <p className="text-sm text-gray-600">
                {config.passwordLastChanged
                  ? `Last changed: ${new Date(config.passwordLastChanged).toLocaleDateString()}`
                  : 'Change your password regularly for better security'
                }
              </p>
            </div>
            <Button onClick={handleChangePassword} variant="outline">
              <Key className="w-4 h-4 mr-2" />
              Change Password
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Login Notifications</h4>
              <p className="text-sm text-gray-600">Get notified when someone logs into your account</p>
            </div>
            <CustomSwitch
              checked={config.loginNotifications}
              onCheckedChange={(checked) => updateConfig({ loginNotifications: checked })}
              disabled={saving}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Suspicious Activity Alerts</h4>
              <p className="text-sm text-gray-600">Get alerts for unusual account activity</p>
            </div>
            <CustomSwitch
              checked={config.suspiciousActivityAlerts}
              onCheckedChange={(checked) => updateConfig({ suspiciousActivityAlerts: checked })}
              disabled={saving}
            />
          </div>
        </CardContent>
      </Card>

      {/* Session Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Monitor className="w-5 h-5 mr-2" />
            Session Management
          </CardTitle>
          <CardDescription>
            Control how long you stay logged in and manage active sessions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Session Timeout</h4>
              <p className="text-sm text-gray-600">
                Automatically log out after {Math.floor(config.sessionTimeout / 60)} hours of inactivity
              </p>
            </div>
            <select
              value={config.sessionTimeout}
              onChange={(e) => updateConfig({ sessionTimeout: parseInt(e.target.value) })}
              className="border border-gray-300 rounded-md px-3 py-2"
              disabled={saving}
            >
              <option value={60}>1 hour</option>
              <option value={240}>4 hours</option>
              <option value={480}>8 hours</option>
              <option value={720}>12 hours</option>
              <option value={1440}>24 hours</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Active Sessions</h4>
              <p className="text-sm text-gray-600">
                {activeSessions.length > 0
                  ? `${activeSessions.length} active session${activeSessions.length !== 1 ? 's' : ''}`
                  : 'No active sessions found - this is normal for new users'
                }
              </p>
            </div>
            <Button
              onClick={handleLogoutOtherDevices}
              variant="outline"
              size="sm"
              disabled={activeSessions.length <= 1}
            >
              <UserX className="w-4 h-4 mr-2" />
              Logout Other Devices
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Privacy & Data Protection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Eye className="w-5 h-5 mr-2" />
            Privacy & Data Protection
          </CardTitle>
          <CardDescription>
            Control how your data is collected, stored, and used
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Activity Logging</h4>
              <p className="text-sm text-gray-600">Keep logs of your account activity for security purposes</p>
            </div>
            <CustomSwitch
              checked={config.activityLogging}
              onCheckedChange={(checked) => updateConfig({ activityLogging: checked })}
              disabled={saving}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Data Retention</h4>
              <p className="text-sm text-gray-600">
                Keep activity logs for {config.dataRetentionPeriod} days
              </p>
            </div>
            <select
              value={config.dataRetentionPeriod}
              onChange={(e) => updateConfig({ dataRetentionPeriod: parseInt(e.target.value) })}
              className="border border-gray-300 rounded-md px-3 py-2"
              disabled={saving}
            >
              <option value={30}>30 days</option>
              <option value={90}>90 days</option>
              <option value={180}>6 months</option>
              <option value={365}>1 year</option>
              <option value={730}>2 years</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Usage Analytics</h4>
              <p className="text-sm text-gray-600">Share anonymous usage data to help improve SignTusk</p>
            </div>
            <CustomSwitch
              checked={config.shareUsageAnalytics}
              onCheckedChange={(checked) => updateConfig({ shareUsageAnalytics: checked })}
              disabled={saving}
            />
          </div>
        </CardContent>
      </Card>

      {/* Account Protection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="w-5 h-5 mr-2" />
            Account Protection
          </CardTitle>
          <CardDescription>
            Advanced protection against unauthorized access attempts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Account Lockout Protection</h4>
              <p className="text-sm text-gray-600">
                Lock account after {config.maxFailedAttempts} failed login attempts
              </p>
            </div>
            <CustomSwitch
              checked={config.accountLockoutEnabled}
              onCheckedChange={(checked) => updateConfig({ accountLockoutEnabled: checked })}
              disabled={saving}
            />
          </div>

          {config.accountLockoutEnabled && (
            <div className="ml-4 space-y-3 border-l-2 border-gray-200 pl-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Failed Attempts Limit</span>
                <select
                  value={config.maxFailedAttempts}
                  onChange={(e) => updateConfig({ maxFailedAttempts: parseInt(e.target.value) })}
                  className="border border-gray-300 rounded-md px-2 py-1 text-sm"
                  disabled={saving}
                >
                  <option value={3}>3 attempts</option>
                  <option value={5}>5 attempts</option>
                  <option value={10}>10 attempts</option>
                </select>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Lockout Duration</span>
                <select
                  value={config.lockoutDuration}
                  onChange={(e) => updateConfig({ lockoutDuration: parseInt(e.target.value) })}
                  className="border border-gray-300 rounded-md px-2 py-1 text-sm"
                  disabled={saving}
                >
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={60}>1 hour</option>
                  <option value={240}>4 hours</option>
                </select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="w-5 h-5 mr-2" />
            Security Actions
          </CardTitle>
          <CardDescription>
            Download security reports and manage your security data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Security Report</h4>
              <p className="text-sm text-gray-600">Download a comprehensive security report for your account</p>
            </div>
            <Button onClick={handleDownloadSecurityReport} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Download Report
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Refresh Sessions</h4>
              <p className="text-sm text-gray-600">Reload active sessions information</p>
            </div>
            <Button onClick={loadActiveSessions} variant="outline" size="sm" disabled={refreshing}>
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
