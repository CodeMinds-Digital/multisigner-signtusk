'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { RefreshCw, Trash2, Search, AlertTriangle } from 'lucide-react'
import { clearSupabaseAuthStorage, diagnoseAuthStorage, forceAuthReset } from '@/utils/auth-recovery'

export default function AuthRecoveryPage() {
  const [diagnosis, setDiagnosis] = useState<string>('')
  const [cleared, setCleared] = useState(false)

  const handleDiagnose = () => {
    // Capture console output
    const originalLog = console.log
    const logs: string[] = []
    
    console.log = (...args) => {
      logs.push(args.join(' '))
      originalLog(...args)
    }

    diagnoseAuthStorage()
    
    console.log = originalLog
    setDiagnosis(logs.join('\n'))
  }

  const handleClear = () => {
    clearSupabaseAuthStorage()
    setCleared(true)
    setDiagnosis('')
  }

  const handleForceReset = () => {
    forceAuthReset()
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Authentication Recovery
          </h1>
          <p className="text-gray-600">
            Fix authentication issues like invalid refresh tokens
          </p>
        </div>

        <div className="grid gap-6">
          {/* Error Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Common Authentication Errors
              </CardTitle>
              <CardDescription>
                These are the most common authentication issues and their solutions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-semibold text-red-800 mb-2">
                  "Invalid Refresh Token: Refresh Token Not Found"
                </h4>
                <p className="text-red-700 text-sm">
                  This error occurs when the stored authentication token has expired or become corrupted.
                  The solution is to clear the authentication storage and sign in again.
                </p>
              </div>
              
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h4 className="font-semibold text-amber-800 mb-2">
                  "AuthApiError" or Authentication Failures
                </h4>
                <p className="text-amber-700 text-sm">
                  General authentication errors that can be resolved by clearing stored authentication data.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Diagnosis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Diagnose Authentication Storage
              </CardTitle>
              <CardDescription>
                Check what authentication data is currently stored
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleDiagnose} className="mb-4">
                <Search className="h-4 w-4 mr-2" />
                Run Diagnosis
              </Button>
              
              {diagnosis && (
                <div className="bg-gray-100 rounded-lg p-4 font-mono text-sm whitespace-pre-wrap">
                  {diagnosis}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Clear Storage */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5" />
                Clear Authentication Storage
              </CardTitle>
              <CardDescription>
                Remove all stored authentication data to fix login issues
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    This will log you out and clear all stored authentication data. 
                    You will need to sign in again after clearing.
                  </AlertDescription>
                </Alert>

                <div className="flex gap-2">
                  <Button onClick={handleClear} variant="destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear Auth Storage
                  </Button>
                  
                  <Button onClick={handleForceReset} variant="destructive">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Clear & Refresh Page
                  </Button>
                </div>

                {cleared && (
                  <Alert className="border-green-200 bg-green-50">
                    <AlertDescription className="text-green-800">
                      ✅ Authentication storage cleared successfully! 
                      Please refresh the page or navigate to the login page.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Manual Instructions */}
          <Card>
            <CardHeader>
              <CardTitle>Manual Recovery Steps</CardTitle>
              <CardDescription>
                If the automatic tools don't work, try these manual steps
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>Open browser Developer Tools (F12)</li>
                <li>Go to the "Application" or "Storage" tab</li>
                <li>Find "Local Storage" and "Session Storage"</li>
                <li>Delete all entries that start with "supabase." or contain "auth-token"</li>
                <li>Refresh the page</li>
                <li>Try signing in again</li>
              </ol>
              
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-2">Console Commands</h4>
                <p className="text-blue-700 text-sm mb-2">
                  You can also run these commands in the browser console:
                </p>
                <code className="block bg-blue-100 p-2 rounded text-sm">
                  clearSupabaseAuthStorage() // Clear auth storage<br/>
                  diagnoseAuthStorage() // Check current storage<br/>
                  forceAuthReset() // Clear and refresh page
                </code>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
