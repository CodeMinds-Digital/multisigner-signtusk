'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { OneClickNDA } from '@/components/features/send/one-click-nda'
import { OneClickNDAConfig } from '@/lib/one-click-nda-service'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, FileText, Shield } from 'lucide-react'

interface LinkData {
  link: {
    id: string
    linkId: string
    title: string
    ndaConfig: OneClickNDAConfig
  }
  document: {
    id: string
    title: string
    file_name: string
  }
}

export default function OneClickNDAPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const linkId = params.linkId as string
  const prefilledEmail = searchParams.get('email') || ''
  const prefilledName = searchParams.get('name') || ''
  const returnUrl = searchParams.get('return') || ''
  const templateId = searchParams.get('template') || ''

  const [linkData, setLinkData] = useState<LinkData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchLinkData()
  }, [linkId])

  const fetchLinkData = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/send/nda/${linkId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load NDA information')
      }

      setLinkData(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load NDA information')
    } finally {
      setLoading(false)
    }
  }

  const handleNDAAccepted = () => {
    if (returnUrl) {
      window.location.href = returnUrl
    } else {
      // Redirect to the document viewer
      router.push(`/v/${linkId}`)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center">
              <Shield className="w-8 h-8 mx-auto mb-4 text-blue-500 animate-pulse" />
              <p className="text-gray-600">Loading NDA information...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              Error
            </CardTitle>
            <CardDescription>
              Unable to load NDA information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-red-600 mb-4">{error}</p>
            <div className="flex gap-2">
              <button
                onClick={fetchLinkData}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Retry
              </button>
              <button
                onClick={() => window.history.back()}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
              >
                Go Back
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!linkData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-600">
              <AlertCircle className="w-5 h-5" />
              Not Found
            </CardTitle>
            <CardDescription>
              The requested NDA link was not found
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              The NDA link you're looking for doesn't exist or has been removed.
            </p>
            <button
              onClick={() => window.history.back()}
              className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
            >
              Go Back
            </button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Override template ID if provided in URL
  const ndaConfig = templateId ? 
    { ...linkData.link.ndaConfig, templateId } : 
    linkData.link.ndaConfig

  return (
    <OneClickNDA
      linkId={linkId}
      config={ndaConfig}
      documentTitle={linkData.document.title}
      onAccepted={handleNDAAccepted}
      prefilledEmail={prefilledEmail}
      prefilledName={prefilledName}
    />
  )
}
