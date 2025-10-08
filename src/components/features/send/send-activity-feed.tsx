'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Eye, 
  Download,
  CheckCircle,
  Activity,
  ArrowRight
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface RecentActivity {
  id: string
  type: 'view' | 'download' | 'nda' | 'email_verified'
  documentTitle: string
  visitorEmail?: string
  timestamp: string
}

export default function SendActivityFeed() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [activities, setActivities] = useState<RecentActivity[]>([])

  useEffect(() => {
    loadActivities()
  }, [])

  const loadActivities = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/send/dashboard/activity')
      const data = await response.json()

      if (data.success) {
        setActivities(data.activities || [])
      }
    } catch (error) {
      console.error('Failed to load activities:', error)
    } finally {
      setLoading(false)
    }
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'view':
        return <Eye className="w-4 h-4 text-blue-600" />
      case 'download':
        return <Download className="w-4 h-4 text-green-600" />
      case 'nda':
        return <CheckCircle className="w-4 h-4 text-purple-600" />
      case 'email_verified':
        return <CheckCircle className="w-4 h-4 text-orange-600" />
      default:
        return <Activity className="w-4 h-4 text-gray-600" />
    }
  }

  const getActivityLabel = (type: string) => {
    switch (type) {
      case 'view':
        return 'Viewed'
      case 'download':
        return 'Downloaded'
      case 'nda':
        return 'Accepted NDA'
      case 'email_verified':
        return 'Verified Email'
      default:
        return 'Activity'
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-green-600" />
          Recent Activity
        </CardTitle>
        <CardDescription>Latest document interactions</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg">
                <div className="animate-pulse flex-1">
                  <div className="h-4 w-24 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 w-48 bg-gray-200 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Activity className="w-12 h-12 mx-auto mb-2 text-gray-400" />
            <p>No recent activity</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activities.slice(0, 5).map((activity) => (
              <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50">
                <div className="flex-shrink-0 mt-1">
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {getActivityLabel(activity.type)}
                  </p>
                  <p className="text-sm text-gray-600 truncate">
                    {activity.documentTitle}
                  </p>
                  {activity.visitorEmail && (
                    <p className="text-xs text-gray-500">{activity.visitorEmail}</p>
                  )}
                </div>
                <div className="flex-shrink-0 text-xs text-gray-500">
                  {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                </div>
              </div>
            ))}
          </div>
        )}
        <Button
          variant="ghost"
          className="w-full mt-4"
          onClick={() => router.push('/send/activity')}
        >
          View All Activity
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  )
}

