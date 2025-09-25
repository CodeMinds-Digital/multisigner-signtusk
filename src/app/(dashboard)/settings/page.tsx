'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to document settings by default
    router.replace('/settings/documents')
  }, [router])

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Redirecting to settings...</div>
      </div>
    </div>
  )
}
