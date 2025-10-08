'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Search,
  Filter,
  User,
  MapPin,
  Clock,
  Eye,
  Download,
  Printer,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { format } from 'date-fns'

interface VisitorListProps {
  documentId?: string
  linkId?: string
}

interface Visitor {
  fingerprint: string
  firstVisit: string
  lastVisit: string
  totalSessions: number
  totalDuration: number
  country?: string
  city?: string
  deviceType?: string
  browser?: string
  os?: string
  isReturning: boolean
  sessions: any[]
}

export default function VisitorList({ documentId, linkId }: VisitorListProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [visitors, setVisitors] = useState<Visitor[]>([])
  const [filteredVisitors, setFilteredVisitors] = useState<Visitor[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [deviceFilter, setDeviceFilter] = useState('all')
  const [returningFilter, setReturningFilter] = useState('all')
  const [sortBy, setSortBy] = useState<'visits' | 'duration' | 'recent'>('recent')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)

  useEffect(() => {
    loadVisitors()
  }, [documentId, linkId])

  useEffect(() => {
    filterAndSortVisitors()
  }, [visitors, searchQuery, deviceFilter, returningFilter, sortBy])

  const loadVisitors = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (documentId) params.append('documentId', documentId)
      if (linkId) params.append('linkId', linkId)

      const response = await fetch(`/api/send/visitors/session?${params.toString()}`)
      const data = await response.json()

      if (data.success && data.visitors) {
        setVisitors(data.visitors)
      }
    } catch (error) {
      console.error('Failed to load visitors:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterAndSortVisitors = () => {
    let filtered = [...visitors]

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (v) =>
          v.fingerprint.toLowerCase().includes(query) ||
          v.country?.toLowerCase().includes(query) ||
          v.city?.toLowerCase().includes(query) ||
          v.browser?.toLowerCase().includes(query)
      )
    }

    // Device filter
    if (deviceFilter !== 'all') {
      filtered = filtered.filter((v) => v.deviceType === deviceFilter)
    }

    // Returning filter
    if (returningFilter === 'returning') {
      filtered = filtered.filter((v) => v.isReturning)
    } else if (returningFilter === 'new') {
      filtered = filtered.filter((v) => !v.isReturning)
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'visits') {
        return b.totalSessions - a.totalSessions
      } else if (sortBy === 'duration') {
        return b.totalDuration - a.totalDuration
      } else {
        return new Date(b.lastVisit).getTime() - new Date(a.lastVisit).getTime()
      }
    })

    setFilteredVisitors(filtered)
    setCurrentPage(1)
  }

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    if (minutes < 60) return `${minutes}m ${remainingSeconds}s`
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return `${hours}h ${remainingMinutes}m`
  }

  // Pagination
  const totalPages = Math.ceil(filteredVisitors.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentVisitors = filteredVisitors.slice(startIndex, endIndex)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Visitor Directory</CardTitle>
          <CardDescription>
            {filteredVisitors.length} {filteredVisitors.length === 1 ? 'visitor' : 'visitors'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search visitors..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Device Filter */}
            <Select value={deviceFilter} onValueChange={setDeviceFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Device" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Devices</SelectItem>
                <SelectItem value="desktop">Desktop</SelectItem>
                <SelectItem value="mobile">Mobile</SelectItem>
                <SelectItem value="tablet">Tablet</SelectItem>
              </SelectContent>
            </Select>

            {/* Returning Filter */}
            <Select value={returningFilter} onValueChange={setReturningFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Visitor Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Visitors</SelectItem>
                <SelectItem value="returning">Returning</SelectItem>
                <SelectItem value="new">New</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort */}
            <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Most Recent</SelectItem>
                <SelectItem value="visits">Most Visits</SelectItem>
                <SelectItem value="duration">Longest Duration</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Visitor Table */}
      <Card>
        <CardContent className="p-0">
          {filteredVisitors.length === 0 ? (
            <div className="text-center py-12">
              <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchQuery || deviceFilter !== 'all' || returningFilter !== 'all'
                  ? 'No visitors found'
                  : 'No visitors yet'}
              </h3>
              <p className="text-gray-500">
                {searchQuery || deviceFilter !== 'all' || returningFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Visitors will appear here once they view your document'}
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Visitor</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Device</TableHead>
                    <TableHead>Visits</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Last Visit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentVisitors.map((visitor) => (
                    <TableRow
                      key={visitor.fingerprint}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => router.push(`/send/visitors/${visitor.fingerprint}`)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                            <User className="w-4 h-4 text-gray-600" />
                          </div>
                          <div>
                            <div className="font-medium font-mono text-xs">
                              {visitor.fingerprint.substring(0, 12)}...
                            </div>
                            {visitor.isReturning && (
                              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                Returning
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {visitor.city || visitor.country ? (
                          <div className="flex items-center gap-1 text-sm">
                            <MapPin className="w-3 h-3 text-gray-400" />
                            {[visitor.city, visitor.country].filter(Boolean).join(', ')}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">Unknown</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium capitalize">{visitor.deviceType || 'Unknown'}</div>
                          <div className="text-xs text-gray-500">
                            {visitor.browser} • {visitor.os}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Eye className="w-3 h-3 text-gray-400" />
                          <span className="font-medium">{visitor.totalSessions}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-gray-400" />
                          <span className="font-medium">{formatDuration(visitor.totalDuration)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {format(new Date(visitor.lastVisit), 'MMM d, h:mm a')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between p-4 border-t">
                  <div className="text-sm text-gray-600">
                    Showing {startIndex + 1} to {Math.min(endIndex, filteredVisitors.length)} of{' '}
                    {filteredVisitors.length} visitors
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

