'use client'

import { useState, useEffect } from 'react'
import { Link as LinkIcon, Copy, Eye, Calendar, MoreVertical, Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface ShareLink {
  id: string
  link_name: string
  document_title: string
  created_at: string
  expires_at: string | null
  password_protected: boolean
  view_limit: number | null
  is_active: boolean
  total_views: number
  total_downloads: number
  current_views: number
}

export default function ShareLinksPage() {
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadShareLinks()
  }, [])

  const loadShareLinks = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/send/links')

      if (!response.ok) {
        throw new Error('Failed to load share links')
      }

      const data = await response.json()
      if (data.success) {
        setShareLinks(data.links || [])
      } else {
        throw new Error(data.error || 'Failed to load share links')
      }
    } catch (err: any) {
      console.error('Load links error:', err)
      setError(err.message || 'Failed to load share links')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url)
    alert('Link copied to clipboard!')
  }

  const getShareUrl = (link: ShareLink) => {
    const baseUrl = window.location.origin
    // For now, we'll use the link ID since we don't have custom_slug in the response
    return `${baseUrl}/v/${link.id}`
  }

  const isExpired = (link: ShareLink) => {
    if (!link.expires_at) return false
    return new Date(link.expires_at) < new Date()
  }

  const isViewLimitReached = (link: ShareLink) => {
    if (!link.view_limit) return false
    return link.current_views >= link.view_limit
  }

  const getStatus = (link: ShareLink) => {
    if (!link.is_active) return 'inactive'
    if (isExpired(link)) return 'expired'
    if (isViewLimitReached(link)) return 'limit_reached'
    return 'active'
  }

  const getStatusBadge = (link: ShareLink) => {
    const status = getStatus(link)

    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-700 border-green-200">Active</Badge>
      case 'expired':
        return <Badge className="bg-red-100 text-red-700 border-red-200">Expired</Badge>
      case 'limit_reached':
        return <Badge className="bg-orange-100 text-orange-700 border-orange-200">Limit Reached</Badge>
      case 'inactive':
        return <Badge className="bg-gray-100 text-gray-700 border-gray-200">Inactive</Badge>
      default:
        return <Badge className="bg-gray-100 text-gray-700 border-gray-200">Unknown</Badge>
    }
  }

  const activeLinksCount = shareLinks.filter(link => getStatus(link) === 'active').length
  const totalViews = shareLinks.reduce((sum, link) => sum + link.total_views, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading share links...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={loadShareLinks}>Try Again</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Share Links</h1>
          <p className="text-gray-600 mt-1">Manage and track your document share links</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Links</CardTitle>
            <LinkIcon className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{shareLinks.length}</div>
            <p className="text-xs text-gray-500 mt-1">Share links created</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Links</CardTitle>
            <LinkIcon className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeLinksCount}</div>
            <p className="text-xs text-gray-500 mt-1">Currently active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalViews}</div>
            <p className="text-xs text-gray-500 mt-1">Across all links</p>
          </CardContent>
        </Card>
      </div>

      {/* Links List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Share Links</CardTitle>
          <CardDescription>View and manage all your document share links</CardDescription>
        </CardHeader>
        <CardContent>
          {shareLinks.length === 0 ? (
            <div className="text-center py-12">
              <LinkIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No share links yet</h3>
              <p className="text-gray-600 mb-4">
                Create your first share link by uploading a document
              </p>
              <Button
                onClick={() => window.location.href = '/send/upload'}
                className="bg-green-600 hover:bg-green-700"
              >
                <LinkIcon className="w-4 h-4 mr-2" />
                Upload Document
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {shareLinks.map((link) => {
                const shareUrl = getShareUrl(link)

                return (
                  <div
                    key={link.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="p-3 bg-green-100 rounded-lg">
                        <LinkIcon className="w-6 h-6 text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900">{link.link_name}</h4>
                        <p className="text-sm text-gray-600 mt-1">{link.document_title}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-700 truncate max-w-md">
                            {shareUrl}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(shareUrl)}
                            className="h-6 px-2"
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <div className="flex items-center gap-1 text-gray-600">
                          <Eye className="w-4 h-4" />
                          <span className="text-sm font-medium">{link.total_views}</span>
                          {link.view_limit && (
                            <span className="text-xs text-gray-500">/ {link.view_limit}</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">Views</p>
                      </div>

                      <div className="text-center min-w-[120px]">
                        {link.expires_at ? (
                          <>
                            <div className="flex items-center gap-1 text-gray-600 justify-center">
                              <Calendar className="w-4 h-4" />
                              <span className="text-sm font-medium">
                                {new Date(link.expires_at).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500">Expires</p>
                          </>
                        ) : (
                          <span className="text-sm text-gray-500">No expiration</span>
                        )}
                      </div>

                      <div className="min-w-[120px]">
                        {getStatusBadge(link)}
                      </div>

                      <Button variant="ghost" size="icon">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

