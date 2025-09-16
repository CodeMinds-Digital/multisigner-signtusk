'use client'

import { useState } from 'react'

export default function CreateProfilePage() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const createProfile = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/debug/create-profile', {
        method: 'POST',
        credentials: 'include',
      })
      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({ error: 'Failed to create profile', details: error })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Create User Profile</h1>
      
      <button
        onClick={createProfile}
        disabled={loading}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {loading ? 'Creating...' : 'Create Profile'}
      </button>

      {result && (
        <div className="mt-4 p-4 bg-gray-100 rounded">
          <h2 className="font-bold mb-2">Result:</h2>
          <pre className="text-sm overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
