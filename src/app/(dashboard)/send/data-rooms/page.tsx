'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Folder, Users, Eye, Calendar, MoreHorizontal, Settings } from 'lucide-react'
import { CreateDataRoomModal } from '@/components/features/send/data-rooms/create-data-room-modal'
import { DataRoomCard } from '@/components/features/send/data-rooms/data-room-card'

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

export default function DataRoomsPage() {
  const [dataRooms, setDataRooms] = useState<DataRoom[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)

  useEffect(() => {
    fetchDataRooms()
  }, [])

  const fetchDataRooms = async () => {
    try {
      const response = await fetch('/api/send/data-rooms')
      if (response.ok) {
        const data = await response.json()
        setDataRooms(data.dataRooms || [])
      }
    } catch (error) {
      console.error('Failed to fetch data rooms:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDataRoomCreated = (newDataRoom: DataRoom) => {
    setDataRooms(prev => [newDataRoom, ...prev])
    setShowCreateModal(false)
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Data Rooms</h1>
          <p className="text-gray-600 mt-1">
            Organize multiple documents into secure virtual data rooms for streamlined sharing
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Data Room
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Folder className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Total Rooms</p>
                <p className="text-2xl font-bold">{dataRooms.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Active Rooms</p>
                <p className="text-2xl font-bold">{dataRooms.filter(room => room.is_active).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Total Views</p>
                <p className="text-2xl font-bold">{dataRooms.reduce((sum, room) => sum + room.total_views, 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">This Month</p>
                <p className="text-2xl font-bold">{dataRooms.filter(room => {
                  const created = new Date(room.created_at)
                  const now = new Date()
                  return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear()
                }).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Rooms Grid */}
      {dataRooms.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Folder className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Data Rooms Yet</h3>
            <p className="text-gray-600 mb-6">
              Create your first data room to organize and share multiple documents securely
            </p>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Data Room
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dataRooms.map((dataRoom) => (
            <DataRoomCard
              key={dataRoom.id}
              dataRoom={dataRoom}
              onUpdate={fetchDataRooms}
            />
          ))}
        </div>
      )}

      {/* Create Data Room Modal */}
      {showCreateModal && (
        <CreateDataRoomModal
          onClose={() => setShowCreateModal(false)}
          onDataRoomCreated={handleDataRoomCreated}
        />
      )}
    </div>
  )
}
