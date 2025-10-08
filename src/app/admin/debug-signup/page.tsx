'use client'

import { useState } from 'react'

export default function DebugSignupPage() {
  const [email, setEmail] = useState('')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [orphanedUsers, setOrphanedUsers] = useState<any[]>([])

  const checkUser = async () => {
    if (!email) return
    
    setLoading(true)
    try {
      const response = await fetch(`/api/debug/orphaned-users?action=check&email=${encodeURIComponent(email)}`)
      const data = await response.json()
      setResult(data)
    } catch (error) {
      console.error('Error checking user:', error)
      setResult({ error: 'Failed to check user' })
    } finally {
      setLoading(false)
    }
  }

  const fixUser = async () => {
    if (!email) return
    
    setLoading(true)
    try {
      const response = await fetch(`/api/debug/orphaned-users?action=fix&email=${encodeURIComponent(email)}`)
      const data = await response.json()
      setResult(data)
      // Refresh the check after fixing
      setTimeout(checkUser, 1000)
    } catch (error) {
      console.error('Error fixing user:', error)
      setResult({ error: 'Failed to fix user' })
    } finally {
      setLoading(false)
    }
  }

  const listOrphanedUsers = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/debug/orphaned-users?action=list')
      const data = await response.json()
      setOrphanedUsers(data.orphanedUsers || [])
    } catch (error) {
      console.error('Error listing orphaned users:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Signup Debug Tool</h1>
        
        {/* Check Specific User */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Check Specific User</h2>
          <div className="flex gap-4 mb-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email address"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={checkUser}
              disabled={loading || !email}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Checking...' : 'Check User'}
            </button>
            <button
              onClick={fixUser}
              disabled={loading || !email || !result?.isOrphaned}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Fixing...' : 'Fix User'}
            </button>
          </div>
          
          {result && (
            <div className="mt-4 p-4 bg-gray-50 rounded-md">
              <h3 className="font-semibold mb-2">Result:</h3>
              <pre className="text-sm overflow-auto">{JSON.stringify(result, null, 2)}</pre>
            </div>
          )}
        </div>

        {/* List All Orphaned Users */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Orphaned Users</h2>
            <button
              onClick={listOrphanedUsers}
              disabled={loading}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Refresh List'}
            </button>
          </div>
          
          {orphanedUsers.length > 0 ? (
            <div className="space-y-4">
              {orphanedUsers.map((user, index) => (
                <div key={index} className="p-4 border border-gray-200 rounded-md">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><strong>Email:</strong> {user.email}</div>
                    <div><strong>User ID:</strong> {user.user_id}</div>
                    <div><strong>Created:</strong> {new Date(user.created_at).toLocaleString()}</div>
                    <div><strong>Email Confirmed:</strong> {user.email_confirmed_at ? 'Yes' : 'No'}</div>
                  </div>
                  <div className="mt-2">
                    <strong>Metadata:</strong>
                    <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-auto">
                      {JSON.stringify(user.user_metadata, null, 2)}
                    </pre>
                  </div>
                  <button
                    onClick={() => {
                      setEmail(user.email)
                      checkUser()
                    }}
                    className="mt-2 px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                  >
                    Check This User
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No orphaned users found or click "Refresh List" to check.</p>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mt-6">
          <h3 className="font-semibold text-yellow-800 mb-2">How to use this tool:</h3>
          <ul className="text-yellow-700 space-y-1 text-sm">
            <li>1. Enter an email address and click "Check User" to see if they exist in auth but not in user_profiles</li>
            <li>2. If a user is "orphaned" (exists in auth but not in profiles), click "Fix User" to create their profile</li>
            <li>3. Click "Refresh List" to see all orphaned users in the system</li>
            <li>4. This tool helps resolve signup issues where users get created in auth but the profile creation fails</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
