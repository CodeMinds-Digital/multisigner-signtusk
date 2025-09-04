'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { debugSupabaseConfig, testSupabaseSimple } from '@/lib/debug-supabase'
import { getSupabaseInfo, detectAndFixConfigurationMismatch } from '@/lib/dynamic-supabase'

export function EnvDebug() {
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [testResult, setTestResult] = useState<any>(null)

  const runDebug = () => {
    console.log('Running environment debug...')
    const config = debugSupabaseConfig()
    const supabaseInfo = getSupabaseInfo()
    const mismatchCheck = detectAndFixConfigurationMismatch()

    setDebugInfo({
      config,
      supabaseInfo,
      mismatchCheck,
      timestamp: new Date().toISOString()
    })
  }

  const runTest = async () => {
    console.log('Running Supabase test...')
    const result = await testSupabaseSimple()
    setTestResult(result)
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Environment Debug</CardTitle>
          <CardDescription>Debug environment variables and Supabase configuration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <Button onClick={runDebug}>Debug Config</Button>
            <Button onClick={runTest}>Test Connection</Button>
          </div>

          {debugInfo && (
            <div className="space-y-4">
              <h3 className="font-semibold">Configuration Info:</h3>
              <div className="bg-gray-50 p-4 rounded text-sm font-mono space-y-1">
                <div><strong>Process.env URL:</strong> {process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT SET'}</div>
                <div><strong>Process.env Key:</strong> {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET'}</div>
                <div><strong>LocalStorage URL:</strong> {debugInfo.config.url || 'NOT SET'}</div>
                <div><strong>LocalStorage Key:</strong> {debugInfo.config.anonKey ? 'SET' : 'NOT SET'}</div>
                <div><strong>Final URL:</strong> {debugInfo.supabaseInfo.url}</div>
                <div><strong>Final Key:</strong> {debugInfo.supabaseInfo.anonKey ? 'SET' : 'NOT SET'}</div>
                <div><strong>Is Configured:</strong> {debugInfo.supabaseInfo.isConfigured ? 'YES' : 'NO'}</div>
                <hr className="my-2" />
                <div><strong>Mismatch Check:</strong> {debugInfo.mismatchCheck.fixed ? 'FIXED' : 'OK'}</div>
                <div><strong>Message:</strong> {debugInfo.mismatchCheck.message}</div>
              </div>
            </div>
          )}

          {testResult && (
            <div className="space-y-2">
              <h3 className="font-semibold">Test Result:</h3>
              <div className="flex items-center space-x-2">
                <Badge className={testResult.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                  {testResult.success ? 'SUCCESS' : 'FAILED'}
                </Badge>
                <span className="text-sm">{testResult.message}</span>
              </div>
              {testResult.debug && (
                <div className="bg-gray-50 p-4 rounded text-sm font-mono">
                  <pre>{JSON.stringify(testResult.debug, null, 2)}</pre>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
