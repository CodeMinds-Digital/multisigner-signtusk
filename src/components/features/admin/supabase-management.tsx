'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Database, RefreshCw, CheckCircle, AlertTriangle, XCircle,
  ExternalLink, Copy, Settings, BarChart3, Table,
  Server, Globe, Key, Eye, EyeOff
} from 'lucide-react'
import {
  getSupabaseConfig,
  getSupabaseStats,
  getDatabaseTables,
  getSupabaseProjectInfo,
  createAdminTables,
  SupabaseConfig,
  SupabaseStats,
  DatabaseTable
} from '@/lib/admin-supabase-service'
import { updateSupabaseConfiguration, testSupabaseConfiguration, refreshSupabaseClient } from '@/lib/dynamic-supabase'
import { debugSupabaseConfig, testSupabaseSimple } from '@/lib/debug-supabase'
import { EnvDebug } from './env-debug'
import { SupabaseProjectSwitcher } from './supabase-project-switcher'
import { getAdminSession } from '@/lib/admin-auth'

export function SupabaseManagement() {
  const [config, setConfig] = useState<SupabaseConfig | null>(null)
  const [stats, setStats] = useState<SupabaseStats | null>(null)
  const [tables, setTables] = useState<DatabaseTable[]>([])
  const [projectInfo, setProjectInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [testing, setTesting] = useState(false)
  const [editing, setEditing] = useState(false)
  const [showKeys, setShowKeys] = useState(false)
  const [editValues, setEditValues] = useState({
    url: '',
    anonKey: ''
  })

  useEffect(() => {
    loadSupabaseData()
  }, [])

  const loadSupabaseData = async () => {
    setLoading(true)
    try {
      const [configData, statsData, tablesData, projectData] = await Promise.all([
        getSupabaseConfig(),
        getSupabaseStats(),
        getDatabaseTables(),
        getSupabaseProjectInfo()
      ])

      setConfig(configData)
      setStats(statsData)
      setTables(tablesData)
      setProjectInfo(projectData)
      setEditValues({
        url: configData.url,
        anonKey: configData.anonKey
      })
    } catch (error) {
      console.error('Failed to load Supabase data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleTestConnection = async () => {
    setTesting(true)
    try {
      // Debug the configuration first
      console.log('Testing Supabase connection...')
      debugSupabaseConfig()

      // Test with both methods
      const simpleResult = await testSupabaseSimple()
      console.log('Simple test result:', simpleResult)

      const dynamicResult = await testSupabaseConfiguration()
      console.log('Dynamic test result:', dynamicResult)

      // Show detailed results
      const message = `
Simple Test: ${simpleResult.success ? 'SUCCESS' : 'FAILED'} - ${simpleResult.message}
Dynamic Test: ${dynamicResult.success ? 'SUCCESS' : 'FAILED'} - ${dynamicResult.message}

Check browser console for detailed debug information.
      `

      alert(message)

      if (simpleResult.success || dynamicResult.success) {
        loadSupabaseData() // Reload data if connection successful
      }
    } catch (error: any) {
      console.error('Test connection error:', error)
      alert(`Test failed: ${error.message}`)
    } finally {
      setTesting(false)
    }
  }

  const handleUpdateConfig = async () => {
    const adminSession = getAdminSession()
    if (!adminSession) return

    try {
      const result = await updateSupabaseConfiguration(
        editValues.url,
        editValues.anonKey
      )

      if (result.success) {
        alert('Configuration updated and Supabase client refreshed successfully!')
        setEditing(false)
        // Refresh the client and reload data
        refreshSupabaseClient()
        loadSupabaseData()
      } else {
        alert(result.message)
      }
    } catch (error: any) {
      alert(error.message)
    }
  }

  const handleCreateTables = async () => {
    const adminSession = getAdminSession()
    if (!adminSession) return

    try {
      const result = await createAdminTables(adminSession.user.id)
      alert(result.message)
      if (result.success) {
        loadSupabaseData()
      }
    } catch (error: any) {
      alert(error.message)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const maskKey = (key: string) => {
    if (!key || key.length <= 8) return key
    return key.substring(0, 8) + '•'.repeat(key.length - 16) + key.substring(key.length - 8)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <Badge className="bg-green-100 text-green-800">Connected</Badge>
      case 'disconnected':
        return <Badge className="bg-gray-100 text-gray-800">Disconnected</Badge>
      case 'error':
        return <Badge className="bg-red-100 text-red-800">Error</Badge>
      default:
        return <Badge className="bg-gray-100 text-gray-800">Unknown</Badge>
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'disconnected':
        return <XCircle className="w-5 h-5 text-gray-500" />
      case 'error':
        return <AlertTriangle className="w-5 h-5 text-red-500" />
      default:
        return <XCircle className="w-5 h-5 text-gray-400" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-600">Loading Supabase configuration...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Supabase Management</h2>
          <p className="text-gray-600">Manage your Supabase database configuration and monitoring</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={loadSupabaseData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleTestConnection} disabled={testing}>
            {testing ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4 mr-2" />
            )}
            Test Connection
          </Button>
          <Button variant="outline" onClick={() => debugSupabaseConfig()}>
            <Settings className="w-4 h-4 mr-2" />
            Debug Config
          </Button>
        </div>
      </div>

      {/* Connection Status */}
      <Card className={config?.status === 'connected' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
        <CardHeader>
          <CardTitle className="flex items-center">
            {config && getStatusIcon(config.status)}
            <span className="ml-2">Connection Status</span>
            {config && getStatusBadge(config.status)}
          </CardTitle>
          <CardDescription>
            {config?.status === 'connected'
              ? 'Successfully connected to Supabase database'
              : 'Unable to connect to Supabase database'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Project ID:</span> {config?.projectId || 'Unknown'}
            </div>
            <div>
              <span className="font-medium">Region:</span> {config?.region || 'Unknown'}
            </div>
            <div>
              <span className="font-medium">Last Checked:</span> {config?.lastChecked ? new Date(config.lastChecked).toLocaleString() : 'Never'}
            </div>
            <div>
              <span className="font-medium">Plan:</span> {projectInfo?.plan || 'Unknown'}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Settings className="w-5 h-5 mr-2" />
              Configuration
            </div>
            <Button variant="outline" size="sm" onClick={() => setEditing(!editing)}>
              {editing ? 'Cancel' : 'Edit'}
            </Button>
          </CardTitle>
          <CardDescription>Supabase project connection settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {editing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Supabase URL
                </label>
                <Input
                  value={editValues.url}
                  onChange={(e) => setEditValues({ ...editValues, url: e.target.value })}
                  placeholder="https://your-project.supabase.co"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Anonymous Key
                </label>
                <Input
                  type="password"
                  value={editValues.anonKey}
                  onChange={(e) => setEditValues({ ...editValues, anonKey: e.target.value })}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                />
              </div>
              <div className="flex space-x-2">
                <Button onClick={handleUpdateConfig}>Save Changes</Button>
                <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div>
                  <span className="text-sm font-medium text-gray-700">Supabase URL</span>
                  <p className="text-sm text-gray-600 font-mono">{config?.url || 'Not configured'}</p>
                </div>
                <div className="flex space-x-2">
                  {config?.url && (
                    <>
                      <Button variant="outline" size="sm" onClick={() => copyToClipboard(config.url)}>
                        <Copy className="w-3 h-3" />
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <a href={config.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </Button>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div>
                  <span className="text-sm font-medium text-gray-700">Anonymous Key</span>
                  <p className="text-sm text-gray-600 font-mono">
                    {config?.anonKey ? (showKeys ? config.anonKey : maskKey(config.anonKey)) : 'Not configured'}
                  </p>
                </div>
                <div className="flex space-x-2">
                  {config?.anonKey && (
                    <>
                      <Button variant="outline" size="sm" onClick={() => setShowKeys(!showKeys)}>
                        {showKeys ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => copyToClipboard(config.anonKey)}>
                        <Copy className="w-3 h-3" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Table className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="text-sm font-medium">Tables</p>
                  <p className="text-2xl font-bold">{stats.totalTables}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <BarChart3 className="w-5 h-5 text-green-500" />
                <div>
                  <p className="text-sm font-medium">Total Rows</p>
                  <p className="text-2xl font-bold">{stats.totalRows.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Server className="w-5 h-5 text-purple-500" />
                <div>
                  <p className="text-sm font-medium">Storage</p>
                  <p className="text-2xl font-bold">{stats.storageUsed}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Globe className="w-5 h-5 text-orange-500" />
                <div>
                  <p className="text-sm font-medium">API Calls (24h)</p>
                  <p className="text-2xl font-bold">{stats.apiCalls24h.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Database Tables */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Table className="w-5 h-5 mr-2" />
              Database Tables ({tables.length})
            </div>
            <Button variant="outline" size="sm" onClick={handleCreateTables}>
              Create Admin Tables
            </Button>
          </CardTitle>
          <CardDescription>Tables in your Supabase database</CardDescription>
        </CardHeader>
        <CardContent>
          {tables.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Table className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p>No tables found or unable to access database</p>
              <p className="text-sm">Check your connection and permissions</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tables.map((table) => (
                <div key={`${table.schema}.${table.name}`} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <h4 className="font-medium">{table.name}</h4>
                    <p className="text-sm text-gray-600">Schema: {table.schema}</p>
                  </div>
                  <div className="text-right text-sm text-gray-600">
                    <p>{table.rowCount.toLocaleString()} rows</p>
                    <p>{table.size}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common Supabase management tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Button variant="outline" asChild>
              <a href={`${config?.url}/project/default/editor`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />
                Open SQL Editor
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href={`${config?.url}/project/default/auth/users`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />
                Manage Users
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href={`${config?.url}/project/default/storage/buckets`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />
                Storage Buckets
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />
                Supabase Dashboard
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Project Switcher */}
      <SupabaseProjectSwitcher />

      {/* Debug Section */}
      <EnvDebug />
    </div>
  )
}
