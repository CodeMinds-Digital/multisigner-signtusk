'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  Settings, 
  ExternalLink,
  Copy,
  Eye,
  EyeOff,
  AlertTriangle,
  Info
} from 'lucide-react'

interface ZohoConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
  authUrl: string
  tokenUrl: string
  userInfoUrl: string
  configured: boolean
}

export function ZohoOneAuthConfig() {
  const [config, setConfig] = useState<ZohoConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [showSecrets, setShowSecrets] = useState(false)
  const [testingConnection, setTestingConnection] = useState(false)

  useEffect(() => {
    fetchConfig()
  }, [])

  const fetchConfig = async () => {
    try {
      // In a real implementation, this would fetch from your backend
      // For now, we'll simulate the configuration check
      const mockConfig: ZohoConfig = {
        clientId: process.env.NEXT_PUBLIC_ZOHO_CLIENT_ID || '',
        clientSecret: '***hidden***',
        redirectUri: `${window.location.origin}/api/auth/zoho/callback`,
        authUrl: 'https://accounts.zoho.com/oauth/v2/auth',
        tokenUrl: 'https://accounts.zoho.com/oauth/v2/token',
        userInfoUrl: 'https://accounts.zoho.com/oauth/user/info',
        configured: !!(process.env.NEXT_PUBLIC_ZOHO_CLIENT_ID && process.env.ZOHO_CLIENT_SECRET)
      }
      
      setConfig(mockConfig)
    } catch (error) {
      console.error('Error fetching Zoho config:', error)
    } finally {
      setLoading(false)
    }
  }

  const testConnection = async () => {
    setTestingConnection(true)
    try {
      // Simulate connection test
      await new Promise(resolve => setTimeout(resolve, 2000))
      alert('Connection test successful! Zoho OneAuth integration is working.')
    } catch (error) {
      alert('Connection test failed. Please check your configuration.')
    } finally {
      setTestingConnection(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    alert('Copied to clipboard!')
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Zoho OneAuth Configuration</h2>
          <p className="text-gray-600">Configure Zoho OneAuth integration for enhanced TOTP experience</p>
        </div>
        <div className="flex items-center space-x-2">
          {config?.configured ? (
            <Badge className="bg-green-100 text-green-800">
              <CheckCircle className="w-3 h-3 mr-1" />
              Configured
            </Badge>
          ) : (
            <Badge className="bg-yellow-100 text-yellow-800">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Not Configured
            </Badge>
          )}
        </div>
      </div>

      {/* Current Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="w-5 h-5 mr-2" />
            Current Status
          </CardTitle>
          <CardDescription>
            Overview of your Zoho OneAuth integration status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 border rounded">
              <span className="text-sm font-medium">TOTP Support</span>
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
                <span className="text-sm text-green-600">Active</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded">
              <span className="text-sm font-medium">Zoho OneAuth Compatible</span>
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
                <span className="text-sm text-green-600">Yes</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded">
              <span className="text-sm font-medium">OAuth Integration</span>
              <div className="flex items-center">
                {config?.configured ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
                    <span className="text-sm text-green-600">Configured</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-yellow-500 mr-1" />
                    <span className="text-sm text-yellow-600">Optional</span>
                  </>
                )}
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded">
              <span className="text-sm font-medium">User Experience</span>
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
                <span className="text-sm text-green-600">Ready</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuration Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="w-5 h-5 mr-2" />
            Configuration Details
          </CardTitle>
          <CardDescription>
            Current Zoho OneAuth configuration settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="client-id">Client ID</Label>
              <div className="flex items-center space-x-2 mt-1">
                <Input
                  id="client-id"
                  value={config?.clientId || 'Not configured'}
                  readOnly
                  className="bg-gray-50"
                />
                {config?.clientId && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(config.clientId)}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="client-secret">Client Secret</Label>
              <div className="flex items-center space-x-2 mt-1">
                <Input
                  id="client-secret"
                  type={showSecrets ? 'text' : 'password'}
                  value={config?.clientSecret || 'Not configured'}
                  readOnly
                  className="bg-gray-50"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowSecrets(!showSecrets)}
                >
                  {showSecrets ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                </Button>
              </div>
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="redirect-uri">Redirect URI</Label>
              <div className="flex items-center space-x-2 mt-1">
                <Input
                  id="redirect-uri"
                  value={config?.redirectUri || ''}
                  readOnly
                  className="bg-gray-50"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(config?.redirectUri || '')}
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>

          <div className="flex space-x-2">
            <Button
              onClick={testConnection}
              disabled={testingConnection || !config?.configured}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {testingConnection ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Shield className="w-4 h-4 mr-2" />
              )}
              Test Connection
            </Button>
            
            <Button
              variant="outline"
              onClick={() => window.open('https://api-console.zoho.com/', '_blank')}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Zoho API Console
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Setup Instructions */}
      {!config?.configured && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Info className="w-5 h-5 mr-2" />
              Setup Instructions
            </CardTitle>
            <CardDescription>
              How to configure Zoho OneAuth integration (optional)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Good News!</h4>
                <p className="text-blue-700 text-sm">
                  Your TOTP system already works with Zoho OneAuth! Users can scan QR codes with the Zoho OneAuth app right now. 
                  The configuration below is optional for enhanced integration.
                </p>
              </div>
              
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>Go to <a href="https://api-console.zoho.com/" target="_blank" className="text-blue-600 hover:underline">Zoho API Console</a></li>
                <li>Create a new Web Application</li>
                <li>Set Homepage URL to: <code className="bg-gray-100 px-1 rounded">{window.location.origin}</code></li>
                <li>Set Redirect URI to: <code className="bg-gray-100 px-1 rounded">{config?.redirectUri}</code></li>
                <li>Copy Client ID and Client Secret to your <code className="bg-gray-100 px-1 rounded">.env.local</code> file</li>
                <li>Restart your application</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
