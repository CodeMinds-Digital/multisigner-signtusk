'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  FileText,
  Folder,
  Download,
  Eye,
  Calendar,
  Search,
  Filter,
  RefreshCw,
  ExternalLink
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'

interface SharedItem {
  id: number
  type: 'document' | 'dataroom'
  linkId?: string
  slug?: string
  name: string
  fileName?: string
  fileType?: string
  fileSize?: number
  description?: string
  thumbnailUrl?: string
  sharedAt: string
  expiresAt?: string
  isActive: boolean
  allowDownload: boolean
  isRead: boolean
  lastAccessedAt?: string
}

export default function SharedWithMePage() {
  const { data: session } = useSession()
  const [items, setItems] = useState<SharedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('shared_at')
  const [sortOrder, setSortOrder] = useState('desc')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [stats, setStats] = useState({
    totalDocuments: 0,
    totalDatarooms: 0,
    unreadCount: 0
  })

  const fetchSharedItems = async () => {
    if (!session?.user?.email) return

    try {
      setLoading(true)
      const params = new URLSearchParams({
        email: session.user.email,
        type: typeFilter,
        status: statusFilter,
        sortBy,
        sortOrder,
        page: page.toString(),
        limit: '20'
      })

      const response = await fetch(`/api/send/shared-with-me?${params}`)
      const data = await response.json()

      if (data.success) {
        setItems(data.items)
        setTotalPages(data.pagination.totalPages)
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Failed to fetch shared items:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSharedItems()
  }, [session, typeFilter, statusFilter, sortBy, sortOrder, page])

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.fileName?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return ''
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`
  }

  const getItemUrl = (item: SharedItem) => {
    if (item.type === 'document') {
      return `/send/view/${item.linkId}`
    } else {
      return `/send/dataroom/${item.slug}`
    }
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Shared With Me</h1>
        <p className="text-gray-600">
          Documents and data rooms that have been shared with you
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Documents</p>
                <p className="text-2xl font-bold">{stats.totalDocuments}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Data Rooms</p>
                <p className="text-2xl font-bold">{stats.totalDatarooms}</p>
              </div>
              <Folder className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Unread</p>
                <p className="text-2xl font-bold">{stats.unreadCount}</p>
              </div>
              <Eye className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="documents">Documents</SelectItem>
                <SelectItem value="datarooms">Data Rooms</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="unread">Unread</SelectItem>
                <SelectItem value="read">Read</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={fetchSharedItems}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Items List */}
      <Card>
        <CardHeader>
          <CardTitle>Shared Items ({filteredItems.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600">Loading shared items...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600">No items shared with you yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredItems.map((item) => (
                <div
                  key={`${item.type}-${item.id}`}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                        {item.type === 'document' ? (
                          <FileText className="w-6 h-6 text-white" />
                        ) : (
                          <Folder className="w-6 h-6 text-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-lg truncate">
                            {item.name}
                          </h3>
                          {!item.isRead && (
                            <Badge variant="default" className="bg-blue-600">
                              New
                            </Badge>
                          )}
                          {!item.isActive && (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </div>
                        {item.fileName && (
                          <p className="text-sm text-gray-600 mb-2">
                            {item.fileName} {item.fileSize && `• ${formatFileSize(item.fileSize)}`}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            Shared {formatDistanceToNow(new Date(item.sharedAt), { addSuffix: true })}
                          </span>
                          {item.expiresAt && (
                            <span>
                              Expires {formatDistanceToNow(new Date(item.expiresAt), { addSuffix: true })}
                            </span>
                          )}
                          {item.lastAccessedAt && (
                            <span>
                              Last viewed {formatDistanceToNow(new Date(item.lastAccessedAt), { addSuffix: true })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link href={getItemUrl(item)} target="_blank">
                        <Button variant="outline" size="sm">
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Open
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-gray-600">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

