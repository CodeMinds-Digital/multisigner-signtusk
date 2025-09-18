'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Settings, Save, RefreshCw, AlertTriangle, CheckCircle,
  XCircle, Edit, Trash2, Plus, Eye, EyeOff, Globe,
  Mail, Shield, Upload, Database, Bell, Users
} from 'lucide-react'

export interface SystemSetting {
  id: string
  key: string
  value: any
  description: string
  category: 'general' | 'uploads' | 'email' | 'security' | 'notifications' | 'features'
  type: 'boolean' | 'string' | 'number' | 'json' | 'array'
  is_sensitive: boolean
  is_active: boolean
  updated_by?: string
  updated_at: string
  validation_rules?: any
}

export function SystemSettingsManagement() {
  const [settings, setSettings] = useState<SystemSetting[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingSettings, setEditingSettings] = useState<Set<string>>(new Set())
  const [editValues, setEditValues] = useState<Record<string, any>>({})
  const [activeCategory, setActiveCategory] = useState<string>('general')
  const [showSensitive, setShowSensitive] = useState(false)

  const categories = [
    { id: 'general', label: 'General', icon: Globe, description: 'Basic application settings' },
    { id: 'features', label: 'Features', icon: Settings, description: 'Feature toggles and module controls' },
    { id: 'uploads', label: 'Uploads', icon: Upload, description: 'File upload and storage settings' },
    { id: 'email', label: 'Email', icon: Mail, description: 'Email service configuration' },
    { id: 'security', label: 'Security', icon: Shield, description: 'Security and authentication settings' },
    { id: 'notifications', label: 'Notifications', icon: Bell, description: 'System notification settings' }
  ]

  useEffect(() => {
    loadSystemSettings()
  }, [])

  const loadSystemSettings = async () => {
    setLoading(true)
    try {
      // Mock data - in real implementation, fetch from system_config table
      const mockSettings: SystemSetting[] = [
        {
          id: '1',
          key: 'app_name',
          value: 'SignTusk',
          description: 'Application name displayed throughout the platform',
          category: 'general',
          type: 'string',
          is_sensitive: false,
          is_active: true,
          updated_at: new Date().toISOString()
        },
        {
          id: '2',
          key: 'maintenance_mode',
          value: false,
          description: 'Enable maintenance mode to prevent user access',
          category: 'general',
          type: 'boolean',
          is_sensitive: false,
          is_active: true,
          updated_at: new Date().toISOString()
        },
        {
          id: '3',
          key: 'multi_signature_enabled',
          value: true,
          description: 'Enable multi-signature document workflows',
          category: 'features',
          type: 'boolean',
          is_sensitive: false,
          is_active: true,
          updated_at: new Date().toISOString()
        },
        {
          id: '4',
          key: 'document_templates_enabled',
          value: true,
          description: 'Allow users to create and use document templates',
          category: 'features',
          type: 'boolean',
          is_sensitive: false,
          is_active: true,
          updated_at: new Date().toISOString()
        },
        {
          id: '5',
          key: 'max_file_size_mb',
          value: 50,
          description: 'Maximum file size for document uploads in MB',
          category: 'uploads',
          type: 'number',
          is_sensitive: false,
          is_active: true,
          updated_at: new Date().toISOString()
        },
        {
          id: '6',
          key: 'allowed_file_types',
          value: ['pdf', 'doc', 'docx'],
          description: 'Allowed file types for document uploads',
          category: 'uploads',
          type: 'array',
          is_sensitive: false,
          is_active: true,
          updated_at: new Date().toISOString()
        },
        {
          id: '7',
          key: 'email_notifications_enabled',
          value: true,
          description: 'Enable email notifications for signature requests',
          category: 'email',
          type: 'boolean',
          is_sensitive: false,
          is_active: true,
          updated_at: new Date().toISOString()
        },
        {
          id: '8',
          key: 'email_from_name',
          value: 'SignTusk',
          description: 'Default sender name for outgoing emails',
          category: 'email',
          type: 'string',
          is_sensitive: false,
          is_active: true,
          updated_at: new Date().toISOString()
        },
        {
          id: '9',
          key: 'resend_api_key',
          value: 'sk_test_*********************',
          description: 'Resend API key for email delivery',
          category: 'email',
          type: 'string',
          is_sensitive: true,
          is_active: true,
          updated_at: new Date().toISOString()
        },
        {
          id: '10',
          key: 'require_email_verification',
          value: true,
          description: 'Require email verification for new user accounts',
          category: 'security',
          type: 'boolean',
          is_sensitive: false,
          is_active: true,
          updated_at: new Date().toISOString()
        },
        {
          id: '11',
          key: 'session_timeout_minutes',
          value: 480,
          description: 'User session timeout in minutes (8 hours default)',
          category: 'security',
          type: 'number',
          is_sensitive: false,
          is_active: true,
          updated_at: new Date().toISOString()
        },
        {
          id: '12',
          key: 'browser_notifications_enabled',
          value: true,
          description: 'Enable browser push notifications',
          category: 'notifications',
          type: 'boolean',
          is_sensitive: false,
          is_active: true,
          updated_at: new Date().toISOString()
        }
      ]

      setSettings(mockSettings)
    } catch (error) {
      console.error('Error loading system settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const startEditing = (settingId: string, currentValue: any) => {
    setEditingSettings(prev => new Set([...prev, settingId]))
    setEditValues(prev => ({ ...prev, [settingId]: currentValue }))
  }

  const cancelEditing = (settingId: string) => {
    setEditingSettings(prev => {
      const newSet = new Set(prev)
      newSet.delete(settingId)
      return newSet
    })
    setEditValues(prev => {
      const newValues = { ...prev }
      delete newValues[settingId]
      return newValues
    })
  }

  const saveSetting = async (settingId: string) => {
    setSaving(true)
    try {
      const newValue = editValues[settingId]

      // Update local state
      setSettings(prev => prev.map(setting =>
        setting.id === settingId
          ? { ...setting, value: newValue, updated_at: new Date().toISOString() }
          : setting
      ))

      // Remove from editing state
      cancelEditing(settingId)

      console.log(`Saved setting ${settingId} with value:`, newValue)
    } catch (error) {
      console.error('Error saving setting:', error)
    } finally {
      setSaving(false)
    }
  }

  const toggleSettingActive = async (settingId: string, isActive: boolean) => {
    try {
      setSettings(prev => prev.map(setting =>
        setting.id === settingId
          ? { ...setting, is_active: isActive, updated_at: new Date().toISOString() }
          : setting
      ))

      console.log(`Toggled setting ${settingId} active state:`, isActive)
    } catch (error) {
      console.error('Error toggling setting:', error)
    }
  }

  const renderSettingValue = (setting: SystemSetting) => {
    const isEditing = editingSettings.has(setting.id)
    const currentValue = isEditing ? editValues[setting.id] : setting.value

    if (setting.is_sensitive && !showSensitive && !isEditing) {
      return <span className="text-gray-400">••••••••••••</span>
    }

    if (isEditing) {
      switch (setting.type) {
        case 'boolean':
          return (
            <Switch
              checked={currentValue}
              onCheckedChange={(checked) =>
                setEditValues(prev => ({ ...prev, [setting.id]: checked }))
              }
            />
          )
        case 'number':
          return (
            <Input
              type="number"
              value={currentValue}
              onChange={(e) =>
                setEditValues(prev => ({ ...prev, [setting.id]: parseInt(e.target.value) }))
              }
              className="w-32"
            />
          )
        case 'array':
          return (
            <Textarea
              value={Array.isArray(currentValue) ? currentValue.join(', ') : currentValue}
              onChange={(e) =>
                setEditValues(prev => ({
                  ...prev,
                  [setting.id]: e.target.value.split(',').map(s => s.trim())
                }))
              }
              className="w-64"
              rows={2}
            />
          )
        default:
          return (
            <Input
              value={currentValue}
              onChange={(e) =>
                setEditValues(prev => ({ ...prev, [setting.id]: e.target.value }))
              }
              className="w-64"
            />
          )
      }
    }

    // Display mode
    switch (setting.type) {
      case 'boolean':
        return (
          <Badge variant={currentValue ? 'default' : 'secondary'}>
            {currentValue ? 'Enabled' : 'Disabled'}
          </Badge>
        )
      case 'array':
        return (
          <span className="text-sm text-gray-600">
            {Array.isArray(currentValue) ? currentValue.join(', ') : String(currentValue)}
          </span>
        )
      default:
        return <span className="text-sm text-gray-900">{String(currentValue)}</span>
    }
  }

  const filteredSettings = settings.filter(setting => setting.category === activeCategory)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">System Settings Management</h2>
          <p className="text-gray-600">Configure platform settings and feature toggles</p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => setShowSensitive(!showSensitive)}
            size="sm"
          >
            {showSensitive ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
            {showSensitive ? 'Hide' : 'Show'} Sensitive
          </Button>
          <Button onClick={loadSystemSettings} disabled={loading} size="sm">
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Category Navigation */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        {categories.map(category => {
          const Icon = category.icon
          return (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeCategory === category.id
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              <Icon className="w-4 h-4 mr-2" />
              {category.label}
            </button>
          )
        })}
      </div>

      {/* Settings List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            {(() => {
              const category = categories.find(c => c.id === activeCategory)
              const Icon = category?.icon
              return (
                <>
                  {Icon && <Icon className="w-5 h-5 mr-2" />}
                  {category?.label} Settings
                </>
              )
            })()}
          </CardTitle>
          <CardDescription>
            {categories.find(c => c.id === activeCategory)?.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-600">Loading settings...</span>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSettings.map(setting => (
                <div
                  key={setting.id}
                  className={`p-4 border rounded-lg ${setting.is_active ? 'border-gray-200' : 'border-gray-300 bg-gray-50'
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h4 className="font-medium text-gray-900">{setting.key}</h4>
                        <Switch
                          checked={setting.is_active}
                          onCheckedChange={(checked) => toggleSettingActive(setting.id, checked)}
                        />
                        {setting.is_sensitive && (
                          <Badge variant="outline" className="text-xs">
                            Sensitive
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{setting.description}</p>
                      <div className="mt-2 flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500">Value:</span>
                          {renderSettingValue(setting)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {editingSettings.has(setting.id) ? (
                        <>
                          <Button
                            size="sm"
                            onClick={() => saveSetting(setting.id)}
                            disabled={saving}
                          >
                            <Save className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => cancelEditing(setting.id)}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startEditing(setting.id, setting.value)}
                          disabled={!setting.is_active}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
