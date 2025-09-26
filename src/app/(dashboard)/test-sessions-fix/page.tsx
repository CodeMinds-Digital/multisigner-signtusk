'use client'

import React, { useState } from 'react'
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, Database, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function TestSessionsFixPage() {
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [createStatus, setCreateStatus] = useState<'idle' | 'creating' | 'success' | 'error'>('idle')
  const [testResults, setTestResults] = useState<any>(null)
  const [error, setError] = useState('')

  const runSessionsTest = async () => {
    setTestStatus('testing')
    setError('')
    setTestResults(null)
    
    try {
      const response = await fetch('/api/test/sessions', {
        credentials: 'include'
      })

      if (response.ok) {
        const result = await response.json()
        setTestResults(result.data)
        setTestStatus('success')
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to test sessions')
        setTestStatus('error')
      }
    } catch (err) {
      console.error('Test error:', err)
      setError('Network error testing sessions')
      setTestStatus('error')
    }
  }

  const createMockSessions = async () => {
    setCreateStatus('creating')
    setError('')
    
    try {
      const response = await fetch('/api/test/sessions', {
        method: 'POST',
        credentials: 'include'
      })

      if (response.ok) {
        const result = await response.json()
        setCreateStatus('success')
        // Re-run the test to see the new sessions
        setTimeout(() => runSessionsTest(), 1000)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to create mock sessions')
        setCreateStatus('error')
      }
    } catch (err) {
      console.error('Create error:', err)
      setError('Network error creating sessions')
      setCreateStatus('error')
    }
  }

  const testActiveSessionsAPI = async () => {
    try {
      const response = await fetch('/api/user/active-sessions', {
        credentials: 'include'
      })

      const result = await response.json()
      console.log('Active Sessions API Result:', result)
      
      if (response.ok) {
        alert(`Active Sessions API Test:\n✅ Success\nSessions found: ${result.data?.length || 0}`)
      } else {
        alert(`Active Sessions API Test:\n❌ Failed\nError: ${result.error}`)
      }
    } catch (err) {
      alert(`Active Sessions API Test:\n❌ Network Error\nDetails: ${err}`)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />
      case 'testing':
      case 'creating':
        return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
      default:
        return <AlertTriangle className="w-5 h-5 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-green-700 bg-green-50 border-green-200'
      case 'error':
        return 'text-red-700 bg-red-50 border-red-200'
      case 'testing':
      case 'creating':
        return 'text-blue-700 bg-blue-50 border-blue-200'
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200'
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Sessions Fix & Test</h1>
        <p className="text-gray-600">Diagnose and fix the "Failed to fetch active sessions" error</p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center mb-6">
          <XCircle className="w-5 h-5 text-red-500 mr-3" />
          <span className="text-red-800">{error}</span>
        </div>
      )}

      {/* Test Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <Database className="w-5 h-5 mr-2" />
              Test Sessions
            </CardTitle>
            <CardDescription>Check table structure and data</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={runSessionsTest} 
              disabled={testStatus === 'testing'}
              className="w-full"
            >
              {testStatus === 'testing' ? 'Testing...' : 'Run Test'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Create Sessions
            </CardTitle>
            <CardDescription>Create mock sessions for testing</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={createMockSessions} 
              disabled={createStatus === 'creating'}
              className="w-full"
              variant="outline"
            >
              {createStatus === 'creating' ? 'Creating...' : 'Create Mock'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Test API</CardTitle>
            <CardDescription>Test the actual API endpoint</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={testActiveSessionsAPI} 
              className="w-full"
              variant="secondary"
            >
              Test API
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Test Results */}
      {testResults && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              {getStatusIcon(testStatus)}
              <span className="ml-2">Test Results</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`p-4 rounded-lg border ${getStatusColor(testStatus)}`}>
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium">User ID:</h4>
                  <p className="text-sm font-mono">{testResults.userId}</p>
                </div>
                
                <div>
                  <h4 className="font-medium">Table Status:</h4>
                  <p className="text-sm">
                    {testResults.tableExists ? '✅ Table exists' : '❌ Table missing'}
                  </p>
                </div>

                <div>
                  <h4 className="font-medium">Sessions:</h4>
                  <p className="text-sm">
                    Existing: {testResults.existingSessionsCount} | 
                    Active: {testResults.activeSessionsCount} |
                    Created New: {testResults.createdNewSession ? 'Yes' : 'No'}
                  </p>
                </div>

                <div>
                  <h4 className="font-medium">Test Results:</h4>
                  <div className="text-sm space-y-1">
                    <p>• Table Check: {testResults.testResults?.tableCheck}</p>
                    <p>• Session Fetch: {testResults.testResults?.sessionFetch}</p>
                    <p>• Active Sessions API: {testResults.testResults?.activeSessionsAPI}</p>
                  </div>
                </div>

                {testResults.activeSessions && testResults.activeSessions.length > 0 && (
                  <div>
                    <h4 className="font-medium">Active Sessions:</h4>
                    <div className="text-sm space-y-2 mt-2">
                      {testResults.activeSessions.slice(0, 3).map((session: any, index: number) => (
                        <div key={index} className="bg-white p-2 rounded border">
                          <p>IP: {session.ip_address}</p>
                          <p>Device: {session.user_agent?.substring(0, 50)}...</p>
                          <p>Current: {session.is_current ? 'Yes' : 'No'}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>How to Fix Sessions Issue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-blue-700">Step 1: Run Test</h4>
              <p className="text-sm text-gray-600">Click "Run Test" to check if the user_sessions table exists and has data</p>
            </div>
            
            <div>
              <h4 className="font-medium text-blue-700">Step 2: Create Mock Sessions (if needed)</h4>
              <p className="text-sm text-gray-600">If no sessions exist, click "Create Mock" to create sample sessions</p>
            </div>
            
            <div>
              <h4 className="font-medium text-blue-700">Step 3: Test API</h4>
              <p className="text-sm text-gray-600">Click "Test API" to verify the active sessions endpoint works</p>
            </div>
            
            <div>
              <h4 className="font-medium text-blue-700">Step 4: Check General Security</h4>
              <p className="text-sm text-gray-600">Go to Settings → Security → General Security to verify the error is fixed</p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mt-4">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> The "Failed to fetch active sessions" error is usually caused by:
                <br />• Missing user_sessions table
                <br />• No sessions data for the current user
                <br />• Database permission issues
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
