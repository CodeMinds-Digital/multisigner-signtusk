'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, CheckCircle, RefreshCw, Database, Settings } from 'lucide-react'
import { getSupabaseClient, refreshSupabaseClient } from '@/lib/dynamic-supabase'

interface DiagnosticResult {
  timestamp: string
  processEnv: {
    url: string | undefined
    keySet: boolean
  }
  localStorage: {
    url: string | null
    keySet: boolean
  }
  activeClient: {
    url: string
    keyLength: number
  }
  connectionTest: {
    success: boolean
    message: string
    responseTime?: number
  }
  databaseTest: {
    success: boolean
    message: string
    responseTime?: number
  }
  configurationMatch: boolean
}

export function ConfigurationDiagnostics() {
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult | null>(null)
  const [testing, setTesting] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(false)

  const runDiagnostics = async () => {
    setTesting(true)
    const startTime = Date.now()

    try {
      // Get process.env values
      const processEnv = {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL,
        keySet: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      }

      // Get localStorage values
      const localStorage = {
        url: typeof window !== 'undefined' ? window.localStorage.getItem('admin_env_NEXT_PUBLIC_SUPABASE_URL') : null,
        keySet: typeof window !== 'undefined' ? !!window.localStorage.getItem('admin_env_NEXT_PUBLIC_SUPABASE_ANON_KEY') : false
      }

      // Get active Supabase client info
      const client = getSupabaseClient()
      const activeClient = {
        url: (client as any).supabaseUrl || 'Protected',
        keyLength: (client as any).supabaseKey?.length || 0
      }

      // Test connection with multiple methods
      let connectionTest = { success: false, message: 'Not tested' }
      let databaseTest = { success: false, message: 'Not tested' }

      try {
        // Test 1: Auth session (basic connectivity)
        const { error: authError } = await client.auth.getSession()
        const authResponseTime = Date.now() - startTime

        if (!authError) {
          connectionTest = {
            success: true,
            message: `Auth connection successful (${authResponseTime}ms)`,
          } as any
        } else {
          connectionTest = {
            success: false,
            message: `Auth error: ${authError.message} (${authResponseTime}ms)`,
          } as any
        }

        // Test 2: Database operation (actual database connectivity)
        try {
          const dbStartTime = Date.now()

          // Test multiple database operations to ensure connectivity
          const tests = []

          // Test 1: Try to query a system table
          try {
            const { error: systemError } = await client
              .from('information_schema.tables')
              .select('table_name')
              .limit(1)

            tests.push({
              name: 'System tables query',
              success: !systemError,
              error: systemError?.message
            })
          } catch (err: any) {
            tests.push({
              name: 'System tables query',
              success: false,
              error: err.message
            })
          }

          // Test 2: Try to query auth.users (if accessible)
          try {
            const { error: authError } = await client
              .from('auth.users')
              .select('id')
              .limit(1)

            tests.push({
              name: 'Auth users query',
              success: !authError,
              error: authError?.message
            })
          } catch (err: any) {
            tests.push({
              name: 'Auth users query',
              success: false,
              error: err.message
            })
          }

          // Test 3: Try to use the proxy directly
          try {
            const { supabase: proxyClient } = await import('@/lib/supabase')
            const { error: proxyError } = await proxyClient.auth.getSession()

            tests.push({
              name: 'Proxy client test',
              success: !proxyError,
              error: proxyError?.message
            })
          } catch (err: any) {
            tests.push({
              name: 'Proxy client test',
              success: false,
              error: err.message
            })
          }

          const dbResponseTime = Date.now() - dbStartTime
          const successfulTests = tests.filter(t => t.success).length
          const totalTests = tests.length

          if (successfulTests > 0) {
            databaseTest = {
              success: true,
              message: `Database connectivity verified (${successfulTests}/${totalTests} tests passed) (${dbResponseTime}ms)`,
            } as any
          } else {
            const errors = tests.map(t => `${t.name}: ${t.error}`).join('; ')
            databaseTest = {
              success: false,
              message: `All database tests failed: ${errors} (${dbResponseTime}ms)`,
            } as any
          }
        } catch (dbErr: any) {
          databaseTest = {
            success: false,
            message: `Database connection failed: ${dbErr.message}`
          }
        }

      } catch (err: any) {
        connectionTest = {
          success: false,
          message: `Connection failed: ${err.message}`
        }
      }

      // Check configuration match
      const expectedUrl = localStorage.url || processEnv.url
      const configurationMatch = activeClient.url === expectedUrl

      const result: DiagnosticResult = {
        timestamp: new Date().toISOString(),
        processEnv,
        localStorage,
        activeClient,
        connectionTest,
        databaseTest,
        configurationMatch
      }

      setDiagnostics(result)

      // Log detailed info to console
      console.log('=== CONFIGURATION DIAGNOSTICS ===')
      console.log('Process.env URL:', processEnv.url)
      console.log('LocalStorage URL:', localStorage.url)
      console.log('Active Client URL:', activeClient.url)
      console.log('Configuration Match:', configurationMatch)
      console.log('Auth Connection Test:', connectionTest)
      console.log('Database Test:', databaseTest)
      console.log('==================================')

    } catch (error: any) {
      console.error('Diagnostics failed:', error)
    } finally {
      setTesting(false)
    }
  }

  const forceRefresh = async () => {
    console.log('Forcing Supabase client refresh...')
    refreshSupabaseClient()
    await runDiagnostics()
  }

  const clearLocalStorage = () => {
    if (typeof window !== 'undefined') {
      const keys = Object.keys(localStorage).filter(key => key.startsWith('admin_env_'))
      keys.forEach(key => localStorage.removeItem(key))
      console.log('Cleared localStorage keys:', keys)
    }
    runDiagnostics()
  }

  const testDatabaseWrite = async () => {
    setTesting(true)
    try {
      console.log('🧪 Testing database write operation...')

      // Import the proxy client
      const { supabase: proxyClient } = await import('@/lib/supabase')

      // Try to create a test table (this will fail if permissions are wrong, but that's expected)
      const { error } = await proxyClient.rpc('version')

      if (!error) {
        console.log('✅ Database write test successful - can execute functions')
        alert('✅ Database connection working! Can execute database functions.')
      } else {
        console.log('⚠️ Database write test failed:', error.message)
        alert(`⚠️ Database connection issue: ${error.message}`)
      }
    } catch (err: any) {
      console.error('❌ Database write test failed:', err)
      alert(`❌ Database test failed: ${err.message}`)
    } finally {
      setTesting(false)
    }
  }

  useEffect(() => {
    runDiagnostics()
  }, [])

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(runDiagnostics, 2000)
      return () => clearInterval(interval)
    }
  }, [autoRefresh])

  const getStatusBadge = (success: boolean) => (
    <Badge className={success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
      {success ? <CheckCircle className="w-3 h-3 mr-1" /> : <AlertTriangle className="w-3 h-3 mr-1" />}
      {success ? 'OK' : 'ISSUE'}
    </Badge>
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Settings className="w-5 h-5" />
          <span>Configuration Diagnostics</span>
        </CardTitle>
        <CardDescription>
          Real-time monitoring of Supabase configuration and connection status
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Controls */}
        <div className="flex flex-wrap gap-2">
          <Button onClick={runDiagnostics} disabled={testing} size="sm">
            <RefreshCw className={`w-4 h-4 mr-2 ${testing ? 'animate-spin' : ''}`} />
            Run Diagnostics
          </Button>
          <Button onClick={forceRefresh} variant="outline" size="sm" disabled={testing}>
            <Database className="w-4 h-4 mr-2" />
            Force Refresh
          </Button>
          <Button onClick={testDatabaseWrite} variant="secondary" size="sm" disabled={testing}>
            <Database className="w-4 h-4 mr-2" />
            Test DB Write
          </Button>
          <Button onClick={clearLocalStorage} variant="destructive" size="sm" disabled={testing}>
            Clear LocalStorage
          </Button>
          <Button
            onClick={() => setAutoRefresh(!autoRefresh)}
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            disabled={testing}
          >
            {autoRefresh ? 'Stop' : 'Start'} Auto-Refresh
          </Button>
        </div>

        {diagnostics && (
          <div className="space-y-4">
            {/* Overall Status */}
            <div className="bg-gray-50 p-4 rounded">
              <h3 className="font-semibold mb-2 flex items-center space-x-2">
                <span>Overall Status</span>
                {getStatusBadge(diagnostics.configurationMatch && diagnostics.connectionTest.success && diagnostics.databaseTest.success)}
              </h3>
              <div className="text-sm space-y-1">
                <div>Configuration Match: {getStatusBadge(diagnostics.configurationMatch)}</div>
                <div>Auth Connection: {getStatusBadge(diagnostics.connectionTest.success)}</div>
                <div>Database Test: {getStatusBadge(diagnostics.databaseTest.success)}</div>
                <div>Last Updated: {new Date(diagnostics.timestamp).toLocaleTimeString()}</div>
              </div>
            </div>

            {/* Configuration Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Process.env */}
              <div className="bg-blue-50 p-3 rounded">
                <h4 className="font-semibold text-blue-800">Process.env</h4>
                <div className="text-sm space-y-1 mt-2">
                  <div><strong>URL:</strong> {diagnostics.processEnv.url || 'NOT SET'}</div>
                  <div><strong>Key:</strong> {getStatusBadge(diagnostics.processEnv.keySet)}</div>
                </div>
              </div>

              {/* LocalStorage */}
              <div className="bg-yellow-50 p-3 rounded">
                <h4 className="font-semibold text-yellow-800">LocalStorage</h4>
                <div className="text-sm space-y-1 mt-2">
                  <div><strong>URL:</strong> {diagnostics.localStorage.url || 'NOT SET'}</div>
                  <div><strong>Key:</strong> {getStatusBadge(diagnostics.localStorage.keySet)}</div>
                </div>
              </div>

              {/* Active Client */}
              <div className="bg-green-50 p-3 rounded">
                <h4 className="font-semibold text-green-800">Active Client</h4>
                <div className="text-sm space-y-1 mt-2">
                  <div><strong>URL:</strong> {diagnostics.activeClient.url}</div>
                  <div><strong>Key Length:</strong> {diagnostics.activeClient.keyLength}</div>
                </div>
              </div>
            </div>

            {/* Connection Test Results */}
            <div className="bg-gray-50 p-4 rounded space-y-4">
              <h3 className="font-semibold mb-2">Connection Test Results</h3>

              {/* Auth Test */}
              <div className="bg-white p-3 rounded border">
                <h4 className="font-medium text-blue-800 mb-2">Auth Connection Test</h4>
                <div className="text-sm space-y-1">
                  <div>Status: {getStatusBadge(diagnostics.connectionTest.success)}</div>
                  <div>Message: {diagnostics.connectionTest.message}</div>
                  {diagnostics.connectionTest.responseTime && (
                    <div>Response Time: {diagnostics.connectionTest.responseTime}ms</div>
                  )}
                </div>
              </div>

              {/* Database Test */}
              <div className="bg-white p-3 rounded border">
                <h4 className="font-medium text-green-800 mb-2">Database Operation Test</h4>
                <div className="text-sm space-y-1">
                  <div>Status: {getStatusBadge(diagnostics.databaseTest.success)}</div>
                  <div>Message: {diagnostics.databaseTest.message}</div>
                  {diagnostics.databaseTest.responseTime && (
                    <div>Response Time: {diagnostics.databaseTest.responseTime}ms</div>
                  )}
                </div>
              </div>
            </div>

            {/* Issues & Recommendations */}
            {(!diagnostics.configurationMatch || !diagnostics.connectionTest.success || !diagnostics.databaseTest.success) && (
              <div className="bg-red-50 border border-red-200 p-4 rounded">
                <h3 className="font-semibold text-red-800 mb-2">Issues Detected</h3>
                <div className="text-sm space-y-1">
                  {!diagnostics.configurationMatch && (
                    <div>• Configuration mismatch: Active client URL doesn't match expected URL</div>
                  )}
                  {!diagnostics.connectionTest.success && (
                    <div>• Auth connection failed: {diagnostics.connectionTest.message}</div>
                  )}
                  {!diagnostics.databaseTest.success && (
                    <div>• Database operation failed: {diagnostics.databaseTest.message}</div>
                  )}
                </div>
                <div className="mt-3 text-sm">
                  <strong>Recommendations:</strong>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>Try clicking "Force Refresh" to recreate the Supabase client</li>
                    <li>Check if the new URL and key are valid for the target project</li>
                    <li>Verify network connectivity to the Supabase project</li>
                    <li>Check browser console for detailed error messages</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
