'use client'

import React, { useState } from 'react'
import { Download, RefreshCw, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function TestDownloadRefreshPage() {
  const [downloadStatus, setDownloadStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [refreshStatus, setRefreshStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [reportTestStatus, setReportTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [downloadError, setDownloadError] = useState('')
  const [refreshError, setRefreshError] = useState('')
  const [reportTestError, setReportTestError] = useState('')
  const [activeSessions, setActiveSessions] = useState<any[]>([])
  const [reportTestData, setReportTestData] = useState<any>(null)

  const testSecurityReportData = async () => {
    setReportTestStatus('testing')
    setReportTestError('')
    
    try {
      const response = await fetch('/api/test/security-report', {
        credentials: 'include'
      })

      if (response.ok) {
        const result = await response.json()
        setReportTestData(result.data)
        setReportTestStatus('success')
      } else {
        const error = await response.json()
        setReportTestError(error.error || 'Failed to test report data')
        setReportTestStatus('error')
      }
    } catch (err) {
      setReportTestError('Network error testing report data')
      setReportTestStatus('error')
    }
  }

  const testDownloadReport = async () => {
    setDownloadStatus('testing')
    setDownloadError('')
    
    try {
      const response = await fetch('/api/user/security-report', {
        credentials: 'include'
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `test-security-report-${new Date().toISOString().split('T')[0]}.txt`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        setDownloadStatus('success')
      } else {
        const errorData = await response.json()
        setDownloadError(errorData.error || 'Failed to download security report')
        setDownloadStatus('error')
      }
    } catch (err) {
      console.error('Download error:', err)
      setDownloadError('Network error downloading report')
      setDownloadStatus('error')
    }
  }

  const testRefreshSessions = async () => {
    setRefreshStatus('testing')
    setRefreshError('')
    
    try {
      const response = await fetch('/api/user/active-sessions', {
        credentials: 'include'
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setActiveSessions(result.data || [])
          setRefreshStatus('success')
        } else {
          setRefreshError(result.error || 'Failed to load active sessions')
          setRefreshStatus('error')
        }
      } else {
        const errorData = await response.json()
        setRefreshError(errorData.error || 'Failed to load active sessions')
        setRefreshStatus('error')
      }
    } catch (err) {
      console.error('Refresh error:', err)
      setRefreshError('Network error refreshing sessions')
      setRefreshStatus('error')
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />
      case 'testing':
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
        return 'text-blue-700 bg-blue-50 border-blue-200'
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200'
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Download & Refresh Test</h1>
        <p className="text-gray-600">Test the Download Report and Refresh Sessions functionality</p>
      </div>

      {/* Test Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Test Report Data</CardTitle>
            <CardDescription>Check if report data can be fetched</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={testSecurityReportData} 
              disabled={reportTestStatus === 'testing'}
              className="w-full"
            >
              {reportTestStatus === 'testing' ? 'Testing...' : 'Test Data'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Test Download</CardTitle>
            <CardDescription>Test security report download</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={testDownloadReport} 
              disabled={downloadStatus === 'testing'}
              className="w-full"
            >
              <Download className="w-4 h-4 mr-2" />
              {downloadStatus === 'testing' ? 'Downloading...' : 'Download'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Test Refresh</CardTitle>
            <CardDescription>Test active sessions refresh</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={testRefreshSessions} 
              disabled={refreshStatus === 'testing'}
              className="w-full"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshStatus === 'testing' ? 'animate-spin' : ''}`} />
              {refreshStatus === 'testing' ? 'Refreshing...' : 'Refresh'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Test Results */}
      <div className="space-y-6">
        {/* Report Data Test */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              {getStatusIcon(reportTestStatus)}
              <span className="ml-2">Report Data Test</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`p-4 rounded-lg border ${getStatusColor(reportTestStatus)}`}>
              {reportTestStatus === 'success' && reportTestData && (
                <div>
                  <p className="font-medium mb-2">✅ Report data fetched successfully</p>
                  <div className="text-sm space-y-1">
                    <p>• Profile: {reportTestData.tests?.profile?.success ? '✅' : '❌'}</p>
                    <p>• Security Config: {reportTestData.tests?.securityConfig?.success ? '✅' : '❌'}</p>
                    <p>• Activity Logs: {reportTestData.tests?.activityLogs?.success ? '✅' : '❌'} ({reportTestData.tests?.activityLogs?.count || 0} entries)</p>
                    <p>• Active Sessions: {reportTestData.tests?.activeSessions?.success ? '✅' : '❌'} ({reportTestData.tests?.activeSessions?.count || 0} sessions)</p>
                    <p>• TOTP Config: {reportTestData.tests?.totpConfig?.success ? '✅' : '❌'}</p>
                  </div>
                </div>
              )}
              {reportTestStatus === 'error' && (
                <p className="text-red-700">❌ {reportTestError}</p>
              )}
              {reportTestStatus === 'idle' && (
                <p className="text-gray-600">Click "Test Data" to check report data availability</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Download Test */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              {getStatusIcon(downloadStatus)}
              <span className="ml-2">Download Test</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`p-4 rounded-lg border ${getStatusColor(downloadStatus)}`}>
              {downloadStatus === 'success' && (
                <p className="text-green-700">✅ Security report downloaded successfully</p>
              )}
              {downloadStatus === 'error' && (
                <p className="text-red-700">❌ {downloadError}</p>
              )}
              {downloadStatus === 'idle' && (
                <p className="text-gray-600">Click "Download" to test report download</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Refresh Test */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              {getStatusIcon(refreshStatus)}
              <span className="ml-2">Refresh Test</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`p-4 rounded-lg border ${getStatusColor(refreshStatus)}`}>
              {refreshStatus === 'success' && (
                <div>
                  <p className="text-green-700 mb-2">✅ Active sessions refreshed successfully</p>
                  <p className="text-sm text-gray-600">Found {activeSessions.length} active sessions</p>
                  {activeSessions.slice(0, 3).map((session, index) => (
                    <div key={index} className="text-xs bg-white p-2 mt-2 rounded border">
                      <p>IP: {session.ip_address}</p>
                      <p>Last Used: {new Date(session.last_used_at).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              )}
              {refreshStatus === 'error' && (
                <p className="text-red-700">❌ {refreshError}</p>
              )}
              {refreshStatus === 'idle' && (
                <p className="text-gray-600">Click "Refresh" to test sessions refresh</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Instructions */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p>1. <strong>Test Data</strong>: Verify that all required data for the report can be fetched</p>
            <p>2. <strong>Download</strong>: Test the actual download functionality - a file should be downloaded</p>
            <p>3. <strong>Refresh</strong>: Test the sessions refresh - should show current active sessions</p>
            <p className="mt-4 text-gray-600">If any test fails, check the browser console and server logs for detailed error information.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
