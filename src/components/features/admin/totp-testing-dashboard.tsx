'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Play, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Shield, 
  Users, 
  FileText,
  AlertTriangle,
  RefreshCw,
  Download
} from 'lucide-react'

interface TestResult {
  id: string
  name: string
  status: 'pending' | 'running' | 'passed' | 'failed'
  duration?: number
  error?: string
  details?: string
}

interface TestSuite {
  id: string
  name: string
  description: string
  tests: TestResult[]
  status: 'pending' | 'running' | 'completed'
}

export function TOTPTestingDashboard() {
  const [testSuites, setTestSuites] = useState<TestSuite[]>([
    {
      id: 'core-totp',
      name: 'Core TOTP Functionality',
      description: 'Test basic TOTP setup, verification, and backup codes',
      status: 'pending',
      tests: [
        { id: 'totp-setup', name: 'TOTP Setup Flow', status: 'pending' },
        { id: 'qr-generation', name: 'QR Code Generation', status: 'pending' },
        { id: 'totp-verification', name: 'TOTP Code Verification', status: 'pending' },
        { id: 'backup-codes', name: 'Backup Codes Generation', status: 'pending' },
        { id: 'backup-verification', name: 'Backup Code Verification', status: 'pending' }
      ]
    },
    {
      id: 'login-flow',
      name: 'Login Integration',
      description: 'Test TOTP integration with login authentication',
      status: 'pending',
      tests: [
        { id: 'login-mfa-check', name: 'Login MFA Requirement Check', status: 'pending' },
        { id: 'login-totp-prompt', name: 'TOTP Prompt Display', status: 'pending' },
        { id: 'login-totp-verify', name: 'Login TOTP Verification', status: 'pending' },
        { id: 'login-session', name: 'Session Creation After TOTP', status: 'pending' }
      ]
    },
    {
      id: 'signing-flow',
      name: 'Document Signing Integration',
      description: 'Test TOTP integration with document signing process',
      status: 'pending',
      tests: [
        { id: 'signing-requirement-check', name: 'Signing TOTP Requirement Check', status: 'pending' },
        { id: 'signing-totp-prompt', name: 'Signing TOTP Prompt', status: 'pending' },
        { id: 'signing-totp-verify', name: 'Signing TOTP Verification', status: 'pending' },
        { id: 'signature-completion', name: 'Signature Completion After TOTP', status: 'pending' }
      ]
    },
    {
      id: 'organization-policies',
      name: 'Organization Policies',
      description: 'Test organization-wide TOTP policy enforcement',
      status: 'pending',
      tests: [
        { id: 'policy-enforcement', name: 'Policy Enforcement Check', status: 'pending' },
        { id: 'user-compliance', name: 'User Compliance Validation', status: 'pending' },
        { id: 'exemption-handling', name: 'Exemption Handling', status: 'pending' },
        { id: 'admin-override', name: 'Admin Override Functionality', status: 'pending' }
      ]
    },
    {
      id: 'security-validation',
      name: 'Security Validation',
      description: 'Test security aspects and edge cases',
      status: 'pending',
      tests: [
        { id: 'time-window', name: 'TOTP Time Window Validation', status: 'pending' },
        { id: 'replay-attack', name: 'Replay Attack Prevention', status: 'pending' },
        { id: 'brute-force', name: 'Brute Force Protection', status: 'pending' },
        { id: 'secret-security', name: 'Secret Storage Security', status: 'pending' }
      ]
    }
  ])

  const [testConfig, setTestConfig] = useState({
    testUser: 'test@example.com',
    testOrganization: 'test-org',
    parallelExecution: false
  })

  const [overallStatus, setOverallStatus] = useState<'idle' | 'running' | 'completed'>('idle')

  const runTestSuite = async (suiteId: string) => {
    setTestSuites(prev => prev.map(suite => 
      suite.id === suiteId 
        ? { ...suite, status: 'running', tests: suite.tests.map(test => ({ ...test, status: 'running' })) }
        : suite
    ))

    // Simulate test execution
    const suite = testSuites.find(s => s.id === suiteId)
    if (!suite) return

    for (let i = 0; i < suite.tests.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate test duration
      
      const success = Math.random() > 0.2 // 80% success rate for demo
      
      setTestSuites(prev => prev.map(s => 
        s.id === suiteId 
          ? {
              ...s,
              tests: s.tests.map((test, index) => 
                index === i 
                  ? {
                      ...test,
                      status: success ? 'passed' : 'failed',
                      duration: Math.floor(Math.random() * 2000) + 500,
                      error: success ? undefined : 'Test failed due to mock error'
                    }
                  : test
              )
            }
          : s
      ))
    }

    setTestSuites(prev => prev.map(suite => 
      suite.id === suiteId 
        ? { ...suite, status: 'completed' }
        : suite
    ))
  }

  const runAllTests = async () => {
    setOverallStatus('running')
    
    for (const suite of testSuites) {
      await runTestSuite(suite.id)
    }
    
    setOverallStatus('completed')
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <Clock className="w-4 h-4 text-blue-500 animate-spin" />
      case 'passed': return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />
      default: return <div className="w-4 h-4 rounded-full bg-gray-300" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'running': return <Badge className="bg-blue-100 text-blue-800">Running</Badge>
      case 'passed': return <Badge className="bg-green-100 text-green-800">Passed</Badge>
      case 'failed': return <Badge className="bg-red-100 text-red-800">Failed</Badge>
      case 'completed': return <Badge className="bg-gray-100 text-gray-800">Completed</Badge>
      default: return <Badge className="bg-gray-100 text-gray-800">Pending</Badge>
    }
  }

  const exportTestResults = () => {
    const results = {
      timestamp: new Date().toISOString(),
      config: testConfig,
      suites: testSuites
    }
    
    const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `totp-test-results-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const getTotalStats = () => {
    const allTests = testSuites.flatMap(suite => suite.tests)
    return {
      total: allTests.length,
      passed: allTests.filter(test => test.status === 'passed').length,
      failed: allTests.filter(test => test.status === 'failed').length,
      pending: allTests.filter(test => test.status === 'pending').length
    }
  }

  const stats = getTotalStats()

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">TOTP Testing Dashboard</h2>
          <p className="text-gray-600">Comprehensive testing of TOTP authentication flows</p>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            onClick={exportTestResults}
            disabled={overallStatus === 'running'}
          >
            <Download className="w-4 h-4 mr-2" />
            Export Results
          </Button>
          <Button 
            onClick={runAllTests}
            disabled={overallStatus === 'running'}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {overallStatus === 'running' ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Running Tests...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Run All Tests
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Test Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Test Configuration</CardTitle>
          <CardDescription>Configure test parameters and environment</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="test-user">Test User Email</Label>
            <Input
              id="test-user"
              value={testConfig.testUser}
              onChange={(e) => setTestConfig({...testConfig, testUser: e.target.value})}
              placeholder="test@example.com"
            />
          </div>
          <div>
            <Label htmlFor="test-org">Test Organization</Label>
            <Input
              id="test-org"
              value={testConfig.testOrganization}
              onChange={(e) => setTestConfig({...testConfig, testOrganization: e.target.value})}
              placeholder="test-organization"
            />
          </div>
          <div className="flex items-center space-x-2 pt-6">
            <input
              type="checkbox"
              id="parallel"
              checked={testConfig.parallelExecution}
              onChange={(e) => setTestConfig({...testConfig, parallelExecution: e.target.checked})}
              className="w-4 h-4"
            />
            <Label htmlFor="parallel">Parallel Execution</Label>
          </div>
        </CardContent>
      </Card>

      {/* Test Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Tests</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Passed</p>
                <p className="text-2xl font-bold text-green-600">{stats.passed}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Failed</p>
                <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-gray-600">{stats.pending}</p>
              </div>
              <Clock className="w-8 h-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Test Suites */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {testSuites.map((suite) => (
          <Card key={suite.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center">
                    {suite.id === 'core-totp' && <Shield className="w-5 h-5 mr-2" />}
                    {suite.id === 'login-flow' && <Users className="w-5 h-5 mr-2" />}
                    {suite.id === 'signing-flow' && <FileText className="w-5 h-5 mr-2" />}
                    {suite.id === 'organization-policies' && <Shield className="w-5 h-5 mr-2" />}
                    {suite.id === 'security-validation' && <AlertTriangle className="w-5 h-5 mr-2" />}
                    {suite.name}
                  </CardTitle>
                  <CardDescription>{suite.description}</CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusBadge(suite.status)}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => runTestSuite(suite.id)}
                    disabled={suite.status === 'running' || overallStatus === 'running'}
                  >
                    <Play className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {suite.tests.map((test) => (
                  <div key={test.id} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(test.status)}
                      <span className="text-sm">{test.name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {test.duration && (
                        <span className="text-xs text-gray-500">{test.duration}ms</span>
                      )}
                      {test.error && (
                        <span className="text-xs text-red-500" title={test.error}>
                          Error
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
