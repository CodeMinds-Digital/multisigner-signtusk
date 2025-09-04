'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { runStorageTests, testStorageConnection, createDefaultBuckets } from '@/lib/storage-test'
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

export default function TestStoragePage() {
  const [testResults, setTestResults] = useState<any>(null)
  const [isRunning, setIsRunning] = useState(false)

  const runTests = async () => {
    setIsRunning(true)
    setTestResults(null)
    
    try {
      const results = await runStorageTests()
      setTestResults(results)
    } catch (error) {
      setTestResults({ error: error instanceof Error ? error.message : 'Unknown error' })
    } finally {
      setIsRunning(false)
    }
  }

  const createBuckets = async () => {
    setIsRunning(true)
    
    try {
      const result = await createDefaultBuckets()
      console.log('Bucket creation result:', result)
      
      // Run tests again after creating buckets
      const testResult = await testStorageConnection()
      setTestResults(prev => ({
        ...prev,
        bucketCreation: result,
        storage: testResult
      }))
    } catch (error) {
      console.error('Error creating buckets:', error)
    } finally {
      setIsRunning(false)
    }
  }

  const renderTestResult = (result: any, title: string) => {
    if (!result) return null

    const isSuccess = result.success
    const Icon = isSuccess ? CheckCircle : AlertCircle
    const colorClass = isSuccess ? 'text-green-600' : 'text-red-600'

    return (
      <div className={`flex items-start space-x-3 p-4 rounded-lg border ${
        isSuccess ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
      }`}>
        <Icon className={`w-5 h-5 mt-0.5 ${colorClass}`} />
        <div className="flex-1">
          <h4 className={`font-medium ${colorClass}`}>{title}</h4>
          {result.message && (
            <p className="text-sm text-gray-600 mt-1">{result.message}</p>
          )}
          {result.error && (
            <p className="text-sm text-red-600 mt-1">Error: {result.error}</p>
          )}
          {result.suggestion && (
            <p className="text-sm text-yellow-600 mt-1">Note: {result.suggestion}</p>
          )}
          {result.workingBucket && (
            <p className="text-sm text-green-600 mt-1">Working bucket: {result.workingBucket}</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Storage & Database Test</h1>
        <p className="text-gray-600">Test your Supabase configuration and storage setup</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Connection Tests</CardTitle>
          <CardDescription>
            Verify that your Supabase storage and database connections are working properly
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button onClick={runTests} disabled={isRunning}>
              {isRunning ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Running Tests...
                </>
              ) : (
                'Run All Tests'
              )}
            </Button>
            
            <Button variant="outline" onClick={createBuckets} disabled={isRunning}>
              {isRunning ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Storage Buckets'
              )}
            </Button>
          </div>

          {testResults && (
            <div className="space-y-4 mt-6">
              <h3 className="text-lg font-medium text-gray-900">Test Results</h3>
              
              {testResults.database && renderTestResult(testResults.database, 'Database Connection')}
              {testResults.storage && renderTestResult(testResults.storage, 'Storage Connection')}
              {testResults.bucketCreation && renderTestResult(testResults.bucketCreation, 'Bucket Creation')}
              
              {testResults.error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                    <h4 className="font-medium text-red-600">Test Failed</h4>
                  </div>
                  <p className="text-sm text-red-600 mt-1">{testResults.error}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Setup Instructions</CardTitle>
          <CardDescription>
            If tests are failing, follow these steps to set up your Supabase project
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">1. Storage Buckets</h4>
              <p className="text-gray-600 mb-2">Create these storage buckets in your Supabase dashboard:</p>
              <ul className="list-disc list-inside text-gray-600 space-y-1 ml-4">
                <li><code className="bg-gray-100 px-1 rounded">documents</code> - For PDF files</li>
                <li><code className="bg-gray-100 px-1 rounded">signatures</code> - For signature images</li>
                <li><code className="bg-gray-100 px-1 rounded">files</code> - For general file uploads</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-2">2. Storage Policies</h4>
              <p className="text-gray-600 mb-2">Set up RLS policies for authenticated users:</p>
              <ul className="list-disc list-inside text-gray-600 space-y-1 ml-4">
                <li>Allow authenticated users to upload files</li>
                <li>Allow authenticated users to read their own files</li>
                <li>Allow public read access for signed documents</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-2">3. Database Tables (Optional)</h4>
              <p className="text-gray-600 mb-2">These tables will enhance functionality but are not required:</p>
              <ul className="list-disc list-inside text-gray-600 space-y-1 ml-4">
                <li><code className="bg-gray-100 px-1 rounded">user_files</code> - Track uploaded documents</li>
                <li><code className="bg-gray-100 px-1 rounded">recent_activity</code> - Activity logging</li>
                <li><code className="bg-gray-100 px-1 rounded">user_signs</code> - Signature storage</li>
                <li><code className="bg-gray-100 px-1 rounded">recent_documents</code> - Document management</li>
              </ul>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-800 text-sm">
                <strong>Note:</strong> The application will work without database tables by using storage-only mode. 
                Files will be uploaded to storage and can be accessed directly via URLs.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
