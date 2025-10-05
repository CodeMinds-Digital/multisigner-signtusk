'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  TrendingUp,
  FileText,
  ArrowRight
} from 'lucide-react'

interface TopDocument {
  id: string
  title: string
  views: number
  visitors: number
  engagement: number
}

export default function SendTopDocuments() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [documents, setDocuments] = useState<TopDocument[]>([])

  useEffect(() => {
    loadTopDocuments()
  }, [])

  const loadTopDocuments = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/send/dashboard/top-documents')
      const data = await response.json()

      if (data.success) {
        setDocuments(data.documents || [])
      }
    } catch (error) {
      console.error('Failed to load top documents:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green-600" />
          Top Performing Documents
        </CardTitle>
        <CardDescription>Most viewed and engaged documents</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg">
                <div className="animate-pulse flex-1">
                  <div className="h-4 w-48 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 w-32 bg-gray-200 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-2 text-gray-400" />
            <p>No documents yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {documents.slice(0, 5).map((doc, index) => (
              <div
                key={doc.id}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer"
                onClick={() => router.push(`/send/analytics/${doc.id}`)}
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <span className="text-sm font-bold text-green-600">#{index + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{doc.title}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>{doc.views} views</span>
                    <span>•</span>
                    <span>{doc.visitors} visitors</span>
                    <span>•</span>
                    <span>{doc.engagement}% engagement</span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

