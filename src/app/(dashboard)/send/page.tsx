'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  FileText,
  Eye,
  Link as LinkIcon,
  TrendingUp,
  Users,
  Download,
  Plus,
  ArrowRight,
  Activity,
  CheckCircle
} from 'lucide-react'
import { useAuth } from '@/components/providers/secure-auth-provider'
import { formatDistanceToNow } from 'date-fns'
import SendStatsCards from '@/components/features/send/send-stats-cards'
import SendActivityFeed from '@/components/features/send/send-activity-feed'
import SendTopDocuments from '@/components/features/send/send-top-documents'

export default function SendDashboard() {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(false)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Send Dashboard</h1>
          <p className="text-gray-600 mt-1">Track and manage your shared documents</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => router.push('/send/documents')}
          >
            <FileText className="w-4 h-4 mr-2" />
            All Documents
          </Button>
          <Button onClick={() => router.push('/send/upload')}>
            <Plus className="w-4 h-4 mr-2" />
            Upload Document
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <SendStatsCards />

      {/* Activity Feed and Top Documents */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SendActivityFeed />
        <SendTopDocuments />
      </div>
    </div>
  )
}
