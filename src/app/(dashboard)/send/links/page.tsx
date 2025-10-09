'use client'

import { useState, useEffect } from 'react'
import { Link as LinkIcon, Copy, Eye, Calendar, MoreVertical, Loader2, Download, Mail, Shield, Clock, Users, BarChart3, ExternalLink } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

interface ShareLink {
  id: string
  link_id: string
  document_id: string // ✅ Added missing document_id field
  link_name: string
  document_title: string
  document_type: string
  document_size: number
  share_url: string
  custom_slug: string | null
  description: string | null
  created_at: string
  expires_at: string | null
  password_protected: boolean
  view_limit: number | null
  is_active: boolean
  allow_download: boolean
  require_email: boolean
  require_nda: boolean
  total_views: number
  total_downloads: number
  emails_sent: number
  current_views: number
  conversion_rate: string
  is_expired: boolean
  is_limit_reached: boolean
}

interface LinkStats {
  total_links: number
  active_links: number
  total_views: number
  total_downloads: number
  total_emails: number
  expired_links: number
  password_protected: number
}

export default function ShareLinksPage() {
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([])
  const [stats, setStats] = useState<LinkStats | null>(null)
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
        setStats(data.stats || null)
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

  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Link copied to clipboard!')
    } catch (err) {
      toast.error('Failed to copy link')
    }
  }

  const openLink = (url: string) => {
    window.open(url, '_blank')
  }

  const getStatus = (link: ShareLink) => {
    if (!link.is_active) return 'inactive'
    if (link.is_expired) return 'expired'
    if (link.is_limit_reached) return 'limit_reached'
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

  // Use stats from API if available, otherwise calculate from links
  const displayStats = stats || {
    total_links: shareLinks.length,
    active_links: shareLinks.filter(link => getStatus(link) === 'active').length,
    total_views: shareLinks.reduce((sum, link) => sum + link.total_views, 0),
    total_downloads: shareLinks.reduce((sum, link) => sum + link.total_downloads, 0),
    total_emails: shareLinks.reduce((sum, link) => sum + link.emails_sent, 0),
    expired_links: shareLinks.filter(link => link.is_expired).length,
    password_protected: shareLinks.filter(link => link.password_protected).length
  }

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

      {/* Enhanced Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Links</CardTitle>
            <LinkIcon className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{displayStats.total_links}</div>
            <p className="text-xs text-gray-500 mt-1">
              {displayStats.active_links} active • {displayStats.expired_links} expired
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{displayStats.total_views.toLocaleString()}</div>
            <p className="text-xs text-gray-500 mt-1">Document views</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Downloads</CardTitle>
            <Download className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{displayStats.total_downloads.toLocaleString()}</div>
            <p className="text-xs text-gray-500 mt-1">
              {displayStats.total_views > 0 ?
                `${((displayStats.total_downloads / displayStats.total_views) * 100).toFixed(1)}% conversion` :
                'No views yet'
              }
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Emails Sent</CardTitle>
            <Mail className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{displayStats.total_emails.toLocaleString()}</div>
            <p className="text-xs text-gray-500 mt-1">
              {displayStats.password_protected} password protected
            </p>
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
            <div className="space-y-6">
              {shareLinks.map((link) => (
                <Card key={link.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      {/* Left Section - Link Info */}
                      <div className="flex items-start gap-4 flex-1">
                        <div className="p-3 bg-green-100 rounded-lg">
                          <LinkIcon className="w-6 h-6 text-green-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold text-gray-900 text-lg">{link.link_name}</h4>
                            {getStatusBadge(link)}
                          </div>

                          <p className="text-gray-600 mb-3">
                            <span className="font-medium">{link.document_title}</span>
                            <span className="text-sm text-gray-500 ml-2">
                              • {link.document_type.toUpperCase()}
                              • {(link.document_size / 1024 / 1024).toFixed(1)} MB
                            </span>
                          </p>

                          {/* Share URL */}
                          <div className="flex items-center gap-2 mb-4">
                            <code className="text-sm bg-gray-100 px-3 py-2 rounded text-gray-700 truncate max-w-md flex-1">
                              {link.share_url}
                            </code>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyToClipboard(link.share_url)}
                              className="shrink-0"
                            >
                              <Copy className="w-4 h-4 mr-1" />
                              Copy
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openLink(link.share_url)}
                              className="shrink-0"
                            >
                              <ExternalLink className="w-4 h-4 mr-1" />
                              Open
                            </Button>
                          </div>

                          {/* Features & Security */}
                          <div className="flex flex-wrap gap-2 mb-4">
                            {link.password_protected && (
                              <Badge variant="secondary" className="text-xs">
                                <Shield className="w-3 h-3 mr-1" />
                                Password Protected
                              </Badge>
                            )}
                            {link.require_email && (
                              <Badge variant="secondary" className="text-xs">
                                <Mail className="w-3 h-3 mr-1" />
                                Email Required
                              </Badge>
                            )}
                            {link.require_nda && (
                              <Badge variant="secondary" className="text-xs">
                                <Shield className="w-3 h-3 mr-1" />
                                NDA Required
                              </Badge>
                            )}
                            {!link.allow_download && (
                              <Badge variant="secondary" className="text-xs">
                                <Download className="w-3 h-3 mr-1" />
                                Download Disabled
                              </Badge>
                            )}
                            {link.expires_at && (
                              <Badge variant="secondary" className="text-xs">
                                <Clock className="w-3 h-3 mr-1" />
                                Expires {new Date(link.expires_at).toLocaleDateString()}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right Section - Analytics & Actions */}
                      <div className="flex flex-col items-end gap-4">
                        {/* Analytics Grid */}
                        <div className="grid grid-cols-3 gap-6 text-center">
                          <div>
                            <div className="flex items-center gap-1 text-gray-600 justify-center">
                              <Eye className="w-4 h-4" />
                              <span className="text-lg font-semibold">{link.total_views}</span>
                            </div>
                            <p className="text-xs text-gray-500">Views</p>
                            {link.view_limit && (
                              <p className="text-xs text-gray-400">Limit: {link.view_limit}</p>
                            )}
                          </div>

                          <div>
                            <div className="flex items-center gap-1 text-gray-600 justify-center">
                              <Download className="w-4 h-4" />
                              <span className="text-lg font-semibold">{link.total_downloads}</span>
                            </div>
                            <p className="text-xs text-gray-500">Downloads</p>
                            <p className="text-xs text-gray-400">{link.conversion_rate}% rate</p>
                          </div>

                          <div>
                            <div className="flex items-center gap-1 text-gray-600 justify-center">
                              <Mail className="w-4 h-4" />
                              <span className="text-lg font-semibold">{link.emails_sent}</span>
                            </div>
                            <p className="text-xs text-gray-500">Emails</p>
                            <p className="text-xs text-gray-400">Sent</p>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`/send/analytics/${link.document_id}?linkId=${link.link_id}`, '_blank')}
                          >
                            <BarChart3 className="w-4 h-4 mr-1" />
                            Analytics
                          </Button>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </div>

                        {/* Created Date */}
                        <p className="text-xs text-gray-500">
                          Created {new Date(link.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

