'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { 
  Folder, 
  FileText, 
  Users, 
  Eye, 
  Calendar, 
  MoreHorizontal, 
  Settings, 
  Share2, 
  Archive, 
  Trash2 
} from 'lucide-react'
import Link from 'next/link'

interface DataRoom {
  id: string
  name: string
  description: string
  document_count: number
  total_views: number
  created_at: string
  updated_at: string
  is_active: boolean
}

interface DataRoomCardProps {
  dataRoom: DataRoom
  onUpdate: () => void
}

export function DataRoomCard({ dataRoom, onUpdate }: DataRoomCardProps) {
  const [loading, setLoading] = useState(false)

  const handleArchive = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/send/data-rooms/${dataRoom.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !dataRoom.is_active })
      })
      
      if (response.ok) {
        onUpdate()
      }
    } catch (error) {
      console.error('Failed to update data room:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this data room? This action cannot be undone.')) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/send/data-rooms/${dataRoom.id}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        onUpdate()
      }
    } catch (error) {
      console.error('Failed to delete data room:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  return (
    <Card className={`hover:shadow-lg transition-shadow ${!dataRoom.is_active ? 'opacity-60' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Folder className="w-5 h-5 text-blue-600" />
            <div>
              <CardTitle className="text-lg">{dataRoom.name}</CardTitle>
              {!dataRoom.is_active && (
                <Badge variant="secondary" className="mt-1">Archived</Badge>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" disabled={loading}>
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/send/data-rooms/${dataRoom.id}`}>
                  <Eye className="w-4 h-4 mr-2" />
                  View Details
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/send/data-rooms/${dataRoom.id}/settings`}>
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleArchive}>
                <Archive className="w-4 h-4 mr-2" />
                {dataRoom.is_active ? 'Archive' : 'Unarchive'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <CardDescription className="line-clamp-2">
          {dataRoom.description || 'No description provided'}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-gray-500" />
            <div>
              <p className="text-sm text-gray-600">Documents</p>
              <p className="font-semibold">{dataRoom.document_count}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-gray-500" />
            <div>
              <p className="text-sm text-gray-600">Views</p>
              <p className="font-semibold">{dataRoom.total_views}</p>
            </div>
          </div>
        </div>

        {/* Dates */}
        <div className="text-xs text-gray-500 space-y-1">
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            Created {formatDate(dataRoom.created_at)}
          </div>
          {dataRoom.updated_at !== dataRoom.created_at && (
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Updated {formatDate(dataRoom.updated_at)}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button asChild variant="outline" size="sm" className="flex-1">
            <Link href={`/send/data-rooms/${dataRoom.id}`}>
              <Eye className="w-4 h-4 mr-1" />
              View
            </Link>
          </Button>
          <Button asChild size="sm" className="flex-1">
            <Link href={`/send/data-rooms/${dataRoom.id}/share`}>
              <Share2 className="w-4 h-4 mr-1" />
              Share
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
