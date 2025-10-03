'use client'

import { useState } from 'react'
import { FileText, Eye, Download, Link as LinkIcon, MoreVertical } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default function SharedDocumentsPage() {
  const [sharedDocs] = useState([
    {
      id: 1,
      title: 'Q4 Financial Report.pdf',
      recipient: 'john@company.com',
      sharedDate: '2024-10-01',
      views: 12,
      downloads: 3,
      status: 'active',
      expiresIn: '14 days'
    },
    {
      id: 2,
      title: 'Product Roadmap 2024.pdf',
      recipient: 'sarah@startup.io',
      sharedDate: '2024-09-28',
      views: 8,
      downloads: 2,
      status: 'active',
      expiresIn: '11 days'
    },
    {
      id: 3,
      title: 'Marketing Strategy.pdf',
      recipient: 'team@marketing.com',
      sharedDate: '2024-09-25',
      views: 24,
      downloads: 5,
      status: 'expired',
      expiresIn: 'Expired'
    },
    {
      id: 4,
      title: 'Partnership Agreement.pdf',
      recipient: 'partner@business.com',
      sharedDate: '2024-09-20',
      views: 15,
      downloads: 4,
      status: 'active',
      expiresIn: '6 days'
    }
  ])

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
          <h1 className="text-3xl font-bold text-gray-900">Shared Documents</h1>
          <p className="text-gray-600 mt-1">Manage documents you've shared with others</p>
        </div>
        <Button className="bg-green-600 hover:bg-green-700">
          <LinkIcon className="w-4 h-4 mr-2" />
          Create Share Link
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Shared</CardTitle>
            <FileText className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sharedDocs.length}</div>
            <p className="text-xs text-gray-500 mt-1">Documents shared</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sharedDocs.reduce((sum, doc) => sum + doc.views, 0)}
            </div>
            <p className="text-xs text-gray-500 mt-1">Across all documents</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Downloads</CardTitle>
            <Download className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sharedDocs.reduce((sum, doc) => sum + doc.downloads, 0)}
            </div>
            <p className="text-xs text-gray-500 mt-1">Total downloads</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Links</CardTitle>
            <LinkIcon className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sharedDocs.filter(doc => doc.status === 'active').length}
            </div>
            <p className="text-xs text-gray-500 mt-1">Currently active</p>
          </CardContent>
        </Card>
      </div>

      {/* Shared Documents Table */}
      <Card>
        <CardHeader>
          <CardTitle>Shared Documents</CardTitle>
          <CardDescription>View and manage your shared documents</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sharedDocs.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <FileText className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 truncate">{doc.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Shared with <span className="font-medium">{doc.recipient}</span> on{' '}
                      {new Date(doc.sharedDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <div className="flex items-center gap-1 text-gray-600">
                      <Eye className="w-4 h-4" />
                      <span className="text-sm font-medium">{doc.views}</span>
                    </div>
                    <p className="text-xs text-gray-500">Views</p>
                  </div>

                  <div className="text-center">
                    <div className="flex items-center gap-1 text-gray-600">
                      <Download className="w-4 h-4" />
                      <span className="text-sm font-medium">{doc.downloads}</span>
                    </div>
                    <p className="text-xs text-gray-500">Downloads</p>
                  </div>

                  <div className="text-center min-w-[100px]">
                    {getStatusBadge(doc.status)}
                    <p className="text-xs text-gray-500 mt-1">{doc.expiresIn}</p>
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

