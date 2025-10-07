'use client'

import { useState, useEffect } from 'react'
import { FileText, Eye, Download, Link as LinkIcon, MoreVertical, Plus } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface SharedLink {
  id: string
  document_title: string
  link_name: string
  created_at: string
  expires_at: string | null
  total_views: number
  total_downloads: number
  is_active: boolean
  password_protected: boolean
  view_limit: number | null
  current_views: number
}

export default function SharedDocumentsPage() {
  const router = useRouter()
  const [sharedLinks, setSharedLinks] = useState<SharedLink[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSharedLinks()
  }, [])

  const fetchSharedLinks = async () => {
    try {
      const response = await fetch('/api/send/links')
      if (response.ok) {
        const data = await response.json()
        setSharedLinks(data.links || [])
      } else {
        toast.error('Failed to load share links')
      }
    } catch (error) {
      console.error('Failed to fetch shared links:', error)
      toast.error('Failed to load share links')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (link: SharedLink) => {
    if (!link.is_active) {
      return <Badge className="bg-gray-100 text-gray-700 border-gray-200">Inactive</Badge>
    }

    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return <Badge className="bg-red-100 text-red-700 border-red-200">Expired</Badge>
    }

    if (link.view_limit && link.current_views >= link.view_limit) {
      return <Badge className="bg-orange-100 text-orange-700 border-orange-200">View Limit Reached</Badge>
    }

    return <Badge className="bg-green-100 text-green-700 border-green-200">Active</Badge>
  }

  const getExpirationText = (link: SharedLink) => {
    if (!link.expires_at) return 'No expiration'

    const expirationDate = new Date(link.expires_at)
    const now = new Date()
    const diffTime = expirationDate.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) return 'Expired'
    if (diffDays === 0) return 'Expires today'
    if (diffDays === 1) return 'Expires tomorrow'
    return `Expires in ${diffDays} days`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Shared Links</h1>
          <p className="text-gray-600 mt-1">Manage and track your shared document links</p>
        </div>
        <Button
          className="bg-green-600 hover:bg-green-700"
          onClick={() => router.push('/send/documents')}
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Share Link
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Links</CardTitle>
            <LinkIcon className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sharedLinks.length}</div>
            <p className="text-xs text-gray-500 mt-1">Share links created</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sharedLinks.reduce((sum, link) => sum + link.total_views, 0)}
            </div>
            <p className="text-xs text-gray-500 mt-1">Across all links</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Downloads</CardTitle>
            <Download className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sharedLinks.reduce((sum, link) => sum + link.total_downloads, 0)}
            </div>
            <p className="text-xs text-gray-500 mt-1">Total downloads</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Links</CardTitle>
            <FileText className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sharedLinks.filter(link => link.is_active && (!link.expires_at || new Date(link.expires_at) > new Date())).length}
            </div>
            <p className="text-xs text-gray-500 mt-1">Currently active</p>
          </CardContent>
        </Card>
      </div>

      {/* Shared Links Table */}
      {sharedLinks.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <LinkIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Shared Links Yet</h3>
            <p className="text-gray-600 mb-6">
              Create your first share link to start tracking document views and engagement
            </p>
            <Button
              onClick={() => router.push('/send/documents')}
              className="bg-green-600 hover:bg-green-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Link
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Shared Links</CardTitle>
            <CardDescription>View and manage your document share links</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sharedLinks.map((link) => (
                <div
                  key={link.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="p-3 bg-green-100 rounded-lg">
                      <FileText className="w-6 h-6 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 truncate">
                        {link.link_name || link.document_title}
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Document: <span className="font-medium">{link.document_title}</span> • Created{' '}
                        {new Date(link.created_at).toLocaleDateString()}
                        {link.password_protected && (
                          <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                            Password Protected
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <div className="flex items-center gap-1 text-gray-600">
                        <Eye className="w-4 h-4" />
                        <span className="text-sm font-medium">{link.total_views}</span>
                      </div>
                      <p className="text-xs text-gray-500">Views</p>
                    </div>

                    <div className="text-center">
                      <div className="flex items-center gap-1 text-gray-600">
                        <Download className="w-4 h-4" />
                        <span className="text-sm font-medium">{link.total_downloads}</span>
                      </div>
                      <p className="text-xs text-gray-500">Downloads</p>
                    </div>

                    <div className="text-center min-w-[120px]">
                      {getStatusBadge(link)}
                      <p className="text-xs text-gray-500 mt-1">{getExpirationText(link)}</p>
                    </div>

                    <Button variant="ghost" size="icon">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

