'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Settings, Eye, EyeOff, Copy, Download, Upload, RefreshCw,
  CheckCircle, AlertTriangle, XCircle, Plus, Edit, Trash2,
  Database, Mail, Shield, Key, Globe, Server, HelpCircle
} from 'lucide-react'
import {
  getEnvironmentVariables,
  updateEnvironmentVariable,
  deleteEnvironmentVariable,
  testEnvironmentVariable,
  generateEnvFileContent,
  exportEnvironmentVariables,
  EnvironmentVariable
} from '@/lib/admin-env-service'
import { getAdminSession } from '@/lib/admin-auth'
import { EnvironmentSetupGuide } from './environment-setup-guide'
import { refreshSupabaseClient, detectAndFixConfigurationMismatch } from '@/lib/dynamic-supabase'
import { resetEnvironmentVariablesToDefaults, fixConfigurationMismatch } from '@/lib/admin-env-service'

export function EnvironmentManagement() {
  const [envVars, setEnvVars] = useState<EnvironmentVariable[]>([])
  const [loading, setLoading] = useState(true)
  const [editingVar, setEditingVar] = useState<string | null>(null)
  const [visibleVars, setVisibleVars] = useState<Set<string>>(new Set())
  const [testingVar, setTestingVar] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Record<string, string>>({})
  const [showSetupGuide, setShowSetupGuide] = useState(false)

  useEffect(() => {
    loadEnvironmentVariables()
  }, [])

  const loadEnvironmentVariables = () => {
    setLoading(true)
    try {
      const vars = getEnvironmentVariables()
      setEnvVars(vars)

      // Initialize edit values
      const values: Record<string, string> = {}
      vars.forEach(v => {
        values[v.key] = v.value
      })
      setEditValues(values)
    } catch (error) {
      console.error('Failed to load environment variables:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefreshSupabase = () => {
    try {
      refreshSupabaseClient()
      alert('Supabase client refreshed with current environment variables!')
      loadEnvironmentVariables()
    } catch (error: any) {
      alert(`Failed to refresh Supabase client: ${error.message}`)
    }
  }

  const handleResetToDefaults = async () => {
    const adminSession = getAdminSession()
    if (!adminSession) return

    if (!confirm('Reset all environment variables to process.env defaults? This will clear all admin overrides.')) {
      return
    }

    try {
      const result = await resetEnvironmentVariablesToDefaults(adminSession.user.id)
      if (result.success) {
        alert(`Successfully reset ${result.resetCount || 0} environment variables to defaults!`)
        loadEnvironmentVariables()
      } else {
        alert(result.error)
      }
    } catch (error: any) {
      alert(`Failed to reset environment variables: ${error.message}`)
    }
  }

  const handleFixMismatch = async () => {
    const adminSession = getAdminSession()
    if (!adminSession) return

    try {
      const result = await fixConfigurationMismatch(adminSession.user.id)
      if (result.success) {
        alert(result.message || 'Configuration checked')
        loadEnvironmentVariables()
      } else {
        alert(result.error)
      }
    } catch (error: any) {
      alert(`Failed to fix configuration: ${error.message}`)
    }
  }

  const handleUpdateVariable = async (key: string) => {
    const adminSession = getAdminSession()
    if (!adminSession) return

    // Special handling for Supabase URL changes
    if (key === 'NEXT_PUBLIC_SUPABASE_URL') {
      const newValue = editValues[key] || ''
      const processUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''

      if (newValue && processUrl) {
        try {
          const processProjectId = new URL(processUrl).hostname.split('.')[0]
          const newProjectId = new URL(newValue).hostname.split('.')[0]

          if (processProjectId !== newProjectId) {
            const confirmed = confirm(
              `You're changing from project "${processProjectId}" to "${newProjectId}".\n\n` +
              `This will:\n` +
              `• Switch to a different Supabase database\n` +
              `• Require updating the anonymous key to match\n` +
              `• May affect existing data access\n\n` +
              `Continue with this change?`
            )

            if (!confirmed) {
              return
            }
          }
        } catch (error) {
          alert('Invalid URL format')
          return
        }
      }
    }

    try {
      const result = await updateEnvironmentVariable(key, editValues[key] || '', adminSession.user.id)
      if (result.success) {
        // Show success message with specific info for Supabase keys
        if (key === 'NEXT_PUBLIC_SUPABASE_URL' || key === 'NEXT_PUBLIC_SUPABASE_ANON_KEY') {
          alert('Environment variable updated and Supabase client refreshed successfully!')
        } else {
          alert('Environment variable updated successfully!')
        }
        loadEnvironmentVariables()
        setEditingVar(null)
      } else {
        alert(result.error)
      }
    } catch (error: any) {
      alert(error.message)
    }
  }

  const handleDeleteVariable = async (key: string) => {
    const adminSession = getAdminSession()
    if (!adminSession) return

    if (confirm(`Are you sure you want to delete ${key}?`)) {
      try {
        const result = await deleteEnvironmentVariable(key, adminSession.user.id)
        if (result.success) {
          loadEnvironmentVariables()
        } else {
          alert(result.error)
        }
      } catch (error: any) {
        alert(error.message)
      }
    }
  }

  const handleTestVariable = async (key: string) => {
    setTestingVar(key)
    try {
      const result = await testEnvironmentVariable(key)
      alert(result.message)
    } catch (error: any) {
      alert(error.message)
    } finally {
      setTestingVar(null)
    }
  }

  const toggleVariableVisibility = (key: string) => {
    const newVisible = new Set(visibleVars)
    if (newVisible.has(key)) {
      newVisible.delete(key)
    } else {
      newVisible.add(key)
    }
    setVisibleVars(newVisible)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const downloadEnvFile = () => {
    const content = generateEnvFileContent()
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = '.env.local'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const exportVariables = () => {
    const content = exportEnvironmentVariables()
    const blob = new Blob([content], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'environment-variables-export.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const maskValue = (value: string, sensitive: boolean) => {
    if (!sensitive || !value) return value
    if (value.length <= 8) return '•'.repeat(value.length)
    return value.substring(0, 4) + '•'.repeat(value.length - 8) + value.substring(value.length - 4)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'configured':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'invalid':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />
      case 'missing':
        return <XCircle className="w-4 h-4 text-red-500" />
      default:
        return <XCircle className="w-4 h-4 text-gray-400" />
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'database':
        return <Database className="w-4 h-4" />
      case 'email':
        return <Mail className="w-4 h-4" />
      case 'auth':
        return <Shield className="w-4 h-4" />
      case 'api':
        return <Key className="w-4 h-4" />
      case 'app':
        return <Globe className="w-4 h-4" />
      case 'storage':
        return <Server className="w-4 h-4" />
      default:
        return <Settings className="w-4 h-4" />
    }
  }

  const getStatusBadge = (status: string, required: boolean) => {
    const baseClasses = "text-xs"
    switch (status) {
      case 'configured':
        return <Badge className={`${baseClasses} bg-green-100 text-green-800`}>Configured</Badge>
      case 'invalid':
        return <Badge className={`${baseClasses} bg-yellow-100 text-yellow-800`}>Invalid</Badge>
      case 'missing':
        return <Badge className={`${baseClasses} ${required ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
          {required ? 'Required' : 'Missing'}
        </Badge>
      default:
        return <Badge className={`${baseClasses} bg-gray-100 text-gray-800`}>Unknown</Badge>
    }
  }

  const requiredVars = envVars.filter(v => v.required)
  const missingRequired = requiredVars.filter(v => v.status === 'missing' || v.status === 'invalid')
  const categories = ['database', 'email', 'auth', 'api', 'app', 'storage']

  if (showSetupGuide) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Environment Setup Guide</h2>
            <p className="text-gray-600">Step-by-step guide to configure your environment</p>
          </div>
          <Button variant="outline" onClick={() => setShowSetupGuide(false)}>
            Back to Environment Management
          </Button>
        </div>
        <EnvironmentSetupGuide />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Environment Management</h2>
          <p className="text-gray-600">Manage application environment variables and configuration</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => setShowSetupGuide(!showSetupGuide)}>
            <HelpCircle className="w-4 h-4 mr-2" />
            Setup Guide
          </Button>
          <Button variant="outline" onClick={loadEnvironmentVariables} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleRefreshSupabase}>
            <Database className="w-4 h-4 mr-2" />
            Refresh Supabase
          </Button>
          <Button variant="outline" onClick={handleFixMismatch}>
            <Shield className="w-4 h-4 mr-2" />
            Fix Config
          </Button>
          <Button variant="destructive" onClick={handleResetToDefaults}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Reset to Default
          </Button>
          <Button variant="outline" onClick={exportVariables}>
            <Upload className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button onClick={downloadEnvFile}>
            <Download className="w-4 h-4 mr-2" />
            Download .env
          </Button>
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm font-medium">Configured</p>
                <p className="text-2xl font-bold">{envVars.filter(v => v.status === 'configured').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <XCircle className="w-5 h-5 text-red-500" />
              <div>
                <p className="text-sm font-medium">Missing Required</p>
                <p className="text-2xl font-bold text-red-600">{missingRequired.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              <div>
                <p className="text-sm font-medium">Invalid</p>
                <p className="text-2xl font-bold text-yellow-600">{envVars.filter(v => v.status === 'invalid').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Settings className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Total Variables</p>
                <p className="text-2xl font-bold">{envVars.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Missing Required Alert */}
      {missingRequired.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800 flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Missing Required Configuration
            </CardTitle>
            <CardDescription className="text-red-600">
              The following required environment variables are missing or invalid:
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {missingRequired.map(envVar => (
                <div key={envVar.key} className="flex items-center justify-between p-2 bg-white rounded border">
                  <div>
                    <span className="font-medium text-red-800">{envVar.key}</span>
                    <p className="text-sm text-red-600">{envVar.description}</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setEditingVar(envVar.key)}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Configure
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Environment Variables by Category */}
      {categories.map(category => {
        const categoryVars = envVars.filter(v => v.category === category)
        if (categoryVars.length === 0) return null

        return (
          <Card key={category}>
            <CardHeader>
              <CardTitle className="flex items-center capitalize">
                {getCategoryIcon(category)}
                <span className="ml-2">{category} Configuration</span>
              </CardTitle>
              <CardDescription>
                {category === 'database' && 'Database connection and storage settings'}
                {category === 'email' && 'Email service configuration for notifications'}
                {category === 'auth' && 'Authentication and security settings'}
                {category === 'api' && 'External API keys and integrations'}
                {category === 'app' && 'Application-wide configuration'}
                {category === 'storage' && 'File storage and media settings'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {categoryVars.map(envVar => (
                  <div key={envVar.key} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          {getStatusIcon(envVar.status)}
                          <h3 className="text-lg font-medium text-gray-900">{envVar.key}</h3>
                          {getStatusBadge(envVar.status, envVar.required)}
                          {envVar.sensitive && (
                            <Badge className="text-xs bg-purple-100 text-purple-800">Sensitive</Badge>
                          )}
                        </div>

                        <p className="text-sm text-gray-600 mb-3">{envVar.description}</p>

                        {editingVar === envVar.key ? (
                          <div className="space-y-2">
                            <Input
                              type={envVar.sensitive ? 'password' : 'text'}
                              value={editValues[envVar.key] || ''}
                              onChange={(e) => setEditValues({
                                ...editValues,
                                [envVar.key]: e.target.value
                              })}
                              placeholder={`Enter ${envVar.key}`}
                            />
                            <div className="flex space-x-2">
                              <Button size="sm" onClick={() => handleUpdateVariable(envVar.key)}>
                                Save
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => setEditingVar(null)}>
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <div className="flex-1 font-mono text-sm bg-gray-50 p-2 rounded border">
                              {envVar.value ?
                                (visibleVars.has(envVar.key) ? envVar.value : maskValue(envVar.value, envVar.sensitive)) :
                                <span className="text-gray-400">Not configured</span>
                              }
                            </div>
                            {envVar.value && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => toggleVariableVisibility(envVar.key)}
                                >
                                  {visibleVars.has(envVar.key) ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => copyToClipboard(envVar.value)}
                                >
                                  <Copy className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        )}

                        {envVar.lastUpdated && (
                          <p className="text-xs text-gray-500 mt-2">
                            Last updated: {new Date(envVar.lastUpdated).toLocaleString()}
                          </p>
                        )}
                      </div>

                      <div className="flex space-x-2 ml-4">
                        {envVar.value && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTestVariable(envVar.key)}
                            disabled={testingVar === envVar.key}
                          >
                            {testingVar === envVar.key ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <CheckCircle className="w-4 h-4" />
                            )}
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingVar(envVar.key)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        {!envVar.required && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteVariable(envVar.key)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
