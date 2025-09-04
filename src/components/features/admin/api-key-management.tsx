'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Key, Plus, Edit, Trash2, Eye, EyeOff, Copy, CheckCircle, AlertTriangle, 
  Clock, Activity, RefreshCw, Settings
} from 'lucide-react'
import { getAdminSession, logAdminActivity } from '@/lib/admin-auth'

interface APIKey {
  id: string
  name: string
  service: string
  key: string
  status: 'active' | 'inactive' | 'expired'
  created_at: string
  last_used: string
  usage_count: number
  description: string
}

export function APIKeyManagement() {
  const [apiKeys, setApiKeys] = useState<APIKey[]>([])
  const [loading, setLoading] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set())
  const [newKey, setNewKey] = useState({
    name: '',
    service: '',
    key: '',
    description: ''
  })

  useEffect(() => {
    loadAPIKeys()
  }, [])

  const loadAPIKeys = async () => {
    setLoading(true)
    try {
      // Mock data - in production, fetch from secure storage
      const mockKeys: APIKey[] = [
        {
          id: 'key_1',
          name: 'Resend Email Service',
          service: 'resend',
          key: 're_G5BSo85p_4JikZvdpos8qJaM8cqbtAxXS',
          status: 'active',
          created_at: '2024-01-01T00:00:00Z',
          last_used: '2024-01-20T14:30:00Z',
          usage_count: 1247,
          description: 'Primary email service for signature requests'
        },
        {
          id: 'key_2',
          name: 'Supabase Project',
          service: 'supabase',
          key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          status: 'active',
          created_at: '2024-01-01T00:00:00Z',
          last_used: '2024-01-20T15:45:00Z',
          usage_count: 5678,
          description: 'Database and storage service'
        },
        {
          id: 'key_3',
          name: 'Backup Email Service',
          service: 'sendgrid',
          key: 'SG.abc123def456...',
          status: 'inactive',
          created_at: '2023-12-15T00:00:00Z',
          last_used: '2024-01-05T10:20:00Z',
          usage_count: 234,
          description: 'Backup email service for failover'
        }
      ]
      setApiKeys(mockKeys)
    } catch (error) {
      console.error('Failed to load API keys:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddKey = async () => {
    if (!newKey.name || !newKey.service || !newKey.key) return

    const adminSession = getAdminSession()
    if (!adminSession) return

    try {
      const apiKey: APIKey = {
        id: `key_${Date.now()}`,
        name: newKey.name,
        service: newKey.service,
        key: newKey.key,
        status: 'active',
        created_at: new Date().toISOString(),
        last_used: 'Never',
        usage_count: 0,
        description: newKey.description
      }

      setApiKeys([...apiKeys, apiKey])
      setNewKey({ name: '', service: '', key: '', description: '' })
      setShowAddForm(false)

      await logAdminActivity(adminSession.user.id, 'create_api_key', `Created API key: ${apiKey.name}`)
    } catch (error) {
      console.error('Failed to add API key:', error)
    }
  }

  const handleDeleteKey = async (keyId: string) => {
    const adminSession = getAdminSession()
    if (!adminSession) return

    if (confirm('Are you sure you want to delete this API key? This action cannot be undone.')) {
      const keyToDelete = apiKeys.find(k => k.id === keyId)
      setApiKeys(apiKeys.filter(k => k.id !== keyId))
      
      if (keyToDelete) {
        await logAdminActivity(adminSession.user.id, 'delete_api_key', `Deleted API key: ${keyToDelete.name}`)
      }
    }
  }

  const handleToggleStatus = async (keyId: string) => {
    const adminSession = getAdminSession()
    if (!adminSession) return

    setApiKeys(apiKeys.map(key => {
      if (key.id === keyId) {
        const newStatus = key.status === 'active' ? 'inactive' : 'active'
        logAdminActivity(adminSession.user.id, 'toggle_api_key', `${newStatus === 'active' ? 'Activated' : 'Deactivated'} API key: ${key.name}`)
        return { ...key, status: newStatus }
      }
      return key
    }))
  }

  const toggleKeyVisibility = (keyId: string) => {
    const newVisible = new Set(visibleKeys)
    if (newVisible.has(keyId)) {
      newVisible.delete(keyId)
    } else {
      newVisible.add(keyId)
    }
    setVisibleKeys(newVisible)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    // You could add a toast notification here
  }

  const maskKey = (key: string) => {
    if (key.length <= 8) return key
    return key.substring(0, 4) + '•'.repeat(key.length - 8) + key.substring(key.length - 4)
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      active: 'secondary',
      inactive: 'default',
      expired: 'destructive'
    }
    const colors: Record<string, string> = {
      active: 'text-green-600',
      inactive: 'text-gray-600',
      expired: 'text-red-600'
    }
    return (
      <Badge variant={variants[status] || 'default'} className={colors[status]}>
        {status}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">API Key Management</h2>
          <p className="text-gray-600">Manage external service API keys and credentials</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={loadAPIKeys} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => setShowAddForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add API Key
          </Button>
        </div>
      </div>

      {/* Add New Key Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add New API Key</CardTitle>
            <CardDescription>Add a new external service API key</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Key Name
                </label>
                <Input
                  value={newKey.name}
                  onChange={(e) => setNewKey({ ...newKey, name: e.target.value })}
                  placeholder="e.g., Resend Email Service"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Service
                </label>
                <select
                  value={newKey.service}
                  onChange={(e) => setNewKey({ ...newKey, service: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select service</option>
                  <option value="resend">Resend</option>
                  <option value="sendgrid">SendGrid</option>
                  <option value="supabase">Supabase</option>
                  <option value="stripe">Stripe</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API Key
              </label>
              <Input
                type="password"
                value={newKey.key}
                onChange={(e) => setNewKey({ ...newKey, key: e.target.value })}
                placeholder="Enter the API key"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description (Optional)
              </label>
              <Input
                value={newKey.description}
                onChange={(e) => setNewKey({ ...newKey, description: e.target.value })}
                placeholder="Brief description of this API key"
              />
            </div>
            <div className="flex space-x-2">
              <Button onClick={handleAddKey}>Add Key</Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* API Keys List */}
      <Card>
        <CardHeader>
          <CardTitle>API Keys ({apiKeys.length})</CardTitle>
          <CardDescription>Manage your external service API keys</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {apiKeys.map((apiKey) => (
              <div key={apiKey.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <Key className="w-5 h-5 text-gray-400" />
                      <h3 className="text-lg font-medium text-gray-900">{apiKey.name}</h3>
                      {getStatusBadge(apiKey.status)}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Service:</span> {apiKey.service}
                      </div>
                      <div>
                        <span className="font-medium">Usage:</span> {apiKey.usage_count.toLocaleString()} calls
                      </div>
                      <div>
                        <span className="font-medium">Created:</span> {new Date(apiKey.created_at).toLocaleDateString()}
                      </div>
                      <div>
                        <span className="font-medium">Last Used:</span> {apiKey.last_used === 'Never' ? 'Never' : new Date(apiKey.last_used).toLocaleDateString()}
                      </div>
                    </div>
                    
                    {apiKey.description && (
                      <p className="text-sm text-gray-600 mt-2">{apiKey.description}</p>
                    )}
                    
                    <div className="flex items-center space-x-2 mt-3">
                      <div className="flex-1 font-mono text-sm bg-gray-50 p-2 rounded border">
                        {visibleKeys.has(apiKey.id) ? apiKey.key : maskKey(apiKey.key)}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleKeyVisibility(apiKey.id)}
                      >
                        {visibleKeys.has(apiKey.id) ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(apiKey.key)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleStatus(apiKey.id)}
                    >
                      {apiKey.status === 'active' ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteKey(apiKey.id)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            
            {apiKeys.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Key className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p>No API keys configured yet</p>
                <p className="text-sm">Add your first API key to get started</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
