'use client'

import { useState } from 'react'
import { Link as LinkIcon, Copy, Eye, Calendar, MoreVertical } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default function ShareLinksPage() {
  const [shareLinks] = useState([
    {
      id: 1,
      name: 'Q4 Report Share Link',
      url: 'https://intotni.com/s/abc123',
      document: 'Q4 Financial Report.pdf',
      created: '2024-10-01',
      expires: '2024-10-15',
      views: 12,
      status: 'active'
    },
    {
      id: 2,
      name: 'Product Roadmap Link',
      url: 'https://intotni.com/s/xyz789',
      document: 'Product Roadmap 2024.pdf',
      created: '2024-09-28',
      expires: '2024-10-12',
      views: 8,
      status: 'active'
    },
    {
      id: 3,
      name: 'Marketing Strategy Link',
      url: 'https://intotni.com/s/def456',
      document: 'Marketing Strategy.pdf',
      created: '2024-09-25',
      expires: '2024-09-30',
      views: 24,
      status: 'expired'
    }
  ])

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url)
    // You could add a toast notification here
    console.log('Link copied:', url)
  }

  const getStatusBadge = (status: string) => {
    if (status === 'active') {
      return <Badge className="bg-green-100 text-green-700 border-green-200">Active</Badge>
    }
    return <Badge className="bg-gray-100 text-gray-700 border-gray-200">Expired</Badge>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Share Links</h1>
          <p className="text-gray-600 mt-1">Manage and track your document share links</p>
        </div>
        <Button className="bg-green-600 hover:bg-green-700">
          <LinkIcon className="w-4 h-4 mr-2" />
          Create New Link
        </Button>
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
            <div className="text-2xl font-bold">
              {shareLinks.filter(link => link.status === 'active').length}
            </div>
            <p className="text-xs text-gray-500 mt-1">Currently active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {shareLinks.reduce((sum, link) => sum + link.views, 0)}
            </div>
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
          <div className="space-y-4">
            {shareLinks.map((link) => (
              <div
                key={link.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <LinkIcon className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900">{link.name}</h4>
                    <p className="text-sm text-gray-600 mt-1">{link.document}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-700">
                        {link.url}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(link.url)}
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
                      <span className="text-sm font-medium">{link.views}</span>
                    </div>
                    <p className="text-xs text-gray-500">Views</p>
                  </div>

                  <div className="text-center min-w-[120px]">
                    <div className="flex items-center gap-1 text-gray-600 justify-center">
                      <Calendar className="w-4 h-4" />
                      <span className="text-sm font-medium">
                        {new Date(link.expires).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">Expires</p>
                  </div>

                  <div className="min-w-[80px]">
                    {getStatusBadge(link.status)}
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
    </div>
  )
}

